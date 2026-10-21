package com.example.shop;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.example.shop.model.OrderItem;
import com.example.shop.model.OrderStatus;
import com.example.shop.model.Role;
import com.example.shop.model.User;
import com.example.shop.repo.OrderItemRepository;
import com.example.shop.repo.UserRepository;
import com.example.shop.security.CurrentUser;
import com.example.shop.service.CommissionService;
import com.example.shop.web.Dtos.SellerEarningsResponse;
import com.example.shop.web.Dtos.SellerSummaryResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class CommissionServiceTest {
  @Mock UserRepository users;
  @Mock OrderItemRepository items;
  @Mock CurrentUser current;
  CommissionService service;

  @BeforeEach void setUp() {
    service = new CommissionService(users, items, current, new BigDecimal("5"));
  }

  private static User user(long id, String email, String... roleNames) {
    User u = new User();
    u.setId(id);
    u.setEmail(email);
    for (String n : roleNames) {
      Role r = new Role();
      r.setName(n);
      u.getRoles().add(r);
    }
    return u;
  }

  private static OrderItem line(OrderStatus status, int qty, String price, String commission, String earning) {
    OrderItem i = new OrderItem();
    i.setStatus(status);
    i.setQuantity(qty);
    i.setUnitPrice(new BigDecimal(price));
    if (commission != null) {
      i.setCommissionAmount(new BigDecimal(commission));
      i.setSellerEarning(new BigDecimal(earning));
    }
    return i;
  }

  private static void assertMoney(String expected, BigDecimal actual) {
    assertEquals(0, new BigDecimal(expected).compareTo(actual), "expected " + expected + " but was " + actual);
  }

  // ---------------- rateFor ----------------
  @Test void sellerWithoutAnOwnRateGetsTheMarketplaceDefault() {
    assertMoney("5", service.rateFor(user(1, "s@t.com", "SELLER")));
    assertMoney("5", service.defaultPercent());
  }

  @Test void sellerWithAnOwnRateKeepsIt() {
    User s = user(1, "s@t.com", "SELLER");
    s.setCommissionPercent(new BigDecimal("3.00"));
    assertMoney("3", service.rateFor(s));
  }

  @Test void productsWithoutASellerCarryNoCommission() {
    assertMoney("0", service.rateFor(null));
  }

  // ---------------- setRate ----------------
  @Test void adminCanMoveASellerToThePreferredRate() {
    User s = user(7, "s@t.com", "SELLER");
    when(users.findById(7L)).thenReturn(Optional.of(s));
    when(users.save(any())).thenAnswer(inv -> inv.getArgument(0));

    SellerSummaryResponse r = service.setRate(7L, new BigDecimal("3"));

    assertMoney("3.00", r.commissionPercent());
    assertMoney("3.00", s.getCommissionPercent());
  }

  @Test void ratesAreRoundedToTwoDecimals() {
    User s = user(7, "s@t.com", "SELLER");
    when(users.findById(7L)).thenReturn(Optional.of(s));
    when(users.save(any())).thenAnswer(inv -> inv.getArgument(0));

    assertMoney("3.46", service.setRate(7L, new BigDecimal("3.456")).commissionPercent());
  }

  @Test void onlySellersHaveACommission() {
    when(users.findById(8L)).thenReturn(Optional.of(user(8, "b@t.com", "BUYER")));

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.setRate(8L, new BigDecimal("3")));

    assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    verify(users, never()).save(any());
  }

  @Test void rateMustStayBetweenZeroAndThirtyPercent() {
    for (BigDecimal bad : new BigDecimal[] { new BigDecimal("-1"), new BigDecimal("30.01"), new BigDecimal("100"), null }) {
      ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.setRate(7L, bad));
      assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }
  }

  @Test void theBoundariesAreAllowed() {
    User s = user(7, "s@t.com", "SELLER");
    when(users.findById(7L)).thenReturn(Optional.of(s));
    when(users.save(any())).thenAnswer(inv -> inv.getArgument(0));
    assertMoney("0.00", service.setRate(7L, BigDecimal.ZERO).commissionPercent());
    assertMoney("30.00", service.setRate(7L, new BigDecimal("30")).commissionPercent());
  }

  @Test void unknownSellerIsNotFound() {
    when(users.findById(404L)).thenReturn(Optional.empty());

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.setRate(404L, new BigDecimal("3")));

    assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
  }

  // ---------------- earnings ----------------
  @Test void earningsSplitDeliveredFromPendingAndSkipCancelled() {
    List<OrderItem> lines = List.of(
        line(OrderStatus.DELIVERED, 1, "1000", "50.00", "950.00"),
        line(OrderStatus.SHIPPED, 1, "500", "25.00", "475.00"),
        line(OrderStatus.PLACED, 2, "100", "10.00", "190.00"),
        line(OrderStatus.CANCELLED, 1, "200", "10.00", "190.00"));

    SellerEarningsResponse e = CommissionService.earnings(new BigDecimal("5"), lines);

    assertMoney("1700", e.grossSales());            // 1000 + 500 + 200, the cancelled 200 is ignored
    assertMoney("85.00", e.commission());           // 50 + 25 + 10
    assertMoney("1615.00", e.netEarnings());
    assertMoney("950.00", e.payable());
    assertMoney("665.00", e.pending());
    assertEquals(4, e.unitsSold());
    assertMoney("5", e.commissionPercent());
  }

  @Test void legacyLinesWithoutACommissionCountFullyForTheSeller() {
    SellerEarningsResponse e = CommissionService.earnings(BigDecimal.ZERO,
        List.of(line(OrderStatus.DELIVERED, 1, "100", null, null)));
    assertMoney("100", e.grossSales());
    assertMoney("0", e.commission());
    assertMoney("100", e.payable());
  }

  @Test void noLinesMeansZeroEarnings() {
    SellerEarningsResponse e = CommissionService.earnings(new BigDecimal("5"), List.of());
    assertMoney("0", e.grossSales());
    assertEquals(0, e.unitsSold());
  }

  @Test void myEarningsUseTheLoggedInSellersRateAndLines() {
    User me = user(7, "s@t.com", "SELLER");
    me.setCommissionPercent(new BigDecimal("3.00"));
    when(current.require()).thenReturn(me);
    when(items.findForSeller(7L)).thenReturn(List.of(line(OrderStatus.PLACED, 1, "1000", "30.00", "970.00")));

    SellerEarningsResponse e = service.myEarnings();

    assertMoney("3", e.commissionPercent());
    assertMoney("30.00", e.commission());
    assertMoney("970.00", e.pending());
  }

  // ---------------- sellers (admin list) ----------------
  @Test void adminListShowsSellersOnly() {
    User seller = user(7, "s@t.com", "SELLER");
    seller.setCommissionPercent(new BigDecimal("3.00"));
    seller.setStoreName("Shop");
    when(users.findAll(any(Sort.class))).thenReturn(List.of(seller, user(8, "b@t.com", "BUYER"), user(9, "a@t.com", "ADMIN")));
    when(items.findForSeller(7L)).thenReturn(List.of(line(OrderStatus.PLACED, 2, "100", "6.00", "194.00")));

    List<SellerSummaryResponse> list = service.sellers();

    assertEquals(1, list.size());
    assertEquals("Shop", list.get(0).storeName());
    assertMoney("3", list.get(0).commissionPercent());
    assertMoney("200", list.get(0).grossSales());
    assertMoney("6.00", list.get(0).commission());
    assertEquals(2, list.get(0).unitsSold());
  }
}

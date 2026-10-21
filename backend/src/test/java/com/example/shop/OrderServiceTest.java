package com.example.shop;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.example.shop.model.Order;
import com.example.shop.model.OrderItem;
import com.example.shop.model.OrderStatus;
import com.example.shop.model.Product;
import com.example.shop.model.User;
import com.example.shop.repo.OrderItemRepository;
import com.example.shop.repo.OrderRepository;
import com.example.shop.repo.ProductRepository;
import com.example.shop.repo.UserRepository;
import com.example.shop.security.AccessGuard;
import com.example.shop.security.CurrentUser;
import com.example.shop.service.CommissionService;
import com.example.shop.service.OrderService;
import com.example.shop.service.PricingService;
import com.example.shop.web.Dtos.CheckoutRequest;
import com.example.shop.web.Dtos.Line;
import com.example.shop.web.Dtos.OrderResponse;
import com.example.shop.web.Dtos.SellerOrderLine;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
  @Mock ProductRepository products;
  @Mock OrderRepository orders;
  @Mock UserRepository users;
  @Mock OrderItemRepository orderItems;
  @Mock PricingService pricing;
  @Mock CurrentUser current;
  @Mock AccessGuard guard;
  @Mock CommissionService commissions;
  @InjectMocks OrderService service;

  User buyer;
  User seller;
  Product mouse;

  @BeforeEach void setUp() {
    buyer = user(1, "b@t.com");
    seller = user(7, "s@t.com");
    seller.setStoreName("Acme");
    mouse = new Product();
    mouse.setId(1L);
    mouse.setName("Mouse");
    mouse.setPrice(new BigDecimal("799"));
    mouse.setStock(5);
    mouse.setSeller(seller);
  }

  private static User user(long id, String email) {
    User u = new User();
    u.setId(id);
    u.setEmail(email);
    return u;
  }

  private Order order(OrderStatus status, OrderItem... items) {
    Order o = new Order();
    o.setId(10L);
    o.setUser(buyer);
    o.setStatus(status);
    for (OrderItem i : items) {
      i.setOrder(o);
      o.getItems().add(i);
    }
    return o;
  }

  private OrderItem item(long id, int qty, Long sellerId, OrderStatus status) {
    OrderItem i = new OrderItem();
    i.setId(id);
    i.setProductId(1L);
    i.setProductName("Mouse");
    i.setUnitPrice(new BigDecimal("799"));
    i.setQuantity(qty);
    i.setSellerId(sellerId);
    i.setStatus(status);
    return i;
  }

  // ---------------- checkout ----------------
  @Test void checkoutChargesTheOfferPriceAndDecrementsStock() {
    when(users.findByEmail("b@t.com")).thenReturn(Optional.of(buyer));
    when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(mouse));
    when(pricing.priceOf(any(), any())).thenReturn(new PricingService.Price(new BigDecimal("679.15"), 15, "Sale"));
    when(commissions.rateFor(seller)).thenReturn(new BigDecimal("5"));
    when(orders.save(any())).thenAnswer(inv -> inv.getArgument(0));

    OrderResponse res = service.checkout("b@t.com", new CheckoutRequest(List.of(new Line(1L, 2))));

    assertEquals(3, mouse.getStock());
    assertEquals(0, new BigDecimal("1358.30").compareTo(res.total()));
    assertEquals(0, new BigDecimal("679.15").compareTo(res.items().get(0).unitPrice()));
    assertEquals("Acme", res.items().get(0).sellerName());
    assertEquals(OrderStatus.PLACED, res.status());

    // 5% of 1358.30 = 67.915 -> 67.92 for the marketplace, the rest for the seller
    ArgumentCaptor<Order> saved = ArgumentCaptor.forClass(Order.class);
    verify(orders).save(saved.capture());
    OrderItem line = saved.getValue().getItems().get(0);
    assertEquals(0, new BigDecimal("5").compareTo(line.getCommissionPercent()));
    assertEquals(0, new BigDecimal("67.92").compareTo(line.getCommissionAmount()));
    assertEquals(0, new BigDecimal("1290.38").compareTo(line.getSellerEarning()));
  }

  @Test void commissionSnapshotUsesTheSellersOwnRate() {
    when(users.findByEmail("b@t.com")).thenReturn(Optional.of(buyer));
    when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(mouse));
    when(pricing.priceOf(any(), any())).thenReturn(new PricingService.Price(new BigDecimal("1000.00"), 0, null));
    when(commissions.rateFor(seller)).thenReturn(new BigDecimal("3"));    // preferred seller
    when(orders.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.checkout("b@t.com", new CheckoutRequest(List.of(new Line(1L, 1))));

    ArgumentCaptor<Order> saved = ArgumentCaptor.forClass(Order.class);
    verify(orders).save(saved.capture());
    OrderItem line = saved.getValue().getItems().get(0);
    assertEquals(0, new BigDecimal("30.00").compareTo(line.getCommissionAmount()));
    assertEquals(0, new BigDecimal("970.00").compareTo(line.getSellerEarning()));
  }

  @Test void checkoutFailsWhenStockIsInsufficient() {
    when(users.findByEmail("b@t.com")).thenReturn(Optional.of(buyer));
    when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(mouse));

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.checkout("b@t.com", new CheckoutRequest(List.of(new Line(1L, 6)))));

    assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    assertEquals(5, mouse.getStock());
    verify(orders, never()).save(any());
  }

  @Test void checkoutFailsForUnknownProduct() {
    when(users.findByEmail("b@t.com")).thenReturn(Optional.of(buyer));
    when(products.findByIdForUpdate(99L)).thenReturn(Optional.empty());

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.checkout("b@t.com", new CheckoutRequest(List.of(new Line(99L, 1)))));

    assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
  }

  @Test void checkoutFailsForUnknownUser() {
    when(users.findByEmail("ghost@t.com")).thenReturn(Optional.empty());

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.checkout("ghost@t.com", new CheckoutRequest(List.of(new Line(1L, 1)))));

    assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
  }

  @Test void sellersCannotBuyTheirOwnProducts() {
    when(users.findByEmail("s@t.com")).thenReturn(Optional.of(seller));
    when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(mouse));

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.checkout("s@t.com", new CheckoutRequest(List.of(new Line(1L, 1)))));

    assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    assertEquals(5, mouse.getStock());
  }

  // ---------------- seller fulfilment ----------------
  @Test void sellerShipsOwnLineAndOrderBecomesShipped() {
    Order o = order(OrderStatus.PLACED, item(100, 2, 7L, OrderStatus.PLACED));
    when(orders.findById(10L)).thenReturn(Optional.of(o));
    when(current.require()).thenReturn(seller);
    when(orders.save(any())).thenAnswer(inv -> inv.getArgument(0));

    OrderResponse res = service.updateItemStatus(10L, 100L, OrderStatus.SHIPPED);

    assertEquals(OrderStatus.SHIPPED, res.status());
    assertEquals(OrderStatus.SHIPPED, res.items().get(0).status());
  }

  @Test void orderStaysShippedWhileAnotherLineIsStillPlaced() {
    Order o = order(OrderStatus.PLACED,
        item(100, 1, 7L, OrderStatus.PLACED), item(101, 1, 8L, OrderStatus.PLACED));
    when(orders.findById(10L)).thenReturn(Optional.of(o));
    when(current.require()).thenReturn(seller);
    when(orders.save(any())).thenAnswer(inv -> inv.getArgument(0));

    OrderResponse res = service.updateItemStatus(10L, 100L, OrderStatus.SHIPPED);

    assertEquals(OrderStatus.SHIPPED, res.status());
    assertEquals(OrderStatus.PLACED, res.items().get(1).status());
  }

  @Test void anotherSellerCannotTouchTheLine() {
    Order o = order(OrderStatus.PLACED, item(100, 2, 7L, OrderStatus.PLACED));
    when(orders.findById(10L)).thenReturn(Optional.of(o));
    when(current.require()).thenReturn(user(8, "other@t.com"));

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.updateItemStatus(10L, 100L, OrderStatus.SHIPPED));

    assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    verify(orders, never()).save(any());
  }

  @Test void adminWithOrdersUpdateCanTouchAnyLine() {
    Order o = order(OrderStatus.PLACED, item(100, 2, 7L, OrderStatus.PLACED));
    when(orders.findById(10L)).thenReturn(Optional.of(o));
    when(current.require()).thenReturn(user(99, "admin@t.com"));
    when(guard.has("ORDERS_UPDATE")).thenReturn(true);
    when(orders.save(any())).thenAnswer(inv -> inv.getArgument(0));

    assertEquals(OrderStatus.SHIPPED, service.updateItemStatus(10L, 100L, OrderStatus.SHIPPED).status());
  }

  @Test void unknownLineIsNotFound() {
    when(orders.findById(10L)).thenReturn(Optional.of(order(OrderStatus.PLACED, item(100, 1, 7L, OrderStatus.PLACED))));

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.updateItemStatus(10L, 555L, OrderStatus.SHIPPED));

    assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
  }

  @Test void cancellingTheOnlyLineRestoresStockAndCancelsTheOrder() {
    Order o = order(OrderStatus.PLACED, item(100, 2, 7L, OrderStatus.PLACED));
    when(orders.findById(10L)).thenReturn(Optional.of(o));
    when(current.require()).thenReturn(seller);
    when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(mouse));
    when(orders.save(any())).thenAnswer(inv -> inv.getArgument(0));

    OrderResponse res = service.updateItemStatus(10L, 100L, OrderStatus.CANCELLED);

    assertEquals(7, mouse.getStock());
    assertEquals(OrderStatus.CANCELLED, res.status());
  }

  @Test void cancelledLineCannotBeReopened() {
    Order o = order(OrderStatus.CANCELLED, item(100, 2, 7L, OrderStatus.CANCELLED));
    when(orders.findById(10L)).thenReturn(Optional.of(o));
    when(current.require()).thenReturn(seller);

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.updateItemStatus(10L, 100L, OrderStatus.SHIPPED));

    assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
  }

  @Test void sellerSeesOnlyTheirLinesWithMaskedBuyer() {
    OrderItem line = item(100, 2, 7L, OrderStatus.PLACED);
    order(OrderStatus.PLACED, line);
    when(current.require()).thenReturn(seller);
    when(orderItems.findForSeller(7L)).thenReturn(List.of(line));

    List<SellerOrderLine> lines = service.sellerLines();

    assertEquals(1, lines.size());
    assertEquals("b***@t.com", lines.get(0).buyer());
    assertEquals(2, lines.get(0).quantity());
  }

  // ---------------- admin ----------------
  @Test void adminCancellingAnOrderRestoresStockForEveryLine() {
    Order o = order(OrderStatus.PLACED,
        item(100, 2, 7L, OrderStatus.PLACED), item(101, 1, 7L, OrderStatus.PLACED));
    when(orders.findById(10L)).thenReturn(Optional.of(o));
    when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(mouse));
    when(orders.save(any())).thenAnswer(inv -> inv.getArgument(0));

    OrderResponse res = service.updateStatus(10L, OrderStatus.CANCELLED);

    assertEquals(8, mouse.getStock());
    assertEquals(OrderStatus.CANCELLED, res.status());
  }

  @Test void cancelledOrderCannotBeReopened() {
    when(orders.findById(10L)).thenReturn(Optional.of(order(OrderStatus.CANCELLED, item(100, 2, 7L, OrderStatus.CANCELLED))));

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.updateStatus(10L, OrderStatus.PLACED));

    assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
  }

  @Test void deletingRestoresStockOnlyForActiveLines() {
    Order o = order(OrderStatus.PLACED,
        item(100, 3, 7L, OrderStatus.PLACED), item(101, 2, 7L, OrderStatus.CANCELLED));
    when(orders.findById(10L)).thenReturn(Optional.of(o));
    when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(mouse));

    service.delete(10L);

    assertEquals(8, mouse.getStock());   // 5 + 3, the cancelled line was already returned
    verify(orders).delete(o);
  }

  @Test void updatingUnknownOrderIsNotFound() {
    when(orders.findById(404L)).thenReturn(Optional.empty());

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.updateStatus(404L, OrderStatus.SHIPPED));

    assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
  }
}

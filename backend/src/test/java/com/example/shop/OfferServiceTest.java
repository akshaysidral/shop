package com.example.shop;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.example.shop.model.Offer;
import com.example.shop.model.Product;
import com.example.shop.model.User;
import com.example.shop.repo.OfferRepository;
import com.example.shop.repo.ProductRepository;
import com.example.shop.security.AccessGuard;
import com.example.shop.security.CurrentUser;
import com.example.shop.service.OfferService;
import com.example.shop.web.Dtos.ActiveOfferResponse;
import com.example.shop.web.Dtos.OfferRequest;
import com.example.shop.web.Dtos.OfferResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class OfferServiceTest {
  @Mock OfferRepository offers;
  @Mock ProductRepository products;
  @Mock CurrentUser current;
  @Mock AccessGuard guard;
  @InjectMocks OfferService service;

  User seller;
  Product mine;

  @BeforeEach void setUp() {
    seller = user(7, "s@t.com");
    seller.setStoreName("Acme");
    mine = product(1, seller);
  }

  private static User user(long id, String email) {
    User u = new User();
    u.setId(id);
    u.setEmail(email);
    return u;
  }

  private static Product product(long id, User seller) {
    Product p = new Product();
    p.setId(id);
    p.setName("P" + id);
    p.setSeller(seller);
    return p;
  }

  private static Instant ago(long hours) { return Instant.now().minus(Duration.ofHours(hours)); }
  private static Instant ahead(long hours) { return Instant.now().plus(Duration.ofHours(hours)); }

  private static OfferRequest request(int pct, Instant from, Instant to, boolean active, boolean all, Set<Long> ids) {
    return new OfferRequest("Diwali Sale", pct, from, to, active, all, ids);
  }

  private Offer existing(long id, User owner) {
    Offer o = new Offer();
    o.setId(id);
    o.setSeller(owner);
    o.setName("Old");
    o.setDiscountPercent(10);
    o.setStartsAt(ago(1));
    o.setEndsAt(ahead(1));
    o.setActive(true);
    return o;
  }

  private void stubCreate() {
    when(current.require()).thenReturn(seller);
    when(products.findAllById(Set.of(1L))).thenReturn(List.of(mine));
    when(offers.save(any())).thenAnswer(inv -> inv.getArgument(0));
  }

  // ---------------- create ----------------
  @Test void sellerCreatesALiveOfferOnTheirOwnProduct() {
    stubCreate();

    OfferResponse r = service.create(request(20, ago(1), ahead(24), true, false, Set.of(1L)));

    assertEquals("LIVE", r.status());
    assertEquals(20, r.discountPercent());
    assertEquals(List.of(1L), r.productIds());
    assertEquals(7L, r.sellerId());
    assertEquals("Acme", r.sellerName());
  }

  @Test void offerThatStartsLaterIsScheduled() {
    stubCreate();
    assertEquals("SCHEDULED", service.create(request(20, ahead(1), ahead(2), true, false, Set.of(1L))).status());
  }

  @Test void offerThatAlreadyEndedIsEnded() {
    stubCreate();
    assertEquals("ENDED", service.create(request(20, ago(2), ago(1), true, false, Set.of(1L))).status());
  }

  @Test void inactiveOfferIsPaused() {
    stubCreate();
    assertEquals("PAUSED", service.create(request(20, ago(1), ahead(1), false, false, Set.of(1L))).status());
  }

  @Test void offerForAllProductsNeedsNoProductList() {
    when(current.require()).thenReturn(seller);
    when(offers.save(any())).thenAnswer(inv -> inv.getArgument(0));

    OfferResponse r = service.create(request(10, ago(1), ahead(1), true, true, Set.of()));

    assertTrue(r.appliesToAll());
    assertTrue(r.productIds().isEmpty());
    verify(products, never()).findAllById(any());
  }

  @Test void endMustBeAfterStart() {
    when(current.require()).thenReturn(seller);
    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.create(request(10, ahead(2), ahead(1), true, true, Set.of())));
    assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    verify(offers, never()).save(any());
  }

  @Test void somethingMustBeSelected() {
    when(current.require()).thenReturn(seller);
    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.create(request(10, ago(1), ahead(1), true, false, Set.of())));
    assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
  }

  @Test void unknownProductsAreNotFound() {
    when(current.require()).thenReturn(seller);
    when(products.findAllById(Set.of(9L))).thenReturn(List.of());
    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.create(request(10, ago(1), ahead(1), true, false, Set.of(9L))));
    assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
  }

  @Test void aSellerCannotDiscountSomeoneElsesProduct() {
    when(current.require()).thenReturn(seller);
    when(products.findAllById(Set.of(2L))).thenReturn(List.of(product(2, user(8, "other@t.com"))));
    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.create(request(10, ago(1), ahead(1), true, false, Set.of(2L))));
    assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
  }

  @Test void productsWithoutASellerCannotBeDiscounted() {
    when(current.require()).thenReturn(seller);
    when(products.findAllById(Set.of(3L))).thenReturn(List.of(product(3, null)));
    assertThrows(ResponseStatusException.class,
        () -> service.create(request(10, ago(1), ahead(1), true, false, Set.of(3L))));
  }

  // ---------------- update / delete ----------------
  @Test void ownerCanUpdate() {
    when(offers.findById(5L)).thenReturn(Optional.of(existing(5, seller)));
    when(current.require()).thenReturn(seller);
    when(offers.save(any())).thenAnswer(inv -> inv.getArgument(0));

    OfferResponse r = service.update(5L, request(30, ago(1), ahead(1), false, true, Set.of()));

    assertEquals(30, r.discountPercent());
    assertEquals("PAUSED", r.status());
  }

  @Test void anotherSellerCannotUpdate() {
    when(offers.findById(5L)).thenReturn(Optional.of(existing(5, seller)));
    when(current.require()).thenReturn(user(8, "other@t.com"));

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.update(5L, request(30, ago(1), ahead(1), true, true, Set.of())));

    assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    verify(offers, never()).save(any());
  }

  @Test void adminWithManageAllCanUpdateAnyOffer() {
    when(offers.findById(5L)).thenReturn(Optional.of(existing(5, seller)));
    when(current.require()).thenReturn(user(99, "admin@t.com"));
    when(guard.has("OFFERS_MANAGE_ALL")).thenReturn(true);
    when(offers.save(any())).thenAnswer(inv -> inv.getArgument(0));

    assertEquals("PAUSED", service.update(5L, request(10, ago(1), ahead(1), false, true, Set.of())).status());
  }

  @Test void ownerCanDelete() {
    Offer o = existing(5, seller);
    when(offers.findById(5L)).thenReturn(Optional.of(o));
    when(current.require()).thenReturn(seller);

    service.delete(5L);

    verify(offers).delete(o);
  }

  @Test void strangerCannotDelete() {
    when(offers.findById(5L)).thenReturn(Optional.of(existing(5, seller)));
    when(current.require()).thenReturn(user(8, "other@t.com"));

    ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.delete(5L));

    assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    verify(offers, never()).delete(any());
  }

  @Test void deletingAnUnknownOfferIsNotFound() {
    when(offers.findById(404L)).thenReturn(Optional.empty());
    ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.delete(404L));
    assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
  }

  // ---------------- list / active ----------------
  @Test void sellersSeeOnlyTheirOwnOffers() {
    when(guard.has("OFFERS_MANAGE_ALL")).thenReturn(false);
    when(current.require()).thenReturn(seller);
    when(offers.findBySellerIdOrderByStartsAtDesc(7L)).thenReturn(List.of(existing(5, seller)));

    assertEquals(1, service.list().size());
    verify(offers, never()).findAllByOrderByStartsAtDesc();
  }

  @Test void adminsSeeEveryoneOffers() {
    when(guard.has("OFFERS_MANAGE_ALL")).thenReturn(true);
    when(offers.findAllByOrderByStartsAtDesc()).thenReturn(List.of(existing(5, seller), existing(6, user(8, "o@t.com"))));

    assertEquals(2, service.list().size());
  }

  @Test void activeOffersAreSummarisedForTheStorefront() {
    Offer o = existing(5, seller);
    o.setName("Diwali Sale");
    o.setDiscountPercent(20);
    o.setAppliesToAll(true);
    when(offers.findActive(any(Instant.class))).thenReturn(List.of(o));

    List<ActiveOfferResponse> active = service.active();

    assertEquals(1, active.size());
    assertEquals("Diwali Sale", active.get(0).name());
    assertEquals(20, active.get(0).discountPercent());
    assertEquals("Acme", active.get(0).sellerName());
    assertTrue(active.get(0).appliesToAll());
  }
}

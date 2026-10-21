package com.example.shop;

import static org.junit.jupiter.api.Assertions.*;

import com.example.shop.model.Offer;
import com.example.shop.model.Product;
import com.example.shop.model.User;
import com.example.shop.service.PricingService;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class PricingServiceTest {
  private final PricingService pricing = new PricingService(null);   // priceOf() needs no repository

  private static User user(long id) {
    User u = new User();
    u.setId(id);
    u.setEmail("u" + id + "@t.com");
    return u;
  }

  private static Product product(long id, String price, User seller) {
    Product p = new Product();
    p.setId(id);
    p.setName("P" + id);
    p.setPrice(new BigDecimal(price));
    p.setSeller(seller);
    return p;
  }

  private static Offer offer(User seller, int pct, String name, boolean all, Product... products) {
    Offer o = new Offer();
    o.setSeller(seller);
    o.setDiscountPercent(pct);
    o.setName(name);
    o.setAppliesToAll(all);
    o.getProducts().addAll(Arrays.asList(products));
    return o;
  }

  private static Map<Long, List<Offer>> live(Offer... offers) {
    return Arrays.stream(offers).collect(Collectors.groupingBy(o -> o.getSeller().getId()));
  }

  private static void assertPrice(String expected, PricingService.Price p) {
    assertEquals(0, new BigDecimal(expected).compareTo(p.finalPrice()), "final price was " + p.finalPrice());
  }

  @Test void noOffersMeansListPrice() {
    PricingService.Price p = pricing.priceOf(product(1, "1000", user(1)), Map.of());
    assertPrice("1000", p);
    assertEquals(0, p.discountPercent());
    assertNull(p.offerName());
  }

  @Test void offerForAllProductsDiscounts() {
    User s = user(1);
    PricingService.Price p = pricing.priceOf(product(1, "1000", s), live(offer(s, 20, "Diwali", true)));
    assertPrice("800", p);
    assertEquals(20, p.discountPercent());
    assertEquals("Diwali", p.offerName());
  }

  @Test void productSpecificOfferOnlyAppliesToListedProducts() {
    User s = user(1);
    Product listed = product(1, "1000", s);
    Product other = product(2, "1000", s);
    Map<Long, List<Offer>> live = live(offer(s, 10, "Holi", false, listed));
    assertPrice("900", pricing.priceOf(listed, live));
    assertPrice("1000", pricing.priceOf(other, live));
  }

  @Test void bestOfSeveralOffersWins() {
    User s = user(1);
    Product p = product(1, "1000", s);
    PricingService.Price price = pricing.priceOf(p,
        live(offer(s, 10, "Small", true), offer(s, 30, "Big", true), offer(s, 20, "Mid", false, p)));
    assertPrice("700", price);
    assertEquals("Big", price.offerName());
  }

  @Test void anotherSellersOfferIsIgnored() {
    User a = user(1);
    User b = user(2);
    assertPrice("1000", pricing.priceOf(product(1, "1000", a), live(offer(b, 50, "Not mine", true))));
  }

  @Test void productWithoutSellerGetsNoDiscount() {
    assertPrice("1000", pricing.priceOf(product(1, "1000", null), live(offer(user(1), 50, "X", true))));
  }

  @Test void roundsToTwoDecimals() {
    User s = user(1);
    assertPrice("849.15", pricing.priceOf(product(1, "999", s), live(offer(s, 15, "Sale", true))));
  }
}

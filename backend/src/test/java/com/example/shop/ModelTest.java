package com.example.shop;

import static org.junit.jupiter.api.Assertions.*;

import com.example.shop.model.Order;
import com.example.shop.model.OrderItem;
import com.example.shop.model.OrderStatus;
import com.example.shop.model.Permission;
import com.example.shop.model.Role;
import com.example.shop.model.User;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class ModelTest {
  private static OrderItem item(OrderStatus status, int qty, String price) {
    OrderItem i = new OrderItem();
    i.setStatus(status);
    i.setQuantity(qty);
    i.setUnitPrice(price == null ? null : new BigDecimal(price));
    return i;
  }

  private static Order order(OrderItem... items) {
    Order o = new Order();
    for (OrderItem i : items) { i.setOrder(o); o.getItems().add(i); }
    return o;
  }

  // ---------------- Order.recomputeStatus ----------------
  @Test void orderIsPlacedWhileEveryLineIsPlaced() {
    Order o = order(item(OrderStatus.PLACED, 1, "10"), item(OrderStatus.PLACED, 1, "10"));
    o.recomputeStatus();
    assertEquals(OrderStatus.PLACED, o.getStatus());
  }

  @Test void orderIsShippedAsSoonAsOneLineMoves() {
    Order o = order(item(OrderStatus.SHIPPED, 1, "10"), item(OrderStatus.PLACED, 1, "10"));
    o.recomputeStatus();
    assertEquals(OrderStatus.SHIPPED, o.getStatus());
  }

  @Test void orderIsDeliveredWhenAllRemainingLinesAreDelivered() {
    Order o = order(item(OrderStatus.DELIVERED, 1, "10"), item(OrderStatus.CANCELLED, 1, "10"));
    o.recomputeStatus();
    assertEquals(OrderStatus.DELIVERED, o.getStatus());
  }

  @Test void deliveredPlusPlacedCountsAsShipped() {
    Order o = order(item(OrderStatus.DELIVERED, 1, "10"), item(OrderStatus.PLACED, 1, "10"));
    o.recomputeStatus();
    assertEquals(OrderStatus.SHIPPED, o.getStatus());
  }

  @Test void orderIsCancelledWhenEveryLineIsCancelled() {
    Order o = order(item(OrderStatus.CANCELLED, 1, "10"), item(OrderStatus.CANCELLED, 2, "10"));
    o.recomputeStatus();
    assertEquals(OrderStatus.CANCELLED, o.getStatus());
  }

  // ---------------- OrderItem ----------------
  @Test void lineWithoutStatusCountsAsPlaced() {
    assertEquals(OrderStatus.PLACED, item(null, 1, "10").effectiveStatus());
  }

  @Test void lineTotalIsPriceTimesQuantity() {
    assertEquals(0, new BigDecimal("300").compareTo(item(OrderStatus.PLACED, 3, "100").lineTotal()));
  }

  @Test void lineWithoutPriceTotalsZero() {
    assertEquals(0, BigDecimal.ZERO.compareTo(item(OrderStatus.PLACED, 3, null).lineTotal()));
  }

  @Test void legacyLinesHaveNoCommissionAndTheSellerKeepsTheTotal() {
    OrderItem legacy = item(OrderStatus.PLACED, 2, "50");
    assertEquals(0, BigDecimal.ZERO.compareTo(legacy.commissionOrZero()));
    assertEquals(0, new BigDecimal("100").compareTo(legacy.earningOrTotal()));
  }

  @Test void lineWithASnapshotReportsItsOwnCommissionAndEarning() {
    OrderItem i = item(OrderStatus.PLACED, 1, "100");
    i.setCommissionAmount(new BigDecimal("5.00"));
    i.setSellerEarning(new BigDecimal("95.00"));
    assertEquals(0, new BigDecimal("5.00").compareTo(i.commissionOrZero()));
    assertEquals(0, new BigDecimal("95.00").compareTo(i.earningOrTotal()));
  }

  // ---------------- User ----------------
  @Test void displayNamePrefersTheStoreName() {
    User u = new User();
    u.setEmail("alice@shop.com");
    u.setStoreName("Alice's Store");
    assertEquals("Alice's Store", u.displayName());
  }

  @Test void displayNameFallsBackToTheEmailName() {
    User u = new User();
    u.setEmail("alice@shop.com");
    assertEquals("alice", u.displayName());
    u.setStoreName("  ");
    assertEquals("alice", u.displayName());
  }

  // ---------------- Role / Permission ----------------
  @Test void rolesAreEqualWhenTheyShareAnId() {
    Role a = new Role(); a.setId(1L);
    Role b = new Role(); b.setId(1L);
    Role c = new Role(); c.setId(2L);
    assertEquals(a, b);
    assertEquals(a.hashCode(), b.hashCode());
    assertNotEquals(a, c);
  }

  @Test void permissionCatalogueContainsTheMarketplaceActions() {
    assertDoesNotThrow(() -> Permission.valueOf("COMMISSION_MANAGE"));
    assertDoesNotThrow(() -> Permission.valueOf("OFFERS_MANAGE"));
    assertDoesNotThrow(() -> Permission.valueOf("SELLER_ORDERS_UPDATE"));
    assertEquals(21, Permission.values().length);
  }
}

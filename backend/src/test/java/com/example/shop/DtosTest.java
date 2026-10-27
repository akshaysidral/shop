package com.example.shop;

import static org.junit.jupiter.api.Assertions.*;

import com.example.shop.model.Order;
import com.example.shop.model.OrderItem;
import com.example.shop.model.OrderStatus;
import com.example.shop.model.Permission;
import com.example.shop.model.Role;
import com.example.shop.model.User;
import com.example.shop.web.Dtos.OrderResponse;
import com.example.shop.web.Dtos.RoleResponse;
import com.example.shop.web.Dtos.SellerOrderLine;
import com.example.shop.web.Dtos.UserResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class DtosTest {
  private static Order orderFor(String buyerEmail, OrderItem... items) {
    User buyer = new User();
    buyer.setId(1L);
    buyer.setEmail(buyerEmail);
    Order o = new Order();
    o.setId(10L);
    o.setUser(buyer);
    o.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
    o.setTotal(new BigDecimal("100"));
    for (OrderItem i : items) { i.setOrder(o); o.getItems().add(i); }
    return o;
  }

  private static OrderItem item() {
    OrderItem i = new OrderItem();
    i.setId(5L);
    i.setProductId(1L);
    i.setProductName("Mouse");
    i.setUnitPrice(new BigDecimal("50"));
    i.setQuantity(2);
    i.setSellerId(7L);
    i.setSellerName("Acme");
    return i;
  }

  @Test void sellerLineMasksTheBuyerEmail() {
    OrderItem i = item();
    orderFor("alice@shop.com", i);
    assertEquals("a***@shop.com", SellerOrderLine.from(i).buyer());
  }

  @Test void sellerLineMasksVeryShortEmails() {
    OrderItem i = item();
    orderFor("a@shop.com", i);
    assertEquals("***@shop.com", SellerOrderLine.from(i).buyer());
  }

  @Test void sellerLineCarriesTheCommissionSnapshot() {
    OrderItem i = item();
    orderFor("alice@shop.com", i);
    i.setCommissionPercent(new BigDecimal("5"));
    i.setCommissionAmount(new BigDecimal("5.00"));
    i.setSellerEarning(new BigDecimal("95.00"));
    SellerOrderLine line = SellerOrderLine.from(i);
    assertEquals(0, new BigDecimal("5").compareTo(line.commissionPercent()));
    assertEquals(0, new BigDecimal("5.00").compareTo(line.commission()));
    assertEquals(0, new BigDecimal("95.00").compareTo(line.earning()));
  }

  @Test void sellerLineForALegacyItemShowsZeroCommissionAndFullEarning() {
    OrderItem i = item();
    orderFor("alice@shop.com", i);
    SellerOrderLine line = SellerOrderLine.from(i);
    assertEquals(0, BigDecimal.ZERO.compareTo(line.commission()));
    assertEquals(0, new BigDecimal("100").compareTo(line.earning()));
    assertEquals(OrderStatus.PLACED, line.status());
  }

  @Test void orderResponseListsItemsWithTheirOwnStatus() {
    OrderItem i = item();
    i.setStatus(OrderStatus.SHIPPED);
    OrderResponse r = OrderResponse.from(orderFor("alice@shop.com", i));
    assertEquals("alice@shop.com", r.userEmail());
    assertEquals(1, r.items().size());
    assertEquals(OrderStatus.SHIPPED, r.items().get(0).status());
    assertEquals("Acme", r.items().get(0).sellerName());
  }

  @Test void roleResponseSortsPermissions() {
    Role r = new Role();
    r.setId(1L);
    r.setName("X");
    r.getPermissions().addAll(List.of(Permission.PRODUCTS_UPDATE, Permission.ROLES_READ, Permission.PRODUCTS_CREATE));
    assertEquals(List.of(Permission.ROLES_READ, Permission.PRODUCTS_CREATE, Permission.PRODUCTS_UPDATE),
        RoleResponse.from(r).permissions());
  }

  @Test void userResponseCombinesRolesAndPermissionsAndShowsTheRate() {
    Role seller = new Role();
    seller.setId(1L);
    seller.setName("SELLER");
    seller.getPermissions().addAll(List.of(Permission.PRODUCTS_CREATE, Permission.OFFERS_MANAGE));
    Role extra = new Role();
    extra.setId(2L);
    extra.setName("MODERATOR");
    extra.getPermissions().addAll(List.of(Permission.PRODUCTS_CREATE, Permission.PRODUCTS_MANAGE_ALL));
    User u = new User();
    u.setId(3L);
    u.setEmail("s@shop.com");
    u.setStoreName("Store");
    u.setCommissionPercent(new BigDecimal("3.00"));
    u.getRoles().addAll(List.of(seller, extra));

    UserResponse r = UserResponse.from(u);

    assertEquals(List.of("MODERATOR", "SELLER"), r.roles());
    assertEquals(List.of("OFFERS_MANAGE", "PRODUCTS_CREATE", "PRODUCTS_MANAGE_ALL"), r.permissions());   // distinct, sorted
    assertEquals(0, new BigDecimal("3.00").compareTo(r.commissionPercent()));
    assertEquals("Store", r.storeName());
  }
}

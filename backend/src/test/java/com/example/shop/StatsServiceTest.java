package com.example.shop;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.shop.model.OrderItem;
import com.example.shop.model.OrderStatus;
import com.example.shop.repo.OrderItemRepository;
import com.example.shop.repo.OrderRepository;
import com.example.shop.repo.ProductRepository;
import com.example.shop.repo.UserRepository;
import com.example.shop.service.StatsService;
import com.example.shop.web.Dtos.StatsResponse;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StatsServiceTest {
  @Mock UserRepository users;
  @Mock ProductRepository products;
  @Mock OrderRepository orders;
  @Mock OrderItemRepository orderItems;
  @InjectMocks StatsService service;

  private static OrderItem line(OrderStatus status, int qty, String price, String commission) {
    OrderItem i = new OrderItem();
    i.setStatus(status);
    i.setQuantity(qty);
    i.setUnitPrice(new BigDecimal(price));
    if (commission != null) i.setCommissionAmount(new BigDecimal(commission));
    return i;
  }

  @Test void countsAndTotalsIgnoreCancelledLines() {
    when(users.count()).thenReturn(10L);
    when(users.countByRoles_Name("BUYER")).thenReturn(6L);
    when(users.countByRoles_Name("SELLER")).thenReturn(3L);
    when(products.count()).thenReturn(15L);
    when(orders.count()).thenReturn(4L);
    when(orderItems.findAll()).thenReturn(List.of(
        line(OrderStatus.DELIVERED, 1, "1000", "50.00"),
        line(OrderStatus.PLACED, 1, "500", "15.00"),
        line(OrderStatus.CANCELLED, 1, "200", "10.00")));

    StatsResponse s = service.get();

    assertEquals(10, s.users());
    assertEquals(6, s.buyers());
    assertEquals(3, s.sellers());
    assertEquals(15, s.products());
    assertEquals(4, s.orders());
    assertEquals(0, new BigDecimal("1500").compareTo(s.revenue()));
    assertEquals(0, new BigDecimal("65.00").compareTo(s.commission()));
  }

  @Test void emptyMarketplaceHasZeroSalesAndCommission() {
    when(orderItems.findAll()).thenReturn(List.of());
    StatsResponse s = service.get();
    assertEquals(0, BigDecimal.ZERO.compareTo(s.revenue()));
    assertEquals(0, BigDecimal.ZERO.compareTo(s.commission()));
  }
}

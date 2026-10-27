package com.example.shop.service;

import com.example.shop.model.OrderItem;
import com.example.shop.model.OrderStatus;
import com.example.shop.repo.OrderItemRepository;
import com.example.shop.repo.OrderRepository;
import com.example.shop.repo.ProductRepository;
import com.example.shop.repo.UserRepository;
import com.example.shop.web.Dtos.StatsResponse;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StatsService {
  private final UserRepository users;
  private final ProductRepository products;
  private final OrderRepository orders;
  private final OrderItemRepository orderItems;

  /**
   * Demo-scale: sums are computed in memory. Cancelled lines are excluded from
   * sales and commission.
   */
  @Transactional(readOnly = true)
  public StatsResponse get() {
    List<OrderItem> live = orderItems.findAll().stream()
        .filter(i -> i.effectiveStatus() != OrderStatus.CANCELLED).toList();
    BigDecimal revenue = live.stream().map(OrderItem::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal commission = live.stream().map(OrderItem::commissionOrZero).reduce(BigDecimal.ZERO, BigDecimal::add);
    return new StatsResponse(users.count(), users.countByRoles_Name("BUYER"), users.countByRoles_Name("SELLER"),
        products.count(), orders.count(), revenue, commission);
  }
}

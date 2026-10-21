package com.example.shop.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Entity @Table(name = "orders") @Getter @Setter
public class Order {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @ManyToOne(optional = false, fetch = FetchType.LAZY) private User user;
  private Instant createdAt;
  private BigDecimal total;

  /** Summary of the lines, kept in sync by recomputeStatus(). */
  @Enumerated(EnumType.STRING)
  @Column(length = 20)
  private OrderStatus status = OrderStatus.PLACED;

  @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<OrderItem> items = new ArrayList<>();

  /** All lines cancelled -> CANCELLED; all remaining delivered -> DELIVERED; any shipped -> SHIPPED; else PLACED. */
  public void recomputeStatus() {
    List<OrderItem> live = items.stream().filter(i -> i.effectiveStatus() != OrderStatus.CANCELLED).toList();
    if (live.isEmpty()) status = OrderStatus.CANCELLED;
    else if (live.stream().allMatch(i -> i.effectiveStatus() == OrderStatus.DELIVERED)) status = OrderStatus.DELIVERED;
    else if (live.stream().anyMatch(i -> i.effectiveStatus() != OrderStatus.PLACED)) status = OrderStatus.SHIPPED;
    else status = OrderStatus.PLACED;
  }
}

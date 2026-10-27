package com.example.shop.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class OrderItem {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  private Order order;
  private Long productId;
  private String productName;
  /** Price actually charged (after any offer). */
  private BigDecimal unitPrice;
  private int quantity;

  /**
   * Seller who fulfils this line (denormalised so history survives product/seller
   * changes).
   */
  private Long sellerId;
  @Column(length = 100)
  private String sellerName;

  /**
   * Commission snapshot taken at checkout, so later rate changes never rewrite
   * history.
   */
  @Column(precision = 5, scale = 2)
  private BigDecimal commissionPercent;
  private BigDecimal commissionAmount;
  private BigDecimal sellerEarning;

  /** Each seller ships their own lines, so status lives on the line. */
  @Enumerated(EnumType.STRING)
  @Column(length = 20)
  private OrderStatus status = OrderStatus.PLACED;

  public OrderStatus effectiveStatus() {
    return status == null ? OrderStatus.PLACED : status;
  }

  public BigDecimal lineTotal() {
    return unitPrice == null ? BigDecimal.ZERO : unitPrice.multiply(BigDecimal.valueOf(quantity));
  }

  /**
   * Lines created before commissions existed have no snapshot: treat the
   * commission as zero.
   */
  public BigDecimal commissionOrZero() {
    return commissionAmount == null ? BigDecimal.ZERO : commissionAmount;
  }

  public BigDecimal earningOrTotal() {
    return sellerEarning == null ? lineTotal() : sellerEarning;
  }
}

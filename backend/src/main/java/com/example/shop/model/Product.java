package com.example.shop.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

@Entity @Getter @Setter
public class Product {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(nullable = false) private String name;
  @Column(length = 2000) private String description;
  /** Base (list) price. The price a buyer pays also depends on live offers, see PricingService. */
  private BigDecimal price;
  private int stock;

  @ManyToOne(fetch = FetchType.LAZY) private User seller;
  @ManyToOne(fetch = FetchType.LAZY) private Category category;
  @Column(length = 500) private String imageUrl;
}

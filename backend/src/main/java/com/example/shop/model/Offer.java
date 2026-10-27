package com.example.shop.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;

/**
 * A seller-controlled sale, for example "Diwali Dhamaka: 20% off" for a date
 * range.
 */
@Entity
@Table(name = "app_offer")
@Getter
@Setter
public class Offer {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  private User seller;

  @Column(nullable = false, length = 100)
  private String name;
  private int discountPercent;
  private Instant startsAt;
  private Instant endsAt;
  private boolean active = true;
  private boolean appliesToAll;

  @ManyToMany
  @JoinTable(name = "app_offer_products", joinColumns = @JoinColumn(name = "offer_id"), inverseJoinColumns = @JoinColumn(name = "product_id"))
  private Set<Product> products = new HashSet<>();
}

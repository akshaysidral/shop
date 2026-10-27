package com.example.shop.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "app_user")
@Getter
@Setter
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(unique = true, nullable = false)
  private String email;
  @Column(nullable = false)
  private String passwordHash;

  /** Shown to buyers as "Sold by ..." (sellers only). */
  @Column(length = 100)
  private String storeName;

  /**
   * Platform commission charged on this seller's sales, in percent (for example 3
   * or 5). Null = marketplace default.
   */
  @Column(precision = 5, scale = 2)
  private BigDecimal commissionPercent;

  @ManyToMany(fetch = FetchType.EAGER)
  @JoinTable(name = "app_user_roles", joinColumns = @JoinColumn(name = "user_id"), inverseJoinColumns = @JoinColumn(name = "role_id"))
  private Set<Role> roles = new HashSet<>();

  public String displayName() {
    return storeName != null && !storeName.isBlank() ? storeName : email.split("@")[0];
  }
}

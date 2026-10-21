package com.example.shop.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity @Table(name = "app_category") @Getter @Setter
public class Category {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(unique = true, nullable = false, length = 60) private String name;
  /** Bootstrap Icons class, e.g. "bi-phone". */
  @Column(length = 40) private String icon;
}

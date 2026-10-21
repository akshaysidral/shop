package com.example.shop.model;

import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@Entity @Table(name = "app_role") @Getter @Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Role {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @Column(unique = true, nullable = false, length = 50)
  private String name;

  private String description;

  /** Built-in roles (ADMIN, USER) cannot be deleted or renamed. */
  @Column(nullable = false)
  private boolean builtIn;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "app_role_permissions", joinColumns = @JoinColumn(name = "role_id"))
  @Column(name = "permission", nullable = false)
  @Enumerated(EnumType.STRING)
  private Set<Permission> permissions = new HashSet<>();
}

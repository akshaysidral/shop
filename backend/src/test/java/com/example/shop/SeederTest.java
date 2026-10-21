package com.example.shop;

import static org.junit.jupiter.api.Assertions.*;

import com.example.shop.model.Category;
import com.example.shop.model.Permission;
import com.example.shop.model.Product;
import com.example.shop.model.Role;
import com.example.shop.model.User;
import com.example.shop.repo.CategoryRepository;
import com.example.shop.repo.OfferRepository;
import com.example.shop.repo.ProductRepository;
import com.example.shop.repo.RoleRepository;
import com.example.shop.repo.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/** What DataSeeder leaves in an empty database. */
@SpringBootTest @ActiveProfiles("test") @Transactional
class SeederTest {
  @Autowired RoleRepository roles;
  @Autowired UserRepository users;
  @Autowired CategoryRepository categories;
  @Autowired ProductRepository products;
  @Autowired OfferRepository offers;

  @Test void builtInRolesExistWithTheRightPermissions() {
    Role admin = roles.findByName("ADMIN").orElseThrow();
    assertTrue(admin.isBuiltIn());
    assertEquals(Permission.values().length, admin.getPermissions().size());

    Role seller = roles.findByName("SELLER").orElseThrow();
    assertTrue(seller.getPermissions().containsAll(Set.of(Permission.PRODUCTS_CREATE, Permission.OFFERS_MANAGE,
        Permission.SELLER_ORDERS_READ, Permission.SELLER_ORDERS_UPDATE)));
    assertFalse(seller.getPermissions().contains(Permission.COMMISSION_MANAGE));     // sellers cannot set their own rate
    assertFalse(seller.getPermissions().contains(Permission.PRODUCTS_MANAGE_ALL));

    assertTrue(roles.findByName("BUYER").orElseThrow().getPermissions().isEmpty());
  }

  @Test void theFirstAdminHoldsTheAdminRole() {
    User root = users.findByEmail("root@test.local").orElseThrow();
    assertTrue(root.getRoles().stream().anyMatch(r -> r.getName().equals("ADMIN")));
  }

  @Test void twoDemoSellersPayDifferentCommission() {
    User standard = users.findByEmail("seller@test.local").orElseThrow();
    User preferred = users.findByEmail("seller2@test.local").orElseThrow();
    assertEquals(0, new BigDecimal("5").compareTo(standard.getCommissionPercent()));
    assertEquals(0, new BigDecimal("3").compareTo(preferred.getCommissionPercent()));
    assertEquals("Test Mart", standard.getStoreName());
    assertEquals("Preferred Test", preferred.getStoreName());
  }

  @Test void sixCategoriesAreSeededWithIconKeys() {
    List<Category> all = categories.findAll();
    assertTrue(all.stream().map(Category::getName).toList().containsAll(List.of(
        "Electronics", "Fashion", "Home & Kitchen", "Books & Stationery", "Beauty & Care", "Sports & Fitness")));
    assertEquals("phone", categories.findByName("Electronics").orElseThrow().getIcon());
  }

  @Test void sampleProductsBelongToTheirSellerAndCategory() {
    User standard = users.findByEmail("seller@test.local").orElseThrow();
    User preferred = users.findByEmail("seller2@test.local").orElseThrow();
    List<Product> all = products.findAll();

    Product mouse = all.stream().filter(p -> p.getName().equals("Wireless Mouse")).findFirst().orElseThrow();
    assertEquals(standard.getId(), mouse.getSeller().getId());
    assertEquals("Electronics", mouse.getCategory().getName());

    Product notebook = all.stream().filter(p -> p.getName().equals("Hardcover Notebook")).findFirst().orElseThrow();
    assertEquals(preferred.getId(), notebook.getSeller().getId());
    assertEquals("Books & Stationery", notebook.getCategory().getName());
  }

  @Test void aDemoSaleIsRunning() {
    assertTrue(offers.count() > 0);
  }
}

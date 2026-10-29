package com.example.shop;

import com.example.shop.model.Category;
import com.example.shop.model.CategorySlug;
import com.example.shop.model.Offer;
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
import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates roles, categories, the first admin, two demo sellers (5% and 3%
 * commission), sample products and a sale.
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {
  private final ProductRepository products;
  private final RoleRepository roles;
  private final UserRepository users;
  private final CategoryRepository categories;
  private final OfferRepository offers;
  private final PasswordEncoder encoder;

  @Value("${app.bootstrap-admin.email:}")
  private String adminEmail;
  @Value("${app.bootstrap-admin.password:}")
  private String adminPassword;

  @Value("${app.bootstrap-seller.email:}")
  private String sellerEmail;
  @Value("${app.bootstrap-seller.password:}")
  private String sellerPassword;
  @Value("${app.bootstrap-seller.store-name:Bazario Mart}")
  private String sellerStore;
  @Value("${app.bootstrap-seller.commission-percent:5}")
  private BigDecimal sellerCommission;

  @Value("${app.bootstrap-seller-2.email:}")
  private String seller2Email;
  @Value("${app.bootstrap-seller-2.password:}")
  private String seller2Password;
  @Value("${app.bootstrap-seller-2.store-name:Preferred Picks}")
  private String seller2Store;
  @Value("${app.bootstrap-seller-2.commission-percent:3}")
  private BigDecimal seller2Commission;

  @Override
  @Transactional
  public void run(String... args) {
    Set<Permission> every = EnumSet.allOf(Permission.class);

    Role admin = roles.findByName("ADMIN").orElseGet(() -> newRole("ADMIN", "Full access", every));
    if (!admin.getPermissions().containsAll(every)) { // pick up permissions added in new releases
      admin.getPermissions().addAll(every);
      roles.save(admin);
    }
    Role seller = roles.findByName("SELLER").orElseGet(() -> newRole("SELLER",
        "Sells products, runs offers and ships orders",
        EnumSet.of(Permission.PRODUCTS_CREATE, Permission.PRODUCTS_UPDATE, Permission.PRODUCTS_DELETE,
            Permission.OFFERS_MANAGE, Permission.SELLER_ORDERS_READ, Permission.SELLER_ORDERS_UPDATE)));
    // the old single "USER" role becomes BUYER (keeps its users)
    roles.findByName("BUYER").orElseGet(() -> roles.findByName("USER")
        .map(legacy -> {
          legacy.setName("BUYER");
          legacy.setDescription("Browses and buys products");
          return roles.save(legacy);
        })
        .orElseGet(() -> newRole("BUYER", "Browses and buys products", EnumSet.noneOf(Permission.class))));

    bootstrapAdmin(admin);
    Map<String, Category> cats = seedCategories();
    User mart = bootstrapSeller(seller, sellerEmail, sellerPassword, sellerStore, sellerCommission);
    User picks = bootstrapSeller(seller, seller2Email, seller2Password, seller2Store, seller2Commission);
    seedProducts(mart, picks != null ? picks : mart, cats);
    adoptLegacyProducts(mart, cats.get("Electronics"));
    seedOffer(mart);
  }

  private Role newRole(String name, String description, Set<Permission> perms) {
    Role r = new Role();
    r.setName(name);
    r.setDescription(description);
    r.setBuiltIn(true);
    r.getPermissions().addAll(perms);
    return roles.save(r);
  }

  /**
   * Creates the first admin (or promotes an existing user with that email). Blank
   * email = do nothing.
   */
  private void bootstrapAdmin(Role admin) {
    if (adminEmail == null || adminEmail.isBlank())
      return;
    User u = users.findByEmail(adminEmail).orElse(null);
    if (u == null) {
      if (adminPassword == null || adminPassword.isBlank())
        return;
      u = new User();
      u.setEmail(adminEmail);
      u.setPasswordHash(encoder.encode(adminPassword));
    }
    u.getRoles().add(admin);
    users.save(u);
  }

  private User bootstrapSeller(Role sellerRole, String email, String password, String store, BigDecimal commission) {
    if (email == null || email.isBlank())
      return null;
    User u = users.findByEmail(email).orElse(null);
    if (u == null) {
      if (password == null || password.isBlank())
        return null;
      u = new User();
      u.setEmail(email);
      u.setPasswordHash(encoder.encode(password));
    }
    if (u.getStoreName() == null || u.getStoreName().isBlank())
      u.setStoreName(store);
    if (u.getCommissionPercent() == null)
      u.setCommissionPercent(commission);
    u.getRoles().add(sellerRole);
    return users.save(u);
  }

  private Map<String, Category> seedCategories() {
    if (categories.count() == 0) {
      cat("Electronics", "phone");
      cat("Fashion", "fashion");
      cat("Home & Kitchen", "home");
      cat("Books & Stationery", "books");
      cat("Beauty & Care", "beauty");
      cat("Sports & Fitness", "sports");
    }
    backfillCategorySlugs();
    return categories.findAll().stream().collect(Collectors.toMap(Category::getName, c -> c));
  }

  private void backfillCategorySlugs() {
    List<Category> existing = categories.findAll(Sort.by("id"));
    Set<String> used = new HashSet<>();
    existing.stream().map(Category::getSlug).filter(slug -> slug != null && !slug.isBlank()).forEach(used::add);
    for (Category category : existing) {
      if (category.getSlug() != null && !category.getSlug().isBlank())
        continue;
      String base = CategorySlug.fromName(category.getName());
      String slug = base;
      int suffix = 2;
      while (used.contains(slug))
        slug = base + "-" + suffix++;
      category.setSlug(slug);
      used.add(slug);
    }
    categories.saveAll(existing);
  }

  private void cat(String name, String icon) {
    Category c = new Category();
    c.setName(name);
    c.setSlug(CategorySlug.fromName(name));
    c.setIcon(icon);
    categories.save(c);
  }

  private void seedProducts(User mart, User picks, Map<String, Category> cats) {
    if (products.count() > 0)
      return;
    add(mart, cats.get("Electronics"), "Wireless Mouse", "2.4GHz ergonomic mouse", "799", 50);
    add(mart, cats.get("Electronics"), "Mechanical Keyboard", "Blue switches, full size", "3499", 25);
    add(mart, cats.get("Electronics"), "USB-C Hub", "7-in-1 hub with HDMI", "1999", 40);
    add(mart, cats.get("Electronics"), "Laptop Stand", "Aluminium, adjustable", "1299", 30);
    add(mart, cats.get("Electronics"), "Webcam 1080p", "Autofocus with mic", "2499", 15);
    add(mart, cats.get("Electronics"), "Noise-Cancelling Headphones", "30h battery", "5999", 10);
    add(mart, cats.get("Fashion"), "Cotton T-Shirt", "Soft, breathable, regular fit", "499", 100);
    add(mart, cats.get("Fashion"), "Denim Jacket", "Classic blue, button front", "2499", 20);
    add(mart, cats.get("Home & Kitchen"), "Non-stick Frying Pan", "26 cm, induction ready", "899", 60);
    add(mart, cats.get("Home & Kitchen"), "Ceramic Mug Set", "Set of 4, 300 ml", "649", 80);
    add(picks, cats.get("Books & Stationery"), "Hardcover Notebook", "A5, 200 ruled pages", "299", 200);
    add(picks, cats.get("Books & Stationery"), "Gel Pen Pack", "Pack of 10, smooth ink", "149", 300);
    add(picks, cats.get("Beauty & Care"), "Herbal Shampoo", "Sulphate free, 250 ml", "349", 70);
    add(picks, cats.get("Sports & Fitness"), "Yoga Mat", "6 mm, anti-slip", "799", 45);
    add(picks, cats.get("Sports & Fitness"), "Football", "Size 5, stitched", "599", 35);
  }

  private void add(User seller, Category category, String name, String desc, String price, int stock) {
    Product p = new Product();
    p.setName(name);
    p.setDescription(desc);
    p.setPrice(new BigDecimal(price));
    p.setStock(stock);
    p.setSeller(seller);
    p.setCategory(category);
    products.save(p);
  }

  /**
   * Products created before sellers/categories existed get the first demo seller
   * and the Electronics category.
   */
  private void adoptLegacyProducts(User seller, Category fallback) {
    if (seller == null)
      return;
    for (Product p : products.findAll()) {
      boolean changed = false;
      if (p.getSeller() == null) {
        p.setSeller(seller);
        changed = true;
      }
      if (p.getCategory() == null && fallback != null) {
        p.setCategory(fallback);
        changed = true;
      }
      if (changed)
        products.save(p);
    }
  }

  private void seedOffer(User seller) {
    if (seller == null || offers.count() > 0)
      return;
    Offer o = new Offer();
    o.setSeller(seller);
    o.setName("Festive Bonanza");
    o.setDiscountPercent(15);
    o.setStartsAt(Instant.now().minus(Duration.ofDays(1)));
    o.setEndsAt(Instant.now().plus(Duration.ofDays(30)));
    o.setActive(true);
    o.setAppliesToAll(true);
    offers.save(o);
  }
}

package com.example.shop.web;

import com.example.shop.model.AccountType;
import com.example.shop.model.Order;
import com.example.shop.model.OrderItem;
import com.example.shop.model.OrderStatus;
import com.example.shop.model.Permission;
import com.example.shop.model.Role;
import com.example.shop.model.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;

public final class Dtos {
  private Dtos() {
  }

  // ---------------- auth ----------------
  public record AuthRequest(@Email @NotBlank String email, @Size(min = 6) String password) {
  }

  public record RegisterRequest(@Email @NotBlank String email,
      @NotBlank @Size(min = 6) String password,
      AccountType accountType, // BUYER (default) or SELLER
      @Size(max = 100) String storeName) {
  }

  public record AuthResponse(String token) {
  }

  // ---------------- catalogue ----------------
  public record CategoryRequest(@NotBlank @Size(max = 60) String name, @Size(max = 40) String icon) {
  }

  public record CategoryResponse(Long id, String name, String slug, String icon, long productCount) {
  }

  public record ProductRequest(@NotBlank @Size(max = 200) String name,
      @Size(max = 2000) String description,
      @NotNull @Positive BigDecimal price,
      @PositiveOrZero int stock,
      Long categoryId,
      @Size(max = 500) String imageUrl) {
  }

  /**
   * price = list price; finalPrice = what the buyer pays right now (after the
   * best live offer).
   */
  public record ProductResponse(Long id, String name, String description, BigDecimal price,
      BigDecimal finalPrice, int discountPercent, String offerName,
      int stock, String imageUrl, Long categoryId, String categoryName, String categorySlug,
      Long sellerId, String sellerName) {
  }

  // ---------------- offers ----------------
  public record OfferRequest(@NotBlank @Size(max = 100) String name,
      @Min(1) @Max(90) int discountPercent,
      @NotNull Instant startsAt,
      @NotNull Instant endsAt,
      boolean active,
      boolean appliesToAll,
      Set<Long> productIds) {
  }

  public record OfferResponse(Long id, String name, int discountPercent, Instant startsAt, Instant endsAt,
      boolean active, boolean appliesToAll, List<Long> productIds,
      Long sellerId, String sellerName, String status) {
  }

  public record ActiveOfferResponse(String name, int discountPercent, Instant endsAt,
      String sellerName, boolean appliesToAll) {
  }

  // ---------------- orders ----------------
  public record Line(@NotNull Long productId, @Min(1) int quantity) {
  }

  public record CheckoutRequest(@NotEmpty List<@Valid Line> items) {
  }

  public record StatusRequest(@NotNull OrderStatus status) {
  }

  public record ItemResponse(Long id, Long productId, String name, BigDecimal unitPrice, int quantity,
      String sellerName, OrderStatus status) {
  }

  public record OrderResponse(Long id, String userEmail, OrderStatus status, Instant createdAt,
      BigDecimal total, List<ItemResponse> items) {
    public static OrderResponse from(Order o) {
      return new OrderResponse(o.getId(), o.getUser().getEmail(), o.getStatus(), o.getCreatedAt(), o.getTotal(),
          o.getItems().stream()
              .map(i -> new ItemResponse(i.getId(), i.getProductId(), i.getProductName(), i.getUnitPrice(),
                  i.getQuantity(), i.getSellerName(), i.effectiveStatus()))
              .toList());
    }
  }

  /** One line a seller has to fulfil. The buyer's email is masked. */
  public record SellerOrderLine(Long orderId, Long itemId, Instant createdAt, String buyer, Long productId,
      String productName, BigDecimal unitPrice, int quantity, OrderStatus status,
      BigDecimal commissionPercent, BigDecimal commission, BigDecimal earning) {
    public static SellerOrderLine from(OrderItem i) {
      Order o = i.getOrder();
      return new SellerOrderLine(o.getId(), i.getId(), o.getCreatedAt(), mask(o.getUser().getEmail()),
          i.getProductId(), i.getProductName(), i.getUnitPrice(), i.getQuantity(), i.effectiveStatus(),
          i.getCommissionPercent() == null ? BigDecimal.ZERO : i.getCommissionPercent(),
          i.commissionOrZero(), i.earningOrTotal());
    }

    static String mask(String email) {
      int at = email.indexOf('@');
      if (at <= 1)
        return "***" + (at < 0 ? "" : email.substring(at));
      return email.charAt(0) + "***" + email.substring(at);
    }
  }

  // ---------------- roles / users / stats ----------------
  public record RoleRequest(
      @NotBlank @Size(max = 50) @Pattern(regexp = "[A-Z][A-Z0-9_]*", message = "must be UPPER_SNAKE_CASE, e.g. PRODUCT_MANAGER") String name,
      @Size(max = 255) String description,
      @NotNull Set<Permission> permissions) {
  }

  public record RoleResponse(Long id, String name, String description, boolean builtIn, List<Permission> permissions) {
    public static RoleResponse from(Role r) {
      return new RoleResponse(r.getId(), r.getName(), r.getDescription(), r.isBuiltIn(),
          r.getPermissions().stream().sorted().toList());
    }
  }

  public record AssignRolesRequest(@NotNull Set<Long> roleIds) {
  }

  public record UserResponse(Long id, String email, String storeName, BigDecimal commissionPercent,
      List<String> roles, List<String> permissions) {
    public static UserResponse from(User u) {
      return new UserResponse(u.getId(), u.getEmail(), u.getStoreName(), u.getCommissionPercent(),
          u.getRoles().stream().map(Role::getName).sorted().toList(),
          u.getRoles().stream().flatMap(r -> r.getPermissions().stream())
              .map(Permission::name).distinct().sorted().toList());
    }
  }

  public record StatsResponse(long users, long buyers, long sellers, long products, long orders,
      BigDecimal revenue, BigDecimal commission) {
  }

  // ---------------- commission ----------------
  public record CommissionRequest(@NotNull @DecimalMin("0") @DecimalMax("30") BigDecimal percent) {
  }

  /**
   * What a seller has earned: gross sales, the platform's commission and the net
   * amount owed to the seller.
   */
  public record SellerEarningsResponse(BigDecimal commissionPercent, BigDecimal grossSales, BigDecimal commission,
      BigDecimal netEarnings, BigDecimal payable, BigDecimal pending,
      long unitsSold) {
  }

  public record SellerSummaryResponse(Long id, String email, String storeName, BigDecimal commissionPercent,
      long unitsSold, BigDecimal grossSales, BigDecimal commission) {
  }
}

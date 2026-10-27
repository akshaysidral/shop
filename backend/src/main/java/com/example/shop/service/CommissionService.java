package com.example.shop.service;

import com.example.shop.model.OrderItem;
import com.example.shop.model.OrderStatus;
import com.example.shop.model.User;
import com.example.shop.repo.OrderItemRepository;
import com.example.shop.repo.UserRepository;
import com.example.shop.security.CurrentUser;
import com.example.shop.web.Dtos.SellerEarningsResponse;
import com.example.shop.web.Dtos.SellerSummaryResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Each seller pays the marketplace a percentage of their sales (for example 5%
 * standard, 3% preferred).
 */
@Service
public class CommissionService {
  public static final BigDecimal MAX_PERCENT = new BigDecimal("30");

  private final UserRepository users;
  private final OrderItemRepository items;
  private final CurrentUser current;
  private final BigDecimal defaultPercent;

  public CommissionService(UserRepository users, OrderItemRepository items, CurrentUser current,
      @Value("${app.commission.default-percent:5}") BigDecimal defaultPercent) {
    this.users = users;
    this.items = items;
    this.current = current;
    this.defaultPercent = defaultPercent;
  }

  public BigDecimal defaultPercent() {
    return defaultPercent;
  }

  /**
   * The seller's own rate, or the marketplace default. Products without a seller
   * carry no commission.
   */
  public BigDecimal rateFor(User seller) {
    if (seller == null)
      return BigDecimal.ZERO;
    return seller.getCommissionPercent() != null ? seller.getCommissionPercent() : defaultPercent;
  }

  @Transactional(readOnly = true)
  public SellerEarningsResponse myEarnings() {
    User me = current.require();
    return earnings(rateFor(me), items.findForSeller(me.getId()));
  }

  @Transactional(readOnly = true)
  public List<SellerSummaryResponse> sellers() {
    return users.findAll(Sort.by("email")).stream().filter(CommissionService::isSeller).map(this::summary).toList();
  }

  /**
   * Applies to FUTURE orders only: existing order lines keep the rate they were
   * sold at.
   */
  @Transactional
  public SellerSummaryResponse setRate(Long userId, BigDecimal percent) {
    if (percent == null || percent.signum() < 0 || percent.compareTo(MAX_PERCENT) > 0)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Commission must be between 0 and 30 percent");
    User u = users.findById(userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    if (!isSeller(u))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "That user is not a seller");
    u.setCommissionPercent(percent.setScale(2, RoundingMode.HALF_UP));
    return summary(users.save(u));
  }

  /**
   * Cancelled lines are ignored. Delivered lines are payable now; the rest are
   * still pending.
   */
  public static SellerEarningsResponse earnings(BigDecimal percent, List<OrderItem> lines) {
    BigDecimal gross = BigDecimal.ZERO;
    BigDecimal commission = BigDecimal.ZERO;
    BigDecimal payable = BigDecimal.ZERO;
    BigDecimal pending = BigDecimal.ZERO;
    long units = 0;
    for (OrderItem i : lines) {
      OrderStatus status = i.effectiveStatus();
      if (status == OrderStatus.CANCELLED)
        continue;
      gross = gross.add(i.lineTotal());
      commission = commission.add(i.commissionOrZero());
      units += i.getQuantity();
      if (status == OrderStatus.DELIVERED)
        payable = payable.add(i.earningOrTotal());
      else
        pending = pending.add(i.earningOrTotal());
    }
    return new SellerEarningsResponse(percent, gross, commission, payable.add(pending), payable, pending, units);
  }

  private SellerSummaryResponse summary(User u) {
    SellerEarningsResponse e = earnings(rateFor(u), items.findForSeller(u.getId()));
    return new SellerSummaryResponse(u.getId(), u.getEmail(), u.getStoreName(), rateFor(u),
        e.unitsSold(), e.grossSales(), e.commission());
  }

  private static boolean isSeller(User u) {
    return u.getRoles().stream().anyMatch(r -> "SELLER".equals(r.getName()));
  }
}

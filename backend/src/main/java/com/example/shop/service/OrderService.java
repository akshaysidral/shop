package com.example.shop.service;

import com.example.shop.model.Offer;
import com.example.shop.model.Order;
import com.example.shop.model.OrderItem;
import com.example.shop.model.OrderStatus;
import com.example.shop.model.Permission;
import com.example.shop.model.Product;
import com.example.shop.model.User;
import com.example.shop.repo.OrderItemRepository;
import com.example.shop.repo.OrderRepository;
import com.example.shop.repo.ProductRepository;
import com.example.shop.repo.UserRepository;
import com.example.shop.security.AccessGuard;
import com.example.shop.security.CurrentUser;
import com.example.shop.web.Dtos.CheckoutRequest;
import com.example.shop.web.Dtos.Line;
import com.example.shop.web.Dtos.OrderResponse;
import com.example.shop.web.Dtos.SellerOrderLine;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class OrderService {
  private final ProductRepository products;
  private final OrderRepository orders;
  private final UserRepository users;
  private final OrderItemRepository orderItems;
  private final PricingService pricing;
  private final CurrentUser current;
  private final AccessGuard guard;
  private final CommissionService commissions;

  // ---------------- buyer ----------------
  @Transactional
  public OrderResponse checkout(String email, CheckoutRequest req) {
    User user = users.findByEmail(email)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    Map<Long, List<Offer>> live = pricing.liveOffersBySeller();
    Order order = new Order();
    order.setUser(user);
    order.setCreatedAt(Instant.now());
    BigDecimal total = BigDecimal.ZERO;

    for (Line line : req.items()) {
      Product p = products.findByIdForUpdate(line.productId())
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product " + line.productId()));
      User seller = p.getSeller();
      if (seller != null && seller.getId().equals(user.getId()))
        throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot buy your own product");
      if (p.getStock() < line.quantity())
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient stock for " + p.getName());

      PricingService.Price price = pricing.priceOf(p, live); // offer-adjusted price at this moment
      p.setStock(p.getStock() - line.quantity());

      OrderItem oi = new OrderItem();
      oi.setOrder(order);
      oi.setProductId(p.getId());
      oi.setProductName(p.getName());
      oi.setUnitPrice(price.finalPrice());
      oi.setQuantity(line.quantity());
      oi.setSellerId(seller == null ? null : seller.getId());
      oi.setSellerName(seller == null ? "Marketplace" : seller.displayName());

      BigDecimal lineTotal = price.finalPrice().multiply(BigDecimal.valueOf(line.quantity()));
      BigDecimal percent = commissions.rateFor(seller); // snapshot: later rate changes do not rewrite history
      Commission.Split split = Commission.split(lineTotal, percent);
      oi.setCommissionPercent(percent);
      oi.setCommissionAmount(split.commission());
      oi.setSellerEarning(split.earning());

      order.getItems().add(oi);
      total = total.add(lineTotal);
    }
    order.setTotal(total);
    return OrderResponse.from(orders.save(order));
  }

  @Transactional(readOnly = true)
  public List<OrderResponse> mine(String email) {
    return orders.findByUserEmailOrderByCreatedAtDesc(email).stream().map(OrderResponse::from).toList();
  }

  // ---------------- seller ----------------
  @Transactional(readOnly = true)
  public List<SellerOrderLine> sellerLines() {
    return orderItems.findForSeller(current.require().getId()).stream().map(SellerOrderLine::from).toList();
  }

  /**
   * A seller (or an admin with ORDERS_UPDATE) moves one line along: PLACED,
   * SHIPPED, DELIVERED or CANCELLED.
   */
  @Transactional
  public OrderResponse updateItemStatus(Long orderId, Long itemId, OrderStatus next) {
    Order order = find(orderId);
    OrderItem item = order.getItems().stream()
        .filter(i -> itemId.equals(i.getId())).findFirst()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order line not found"));
    User me = current.require();
    boolean mine = item.getSellerId() != null && item.getSellerId().equals(me.getId());
    if (!mine && !guard.has(Permission.ORDERS_UPDATE.name()))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only update lines you sell");
    applyItemStatus(item, next);
    order.recomputeStatus();
    return OrderResponse.from(orders.save(order));
  }

  // ---------------- admin ----------------
  @Transactional(readOnly = true)
  public List<OrderResponse> all() {
    return orders.findAllByOrderByCreatedAtDesc().stream().map(OrderResponse::from).toList();
  }

  /** Applies the status to every line that is not already cancelled. */
  @Transactional
  public OrderResponse updateStatus(Long id, OrderStatus next) {
    Order order = find(id);
    if (order.getStatus() == OrderStatus.CANCELLED && next != OrderStatus.CANCELLED)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Cancelled orders cannot be reopened");
    for (OrderItem item : order.getItems()) {
      if (item.effectiveStatus() != OrderStatus.CANCELLED)
        applyItemStatus(item, next);
    }
    order.recomputeStatus();
    return OrderResponse.from(orders.save(order));
  }

  @Transactional
  public void delete(Long id) {
    Order order = find(id);
    for (OrderItem item : order.getItems()) {
      if (item.effectiveStatus() != OrderStatus.CANCELLED)
        restoreStock(item);
    }
    orders.delete(order);
  }

  // ---------------- helpers ----------------
  private void applyItemStatus(OrderItem item, OrderStatus next) {
    OrderStatus cur = item.effectiveStatus();
    if (cur == OrderStatus.CANCELLED && next != OrderStatus.CANCELLED)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Cancelled lines cannot be reopened");
    if (cur == next)
      return;
    if (next == OrderStatus.CANCELLED)
      restoreStock(item);
    item.setStatus(next);
  }

  private Order find(Long id) {
    return orders.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
  }

  private void restoreStock(OrderItem item) {
    products.findByIdForUpdate(item.getProductId())
        .ifPresent(p -> p.setStock(p.getStock() + item.getQuantity()));
  }
}

package com.example.shop.service;

import com.example.shop.model.Offer;
import com.example.shop.model.Product;
import com.example.shop.repo.OfferRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Works out what a buyer pays: the list price minus the best live offer of the
 * product's seller.
 */
@Service
@RequiredArgsConstructor
public class PricingService {
  private final OfferRepository offers;

  public record Price(BigDecimal finalPrice, int discountPercent, String offerName) {
  }

  /**
   * Load all live offers once (grouped by seller id) and reuse the map for a
   * whole list of products.
   */
  @Transactional(readOnly = true)
  public Map<Long, List<Offer>> liveOffersBySeller() {
    return offers.findActive(Instant.now()).stream()
        .collect(Collectors.groupingBy(o -> o.getSeller().getId()));
  }

  /** Must run inside a transaction when offers are lazy-loaded entities. */
  public Price priceOf(Product p, Map<Long, List<Offer>> live) {
    int best = 0;
    String name = null;
    if (p.getSeller() != null) {
      for (Offer o : live.getOrDefault(p.getSeller().getId(), List.of())) {
        boolean applies = o.isAppliesToAll()
            || o.getProducts().stream().anyMatch(x -> x.getId().equals(p.getId()));
        if (applies && o.getDiscountPercent() > best) {
          best = o.getDiscountPercent();
          name = o.getName();
        }
      }
    }
    BigDecimal fin = p.getPrice().multiply(BigDecimal.valueOf(100L - best))
        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    return new Price(fin, best, name);
  }
}

package com.example.shop.service;

import com.example.shop.model.Offer;
import com.example.shop.model.Permission;
import com.example.shop.model.Product;
import com.example.shop.model.User;
import com.example.shop.repo.OfferRepository;
import com.example.shop.repo.ProductRepository;
import com.example.shop.security.AccessGuard;
import com.example.shop.security.CurrentUser;
import com.example.shop.web.Dtos.ActiveOfferResponse;
import com.example.shop.web.Dtos.OfferRequest;
import com.example.shop.web.Dtos.OfferResponse;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Festival sales and offers. Sellers control their own; admins (OFFERS_MANAGE_ALL) can manage any. */
@Service @RequiredArgsConstructor
public class OfferService {
  private final OfferRepository offers;
  private final ProductRepository products;
  private final CurrentUser current;
  private final AccessGuard guard;

  @Transactional(readOnly = true)
  public List<OfferResponse> list() {
    List<Offer> list = guard.has(Permission.OFFERS_MANAGE_ALL.name())
        ? offers.findAllByOrderByStartsAtDesc()
        : offers.findBySellerIdOrderByStartsAtDesc(current.require().getId());
    Instant now = Instant.now();
    return list.stream().map(o -> view(o, now)).toList();
  }

  /** Public: what sales are running right now (for the storefront banner). */
  @Transactional(readOnly = true)
  public List<ActiveOfferResponse> active() {
    return offers.findActive(Instant.now()).stream()
        .map(o -> new ActiveOfferResponse(o.getName(), o.getDiscountPercent(), o.getEndsAt(),
            o.getSeller().displayName(), o.isAppliesToAll()))
        .toList();
  }

  @Transactional
  public OfferResponse create(OfferRequest r) {
    User me = current.require();
    Offer o = new Offer();
    o.setSeller(me);
    apply(o, r, me);
    return view(offers.save(o), Instant.now());
  }

  @Transactional
  public OfferResponse update(Long id, OfferRequest r) {
    Offer o = find(id);
    requireOwnerOrAll(o);
    apply(o, r, o.getSeller());
    return view(offers.save(o), Instant.now());
  }

  @Transactional
  public void delete(Long id) {
    Offer o = find(id);
    requireOwnerOrAll(o);
    offers.delete(o);
  }

  // ---------------- helpers ----------------
  private Offer find(Long id) {
    return offers.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Offer not found"));
  }

  private void requireOwnerOrAll(Offer o) {
    User me = current.require();
    if (!o.getSeller().getId().equals(me.getId()) && !guard.has(Permission.OFFERS_MANAGE_ALL.name()))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only change your own offers");
  }

  private void apply(Offer o, OfferRequest r, User seller) {
    if (!r.endsAt().isAfter(r.startsAt()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The end must be after the start");
    Set<Long> ids = r.productIds() == null ? Set.of() : r.productIds();
    if (!r.appliesToAll() && ids.isEmpty())
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose at least one product, or apply to all");

    List<Product> found = r.appliesToAll() ? List.of() : products.findAllById(ids);
    if (found.size() != (r.appliesToAll() ? 0 : ids.size()))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "One or more products do not exist");
    for (Product p : found) {
      if (p.getSeller() == null || !p.getSeller().getId().equals(seller.getId()))
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An offer can only include the seller's own products");
    }

    o.setName(r.name().trim());
    o.setDiscountPercent(r.discountPercent());
    o.setStartsAt(r.startsAt());
    o.setEndsAt(r.endsAt());
    o.setActive(r.active());
    o.setAppliesToAll(r.appliesToAll());
    o.getProducts().clear();
    o.getProducts().addAll(found);
  }

  private OfferResponse view(Offer o, Instant now) {
    String status;
    if (!o.isActive()) status = "PAUSED";
    else if (now.isBefore(o.getStartsAt())) status = "SCHEDULED";
    else if (now.isAfter(o.getEndsAt())) status = "ENDED";
    else status = "LIVE";
    return new OfferResponse(o.getId(), o.getName(), o.getDiscountPercent(), o.getStartsAt(), o.getEndsAt(),
        o.isActive(), o.isAppliesToAll(), o.getProducts().stream().map(Product::getId).sorted().toList(),
        o.getSeller().getId(), o.getSeller().displayName(), status);
  }
}

package com.example.shop.service;

import com.example.shop.model.Category;
import com.example.shop.model.Offer;
import com.example.shop.model.Permission;
import com.example.shop.model.Product;
import com.example.shop.model.User;
import com.example.shop.repo.CategoryRepository;
import com.example.shop.repo.OfferRepository;
import com.example.shop.repo.ProductRepository;
import com.example.shop.security.AccessGuard;
import com.example.shop.security.CurrentUser;
import com.example.shop.web.Dtos.ProductRequest;
import com.example.shop.web.Dtos.ProductResponse;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ProductService {
  private final ProductRepository products;
  private final CategoryRepository categories;
  private final OfferRepository offers;
  private final PricingService pricing;
  private final CurrentUser current;
  private final AccessGuard guard;

  @Transactional(readOnly = true)
  public List<ProductResponse> search(String q, Long categoryId, Long sellerId) {
    Specification<Product> spec = (root, cq, cb) -> cb.conjunction();
    if (q != null && !q.isBlank()) {
      String pattern = "%" + q.trim().toLowerCase() + "%";
      spec = spec.and((root, cq, cb) -> cb.or(
          cb.like(cb.lower(root.get("name")), pattern),
          cb.like(cb.lower(root.get("description")), pattern)));
    }
    if (categoryId != null) {
      spec = spec.and((root, cq, cb) -> cb.equal(root.get("category").get("id"), categoryId));
    }
    if (sellerId != null) {
      spec = spec.and((root, cq, cb) -> cb.equal(root.get("seller").get("id"), sellerId));
    }
    Map<Long, List<Offer>> live = pricing.liveOffersBySeller();
    return products.findAll(spec, Sort.by("id")).stream().map(p -> view(p, live)).toList();
  }

  @Transactional(readOnly = true)
  public List<ProductResponse> mine() {
    return search(null, null, current.require().getId());
  }

  @Transactional(readOnly = true)
  public ProductResponse get(Long id) {
    return view(find(id), pricing.liveOffersBySeller());
  }

  @Transactional
  public ProductResponse create(ProductRequest r) {
    Product p = new Product();
    apply(p, r);
    p.setSeller(current.require());
    return view(products.save(p), pricing.liveOffersBySeller());
  }

  @Transactional
  public ProductResponse update(Long id, ProductRequest r) {
    Product p = find(id);
    requireOwnerOrManageAll(p);
    apply(p, r);
    return view(products.save(p), pricing.liveOffersBySeller());
  }

  @Transactional
  public void delete(Long id) {
    Product p = find(id);
    requireOwnerOrManageAll(p);
    for (Offer o : offers.findByProducts_Id(id)) { // detach from offers first (join table FK)
      o.getProducts().removeIf(x -> x.getId().equals(id));
    }
    products.delete(p);
  }

  // ---------------- helpers ----------------
  private Product find(Long id) {
    return products.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
  }

  private void apply(Product p, ProductRequest r) {
    p.setName(r.name().trim());
    p.setDescription(r.description());
    p.setPrice(r.price());
    p.setStock(r.stock());
    p.setImageUrl(r.imageUrl() == null || r.imageUrl().isBlank() ? null : r.imageUrl().trim());
    if (r.categoryId() == null) {
      p.setCategory(null);
    } else {
      Category c = categories.findById(r.categoryId())
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
      p.setCategory(c);
    }
  }

  private void requireOwnerOrManageAll(Product p) {
    User me = current.require();
    boolean owner = p.getSeller() != null && p.getSeller().getId().equals(me.getId());
    if (!owner && !guard.has(Permission.PRODUCTS_MANAGE_ALL.name()))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only change your own products");
  }

  private ProductResponse view(Product p, Map<Long, List<Offer>> live) {
    PricingService.Price price = pricing.priceOf(p, live);
    Category c = p.getCategory();
    User s = p.getSeller();
    return new ProductResponse(p.getId(), p.getName(), p.getDescription(), p.getPrice(),
        price.finalPrice(), price.discountPercent(), price.offerName(), p.getStock(), p.getImageUrl(),
        c == null ? null : c.getId(), c == null ? null : c.getName(),
        s == null ? null : s.getId(), s == null ? "Marketplace" : s.displayName());
  }
}

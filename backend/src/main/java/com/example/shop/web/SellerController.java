package com.example.shop.web;

import com.example.shop.service.CommissionService;
import com.example.shop.service.OrderService;
import com.example.shop.service.ProductService;
import com.example.shop.service.S3ImageUploadService;
import com.example.shop.security.CurrentUser;
import com.example.shop.web.Dtos.ImageUploadRequest;
import com.example.shop.web.Dtos.ImageUploadUrlResponse;
import com.example.shop.web.Dtos.OrderResponse;
import com.example.shop.web.Dtos.ProductResponse;
import com.example.shop.web.Dtos.SellerEarningsResponse;
import com.example.shop.web.Dtos.SellerOrderLine;
import com.example.shop.web.Dtos.StatusRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Seller Hub: everything scoped to the logged-in seller. */
@RestController
@RequestMapping("/api/seller")
@RequiredArgsConstructor
public class SellerController {
  private final ProductService products;
  private final OrderService orders;
  private final CommissionService commissions;
  private final S3ImageUploadService imageUploads;
  private final CurrentUser current;

  @GetMapping("/products")
  @PreAuthorize("hasAuthority('PRODUCTS_CREATE')")
  public List<ProductResponse> myProducts() {
    return products.mine();
  }

  @PostMapping("/products/{productId}/image-upload-url")
  @PreAuthorize("hasAuthority('PRODUCTS_CREATE')")
  public ImageUploadUrlResponse createProductImageUploadUrl(@PathVariable Long productId,
      @Valid @RequestBody ImageUploadRequest request) {
    return imageUploads.createUploadUrl(productId, current.require().getId(),
        request.contentType(), request.fileSizeBytes());
  }

  /**
   * Gross sales, the platform commission and the net amount owed to the seller.
   */
  @GetMapping("/earnings")
  @PreAuthorize("hasAuthority('SELLER_ORDERS_READ')")
  public SellerEarningsResponse earnings() {
    return commissions.myEarnings();
  }

  @GetMapping("/orders")
  @PreAuthorize("hasAuthority('SELLER_ORDERS_READ')")
  public List<SellerOrderLine> myOrderLines() {
    return orders.sellerLines();
  }

  @PatchMapping("/orders/{orderId}/items/{itemId}/status")
  @PreAuthorize("hasAuthority('SELLER_ORDERS_UPDATE')")
  public OrderResponse updateLine(@PathVariable Long orderId, @PathVariable Long itemId,
      @Valid @RequestBody StatusRequest req) {
    return orders.updateItemStatus(orderId, itemId, req.status());
  }
}

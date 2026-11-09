package com.example.shop;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.example.shop.model.Category;
import com.example.shop.model.Offer;
import com.example.shop.model.Product;
import com.example.shop.model.User;
import com.example.shop.repo.CategoryRepository;
import com.example.shop.repo.OfferRepository;
import com.example.shop.repo.ProductRepository;
import com.example.shop.security.AccessGuard;
import com.example.shop.security.CurrentUser;
import com.example.shop.service.PricingService;
import com.example.shop.service.ProductService;
import com.example.shop.service.S3ImageUploadService;
import com.example.shop.web.Dtos.ProductRequest;
import com.example.shop.web.Dtos.ProductResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {
  @Mock ProductRepository products;
  @Mock CategoryRepository categories;
  @Mock OfferRepository offers;
  @Mock PricingService pricing;
  @Mock CurrentUser current;
  @Mock AccessGuard guard;
  @Mock S3ImageUploadService imageUploads;
  @InjectMocks ProductService service;

  User seller;
  Category electronics;

  @BeforeEach void setUp() {
    seller = new User();
    seller.setId(7L);
    seller.setEmail("s@t.com");
    seller.setStoreName("Acme");
    electronics = new Category();
    electronics.setId(3L);
    electronics.setName("Electronics");
  }

  private Product owned(long id, User owner) {
    Product p = new Product();
    p.setId(id);
    p.setName("Lamp");
    p.setPrice(new BigDecimal("100"));
    p.setStock(5);
    p.setSeller(owner);
    return p;
  }

  private void stubPrice() {
    when(pricing.priceOf(any(), any())).thenReturn(new PricingService.Price(new BigDecimal("100.00"), 0, null));
    lenient().when(imageUploads.resolveImageUrl(any())).thenAnswer(inv -> inv.getArgument(0));
  }

  private static ProductRequest request(String name, Long categoryId) {
    return new ProductRequest(name, "d", new BigDecimal("100"), 5, categoryId, null, null);
  }

  // ---------------- create ----------------
  @Test void createdProductBelongsToTheCallerAndKeepsItsCategory() {
    when(current.require()).thenReturn(seller);
    when(categories.findById(3L)).thenReturn(Optional.of(electronics));
    when(products.save(any())).thenAnswer(inv -> inv.getArgument(0));
    stubPrice();

    ProductResponse r = service.create(new ProductRequest("  Lamp ", "d", new BigDecimal("100"), 5, 3L, " https://img/x.png ", null));

    assertEquals("Lamp", r.name());
    assertEquals(7L, r.sellerId());
    assertEquals("Acme", r.sellerName());
    assertEquals("Electronics", r.categoryName());
    assertEquals("https://img/x.png", r.imageUrl());
    assertNull(r.imageKey());
  }

  @Test void blankImageUrlBecomesNull() {
    when(current.require()).thenReturn(seller);
    when(products.save(any())).thenAnswer(inv -> inv.getArgument(0));
    stubPrice();

    ProductResponse r = service.create(new ProductRequest("Lamp", "d", new BigDecimal("100"), 5, null, "   ", null));

    assertNull(r.imageUrl());
    assertNull(r.categoryId());
  }

  @Test void savesMultipleProductImagesInTheirSubmittedOrder() {
    when(current.require()).thenReturn(seller);
    when(products.save(any())).thenAnswer(inv -> inv.getArgument(0));
    stubPrice();
    List<String> imageUrls = List.of("https://images.example/front", "https://images.example/back");

    ProductResponse response = service.create(new ProductRequest(
        "Lamp", "d", new BigDecimal("100"), 5, null, imageUrls.get(0), imageUrls));

    assertEquals(imageUrls, response.images().stream().map(image -> image.url()).toList());
    assertTrue(response.images().stream().allMatch(image -> image.key() == null));
  }

  @Test void unknownCategoryIsNotFound() {
    when(categories.findById(99L)).thenReturn(Optional.empty());
    ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.create(request("Lamp", 99L)));
    assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    verify(products, never()).save(any());
  }

  // ---------------- update ----------------
  @Test void ownerCanUpdateTheirProduct() {
    when(products.findById(1L)).thenReturn(Optional.of(owned(1, seller)));
    when(current.require()).thenReturn(seller);
    when(products.save(any())).thenAnswer(inv -> inv.getArgument(0));
    stubPrice();

    ProductResponse r = service.update(1L, request("Renamed", null));

    assertEquals("Renamed", r.name());
  }

  @Test void anotherSellerCannotUpdate() {
    User other = new User();
    other.setId(8L);
    when(products.findById(1L)).thenReturn(Optional.of(owned(1, seller)));
    when(current.require()).thenReturn(other);

    ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.update(1L, request("Hijack", null)));

    assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    verify(products, never()).save(any());
  }

  @Test void adminWithManageAllCanUpdateAnyProduct() {
    User admin = new User();
    admin.setId(99L);
    when(products.findById(1L)).thenReturn(Optional.of(owned(1, seller)));
    when(current.require()).thenReturn(admin);
    when(guard.has("PRODUCTS_MANAGE_ALL")).thenReturn(true);
    when(products.save(any())).thenAnswer(inv -> inv.getArgument(0));
    stubPrice();

    assertEquals("Moderated", service.update(1L, request("Moderated", null)).name());
  }

  @Test void updatingAnUnknownProductIsNotFound() {
    when(products.findById(404L)).thenReturn(Optional.empty());
    ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.update(404L, request("X", null)));
    assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
  }

  // ---------------- delete ----------------
  @Test void deletingAProductRemovesItFromEveryOffer() {
    Product p = owned(1, seller);
    Offer offer = new Offer();
    offer.getProducts().add(p);
    offer.getProducts().add(owned(2, seller));
    when(products.findById(1L)).thenReturn(Optional.of(p));
    when(current.require()).thenReturn(seller);
    when(offers.findByProducts_Id(1L)).thenReturn(List.of(offer));

    service.delete(1L);

    assertEquals(1, offer.getProducts().size());
    assertEquals(2L, offer.getProducts().iterator().next().getId());
    verify(products).delete(p);
  }

  // @Test void strangersCannotDelete() {
  //   User other = new User();
  //   other.setId(8L);
  //   when(products.findById(1L)).thenReturn(Optional.of(owned(1, seller)));
  //   when(current.require()).thenReturn(other);

  //   ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.delete(1L));

  //   assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
  //   verify(products, never()).delete(any());
  // }

  // ---------------- read ----------------
  @Test void getShowsTheOfferPriceAndSeller() {
    when(products.findById(1L)).thenReturn(Optional.of(owned(1, seller)));
    when(pricing.priceOf(any(), any())).thenReturn(new PricingService.Price(new BigDecimal("80.00"), 20, "Diwali Sale"));

    ProductResponse r = service.get(1L);

    assertEquals(0, new BigDecimal("100").compareTo(r.price()));
    assertEquals(0, new BigDecimal("80.00").compareTo(r.finalPrice()));
    assertEquals(20, r.discountPercent());
    assertEquals("Diwali Sale", r.offerName());
    assertEquals("Acme", r.sellerName());
  }

  @Test void privateS3ImagesAreSignedForDisplayAndKeepTheirObjectKey() {
    String key = "product/1_lamp/123e4567-e89b-12d3-a456-426614174000.png";
    Product product = owned(1, seller);
    product.setImageUrl(key);
    when(products.findById(1L)).thenReturn(Optional.of(product));
    stubPrice();
    when(imageUploads.resolveImageUrl(key)).thenReturn("https://s3.example/signed-read");

    ProductResponse response = service.get(1L);

    assertEquals("https://s3.example/signed-read", response.imageUrl());
    assertEquals(key, response.imageKey());
  }

  @Test void returnsAllPrivateProductImagesInTheirSavedOrder() {
    String firstKey = "product/1_lamp/123e4567-e89b-12d3-a456-426614174000.png";
    String secondKey = "product/1_lamp/123e4567-e89b-12d3-a456-426614174001.jpg";
    Product product = owned(1, seller);
    product.setImageUrls(List.of(firstKey, secondKey));
    product.setImageUrl(firstKey);
    when(products.findById(1L)).thenReturn(Optional.of(product));
    stubPrice();
    when(imageUploads.resolveImageUrl(firstKey)).thenReturn("https://s3.example/first");
    when(imageUploads.resolveImageUrl(secondKey)).thenReturn("https://s3.example/second");

    ProductResponse response = service.get(1L);

    assertEquals(List.of(
        new com.example.shop.web.Dtos.ProductImageResponse("https://s3.example/first", firstKey),
        new com.example.shop.web.Dtos.ProductImageResponse("https://s3.example/second", secondKey)), response.images());
    assertEquals("https://s3.example/first", response.imageUrl());
  }

  @Test void productWithoutASellerIsSoldByTheMarketplace() {
    when(products.findById(1L)).thenReturn(Optional.of(owned(1, null)));
    stubPrice();

    ProductResponse r = service.get(1L);

    assertEquals("Marketplace", r.sellerName());
    assertNull(r.sellerId());
  }

  @Test void gettingAnUnknownProductIsNotFound() {
    when(products.findById(404L)).thenReturn(Optional.empty());
    ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.get(404L));
    assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
  }

  @SuppressWarnings("unchecked")
  @Test void mineSearchesBySellerId() {
    when(current.require()).thenReturn(seller);
    when(products.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(owned(1, seller), owned(2, seller)));
    stubPrice();

    assertEquals(2, service.mine().size());
    verify(products).findAll(any(Specification.class), any(Sort.class));
  }
}

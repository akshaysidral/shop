package com.example.shop.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.shop.model.Product;
import com.example.shop.model.User;
import com.example.shop.repo.ProductRepository;
import com.example.shop.security.AccessGuard;
import java.net.URI;
import java.net.URL;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

class S3ImageUploadServiceTest {
  @SuppressWarnings("unchecked")
  private static ObjectProvider<S3Presigner> provider(S3Presigner presigner) {
    ObjectProvider<S3Presigner> provider = mock(ObjectProvider.class);
    when(provider.getIfAvailable()).thenReturn(presigner);
    return provider;
  }

  @Test
  void createsShortLivedProductScopedUploadUrl() throws Exception {
    S3Presigner presigner = mock(S3Presigner.class);
    ProductRepository products = mock(ProductRepository.class);
    AccessGuard guard = mock(AccessGuard.class);
    Product product = product(7L, "Blue & Bright Lamp", 42L);
    when(products.findById(7L)).thenReturn(Optional.of(product));
    PresignedPutObjectRequest signedRequest = mock(PresignedPutObjectRequest.class);
    URL uploadUrl = URI.create("https://s3.example/upload").toURL();
    when(signedRequest.url()).thenReturn(uploadUrl);
    when(presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(signedRequest);
    var service = new S3ImageUploadService(provider(presigner), products, guard, "shop-images", 300, 3600);

    var response = service.createUploadUrl(7L, 42L, "image/png", 1024);

    assertEquals("https://s3.example/upload", response.uploadUrl());
    assertEquals("image/png", response.requiredHeaders().get("Content-Type"));
    assertEquals("1024", response.requiredHeaders().get("Content-Length"));
    org.junit.jupiter.api.Assertions.assertTrue(
        response.objectKey().matches("product/7_blue-bright-lamp/[0-9a-f-]{36}\\.png"));
    var request = org.mockito.ArgumentCaptor.forClass(PutObjectPresignRequest.class);
    verify(presigner).presignPutObject(request.capture());
    PutObjectRequest put = request.getValue().putObjectRequest();
    assertEquals("shop-images", put.bucket());
    assertEquals(response.objectKey(), put.key());
    assertEquals("image/png", put.contentType());
    assertEquals(1024L, put.contentLength());
    assertEquals(300, request.getValue().signatureDuration().toSeconds());
  }

  @Test
  void rejectsUnsupportedContentType() {
    var service = service(mock(S3Presigner.class), product(7L, "Lamp", 42L));

    ResponseStatusException error = assertThrows(ResponseStatusException.class,
        () -> service.createUploadUrl(7L, 42L, "image/svg+xml", 1024));

    assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
  }

  @Test
  void rejectsFilesOverFiveMebibytes() {
    var service = service(mock(S3Presigner.class), product(7L, "Lamp", 42L));

    ResponseStatusException error = assertThrows(ResponseStatusException.class,
        () -> service.createUploadUrl(7L, 42L, "image/png", 5 * 1024 * 1024L + 1));

    assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
  }

  @Test
  void reportsUnavailableWhenS3IsNotConfigured() {
    var service = service(null, product(7L, "Lamp", 42L));

    ResponseStatusException error = assertThrows(ResponseStatusException.class,
        () -> service.createUploadUrl(7L, 42L, "image/png", 1024));

    assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatusCode());
  }

  @Test
  void signsPrivateProductImageForReading() throws Exception {
    S3Presigner presigner = mock(S3Presigner.class);
    var signedRequest = mock(software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest.class);
    URL imageUrl = URI.create("https://s3.example/read").toURL();
    when(signedRequest.url()).thenReturn(imageUrl);
    when(presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(signedRequest);
    var service = new S3ImageUploadService(provider(presigner), mock(ProductRepository.class),
        mock(AccessGuard.class), "shop-images", 300, 3600);

    assertEquals("https://s3.example/read",
        service.resolveImageUrl("product/7_lamp/123e4567-e89b-12d3-a456-426614174000.png"));
    var request = org.mockito.ArgumentCaptor.forClass(GetObjectPresignRequest.class);
    verify(presigner).presignGetObject(request.capture());
    GetObjectRequest get = request.getValue().getObjectRequest();
    assertEquals("shop-images", get.bucket());
    assertEquals("product/7_lamp/123e4567-e89b-12d3-a456-426614174000.png", get.key());
    assertEquals(3600, request.getValue().signatureDuration().toSeconds());
  }

  @Test
  void rejectsImageUploadForAnotherSellersProduct() {
    Product product = product(7L, "Lamp", 99L);
    var service = service(mock(S3Presigner.class), product);

    ResponseStatusException error = assertThrows(ResponseStatusException.class,
        () -> service.createUploadUrl(7L, 42L, "image/png", 1024));

    assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
  }

  @Test
  void presignedPutRequiresTheDeclaredContentLength() {
    try (S3Presigner presigner = S3Presigner.builder()
        .region(Region.US_EAST_1)
        .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create("test", "test")))
        .build()) {
      var signed = presigner.presignPutObject(PutObjectPresignRequest.builder()
          .signatureDuration(Duration.ofMinutes(5))
          .putObjectRequest(PutObjectRequest.builder()
              .bucket("test-images")
              .key("product/7_lamp/image.png")
              .contentType("image/png")
              .contentLength(1024L)
              .build())
          .build());

      assertTrue(signed.signedHeaders().containsKey("content-length"), signed.signedHeaders().toString());
    }
  }

  private static S3ImageUploadService service(S3Presigner presigner, Product product) {
    ProductRepository products = mock(ProductRepository.class);
    when(products.findById(7L)).thenReturn(Optional.of(product));
    AccessGuard guard = mock(AccessGuard.class);
    return new S3ImageUploadService(provider(presigner), products, guard, "shop-images", 300, 3600);
  }

  private static Product product(Long id, String name, Long ownerId) {
    User owner = new User();
    owner.setId(ownerId);
    Product product = new Product();
    product.setId(id);
    product.setName(name);
    product.setSeller(owner);
    return product;
  }
}

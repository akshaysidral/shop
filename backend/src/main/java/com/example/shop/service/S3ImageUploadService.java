package com.example.shop.service;

import com.example.shop.web.Dtos;
import com.example.shop.web.Dtos.ImageUploadUrlResponse;
import com.example.shop.model.Permission;
import com.example.shop.model.Product;
import com.example.shop.model.User;
import com.example.shop.repo.ProductRepository;
import com.example.shop.security.AccessGuard;
import java.time.Duration;
import java.time.Instant;
import java.text.Normalizer;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.Locale;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
public class S3ImageUploadService {
  private static final Map<String, String> EXTENSIONS = Map.of(
      "image/jpeg", ".jpg",
      "image/png", ".png",
      "image/webp", ".webp");

  private final ObjectProvider<S3Presigner> presigners;
  private final ProductRepository products;
  private final AccessGuard guard;
  private final String bucket;
  private final Duration uploadUrlDuration;
  private final Duration readUrlDuration;

  public S3ImageUploadService(ObjectProvider<S3Presigner> presigners,
      ProductRepository products,
      AccessGuard guard,
      @Value("${app.storage.s3.bucket:}") String bucket,
      @Value("${app.storage.s3.upload-url-expiration-seconds:300}") long expirationSeconds,
      @Value("${app.storage.s3.read-url-expiration-seconds:3600}") long readUrlExpirationSeconds) {
    if (expirationSeconds < 1 || expirationSeconds > 900) {
      throw new IllegalArgumentException("S3 upload URL expiration must be between 1 and 900 seconds");
    }
    if (readUrlExpirationSeconds < 1 || readUrlExpirationSeconds > 604800) {
      throw new IllegalArgumentException("S3 read URL expiration must be between 1 and 604800 seconds");
    }
    this.presigners = presigners;
    this.products = products;
    this.guard = guard;
    this.bucket = bucket;
    this.uploadUrlDuration = Duration.ofSeconds(expirationSeconds);
    this.readUrlDuration = Duration.ofSeconds(readUrlExpirationSeconds);
  }

  public String resolveImageUrl(String imageUrl) {
    if (imageUrl == null || !isManagedObjectKey(imageUrl)) {
      return imageUrl;
    }
    S3Presigner presigner = presigners.getIfAvailable();
    if (bucket.isBlank() || presigner == null) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Image storage is not configured");
    }
    var request = GetObjectRequest.builder().bucket(bucket).key(imageUrl).build();
    return presigner.presignGetObject(GetObjectPresignRequest.builder()
        .signatureDuration(readUrlDuration)
        .getObjectRequest(request)
        .build()).url().toString();
  }

  public static boolean isManagedObjectKey(String value) {
    return value != null && value.matches("product/[0-9]+_[a-z0-9-]+/[0-9a-f-]{36}\\.(jpg|png|webp)");
  }

  @Transactional(readOnly = true)
  public ImageUploadUrlResponse createUploadUrl(Long productId, Long sellerId, String contentType, long fileSizeBytes) {
    long id = Objects.requireNonNull(productId, "productId");
    Product product = products.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    User owner = product.getSeller();
    if ((owner == null || !owner.getId().equals(sellerId)) && !guard.has(Permission.PRODUCTS_MANAGE_ALL.name())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only upload images for your own products");
    }

    String extension = EXTENSIONS.get(contentType);
    if (extension == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPEG, PNG, and WebP images are supported");
    }
    if (fileSizeBytes <= 0 || fileSizeBytes > Dtos.MAX_IMAGE_SIZE_BYTES) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image size must be between 1 byte and 5 MiB");
    }

    S3Presigner presigner = presigners.getIfAvailable();
    if (bucket.isBlank() || presigner == null) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Image uploads are not configured");
    }

    String key = "product/" + productId + "_" + productNameSegment(product.getName())
        + "/" + UUID.randomUUID() + extension;
    var putObject = PutObjectRequest.builder()
        .bucket(bucket)
        .key(key)
        .contentType(contentType)
        .contentLength(fileSizeBytes)
        .build();
    var presignRequest = PutObjectPresignRequest.builder()
        .signatureDuration(uploadUrlDuration)
        .putObjectRequest(putObject)
        .build();
    var signedRequest = presigner.presignPutObject(presignRequest);

    return new ImageUploadUrlResponse(key, signedRequest.url().toString(),
        Instant.now().plus(uploadUrlDuration), Map.of(
            "Content-Type", contentType,
            "Content-Length", Long.toString(fileSizeBytes)));
  }

  private static String productNameSegment(String name) {
    String normalized = Normalizer.normalize(name, Normalizer.Form.NFD)
        .replaceAll("\\p{M}+", "")
        .toLowerCase(Locale.ROOT)
        .replaceAll("[^a-z0-9]+", "-")
        .replaceAll("^-|-$", "");
    return normalized.isBlank() ? "product" : normalized;
  }
}

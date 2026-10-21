package com.example.shop.web;

import com.example.shop.service.ProductService;
import com.example.shop.web.Dtos.ProductRequest;
import com.example.shop.web.Dtos.ProductResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/products") @RequiredArgsConstructor
public class ProductController {
  private final ProductService service;

  // ---- public catalogue ----
  @GetMapping
  public List<ProductResponse> list(@RequestParam(required = false) String q,
                                    @RequestParam(required = false) Long categoryId,
                                    @RequestParam(required = false) Long sellerId) {
    return service.search(q, categoryId, sellerId);
  }

  @GetMapping("/{id}")
  public ProductResponse get(@PathVariable Long id) { return service.get(id); }

  // ---- sellers (own products) and admins (PRODUCTS_MANAGE_ALL: any product) ----
  @PostMapping @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('PRODUCTS_CREATE')")
  public ProductResponse create(@Valid @RequestBody ProductRequest body) { return service.create(body); }

  @PutMapping("/{id}") @PreAuthorize("hasAuthority('PRODUCTS_UPDATE')")
  public ProductResponse update(@PathVariable Long id, @Valid @RequestBody ProductRequest body) {
    return service.update(id, body);
  }

  @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasAuthority('PRODUCTS_DELETE')")
  public void delete(@PathVariable Long id) { service.delete(id); }
}

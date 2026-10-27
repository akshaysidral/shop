package com.example.shop.web;

import com.example.shop.service.CategoryService;
import com.example.shop.web.Dtos.CategoryRequest;
import com.example.shop.web.Dtos.CategoryResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {
  private final CategoryService service;

  @GetMapping
  public List<CategoryResponse> list() {
    return service.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('CATEGORIES_MANAGE')")
  public CategoryResponse create(@Valid @RequestBody CategoryRequest r) {
    return service.create(r);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('CATEGORIES_MANAGE')")
  public CategoryResponse update(@PathVariable Long id, @Valid @RequestBody CategoryRequest r) {
    return service.update(id, r);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasAuthority('CATEGORIES_MANAGE')")
  public void delete(@PathVariable Long id) {
    service.delete(id);
  }
}

package com.example.shop.service;

import com.example.shop.model.Category;
import com.example.shop.model.CategorySlug;
import com.example.shop.repo.CategoryRepository;
import com.example.shop.repo.ProductRepository;
import com.example.shop.web.Dtos.CategoryRequest;
import com.example.shop.web.Dtos.CategoryResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class CategoryService {
  private final CategoryRepository categories;
  private final ProductRepository products;

  @Transactional(readOnly = true)
  public List<CategoryResponse> list() {
    return categories.findAll(Sort.by("name")).stream().map(this::view).toList();
  }

  @Transactional
  public CategoryResponse create(CategoryRequest r) {
    String name = r.name().trim();
    if (categories.existsByName(name))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Category already exists");
    Category c = new Category();
    c.setName(name);
    c.setSlug(uniqueSlug(name, null));
    c.setIcon(r.icon());
    return view(categories.save(c));
  }

  @Transactional
  public CategoryResponse update(Long id, CategoryRequest r) {
    Category c = find(id);
    String name = r.name().trim();
    if (categories.findByName(name).filter(x -> !x.getId().equals(id)).isPresent())
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Category already exists");
    c.setName(name);
    if (c.getSlug() == null)
      c.setSlug(uniqueSlug(name, id));
    c.setIcon(r.icon());
    return view(categories.save(c));
  }

  @Transactional
  public void delete(Long id) {
    Category c = find(id);
    if (products.existsByCategory_Id(id))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Category still has products");
    categories.delete(c);
  }

  private Category find(Long id) {
    return categories.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
  }

  private CategoryResponse view(Category c) {
    return new CategoryResponse(c.getId(), c.getName(),
        c.getSlug() == null ? CategorySlug.fromName(c.getName()) : c.getSlug(),
        c.getIcon(), products.countByCategory_Id(c.getId()));
  }

  private String uniqueSlug(String name, Long excludedId) {
    String base = CategorySlug.fromName(name);
    String candidate = base;
    int suffix = 2;
    while (categories.findBySlug(candidate)
        .filter(category -> excludedId == null || !excludedId.equals(category.getId()))
        .isPresent()) {
      candidate = base + "-" + suffix++;
    }
    return candidate;
  }
}

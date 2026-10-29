package com.example.shop;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.example.shop.model.Category;
import com.example.shop.model.CategorySlug;
import com.example.shop.repo.CategoryRepository;
import com.example.shop.repo.ProductRepository;
import com.example.shop.service.CategoryService;
import com.example.shop.web.Dtos.CategoryRequest;
import com.example.shop.web.Dtos.CategoryResponse;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {
  @Mock CategoryRepository categories;
  @Mock ProductRepository products;
  @InjectMocks CategoryService service;

  private static Category category(long id, String name) {
    Category c = new Category();
    c.setId(id);
    c.setName(name);
    c.setSlug(CategorySlug.fromName(name));
    c.setIcon("tag");
    return c;
  }

  @Test void listShowsHowManyProductsEachCategoryHolds() {
    when(categories.findAll(any(Sort.class))).thenReturn(List.of(category(1, "Books"), category(2, "Toys")));
    when(products.countByCategory_Id(1L)).thenReturn(3L);
    when(products.countByCategory_Id(2L)).thenReturn(0L);

    List<CategoryResponse> list = service.list();

    assertEquals(2, list.size());
    assertEquals("Books", list.get(0).name());
    assertEquals("books", list.get(0).slug());
    assertEquals(3, list.get(0).productCount());
    assertEquals(0, list.get(1).productCount());
  }

  @Test void createTrimsTheNameAndSavesIt() {
    when(categories.existsByName("Toys")).thenReturn(false);
    when(categories.save(any())).thenAnswer(inv -> {
      Category c = inv.getArgument(0);
      c.setId(9L);
      return c;
    });

    CategoryResponse r = service.create(new CategoryRequest("  Toys ", "gem"));

    assertEquals(9L, r.id());
    assertEquals("Toys", r.name());
    assertEquals("toys", r.slug());
    assertEquals("gem", r.icon());
  }

  @Test void duplicateNamesAreRejectedOnCreate() {
    when(categories.existsByName("Toys")).thenReturn(true);

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.create(new CategoryRequest("Toys", null)));

    assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    verify(categories, never()).save(any());
  }

  @Test void renamingToAnotherCategorysNameIsRejected() {
    when(categories.findById(1L)).thenReturn(Optional.of(category(1, "Books")));
    when(categories.findByName("Toys")).thenReturn(Optional.of(category(2, "Toys")));

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.update(1L, new CategoryRequest("Toys", "tag")));

    assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
  }

  @Test void keepingTheSameNameWhileChangingTheIconIsAllowed() {
    Category books = category(1, "Books");
    when(categories.findById(1L)).thenReturn(Optional.of(books));
    when(categories.findByName("Books")).thenReturn(Optional.of(books));
    when(categories.save(any())).thenAnswer(inv -> inv.getArgument(0));

    CategoryResponse r = service.update(1L, new CategoryRequest("Books", "books"));

    assertEquals("books", r.icon());
    assertEquals("books", r.slug());
  }

  @Test void slugCollisionsReceiveUniqueNumericSuffixes() {
    when(categories.findBySlug("books-stationery")).thenReturn(Optional.of(category(1, "Books Stationery")));
    when(categories.findBySlug("books-stationery-2")).thenReturn(Optional.empty());
    when(categories.save(any())).thenAnswer(inv -> {
      Category c = inv.getArgument(0);
      c.setId(9L);
      return c;
    });

    CategoryResponse r = service.create(new CategoryRequest("Books-Stationery", null));

    assertEquals("books-stationery-2", r.slug());
  }

  @Test void renamingCategoryKeepsItsExistingSlug() {
    Category books = category(1, "Books");
    when(categories.findById(1L)).thenReturn(Optional.of(books));
    when(categories.findByName("Reading")).thenReturn(Optional.empty());
    when(categories.save(any())).thenAnswer(inv -> inv.getArgument(0));

    CategoryResponse r = service.update(1L, new CategoryRequest("Reading", null));

    assertEquals("Reading", r.name());
    assertEquals("books", r.slug());
    verify(categories, never()).findBySlug(any());
  }

  @Test void updatingAnUnknownCategoryIsNotFound() {
    when(categories.findById(404L)).thenReturn(Optional.empty());

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.update(404L, new CategoryRequest("X", null)));

    assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
  }

  @Test void categoryWithProductsCannotBeDeleted() {
    when(categories.findById(1L)).thenReturn(Optional.of(category(1, "Books")));
    when(products.existsByCategory_Id(1L)).thenReturn(true);

    ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.delete(1L));

    assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    verify(categories, never()).delete(any());
  }

  @Test void emptyCategoryCanBeDeleted() {
    Category c = category(1, "Books");
    when(categories.findById(1L)).thenReturn(Optional.of(c));
    when(products.existsByCategory_Id(1L)).thenReturn(false);

    service.delete(1L);

    verify(categories).delete(c);
  }
}

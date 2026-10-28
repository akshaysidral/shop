package com.example.shop.repo;

import com.example.shop.model.Category;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {
  Optional<Category> findByName(String name);

  Optional<Category> findBySlug(String slug);

  boolean existsByName(String name);
}

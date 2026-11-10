package com.example.shop;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class LegacyProductImageMigration implements ApplicationRunner {
  private static final String PRODUCTS_NEEDING_IMAGE_MIGRATION = """
      SELECT p.id
      FROM product p
      WHERE p.image_url IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM product_images i
          WHERE i.product_id = p.id AND i.image_url = p.image_url
        )
      """;

  private final JdbcTemplate jdbc;

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    Integer legacyColumnCount = jdbc.queryForObject("""
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE LOWER(table_schema) = LOWER(current_schema())
          AND LOWER(table_name) = 'product'
          AND LOWER(column_name) = 'image_url'
        """, Integer.class);
    if (legacyColumnCount == null || legacyColumnCount == 0) {
      return;
    }

    jdbc.update("UPDATE product_images SET image_position = -image_position - 1 "
        + "WHERE product_id IN (" + PRODUCTS_NEEDING_IMAGE_MIGRATION + ")");
    jdbc.update("UPDATE product_images SET image_position = -image_position "
        + "WHERE image_position < 0 AND product_id IN (" + PRODUCTS_NEEDING_IMAGE_MIGRATION + ")");
    jdbc.update("INSERT INTO product_images (product_id, image_url, image_position) "
        + "SELECT p.id, p.image_url, 0 FROM product p "
        + "WHERE p.image_url IS NOT NULL AND NOT EXISTS ("
        + "SELECT 1 FROM product_images i "
        + "WHERE i.product_id = p.id AND i.image_url = p.image_url)");
    jdbc.execute("ALTER TABLE product DROP COLUMN image_url");
  }
}

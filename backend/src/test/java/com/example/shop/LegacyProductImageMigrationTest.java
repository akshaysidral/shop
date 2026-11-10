package com.example.shop;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class LegacyProductImageMigrationTest {
  @Test
  void movesLegacyPrimaryImagesIntoOrderedImageCollectionAndDropsOldColumn() {
    var dataSource = new DriverManagerDataSource("jdbc:h2:mem:legacy-images;DB_CLOSE_DELAY=-1", "sa", "");
    JdbcTemplate jdbc = new JdbcTemplate(dataSource);
    jdbc.execute("CREATE TABLE product (id BIGINT PRIMARY KEY, image_url VARCHAR(500))");
    jdbc.execute("""
        CREATE TABLE product_images (
          product_id BIGINT NOT NULL,
          image_url VARCHAR(500) NOT NULL,
          image_position INTEGER NOT NULL,
          PRIMARY KEY (product_id, image_position)
        )
        """);
    jdbc.update("INSERT INTO product (id, image_url) VALUES (1, 'legacy-key'), (2, 'already-saved')");
    jdbc.update("INSERT INTO product_images (product_id, image_url, image_position) VALUES "
        + "(1, 'saved-image', 0), (2, 'already-saved', 0)");

    new LegacyProductImageMigration(jdbc).run(new DefaultApplicationArguments(new String[0]));

    List<String> firstProductImages = jdbc.queryForList(
        "SELECT image_url FROM product_images WHERE product_id = 1 ORDER BY image_position", String.class);
    assertEquals(List.of("legacy-key", "saved-image"), firstProductImages);
    List<String> secondProductImages = jdbc.queryForList(
        "SELECT image_url FROM product_images WHERE product_id = 2 ORDER BY image_position", String.class);
    assertEquals(List.of("already-saved"), secondProductImages);
    Integer legacyColumnCount = jdbc.queryForObject("""
        SELECT COUNT(*) FROM information_schema.columns
        WHERE LOWER(table_schema) = LOWER(current_schema())
          AND LOWER(table_name) = 'product'
          AND LOWER(column_name) = 'image_url'
        """, Integer.class);
    assertEquals(0, legacyColumnCount);
  }

  @Test
  void skipsMigrationWhenLegacyColumnIsAbsent() {
    var dataSource = new DriverManagerDataSource("jdbc:h2:mem:current-images;DB_CLOSE_DELAY=-1", "sa", "");
    JdbcTemplate jdbc = new JdbcTemplate(dataSource);
    jdbc.execute("CREATE TABLE product (id BIGINT PRIMARY KEY)");

    new LegacyProductImageMigration(jdbc).run(new DefaultApplicationArguments(new String[0]));

    assertFalse(jdbc.queryForList("SELECT table_name FROM information_schema.tables "
        + "WHERE LOWER(table_name) = 'product'").isEmpty());
  }
}

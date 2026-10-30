package com.example.shop.model;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class CategorySlugTest {
  @Test
  void trimsSeparatorsAndCollapsesPunctuation() {
    assertEquals("books-games", CategorySlug.fromName("---Books & Games---"));
  }

  @Test
  void removesDiacriticsBeforeCreatingSlug() {
    assertEquals("cafe-bucher", CategorySlug.fromName("Café & Bücher"));
  }

  @Test
  void usesFallbackWhenNameHasNoAsciiLettersOrDigits() {
    assertEquals("category", CategorySlug.fromName("!!!"));
  }
}

package com.example.shop.model;

import java.text.Normalizer;
import java.util.Locale;

public final class CategorySlug {
  private CategorySlug() {
  }

  public static String fromName(String name) {
    String normalized = Normalizer.normalize(name, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .toLowerCase(Locale.ROOT)
        .replaceAll("[^a-z0-9]+", "-")
        .replaceAll("(^-+|-+$)", "");
    return normalized.isBlank() ? "category" : normalized;
  }
}

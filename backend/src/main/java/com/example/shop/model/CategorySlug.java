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
        .replaceAll("[^a-z0-9]+", "-");
    int start = 0;
    int end = normalized.length();
    while (start < end && normalized.charAt(start) == '-') {
      start++;
    }
    while (end > start && normalized.charAt(end - 1) == '-') {
      end--;
    }
    normalized = normalized.substring(start, end);
    return normalized.isBlank() ? "category" : normalized;
  }
}

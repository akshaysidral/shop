package com.example.shop.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** The marketplace's cut of a sale. Pure arithmetic, no database. */
public final class Commission {
  private Commission() {}

  /** commission = what the platform keeps; earning = what the seller gets. Always sums to the line total. */
  public record Split(BigDecimal commission, BigDecimal earning) {}

  public static Split split(BigDecimal lineTotal, BigDecimal percent) {
    BigDecimal commission = lineTotal.multiply(percent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    return new Split(commission, lineTotal.subtract(commission));
  }
}

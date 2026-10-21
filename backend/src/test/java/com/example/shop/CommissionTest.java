package com.example.shop;

import static org.junit.jupiter.api.Assertions.*;

import com.example.shop.service.Commission;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class CommissionTest {
  private static void assertMoney(String expected, BigDecimal actual) {
    assertEquals(0, new BigDecimal(expected).compareTo(actual), "expected " + expected + " but was " + actual);
  }

  @Test void standardSellerPaysFivePercent() {
    Commission.Split s = Commission.split(new BigDecimal("1000"), new BigDecimal("5"));
    assertMoney("50.00", s.commission());
    assertMoney("950.00", s.earning());
  }

  @Test void preferredSellerPaysThreePercent() {
    Commission.Split s = Commission.split(new BigDecimal("1000"), new BigDecimal("3"));
    assertMoney("30.00", s.commission());
    assertMoney("970.00", s.earning());
  }

  @Test void commissionAndEarningAlwaysSumToTheSale() {
    BigDecimal total = new BigDecimal("999.99");
    Commission.Split s = Commission.split(total, new BigDecimal("3"));
    assertMoney("30.00", s.commission());                // 29.9997 rounded
    assertEquals(0, total.compareTo(s.commission().add(s.earning())));
  }

  @Test void roundsHalfUpToTwoDecimals() {
    Commission.Split s = Commission.split(new BigDecimal("10.50"), new BigDecimal("5"));   // 0.525
    assertMoney("0.53", s.commission());
    assertMoney("9.97", s.earning());
  }

  @Test void zeroPercentKeepsEverythingForTheSeller() {
    Commission.Split s = Commission.split(new BigDecimal("250"), BigDecimal.ZERO);
    assertMoney("0.00", s.commission());
    assertMoney("250", s.earning());
  }

  @Test void zeroSaleHasNoCommission() {
    Commission.Split s = Commission.split(BigDecimal.ZERO, new BigDecimal("5"));
    assertMoney("0.00", s.commission());
    assertMoney("0", s.earning());
  }
}

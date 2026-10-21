package com.example.shop;

import static org.junit.jupiter.api.Assertions.*;

import com.example.shop.security.JwtService;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

class JwtServiceTest {
  private static final String SECRET = "unit-test-secret-unit-test-secret-1234";

  @Test void roundTripReturnsSubject() {
    JwtService jwt = new JwtService(SECRET, 60_000);
    assertEquals("a@b.com", jwt.subject(jwt.generate("a@b.com")));
  }

  @Test void tamperedTokenIsRejected() {
    JwtService jwt = new JwtService(SECRET, 60_000);
    String token = jwt.generate("a@b.com");
    assertThrows(JwtException.class, () -> jwt.subject(token + "x"));
  }

  @Test void tokenSignedWithAnotherSecretIsRejected() {
    String token = new JwtService(SECRET, 60_000).generate("a@b.com");
    JwtService other = new JwtService("another-secret-another-secret-another-1", 60_000);
    assertThrows(JwtException.class, () -> other.subject(token));
  }

  @Test void expiredTokenIsRejected() {
    JwtService jwt = new JwtService(SECRET, -1_000);
    String token = jwt.generate("a@b.com");
    assertThrows(JwtException.class, () -> jwt.subject(token));
  }
}

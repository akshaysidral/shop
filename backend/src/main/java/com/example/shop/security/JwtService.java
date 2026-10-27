package com.example.shop.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final SecretKey key;
  private final long expMs;

  public JwtService(@Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.expiration-ms}") long expMs) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expMs = expMs;
  }

  public String generate(String email) {
    Date now = new Date();
    return Jwts.builder().subject(email).issuedAt(now)
        .expiration(new Date(now.getTime() + expMs)).signWith(key).compact();
  }

  public String subject(String token) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject();
  }
}

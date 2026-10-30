package com.example.shop.security;

import com.example.shop.model.RefreshToken;
import com.example.shop.model.User;
import com.example.shop.repo.RefreshTokenRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthTokenService {
  private static final SecureRandom RANDOM = new SecureRandom();

  private final JwtService jwt;
  private final RefreshTokenRepository refreshTokens;

  @Value("${app.auth.refresh-token.expiration-ms:604800000}")
  private long refreshExpirationMs;

  @Transactional
  public TokenPair issue(User user) {
    String familyId = UUID.randomUUID().toString();
    String rawToken = createRefreshToken();
    saveRefreshToken(rawToken, familyId, user);
    return new TokenPair(jwt.generate(user.getEmail()), rawToken);
  }

  @Transactional
  public Optional<TokenPair> rotate(String rawToken) {
    if (rawToken == null || rawToken.isBlank()) {
      return Optional.empty();
    }

    Optional<RefreshToken> storedToken = refreshTokens.findByTokenHashForUpdate(hash(rawToken));
    if (storedToken.isEmpty()) {
      return Optional.empty();
    }
    RefreshToken current = storedToken.get();
    if (current.getRevokedAt() != null) {
      revokeFamily(current.getFamilyId());
      return Optional.empty();
    }

    Instant now = Instant.now();
    if (!current.getExpiresAt().isAfter(now)) {
      revokeFamily(current.getFamilyId());
      return Optional.empty();
    }

    current.setRevokedAt(now);
    refreshTokens.save(current);
    String nextRawToken = createRefreshToken();
    User user = current.getUser();
    saveRefreshToken(nextRawToken, current.getFamilyId(), user);
    return Optional.of(new TokenPair(jwt.generate(user.getEmail()), nextRawToken));
  }

  @Transactional
  public void revoke(String rawToken) {
    if (rawToken == null || rawToken.isBlank()) {
      return;
    }
    refreshTokens.findByTokenHashForUpdate(hash(rawToken))
        .ifPresent(token -> revokeFamily(token.getFamilyId()));
  }

  private void saveRefreshToken(String rawToken, String familyId, User user) {
    Instant now = Instant.now();
    RefreshToken token = new RefreshToken();
    token.setTokenHash(hash(rawToken));
    token.setFamilyId(familyId);
    token.setUser(user);
    token.setCreatedAt(now);
    token.setExpiresAt(now.plusMillis(refreshExpirationMs));
    refreshTokens.save(token);
  }

  private void revokeFamily(String familyId) {
    Instant now = Instant.now();
    refreshTokens.findByFamilyIdAndRevokedAtIsNull(familyId).forEach(token -> {
      token.setRevokedAt(now);
      refreshTokens.save(token);
    });
  }

  private static String createRefreshToken() {
    byte[] bytes = new byte[32];
    RANDOM.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private static String hash(String rawToken) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException("SHA-256 is unavailable", ex);
    }
  }

  public record TokenPair(String accessToken, String refreshToken) {
  }
}

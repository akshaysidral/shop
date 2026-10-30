package com.example.shop.web;

import com.example.shop.model.AccountType;
import com.example.shop.model.Role;
import com.example.shop.model.User;
import com.example.shop.repo.RoleRepository;
import com.example.shop.repo.UserRepository;
import com.example.shop.security.AuthTokenService;
import com.example.shop.security.AuthTokenService.TokenPair;
import com.example.shop.service.CommissionService;
import com.example.shop.web.Dtos.AuthRequest;
import com.example.shop.web.Dtos.AuthResponse;
import com.example.shop.web.Dtos.RegisterRequest;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
  private final UserRepository users;
  private final RoleRepository roles;
  private final PasswordEncoder encoder;
  private final AuthTokenService authTokens;
  private final CommissionService commissions;

  @Value("${app.auth.refresh-token.expiration-ms:604800000}")
  private long refreshExpirationMs;

  @Value("${app.auth.refresh-token.cookie.secure:false}")
  private boolean refreshCookieSecure;

  @Value("${app.auth.refresh-token.cookie.same-site:Lax}")
  private String refreshCookieSameSite;

  @Value("${app.cors-origin}")
  private String corsOrigins;

  /**
   * Self-registration as a BUYER (default) or SELLER. ADMIN can never be chosen
   * here.
   */
  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public AuthResponse register(@Valid @RequestBody RegisterRequest req, HttpServletResponse response) {
    if (users.existsByEmail(req.email()))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");

    AccountType type = req.accountType() == null ? AccountType.BUYER : req.accountType();
    boolean seller = type == AccountType.SELLER;
    if (seller && (req.storeName() == null || req.storeName().isBlank()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Store name is required for sellers");

    Role role = roles.findByName(seller ? "SELLER" : "BUYER")
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Default role missing"));

    User u = new User();
    u.setEmail(req.email());
    u.setPasswordHash(encoder.encode(req.password()));
    if (seller) {
      u.setStoreName(req.storeName().trim());
      u.setCommissionPercent(commissions.defaultPercent()); // admins can later move a seller to a lower rate
    }
    u.getRoles().add(role);
    users.save(u);
    return issueResponse(u, response);
  }

  @PostMapping("/login")
  public AuthResponse login(@Valid @RequestBody AuthRequest req, HttpServletResponse response) {
    User u = users.findByEmail(req.email())
        .filter(x -> encoder.matches(req.password(), x.getPasswordHash()))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bad credentials"));
    return issueResponse(u, response);
  }

  @PostMapping("/refresh")
  public AuthResponse refresh(
      @CookieValue(name = "refresh_token", required = false) String refreshToken,
      HttpServletRequest request,
      HttpServletResponse response) {
    assertTrustedOrigin(request);
    TokenPair pair = authTokens.rotate(refreshToken).orElseThrow(() -> {
      clearRefreshCookie(response);
      return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired refresh token");
    });
    setRefreshCookie(response, pair.refreshToken());
    return new AuthResponse(pair.accessToken());
  }

  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(@CookieValue(name = "refresh_token", required = false) String refreshToken,
      HttpServletRequest request,
      HttpServletResponse response) {
    assertTrustedOrigin(request);
    authTokens.revoke(refreshToken);
    clearRefreshCookie(response);
  }

  private void assertTrustedOrigin(HttpServletRequest request) {
    String origin = request.getHeader(HttpHeaders.ORIGIN);
    if (origin != null) {
      boolean trusted = false;
      for (String allowedOrigin : corsOrigins.split(",")) {
        if (allowedOrigin.trim().equals(origin)) {
          trusted = true;
          break;
        }
      }
      if (!trusted) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Untrusted request origin");
      }
    }
  }

  private AuthResponse issueResponse(User user, HttpServletResponse response) {
    TokenPair pair = authTokens.issue(user);
    setRefreshCookie(response, pair.refreshToken());
    return new AuthResponse(pair.accessToken());
  }

  private void setRefreshCookie(HttpServletResponse response, String token) {
    ResponseCookie cookie = ResponseCookie.from("refresh_token", Objects.requireNonNull(token))
        .httpOnly(true)
        .secure(refreshCookieSecure)
        .sameSite(refreshCookieSameSite)
        .path("/api/auth")
        .maxAge(refreshExpirationMs / 1000)
        .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }

  private void clearRefreshCookie(HttpServletResponse response) {
    ResponseCookie cookie = ResponseCookie.from("refresh_token", "")
        .httpOnly(true)
        .secure(refreshCookieSecure)
        .sameSite(refreshCookieSameSite)
        .path("/api/auth")
        .maxAge(0)
        .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }
}

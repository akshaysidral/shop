package com.example.shop.web;

import com.example.shop.model.AccountType;
import com.example.shop.model.Permission;
import com.example.shop.model.Role;
import com.example.shop.model.User;
import com.example.shop.repo.RoleRepository;
import com.example.shop.repo.UserRepository;
import com.example.shop.service.CommissionService;
import com.example.shop.web.Dtos.AuthRequest;
import com.example.shop.web.Dtos.CsrfResponse;
import com.example.shop.web.Dtos.RegisterRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
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
  private final CommissionService commissions;
  private final SecurityContextRepository securityContexts;
  private final SessionAuthenticationStrategy sessionAuthenticationStrategy;

  @Value("${app.cors-origin}")
  private String corsOrigins;

  @GetMapping("/csrf")
  public CsrfResponse csrf(CsrfToken csrfToken) {
    return new CsrfResponse(csrfToken.getToken());
  }

  /**
   * Self-registration as a BUYER (default) or SELLER. ADMIN can never be chosen
   * here.
   */
  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public void register(@Valid @RequestBody RegisterRequest req, HttpServletRequest request,
      HttpServletResponse response) {
    assertTrustedOrigin(request);
    if (users.existsByEmail(req.email()))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");

    AccountType type = req.accountType() == null ? AccountType.BUYER : req.accountType();
    boolean seller = type == AccountType.SELLER;
    if (seller && (req.storeName() == null || req.storeName().isBlank()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Store name is required for sellers");

    Role role = roles.findByName(seller ? "SELLER" : "BUYER")
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Default role missing"));

    User user = new User();
    user.setEmail(req.email());
    user.setPasswordHash(encoder.encode(req.password()));
    if (seller) {
      user.setStoreName(req.storeName().trim());
      user.setCommissionPercent(commissions.defaultPercent());
    }
    user.getRoles().add(role);
    users.save(user);
    startSession(user, request, response);
  }

  @PostMapping("/login")
  @Transactional(readOnly = true)
  public void login(@Valid @RequestBody AuthRequest req, HttpServletRequest request,
      HttpServletResponse response) {
    assertTrustedOrigin(request);
    User user = users.findByEmail(req.email())
        .filter(candidate -> encoder.matches(req.password(), candidate.getPasswordHash()))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bad credentials"));
    startSession(user, request, response);
  }

  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(HttpServletRequest request) {
    assertTrustedOrigin(request);
    SecurityContextHolder.clearContext();
    if (request.getSession(false) != null) {
      request.getSession(false).invalidate();
    }
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

  private void startSession(User user, HttpServletRequest request, HttpServletResponse response) {
    Set<Permission> permissions = user.getRoles().stream()
        .flatMap(role -> role.getPermissions().stream())
        .collect(Collectors.toSet());
    List<SimpleGrantedAuthority> authorities = permissions.stream()
        .map(Permission::name)
        .map(SimpleGrantedAuthority::new)
        .toList();
    Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(user.getEmail(), null, authorities);
    sessionAuthenticationStrategy.onAuthentication(authentication, request, response);

    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);
    SecurityContextHolder.setContext(context);
    securityContexts.saveContext(context, request, response);
  }
}

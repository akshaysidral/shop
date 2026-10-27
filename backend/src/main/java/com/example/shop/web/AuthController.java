package com.example.shop.web;

import com.example.shop.model.AccountType;
import com.example.shop.model.Role;
import com.example.shop.model.User;
import com.example.shop.repo.RoleRepository;
import com.example.shop.repo.UserRepository;
import com.example.shop.security.JwtService;
import com.example.shop.service.CommissionService;
import com.example.shop.web.Dtos.AuthRequest;
import com.example.shop.web.Dtos.AuthResponse;
import com.example.shop.web.Dtos.RegisterRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
  private final JwtService jwt;
  private final CommissionService commissions;

  /**
   * Self-registration as a BUYER (default) or SELLER. ADMIN can never be chosen
   * here.
   */
  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
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
    return new AuthResponse(jwt.generate(u.getEmail()));
  }

  @PostMapping("/login")
  public AuthResponse login(@Valid @RequestBody AuthRequest req) {
    User u = users.findByEmail(req.email())
        .filter(x -> encoder.matches(req.password(), x.getPasswordHash()))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bad credentials"));
    return new AuthResponse(jwt.generate(u.getEmail()));
  }
}

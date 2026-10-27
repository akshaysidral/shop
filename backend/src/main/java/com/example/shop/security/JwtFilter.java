package com.example.shop.security;

import com.example.shop.repo.UserRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Validates the JWT, then loads the user's CURRENT permissions from the
 * database.
 * Because permissions are not stored in the token, role changes take effect on
 * the very next request.
 */
@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {
  private final JwtService jwt;
  private final UserRepository users;

  @Override
  protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {
    String h = req.getHeader("Authorization");
    if (h != null && h.startsWith("Bearer ")) {
      try {
        String email = jwt.subject(h.substring(7));
        users.findByEmail(email).ifPresent(u -> {
          Set<SimpleGrantedAuthority> authorities = u.getRoles().stream()
              .flatMap(r -> r.getPermissions().stream())
              .map(p -> new SimpleGrantedAuthority(p.name()))
              .collect(Collectors.toSet());
          SecurityContextHolder.getContext().setAuthentication(
              new UsernamePasswordAuthenticationToken(email, null, authorities));
        });
      } catch (JwtException | IllegalArgumentException ignored) {
        /* stays unauthenticated */ }
    }
    chain.doFilter(req, res);
  }
}

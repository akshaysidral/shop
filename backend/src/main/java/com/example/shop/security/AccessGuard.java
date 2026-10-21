package com.example.shop.security;

import com.example.shop.model.Permission;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Anti-escalation: nobody can grant or revoke a permission they do not hold themselves. */
@Component
public class AccessGuard {

  public void requireHolds(Collection<Permission> needed) {
    Authentication a = SecurityContextHolder.getContext().getAuthentication();
    Set<String> held = a == null ? Set.of()
        : a.getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toSet());
    List<String> missing = needed.stream().map(Permission::name)
        .filter(n -> !held.contains(n)).sorted().toList();
    if (!missing.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,
          "You cannot grant or revoke permissions you do not hold: " + missing);
    }
  }

  public boolean has(String permission) {
    Authentication a = SecurityContextHolder.getContext().getAuthentication();
    return a != null && a.getAuthorities().stream().anyMatch(g -> g.getAuthority().equals(permission));
  }

  public String currentEmail() {
    Authentication a = SecurityContextHolder.getContext().getAuthentication();
    return a == null ? null : a.getName();
  }
}

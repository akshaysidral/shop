package com.example.shop.security;

import com.example.shop.model.User;
import com.example.shop.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** The logged-in user as a database entity. */
@Component
@RequiredArgsConstructor
public class CurrentUser {
  private final UserRepository users;

  public User require() {
    Authentication a = SecurityContextHolder.getContext().getAuthentication();
    if (a == null)
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    return users.findByEmail(a.getName())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
  }
}

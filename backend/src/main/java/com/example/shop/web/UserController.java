package com.example.shop.web;

import com.example.shop.service.UserService;
import com.example.shop.web.Dtos.AssignRolesRequest;
import com.example.shop.web.Dtos.UserResponse;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api") @RequiredArgsConstructor
public class UserController {
  private final UserService service;

  /** Any logged-in user: who am I and what may I do? (the UI uses this to show/hide buttons) */
  @GetMapping("/me")
  public UserResponse me(Principal me) { return service.me(me.getName()); }

  @GetMapping("/users") @PreAuthorize("hasAuthority('USERS_READ')")
  public List<UserResponse> list() { return service.list(); }

  @GetMapping("/users/{id}") @PreAuthorize("hasAuthority('USERS_READ')")
  public UserResponse get(@PathVariable Long id) { return service.get(id); }

  @PutMapping("/users/{id}/roles") @PreAuthorize("hasAuthority('USERS_UPDATE')")
  public UserResponse setRoles(@PathVariable Long id, @Valid @RequestBody AssignRolesRequest req) {
    return service.setRoles(id, req.roleIds());
  }

  @DeleteMapping("/users/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasAuthority('USERS_DELETE')")
  public void delete(@PathVariable Long id) { service.delete(id); }
}

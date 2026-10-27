package com.example.shop.web;

import com.example.shop.model.Permission;
import com.example.shop.service.RoleService;
import com.example.shop.web.Dtos.RoleRequest;
import com.example.shop.web.Dtos.RoleResponse;
import jakarta.validation.Valid;
import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RoleController {
  private final RoleService service;

  @GetMapping("/permissions")
  @PreAuthorize("hasAuthority('ROLES_READ')")
  public List<String> permissions() {
    return Arrays.stream(Permission.values()).map(Permission::name).toList();
  }

  @GetMapping("/roles")
  @PreAuthorize("hasAuthority('ROLES_READ')")
  public List<RoleResponse> list() {
    return service.list();
  }

  @GetMapping("/roles/{id}")
  @PreAuthorize("hasAuthority('ROLES_READ')")
  public RoleResponse get(@PathVariable Long id) {
    return service.get(id);
  }

  @PostMapping("/roles")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('ROLES_CREATE')")
  public RoleResponse create(@Valid @RequestBody RoleRequest req) {
    return service.create(req);
  }

  @PutMapping("/roles/{id}")
  @PreAuthorize("hasAuthority('ROLES_UPDATE')")
  public RoleResponse update(@PathVariable Long id, @Valid @RequestBody RoleRequest req) {
    return service.update(id, req);
  }

  @DeleteMapping("/roles/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasAuthority('ROLES_DELETE')")
  public void delete(@PathVariable Long id) {
    service.delete(id);
  }
}

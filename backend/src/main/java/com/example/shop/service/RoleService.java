package com.example.shop.service;

import com.example.shop.model.Permission;
import com.example.shop.model.Role;
import com.example.shop.repo.RoleRepository;
import com.example.shop.repo.UserRepository;
import com.example.shop.security.AccessGuard;
import com.example.shop.web.Dtos.RoleRequest;
import com.example.shop.web.Dtos.RoleResponse;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class RoleService {
  public static final String ADMIN = "ADMIN";

  private final RoleRepository roles;
  private final UserRepository users;
  private final AccessGuard guard;

  @Transactional(readOnly = true)
  public List<RoleResponse> list() {
    return roles.findAll(Sort.by("name")).stream().map(RoleResponse::from).toList();
  }

  @Transactional(readOnly = true)
  public RoleResponse get(Long id) {
    return RoleResponse.from(find(id));
  }

  @Transactional
  public RoleResponse create(RoleRequest req) {
    guard.requireHolds(req.permissions()); // cannot hand out what you do not have
    if (roles.existsByName(req.name()))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Role name already exists");
    Role role = new Role();
    role.setName(req.name());
    role.setDescription(req.description());
    role.getPermissions().addAll(req.permissions());
    return RoleResponse.from(roles.save(role));
  }

  @Transactional
  public RoleResponse update(Long id, RoleRequest req) {
    Role role = find(id);
    if (RoleService.ADMIN.equals(role.getName()))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "The ADMIN role cannot be modified");
    boolean renamed = !role.getName().equals(req.name());
    if (renamed && role.isBuiltIn())
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Built-in roles cannot be renamed");
    if (renamed && roles.existsByName(req.name()))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Role name already exists");

    guard.requireHolds(symmetricDifference(role.getPermissions(), req.permissions()));

    role.setName(req.name());
    role.setDescription(req.description());
    role.getPermissions().clear();
    role.getPermissions().addAll(req.permissions());
    return RoleResponse.from(roles.save(role));
  }

  @Transactional
  public void delete(Long id) {
    Role role = find(id);
    if (role.isBuiltIn())
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Built-in roles cannot be deleted");
    if (users.existsByRoles_Id(id))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Role is assigned to users; unassign it first");
    guard.requireHolds(role.getPermissions());
    roles.delete(role);
  }

  private Role find(Long id) {
    return roles.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
  }

  private static Set<Permission> symmetricDifference(Set<Permission> a, Set<Permission> b) {
    Set<Permission> all = new HashSet<>(a);
    all.addAll(b);
    Set<Permission> common = new HashSet<>(a);
    common.retainAll(b);
    all.removeAll(common);
    return all;
  }
}

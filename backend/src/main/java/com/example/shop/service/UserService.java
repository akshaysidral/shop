package com.example.shop.service;

import com.example.shop.model.Permission;
import com.example.shop.model.Role;
import com.example.shop.model.User;
import com.example.shop.repo.OrderRepository;
import com.example.shop.repo.RoleRepository;
import com.example.shop.repo.UserRepository;
import com.example.shop.security.AccessGuard;
import com.example.shop.web.Dtos.UserResponse;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserService {
  private final UserRepository users;
  private final RoleRepository roles;
  private final OrderRepository orders;
  private final AccessGuard guard;

  @Transactional(readOnly = true)
  public List<UserResponse> list() {
    return users.findAll(Sort.by("email")).stream().map(UserResponse::from).toList();
  }

  @Transactional(readOnly = true)
  public UserResponse get(Long id) {
    return UserResponse.from(find(id));
  }

  @Transactional(readOnly = true)
  public UserResponse me(String email) {
    return UserResponse.from(users.findByEmail(email)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED)));
  }

  @Transactional
  public UserResponse setRoles(Long id, Set<Long> roleIds) {
    User user = find(id);
    List<Role> found = roles.findAllById(roleIds);
    if (found.size() != roleIds.size())
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "One or more role ids do not exist");
    Set<Role> target = new HashSet<>(found);

    // roles being added or removed: caller must hold every permission those roles
    // carry
    Set<Role> changed = new HashSet<>(target);
    changed.addAll(user.getRoles());
    Set<Role> unchanged = new HashSet<>(target);
    unchanged.retainAll(user.getRoles());
    changed.removeAll(unchanged);
    guard.requireHolds(permissionsOf(changed));

    boolean hadAdmin = hasAdmin(user.getRoles());
    if (hadAdmin && !hasAdmin(target) && users.countByRoles_Name(RoleService.ADMIN) <= 1)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot remove the last ADMIN");

    user.getRoles().clear();
    user.getRoles().addAll(target);
    return UserResponse.from(users.save(user));
  }

  @Transactional
  public void delete(Long id) {
    User user = find(id);
    if (user.getEmail().equals(guard.currentEmail()))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot delete yourself");
    if (hasAdmin(user.getRoles()) && users.countByRoles_Name(RoleService.ADMIN) <= 1)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete the last ADMIN");
    if (orders.existsByUserId(id))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "User has orders and cannot be deleted");
    guard.requireHolds(permissionsOf(user.getRoles()));
    users.delete(user);
  }

  private User find(Long id) {
    return users.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
  }

  private static boolean hasAdmin(Set<Role> rs) {
    return rs.stream().anyMatch(r -> RoleService.ADMIN.equals(r.getName()));
  }

  private static Set<Permission> permissionsOf(Set<Role> rs) {
    return rs.stream().flatMap(r -> r.getPermissions().stream()).collect(Collectors.toSet());
  }
}

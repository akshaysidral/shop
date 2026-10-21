package com.example.shop;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.example.shop.model.Permission;
import com.example.shop.model.Role;
import com.example.shop.model.User;
import com.example.shop.repo.OrderRepository;
import com.example.shop.repo.RoleRepository;
import com.example.shop.repo.UserRepository;
import com.example.shop.security.AccessGuard;
import com.example.shop.service.UserService;
import com.example.shop.web.Dtos.UserResponse;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {
  @Mock UserRepository users;
  @Mock RoleRepository roles;
  @Mock OrderRepository orders;
  @Mock AccessGuard guard;
  @InjectMocks UserService service;

  private static Role role(long id, String name, Permission... perms) {
    Role r = new Role();
    r.setId(id);
    r.setName(name);
    r.getPermissions().addAll(List.of(perms));
    return r;
  }

  private static User user(long id, String email, Role... roles) {
    User u = new User();
    u.setId(id);
    u.setEmail(email);
    u.getRoles().addAll(List.of(roles));
    return u;
  }

  private static HttpStatus statusOf(Runnable r) {
    return (HttpStatus) assertThrows(ResponseStatusException.class, r::run).getStatusCode();
  }

  @Test void listAndGetMapToResponses() {
    when(users.findAll(any(Sort.class))).thenReturn(List.of(user(1, "a@t.com"), user(2, "b@t.com")));
    when(users.findById(1L)).thenReturn(Optional.of(user(1, "a@t.com")));
    assertEquals(2, service.list().size());
    assertEquals("a@t.com", service.get(1L).email());
  }

  @Test void getUnknownUserIsNotFound() {
    when(users.findById(404L)).thenReturn(Optional.empty());
    assertEquals(HttpStatus.NOT_FOUND, statusOf(() -> service.get(404L)));
  }

  @Test void meReturnsTheLoggedInUser() {
    Role seller = role(2, "SELLER", Permission.PRODUCTS_CREATE);
    when(users.findByEmail("s@t.com")).thenReturn(Optional.of(user(5, "s@t.com", seller)));
    UserResponse r = service.me("s@t.com");
    assertEquals(List.of("SELLER"), r.roles());
    assertEquals(List.of("PRODUCTS_CREATE"), r.permissions());
  }

  @Test void meForAnUnknownEmailIsUnauthorized() {
    when(users.findByEmail("ghost@t.com")).thenReturn(Optional.empty());
    assertEquals(HttpStatus.UNAUTHORIZED, statusOf(() -> service.me("ghost@t.com")));
  }

  // ---------------- setRoles ----------------
  @Test void rolesAreReplacedAndTheCallerMustHoldTheChangedPermissions() {
    Role buyer = role(1, "BUYER");
    Role seller = role(2, "SELLER", Permission.PRODUCTS_CREATE);
    when(users.findById(5L)).thenReturn(Optional.of(user(5, "u@t.com", buyer)));
    when(roles.findAllById(Set.of(2L))).thenReturn(List.of(seller));
    when(users.save(any())).thenAnswer(inv -> inv.getArgument(0));

    UserResponse r = service.setRoles(5L, Set.of(2L));

    verify(guard).requireHolds(Set.of(Permission.PRODUCTS_CREATE));    // BUYER carries none, SELLER carries one
    assertEquals(List.of("SELLER"), r.roles());
  }

  @Test void unknownRoleIdsAreNotFound() {
    when(users.findById(5L)).thenReturn(Optional.of(user(5, "u@t.com")));
    when(roles.findAllById(Set.of(99L))).thenReturn(List.of());
    assertEquals(HttpStatus.NOT_FOUND, statusOf(() -> service.setRoles(5L, Set.of(99L))));
  }

  @Test void theLastAdminCannotBeDemoted() {
    Role admin = role(1, "ADMIN", Permission.ROLES_READ);
    when(users.findById(5L)).thenReturn(Optional.of(user(5, "root@t.com", admin)));
    when(roles.findAllById(Set.of())).thenReturn(List.of());
    when(users.countByRoles_Name("ADMIN")).thenReturn(1L);

    assertEquals(HttpStatus.CONFLICT, statusOf(() -> service.setRoles(5L, Set.of())));
    verify(users, never()).save(any());
  }

  @Test void anAdminCanBeDemotedWhenAnotherAdminExists() {
    Role admin = role(1, "ADMIN", Permission.ROLES_READ);
    when(users.findById(5L)).thenReturn(Optional.of(user(5, "root@t.com", admin)));
    when(roles.findAllById(Set.of())).thenReturn(List.of());
    when(users.countByRoles_Name("ADMIN")).thenReturn(2L);
    when(users.save(any())).thenAnswer(inv -> inv.getArgument(0));

    assertTrue(service.setRoles(5L, Set.of()).roles().isEmpty());
  }

  // ---------------- delete ----------------
  @Test void youCannotDeleteYourself() {
    when(users.findById(5L)).thenReturn(Optional.of(user(5, "me@t.com")));
    when(guard.currentEmail()).thenReturn("me@t.com");
    assertEquals(HttpStatus.CONFLICT, statusOf(() -> service.delete(5L)));
  }

  @Test void theLastAdminCannotBeDeleted() {
    Role admin = role(1, "ADMIN");
    when(users.findById(5L)).thenReturn(Optional.of(user(5, "root@t.com", admin)));
    when(guard.currentEmail()).thenReturn("other@t.com");
    when(users.countByRoles_Name("ADMIN")).thenReturn(1L);
    assertEquals(HttpStatus.CONFLICT, statusOf(() -> service.delete(5L)));
  }

  @Test void usersWithOrdersCannotBeDeleted() {
    when(users.findById(5L)).thenReturn(Optional.of(user(5, "buyer@t.com")));
    when(guard.currentEmail()).thenReturn("admin@t.com");
    when(orders.existsByUserId(5L)).thenReturn(true);
    assertEquals(HttpStatus.CONFLICT, statusOf(() -> service.delete(5L)));
    verify(users, never()).delete(any());
  }

  @Test void aUserWithoutOrdersCanBeDeleted() {
    Role buyer = role(1, "BUYER", Permission.ROLES_READ);
    User u = user(5, "buyer@t.com", buyer);
    when(users.findById(5L)).thenReturn(Optional.of(u));
    when(guard.currentEmail()).thenReturn("admin@t.com");
    when(orders.existsByUserId(5L)).thenReturn(false);

    service.delete(5L);

    verify(guard).requireHolds(Set.of(Permission.ROLES_READ));
    verify(users).delete(u);
  }
}

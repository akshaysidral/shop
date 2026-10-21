package com.example.shop;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.example.shop.model.Permission;
import com.example.shop.model.Role;
import com.example.shop.repo.RoleRepository;
import com.example.shop.repo.UserRepository;
import com.example.shop.security.AccessGuard;
import com.example.shop.service.RoleService;
import com.example.shop.web.Dtos.RoleRequest;
import com.example.shop.web.Dtos.RoleResponse;
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
class RoleServiceTest {
  @Mock RoleRepository roles;
  @Mock UserRepository users;
  @Mock AccessGuard guard;
  @InjectMocks RoleService service;

  private static Role role(long id, String name, boolean builtIn, Permission... perms) {
    Role r = new Role();
    r.setId(id);
    r.setName(name);
    r.setBuiltIn(builtIn);
    r.getPermissions().addAll(List.of(perms));
    return r;
  }

  private static RoleRequest request(String name, Permission... perms) {
    return new RoleRequest(name, "d", Set.of(perms));
  }

  @Test void listComesBackSorted() {
    when(roles.findAll(any(Sort.class))).thenReturn(List.of(role(1, "A", false), role(2, "B", false)));
    assertEquals(2, service.list().size());
  }

  @Test void getUnknownRoleIsNotFound() {
    when(roles.findById(404L)).thenReturn(Optional.empty());
    assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class, () -> service.get(404L)).getStatusCode());
  }

  // ---------------- create ----------------
  @Test void createSavesTheRoleWithItsPermissions() {
    when(roles.existsByName("CATALOG_EDITOR")).thenReturn(false);
    when(roles.save(any())).thenAnswer(inv -> inv.getArgument(0));

    RoleResponse r = service.create(request("CATALOG_EDITOR", Permission.PRODUCTS_UPDATE, Permission.PRODUCTS_DELETE));

    assertEquals("CATALOG_EDITOR", r.name());
    assertEquals(List.of(Permission.PRODUCTS_UPDATE, Permission.PRODUCTS_DELETE), r.permissions());
    assertFalse(r.builtIn());
  }

  @Test void duplicateNamesAreRejected() {
    when(roles.existsByName("TAKEN")).thenReturn(true);
    ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.create(request("TAKEN")));
    assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
  }

  @Test void youCannotGrantPermissionsYouDoNotHold() {
    doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "no")).when(guard).requireHolds(any());

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.create(request("SNEAKY", Permission.ORDERS_DELETE)));

    assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    verify(roles, never()).save(any());
  }

  // ---------------- update ----------------
  @Test void adminRoleCannotBeModified() {
    when(roles.findById(1L)).thenReturn(Optional.of(role(1, "ADMIN", true, Permission.ROLES_READ)));
    ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.update(1L, request("ADMIN")));
    assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
  }

  @Test void builtInRolesCannotBeRenamed() {
    when(roles.findById(2L)).thenReturn(Optional.of(role(2, "BUYER", true)));
    ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.update(2L, request("CUSTOMER")));
    assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
  }

  @Test void renamingToAnExistingNameIsRejected() {
    when(roles.findById(3L)).thenReturn(Optional.of(role(3, "MINE", false)));
    when(roles.existsByName("TAKEN")).thenReturn(true);
    ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.update(3L, request("TAKEN")));
    assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
  }

  @Test void updateChecksTheCallerHoldsEveryAddedOrRemovedPermission() {
    when(roles.findById(3L)).thenReturn(Optional.of(role(3, "MINE", false, Permission.PRODUCTS_CREATE)));
    when(roles.save(any())).thenAnswer(inv -> inv.getArgument(0));

    RoleResponse r = service.update(3L, request("MINE", Permission.PRODUCTS_UPDATE));

    verify(guard).requireHolds(Set.of(Permission.PRODUCTS_CREATE, Permission.PRODUCTS_UPDATE));
    assertEquals(List.of(Permission.PRODUCTS_UPDATE), r.permissions());
  }

  @Test void updatingAnUnknownRoleIsNotFound() {
    when(roles.findById(404L)).thenReturn(Optional.empty());
    assertThrows(ResponseStatusException.class, () -> service.update(404L, request("X")));
  }

  // ---------------- delete ----------------
  @Test void builtInRolesCannotBeDeleted() {
    when(roles.findById(2L)).thenReturn(Optional.of(role(2, "BUYER", true)));
    assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class, () -> service.delete(2L)).getStatusCode());
  }

  @Test void rolesStillAssignedToUsersCannotBeDeleted() {
    when(roles.findById(3L)).thenReturn(Optional.of(role(3, "MINE", false)));
    when(users.existsByRoles_Id(3L)).thenReturn(true);
    assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class, () -> service.delete(3L)).getStatusCode());
    verify(roles, never()).delete(any());
  }

  @Test void unusedCustomRoleCanBeDeleted() {
    Role r = role(3, "MINE", false, Permission.PRODUCTS_CREATE);
    when(roles.findById(3L)).thenReturn(Optional.of(r));
    when(users.existsByRoles_Id(3L)).thenReturn(false);

    service.delete(3L);

    verify(guard).requireHolds(Set.of(Permission.PRODUCTS_CREATE));
    verify(roles).delete(r);
  }
}

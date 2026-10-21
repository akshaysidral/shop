package com.example.shop;

import static org.junit.jupiter.api.Assertions.*;

import com.example.shop.model.Permission;
import com.example.shop.security.AccessGuard;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

class AccessGuardTest {
  private final AccessGuard guard = new AccessGuard();

  @AfterEach void clear() { SecurityContextHolder.clearContext(); }

  private static void loginAs(String email, String... authorities) {
    SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(email, null,
        Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList()));
  }

  @Test void passesWhenEveryPermissionIsHeld() {
    loginAs("a@b.com", "PRODUCTS_CREATE", "OFFERS_MANAGE");
    assertDoesNotThrow(() -> guard.requireHolds(List.of(Permission.PRODUCTS_CREATE, Permission.OFFERS_MANAGE)));
  }

  @Test void refusesAndListsWhatIsMissing() {
    loginAs("a@b.com", "PRODUCTS_CREATE");
    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> guard.requireHolds(List.of(Permission.PRODUCTS_CREATE, Permission.ORDERS_DELETE, Permission.COMMISSION_MANAGE)));
    assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    assertTrue(ex.getReason().contains("COMMISSION_MANAGE"));
    assertTrue(ex.getReason().contains("ORDERS_DELETE"));
    assertFalse(ex.getReason().contains("PRODUCTS_CREATE"));
  }

  @Test void nothingNeededAlwaysPasses() {
    assertDoesNotThrow(() -> guard.requireHolds(List.of()));
  }

  @Test void anonymousCallersHoldNothing() {
    assertThrows(ResponseStatusException.class, () -> guard.requireHolds(List.of(Permission.ROLES_READ)));
  }

  @Test void hasReportsASinglePermission() {
    loginAs("a@b.com", "OFFERS_MANAGE");
    assertTrue(guard.has("OFFERS_MANAGE"));
    assertFalse(guard.has("OFFERS_MANAGE_ALL"));
  }

  @Test void hasIsFalseWhenNobodyIsLoggedIn() {
    assertFalse(guard.has("OFFERS_MANAGE"));
  }

  @Test void currentEmailComesFromTheLoginOrIsNull() {
    assertNull(guard.currentEmail());
    loginAs("who@b.com");
    assertEquals("who@b.com", guard.currentEmail());
  }
}

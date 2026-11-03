package com.example.shop;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(MockCsrfConfig.class)
class AuthFlowTest {
  @Autowired MockMvc mvc;

  private static String json(String email, String password) {
    return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
  }

  @Test void duplicateRegistrationReturnsConflict() throws Exception {
    mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
        .content(json("dup@b.com", "secret1"))).andExpect(status().isCreated());
    mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
        .content(json("dup@b.com", "secret1"))).andExpect(status().isConflict());
  }

  @Test void loginWithWrongPasswordIsUnauthorized() throws Exception {
    mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
        .content(json("login@b.com", "secret1"))).andExpect(status().isCreated());
    mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
        .content(json("login@b.com", "wrong-pw"))).andExpect(status().isUnauthorized());
  }

  @Test void invalidEmailIsRejected() throws Exception {
    mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
        .content(json("not-an-email", "secret1"))).andExpect(status().isBadRequest());
  }

  @Test void registrationCreatesServerSessionWithoutReturningIdentityClaimsOrAToken() throws Exception {
    MvcResult result = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
        .content(json("session-register@b.com", "secret1")))
        .andExpect(status().isCreated())
        .andExpect(cookie().exists("SHOP_SESSION"))
        .andExpect(cookie().httpOnly("SHOP_SESSION", true))
        .andReturn();

    Cookie session = result.getResponse().getCookie("SHOP_SESSION");
    assertNotNull(session);
    assertFalse(result.getResponse().getContentAsString().contains("session-register@b.com"));
    assertFalse(result.getResponse().getContentAsString().contains("."));

    mvc.perform(get("/api/me").cookie(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value("session-register@b.com"));
  }

  @Test void loginCreatesASessionAndLogoutInvalidatesIt() throws Exception {
    mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
        .content(json("session-logout@b.com", "secret1"))).andExpect(status().isCreated());
    MvcResult login = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
        .content(json("session-logout@b.com", "secret1")))
        .andExpect(status().isOk())
        .andExpect(cookie().httpOnly("SHOP_SESSION", true))
        .andReturn();

    Cookie session = login.getResponse().getCookie("SHOP_SESSION");
    assertNotNull(session);
    mvc.perform(post("/api/auth/logout").cookie(session))
        .andExpect(status().isNoContent());
    mvc.perform(get("/api/me").cookie(session)).andExpect(status().isUnauthorized());
  }

  @Test void unsafeRequestsRequireCsrfProtection() throws Exception {
    mvc.perform(post("/api/auth/register")
        .header("X-XSRF-TOKEN", "missing-cookie")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json("csrf-failure@b.com", "secret1")))
        .andExpect(status().isForbidden());
  }
}

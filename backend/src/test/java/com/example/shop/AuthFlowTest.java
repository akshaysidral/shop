package com.example.shop;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import jakarta.servlet.http.Cookie;
import java.util.Objects;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class AuthFlowTest {
  @Autowired MockMvc mvc;

  private static String json(String email, String pw) {
    return "{\"email\":\"" + email + "\",\"password\":\"" + pw + "\"}";
  }

  @Test void duplicateRegistrationReturnsConflict() throws Exception {
    mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json("dup@b.com", "secret1")))
        .andExpect(status().isCreated());
    mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json("dup@b.com", "secret1")))
        .andExpect(status().isConflict());
  }

  @Test void loginWithWrongPasswordIsUnauthorized() throws Exception {
    mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json("login@b.com", "secret1")))
        .andExpect(status().isCreated());
    mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json("login@b.com", "wrong-pw")))
        .andExpect(status().isUnauthorized());
  }

  @Test void invalidEmailIsRejected() throws Exception {
    mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json("not-an-email", "secret1")))
        .andExpect(status().isBadRequest());
  }

  @Test void registrationIssuesAccessTokenAndHttpOnlyRefreshCookie() throws Exception {
    mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
        .content(json("refresh-register@b.com", "secret1")))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.token").isNotEmpty())
        .andExpect(cookie().exists("refresh_token"))
        .andExpect(cookie().httpOnly("refresh_token", true));
  }

  @Test void refreshRotatesCookieAndRevokesReusedTokenFamily() throws Exception {
    Cookie initial = registerAndGetRefreshCookie("refresh-rotate@b.com");

    MvcResult refreshResult = mvc.perform(post("/api/auth/refresh").cookie(initial))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").isNotEmpty())
        .andExpect(cookie().exists("refresh_token"))
        .andReturn();
    Cookie rotated = refreshResult.getResponse().getCookie("refresh_token");
    org.junit.jupiter.api.Assertions.assertNotNull(rotated);
    org.junit.jupiter.api.Assertions.assertNotEquals(initial.getValue(), rotated.getValue());

    mvc.perform(post("/api/auth/refresh").cookie(initial)).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/auth/refresh").cookie(rotated)).andExpect(status().isUnauthorized());
  }

  @Test void logoutRevokesRefreshTokenAndClearsCookie() throws Exception {
    Cookie refreshToken = registerAndGetRefreshCookie("refresh-logout@b.com");

    MockHttpServletResponse response = mvc.perform(post("/api/auth/logout").cookie(refreshToken))
        .andExpect(status().isNoContent())
        .andExpect(cookie().maxAge("refresh_token", 0))
        .andReturn()
        .getResponse();
    org.junit.jupiter.api.Assertions.assertTrue(
        Objects.requireNonNull(response.getCookie("refresh_token")).isHttpOnly());
    mvc.perform(post("/api/auth/refresh").cookie(refreshToken)).andExpect(status().isUnauthorized());
  }

  @Test void refreshRejectsUntrustedOriginWithoutConsumingToken() throws Exception {
    Cookie refreshToken = registerAndGetRefreshCookie("refresh-origin@b.com");

    mvc.perform(post("/api/auth/refresh").cookie(refreshToken).header("Origin", "https://evil.example"))
        .andExpect(status().isForbidden());
    mvc.perform(post("/api/auth/refresh").cookie(refreshToken)).andExpect(status().isOk());
  }

  private Cookie registerAndGetRefreshCookie(String email) throws Exception {
    MockHttpServletResponse response = mvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json(email, "secret1")))
        .andExpect(status().isCreated())
        .andReturn()
        .getResponse();
    Cookie cookie = response.getCookie("refresh_token");
    org.junit.jupiter.api.Assertions.assertNotNull(cookie);
    return cookie;
  }
}

package com.example.shop;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

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
}

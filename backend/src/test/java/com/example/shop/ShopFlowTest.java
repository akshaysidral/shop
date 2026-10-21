package com.example.shop;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
class ShopFlowTest {
  @Autowired MockMvc mvc;

  @Test void productsArePublic() throws Exception {
    mvc.perform(get("/api/products")).andExpect(status().isOk());
  }

  @Test void ordersRequireAuth() throws Exception {
    mvc.perform(get("/api/orders")).andExpect(status().isUnauthorized());
  }

  @Test void registerThenListOrders() throws Exception {
    String body = "{\"email\":\"a@b.com\",\"password\":\"secret1\"}";
    String res = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    String token = res.replaceAll(".*\"token\":\"([^\"]+)\".*", "$1");
    mvc.perform(get("/api/orders").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
  }
}

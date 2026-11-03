package com.example.shop;

import jakarta.servlet.http.Cookie;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@TestConfiguration
public class MockCsrfConfig {
  @Bean
  MockMvcBuilderCustomizer csrfDefaults() {
    return builder -> builder.defaultRequest(get("/")
        .cookie(new Cookie("XSRF-TOKEN", "test-csrf-token"))
        .header("X-XSRF-TOKEN", "test-csrf-token"));
  }
}

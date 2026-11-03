package com.example.shop;

import jakarta.servlet.http.Cookie;
import java.util.Objects;
import org.springframework.mock.web.MockHttpServletResponse;

final class TestSessions {
  private TestSessions() {
  }

  static String sessionId(MockHttpServletResponse response) {
    Cookie cookie = Objects.requireNonNull(response.getCookie("SHOP_SESSION"), "session cookie");
    return cookie.getValue();
  }

  static Cookie sessionCookie(String sessionId) {
    return new Cookie("SHOP_SESSION", sessionId);
  }
}

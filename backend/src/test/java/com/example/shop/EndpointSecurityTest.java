package com.example.shop;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** One table of every protected endpoint: anonymous callers get 401, plain buyers get 403 where a permission is needed. */
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @TestInstance(TestInstance.Lifecycle.PER_CLASS)
class EndpointSecurityTest {
  @Autowired MockMvc mvc;

  private static final MediaType JSON = MediaType.APPLICATION_JSON;
  private static final String OFFER = "{\"name\":\"S\",\"discountPercent\":10,\"startsAt\":\"2030-01-01T00:00:00Z\","
      + "\"endsAt\":\"2030-01-02T00:00:00Z\",\"active\":true,\"appliesToAll\":true,\"productIds\":[]}";
  private static final String PRODUCT = "{\"name\":\"X\",\"price\":10,\"stock\":1}";
  private static final String ROLE = "{\"name\":\"X_ROLE\",\"permissions\":[]}";
  private static final String STATUS = "{\"status\":\"SHIPPED\"}";

  /** Any logged-in user may call these, so buyers are not refused. */
  private static final Set<String> LOGGED_IN_ONLY = Set.of("GET /api/me", "GET /api/orders", "POST /api/orders");

  record Endpoint(String method, String path, String body) {
    @Override public String toString() { return method + " " + path; }
  }

  private String buyerToken;

  @BeforeAll void registerBuyer() throws Exception {
    String res = mvc.perform(post("/api/auth/register").contentType(JSON)
        .content("{\"email\":\"endpoint-buyer@t.com\",\"password\":\"secret1\"}"))
        .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    buyerToken = JsonPath.read(res, "$.token");
  }

  static Stream<Endpoint> protectedEndpoints() {
    return Stream.of(
        new Endpoint("GET", "/api/me", null),
        new Endpoint("GET", "/api/users", null),
        new Endpoint("GET", "/api/users/1", null),
        new Endpoint("PUT", "/api/users/1/roles", "{\"roleIds\":[]}"),
        new Endpoint("DELETE", "/api/users/1", null),
        new Endpoint("GET", "/api/roles", null),
        new Endpoint("GET", "/api/roles/1", null),
        new Endpoint("GET", "/api/permissions", null),
        new Endpoint("POST", "/api/roles", ROLE),
        new Endpoint("PUT", "/api/roles/1", ROLE),
        new Endpoint("DELETE", "/api/roles/1", null),
        new Endpoint("POST", "/api/products", PRODUCT),
        new Endpoint("PUT", "/api/products/1", PRODUCT),
        new Endpoint("DELETE", "/api/products/1", null),
        new Endpoint("POST", "/api/categories", "{\"name\":\"X\"}"),
        new Endpoint("PUT", "/api/categories/1", "{\"name\":\"X\"}"),
        new Endpoint("DELETE", "/api/categories/1", null),
        new Endpoint("GET", "/api/offers", null),
        new Endpoint("POST", "/api/offers", OFFER),
        new Endpoint("PUT", "/api/offers/1", OFFER),
        new Endpoint("DELETE", "/api/offers/1", null),
        new Endpoint("GET", "/api/orders", null),
        new Endpoint("POST", "/api/orders", "{\"items\":[{\"productId\":1,\"quantity\":1}]}"),
        new Endpoint("GET", "/api/orders/all", null),
        new Endpoint("PATCH", "/api/orders/1/status", STATUS),
        new Endpoint("DELETE", "/api/orders/1", null),
        new Endpoint("GET", "/api/seller/products", null),
        new Endpoint("GET", "/api/seller/orders", null),
        new Endpoint("GET", "/api/seller/earnings", null),
        new Endpoint("PATCH", "/api/seller/orders/1/items/1/status", STATUS),
        new Endpoint("GET", "/api/admin/stats", null),
        new Endpoint("GET", "/api/admin/sellers", null),
        new Endpoint("PUT", "/api/admin/sellers/1/commission", "{\"percent\":4}"));
  }

  static Stream<Endpoint> permissionEndpoints() {
    return protectedEndpoints().filter(e -> !LOGGED_IN_ONLY.contains(e.toString()));
  }

  private static MockHttpServletRequestBuilder build(Endpoint e) {
    MockHttpServletRequestBuilder b = request(HttpMethod.valueOf(e.method()), e.path());
    if (e.body() != null) b.contentType(JSON).content(e.body());
    return b;
  }

  @ParameterizedTest(name = "{0} needs a login") @MethodSource("protectedEndpoints")
  void anonymousCallersAreUnauthorized(Endpoint e) throws Exception {
    mvc.perform(build(e)).andExpect(status().isUnauthorized());
  }

  @ParameterizedTest(name = "{0} needs a permission buyers lack") @MethodSource("permissionEndpoints")
  void buyersAreForbidden(Endpoint e) throws Exception {
    mvc.perform(build(e).header("Authorization", "Bearer " + buyerToken)).andExpect(status().isForbidden());
  }

  @ParameterizedTest(name = "{0} is open to any logged-in user") @MethodSource("protectedEndpoints")
  void loggedInOnlyEndpointsAreNotRefusedToBuyers(Endpoint e) throws Exception {
    if (!LOGGED_IN_ONLY.contains(e.toString())) return;
    int status = mvc.perform(build(e).header("Authorization", "Bearer " + buyerToken)).andReturn().getResponse().getStatus();
    assertNotEquals(401, status);
    assertNotEquals(403, status);
  }

  @Test void theCatalogueIsPublic() throws Exception {
    for (String path : new String[] { "/api/products", "/api/categories", "/api/offers/active", "/actuator/health" }) {
      mvc.perform(get(path)).andExpect(status().isOk());
    }
  }
}

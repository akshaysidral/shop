package com.example.shop;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** End-to-end tests of the permission model: roles, assignment, products, orders. */
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class RbacFlowTest {
  @Autowired MockMvc mvc;

  private static final MediaType JSON = MediaType.APPLICATION_JSON;
  private static final String PRODUCT = "{\"name\":\"X\",\"description\":\"d\",\"price\":10,\"stock\":1}";
  private static final String ROLE_BODY = "{\"name\":\"%s\",\"description\":\"d\",\"permissions\":[%s]}";

  // ---------------- helpers ----------------
  private static String bearer(String token) { return "Bearer " + token; }
  private static String unique(String prefix) { return prefix + System.nanoTime(); }
  private static String cred(String email, String pw) { return "{\"email\":\"" + email + "\",\"password\":\"" + pw + "\"}"; }
  private static String quoted(String... xs) { return Arrays.stream(xs).map(x -> "\"" + x + "\"").collect(Collectors.joining(",")); }

  private String adminToken() throws Exception {
    String res = mvc.perform(post("/api/auth/login").contentType(JSON).content(cred("root@test.local", "Root@12345")))
        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    return JsonPath.read(res, "$.token");
  }

  private String register(String email) throws Exception {
    String res = mvc.perform(post("/api/auth/register").contentType(JSON).content(cred(email, "secret1")))
        .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    return JsonPath.read(res, "$.token");
  }

  private long userId(String admin, String email) throws Exception {
    String res = mvc.perform(get("/api/users").header("Authorization", bearer(admin)))
        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    List<Integer> ids = JsonPath.read(res, "$[?(@.email=='" + email + "')].id");
    return ids.get(0);
  }

  private long roleId(String admin, String name) throws Exception {
    String res = mvc.perform(get("/api/roles").header("Authorization", bearer(admin)))
        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    List<Integer> ids = JsonPath.read(res, "$[?(@.name=='" + name + "')].id");
    return ids.get(0);
  }

  private long createRole(String token, String name, String... perms) throws Exception {
    String res = mvc.perform(post("/api/roles").header("Authorization", bearer(token)).contentType(JSON)
            .content(String.format(ROLE_BODY, name, quoted(perms))))
        .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    return ((Number) JsonPath.read(res, "$.id")).longValue();
  }

  private void setRoles(String admin, long userId, long... roleIds) throws Exception {
    String ids = Arrays.stream(roleIds).mapToObj(String::valueOf).collect(Collectors.joining(","));
    mvc.perform(put("/api/users/" + userId + "/roles").header("Authorization", bearer(admin)).contentType(JSON)
            .content("{\"roleIds\":[" + ids + "]}"))
        .andExpect(status().isOk());
  }

  private long createProduct(String token, int stock) throws Exception {
    String res = mvc.perform(post("/api/products").header("Authorization", bearer(token)).contentType(JSON)
            .content("{\"name\":\"T\",\"description\":\"d\",\"price\":100,\"stock\":" + stock + "}"))
        .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    return ((Number) JsonPath.read(res, "$.id")).longValue();
  }

  // ---------------- tests ----------------
  @Test void plainUserHasNoManagementPermissions() throws Exception {
    String user = register(unique("plain") + "@b.com");
    mvc.perform(post("/api/products").header("Authorization", bearer(user)).contentType(JSON).content(PRODUCT))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/roles").header("Authorization", bearer(user))).andExpect(status().isForbidden());
    mvc.perform(get("/api/users").header("Authorization", bearer(user))).andExpect(status().isForbidden());
    mvc.perform(get("/api/orders/all").header("Authorization", bearer(user))).andExpect(status().isForbidden());
    mvc.perform(delete("/api/orders/1").header("Authorization", bearer(user))).andExpect(status().isForbidden());
  }

  @Test void anonymousIsUnauthorized() throws Exception {
    mvc.perform(post("/api/products").contentType(JSON).content(PRODUCT)).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/roles")).andExpect(status().isUnauthorized());
  }

  @Test void meEndpointListsRolesAndPermissions() throws Exception {
    mvc.perform(get("/api/me").header("Authorization", bearer(adminToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.roles", hasItem("ADMIN")))
        .andExpect(jsonPath("$.permissions", hasItem("ROLES_CREATE")));
  }

  @Test void roleCrudFlow() throws Exception {
    String admin = adminToken();
    String name = unique("CRUD_");
    long id = createRole(admin, name, "PRODUCTS_CREATE");

    mvc.perform(get("/api/roles/" + id).header("Authorization", bearer(admin)))
        .andExpect(status().isOk()).andExpect(jsonPath("$.name").value(name))
        .andExpect(jsonPath("$.permissions[0]").value("PRODUCTS_CREATE"));

    // duplicate name
    mvc.perform(post("/api/roles").header("Authorization", bearer(admin)).contentType(JSON)
            .content(String.format(ROLE_BODY, name, quoted("PRODUCTS_CREATE"))))
        .andExpect(status().isConflict());

    // update: rename + change permissions
    String renamed = unique("RENAMED_");
    mvc.perform(put("/api/roles/" + id).header("Authorization", bearer(admin)).contentType(JSON)
            .content(String.format(ROLE_BODY, renamed, quoted("PRODUCTS_UPDATE", "PRODUCTS_DELETE"))))
        .andExpect(status().isOk()).andExpect(jsonPath("$.name").value(renamed))
        .andExpect(jsonPath("$.permissions", hasItem("PRODUCTS_DELETE")));

    mvc.perform(delete("/api/roles/" + id).header("Authorization", bearer(admin))).andExpect(status().isNoContent());
    mvc.perform(get("/api/roles/" + id).header("Authorization", bearer(admin))).andExpect(status().isNotFound());
  }

  @Test void roleValidation() throws Exception {
    String admin = adminToken();
    mvc.perform(post("/api/roles").header("Authorization", bearer(admin)).contentType(JSON)
            .content(String.format(ROLE_BODY, "lower_case", quoted("PRODUCTS_CREATE"))))
        .andExpect(status().isBadRequest());
    mvc.perform(post("/api/roles").header("Authorization", bearer(admin)).contentType(JSON)
            .content(String.format(ROLE_BODY, unique("BAD_"), quoted("NOT_A_PERMISSION"))))
        .andExpect(status().isBadRequest());
  }

  @Test void builtInRolesAreProtected() throws Exception {
    String admin = adminToken();
    long adminRole = roleId(admin, "ADMIN");
    long userRole = roleId(admin, "BUYER");
    mvc.perform(delete("/api/roles/" + adminRole).header("Authorization", bearer(admin))).andExpect(status().isConflict());
    mvc.perform(delete("/api/roles/" + userRole).header("Authorization", bearer(admin))).andExpect(status().isConflict());
    mvc.perform(put("/api/roles/" + adminRole).header("Authorization", bearer(admin)).contentType(JSON)
            .content(String.format(ROLE_BODY, "ADMIN", quoted("ROLES_READ"))))
        .andExpect(status().isConflict());
  }

  @Test void grantedRoleGivesProductAccessImmediatelyAndRevokeRemovesIt() throws Exception {
    String admin = adminToken();
    String email = unique("pm") + "@b.com";
    String pm = register(email);
    long pmRole = createRole(admin, unique("PM_"), "PRODUCTS_CREATE", "PRODUCTS_UPDATE", "PRODUCTS_DELETE");

    mvc.perform(post("/api/products").header("Authorization", bearer(pm)).contentType(JSON).content(PRODUCT))
        .andExpect(status().isForbidden());

    long uid = userId(admin, email);
    setRoles(admin, uid, pmRole);       // same token, no re-login needed

    String created = mvc.perform(post("/api/products").header("Authorization", bearer(pm)).contentType(JSON).content(PRODUCT))
        .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    long pid = ((Number) JsonPath.read(created, "$.id")).longValue();
    mvc.perform(put("/api/products/" + pid).header("Authorization", bearer(pm)).contentType(JSON)
            .content("{\"name\":\"Y\",\"description\":\"d\",\"price\":20,\"stock\":2}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Y"));
    mvc.perform(delete("/api/products/" + pid).header("Authorization", bearer(pm))).andExpect(status().isNoContent());

    // a product manager still cannot manage roles
    mvc.perform(post("/api/roles").header("Authorization", bearer(pm)).contentType(JSON)
            .content(String.format(ROLE_BODY, unique("NOPE_"), quoted("PRODUCTS_CREATE"))))
        .andExpect(status().isForbidden());

    setRoles(admin, uid);               // revoke everything
    mvc.perform(post("/api/products").header("Authorization", bearer(pm)).contentType(JSON).content(PRODUCT))
        .andExpect(status().isForbidden());
  }

  @Test void roleManagerCannotGrantPermissionsTheyDoNotHold() throws Exception {
    String admin = adminToken();
    String email = unique("rm") + "@b.com";
    String rm = register(email);
    long rmRole = createRole(admin, unique("RM_"), "ROLES_READ", "ROLES_CREATE", "PRODUCTS_CREATE");
    setRoles(admin, userId(admin, email), rmRole);

    mvc.perform(post("/api/roles").header("Authorization", bearer(rm)).contentType(JSON)
            .content(String.format(ROLE_BODY, unique("ESC_"), quoted("ORDERS_DELETE"))))
        .andExpect(status().isForbidden());
    mvc.perform(post("/api/roles").header("Authorization", bearer(rm)).contentType(JSON)
            .content(String.format(ROLE_BODY, unique("OK_"), quoted("PRODUCTS_CREATE"))))
        .andExpect(status().isCreated());
  }

  @Test void roleInUseCannotBeDeleted() throws Exception {
    String admin = adminToken();
    String email = unique("inuse") + "@b.com";
    register(email);
    long uid = userId(admin, email);
    long role = createRole(admin, unique("INUSE_"), "PRODUCTS_CREATE");

    setRoles(admin, uid, role);
    mvc.perform(delete("/api/roles/" + role).header("Authorization", bearer(admin))).andExpect(status().isConflict());
    setRoles(admin, uid);
    mvc.perform(delete("/api/roles/" + role).header("Authorization", bearer(admin))).andExpect(status().isNoContent());
  }

  @Test void lastAdminCannotBeDemotedOrDeleted() throws Exception {
    String admin = adminToken();
    long rootId = userId(admin, "root@test.local");
    mvc.perform(put("/api/users/" + rootId + "/roles").header("Authorization", bearer(admin)).contentType(JSON)
            .content("{\"roleIds\":[]}"))
        .andExpect(status().isConflict());
    mvc.perform(delete("/api/users/" + rootId).header("Authorization", bearer(admin))).andExpect(status().isConflict());
  }

  @Test void orderPermissionsFlow() throws Exception {
    String admin = adminToken();
    long pid = createProduct(admin, 5);
    String email = unique("buyer") + "@b.com";
    String buyer = register(email);

    // any logged-in user can place an order
    String placed = mvc.perform(post("/api/orders").header("Authorization", bearer(buyer)).contentType(JSON)
            .content("{\"items\":[{\"productId\":" + pid + ",\"quantity\":2}]}"))
        .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    long oid = ((Number) JsonPath.read(placed, "$.id")).longValue();
    mvc.perform(get("/api/products/" + pid)).andExpect(jsonPath("$.stock").value(3));

    // but cannot manage orders
    mvc.perform(get("/api/orders/all").header("Authorization", bearer(buyer))).andExpect(status().isForbidden());
    mvc.perform(patch("/api/orders/" + oid + "/status").header("Authorization", bearer(buyer)).contentType(JSON)
            .content("{\"status\":\"SHIPPED\"}"))
        .andExpect(status().isForbidden());

    // grant order-manager permissions (no delete)
    long role = createRole(admin, unique("OM_"), "ORDERS_READ_ALL", "ORDERS_UPDATE");
    setRoles(admin, userId(admin, email), role);

    mvc.perform(get("/api/orders/all").header("Authorization", bearer(buyer))).andExpect(status().isOk());
    mvc.perform(patch("/api/orders/" + oid + "/status").header("Authorization", bearer(buyer)).contentType(JSON)
            .content("{\"status\":\"CANCELLED\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
    mvc.perform(get("/api/products/" + pid)).andExpect(jsonPath("$.stock").value(5));   // stock restored
    mvc.perform(patch("/api/orders/" + oid + "/status").header("Authorization", bearer(buyer)).contentType(JSON)
            .content("{\"status\":\"PLACED\"}"))
        .andExpect(status().isConflict());                                                // cannot reopen
    mvc.perform(delete("/api/orders/" + oid).header("Authorization", bearer(buyer))).andExpect(status().isForbidden());

    mvc.perform(delete("/api/orders/" + oid).header("Authorization", bearer(admin))).andExpect(status().isNoContent());
  }
}

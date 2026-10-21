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
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Buyer / seller / admin marketplace flows: registration, ownership, offers, categories, fulfilment. */
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class MarketplaceFlowTest {
  @Autowired MockMvc mvc;

  private static final MediaType JSON = MediaType.APPLICATION_JSON;

  // ---------------- helpers ----------------
  private static String bearer(String t) { return "Bearer " + t; }
  private static String unique(String p) { return p + System.nanoTime(); }
  private static long idOf(String json) { return ((Number) JsonPath.read(json, "$.id")).longValue(); }
  private static String read(ResultActions r) throws Exception { return r.andReturn().getResponse().getContentAsString(); }

  private String register(String email, String type, String store) throws Exception {
    String storePart = store == null ? "" : ",\"storeName\":\"" + store + "\"";
    String res = read(mvc.perform(post("/api/auth/register").contentType(JSON)
        .content("{\"email\":\"" + email + "\",\"password\":\"secret1\",\"accountType\":\"" + type + "\"" + storePart + "}"))
        .andExpect(status().isCreated()));
    return JsonPath.read(res, "$.token");
  }

  private String buyer() throws Exception { return register(unique("buyer") + "@t.com", "BUYER", null); }
  private String seller() throws Exception { return register(unique("seller") + "@t.com", "SELLER", "Store " + System.nanoTime()); }

  private String admin() throws Exception {
    String res = read(mvc.perform(post("/api/auth/login").contentType(JSON)
        .content("{\"email\":\"root@test.local\",\"password\":\"Root@12345\"}")).andExpect(status().isOk()));
    return JsonPath.read(res, "$.token");
  }

  private long createCategory(String adminToken, String name) throws Exception {
    return idOf(read(mvc.perform(post("/api/categories").header("Authorization", bearer(adminToken)).contentType(JSON)
        .content("{\"name\":\"" + name + "\",\"icon\":\"bi-tag\"}")).andExpect(status().isCreated())));
  }

  private static String productJson(String name, int price, int stock, Long categoryId) {
    return String.format("{\"name\":\"%s\",\"description\":\"d\",\"price\":%d,\"stock\":%d%s}", name, price, stock,
        categoryId == null ? "" : ",\"categoryId\":" + categoryId);
  }

  private long createProduct(String token, String name, int price, int stock, Long categoryId) throws Exception {
    return idOf(read(mvc.perform(post("/api/products").header("Authorization", bearer(token)).contentType(JSON)
        .content(productJson(name, price, stock, categoryId))).andExpect(status().isCreated())));
  }

  private static String offerJson(String name, int pct, Instant from, Instant to, boolean active, boolean all, Long... pids) {
    String ids = Arrays.stream(pids).map(String::valueOf).collect(Collectors.joining(","));
    return String.format("{\"name\":\"%s\",\"discountPercent\":%d,\"startsAt\":\"%s\",\"endsAt\":\"%s\","
        + "\"active\":%b,\"appliesToAll\":%b,\"productIds\":[%s]}", name, pct, from, to, active, all, ids);
  }

  private static Instant ago(long hours) { return Instant.now().minus(Duration.ofHours(hours)); }
  private static Instant ahead(long hours) { return Instant.now().plus(Duration.ofHours(hours)); }

  private String placeOrder(String buyerToken, long productId, int qty) throws Exception {
    return read(mvc.perform(post("/api/orders").header("Authorization", bearer(buyerToken)).contentType(JSON)
        .content("{\"items\":[{\"productId\":" + productId + ",\"quantity\":" + qty + "}]}"))
        .andExpect(status().isCreated()));
  }

  // ---------------- registration and roles ----------------
  @Test void sellerRegistrationGetsSellerRoleAndStoreName() throws Exception {
    String token = register(unique("newseller") + "@t.com", "SELLER", "Shiny Store");
    mvc.perform(get("/api/me").header("Authorization", bearer(token)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.roles", hasItem("SELLER")))
        .andExpect(jsonPath("$.storeName").value("Shiny Store"))
        .andExpect(jsonPath("$.permissions", hasItem("OFFERS_MANAGE")));
  }

  @Test void buyerRegistrationGetsBuyerRoleWithoutSellerPermissions() throws Exception {
    String token = buyer();
    mvc.perform(get("/api/me").header("Authorization", bearer(token)))
        .andExpect(jsonPath("$.roles", hasItem("BUYER")))
        .andExpect(jsonPath("$.permissions.length()").value(0));
  }

  @Test void sellerNeedsAStoreName() throws Exception {
    mvc.perform(post("/api/auth/register").contentType(JSON)
            .content("{\"email\":\"" + unique("nostore") + "@t.com\",\"password\":\"secret1\",\"accountType\":\"SELLER\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test void adminCannotBeChosenAtRegistration() throws Exception {
    mvc.perform(post("/api/auth/register").contentType(JSON)
            .content("{\"email\":\"" + unique("evil") + "@t.com\",\"password\":\"secret1\",\"accountType\":\"ADMIN\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test void buyersCannotSellOrRunOffers() throws Exception {
    String b = buyer();
    mvc.perform(post("/api/products").header("Authorization", bearer(b)).contentType(JSON)
        .content(productJson("Nope", 10, 1, null))).andExpect(status().isForbidden());
    mvc.perform(get("/api/seller/products").header("Authorization", bearer(b))).andExpect(status().isForbidden());
    mvc.perform(get("/api/seller/orders").header("Authorization", bearer(b))).andExpect(status().isForbidden());
    mvc.perform(get("/api/offers").header("Authorization", bearer(b))).andExpect(status().isForbidden());
  }

  // ---------------- public catalogue ----------------
  @Test void catalogueIsPublicAndSeeded() throws Exception {
    mvc.perform(get("/api/products")).andExpect(status().isOk());
    mvc.perform(get("/api/offers/active")).andExpect(status().isOk());
    mvc.perform(get("/api/categories")).andExpect(status().isOk())
        .andExpect(jsonPath("$[*].name", hasItem("Electronics")));
    mvc.perform(get("/api/offers")).andExpect(status().isUnauthorized());
  }

  // ---------------- product ownership ----------------
  @Test void sellersManageOnlyTheirOwnProducts() throws Exception {
    String a = seller();
    String b = seller();
    long pid = createProduct(a, unique("Own"), 500, 3, null);
    String update = productJson("Renamed", 600, 4, null);

    mvc.perform(put("/api/products/" + pid).header("Authorization", bearer(b)).contentType(JSON).content(update))
        .andExpect(status().isForbidden());
    mvc.perform(delete("/api/products/" + pid).header("Authorization", bearer(b))).andExpect(status().isForbidden());

    mvc.perform(put("/api/products/" + pid).header("Authorization", bearer(a)).contentType(JSON).content(update))
        .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Renamed"));
    mvc.perform(put("/api/products/" + pid).header("Authorization", bearer(admin())).contentType(JSON)
        .content(productJson("Moderated", 600, 4, null))).andExpect(status().isOk());      // admin: MANAGE_ALL
    mvc.perform(delete("/api/products/" + pid).header("Authorization", bearer(a))).andExpect(status().isNoContent());
  }

  @Test void sellerListsOnlyTheirOwnProducts() throws Exception {
    String a = seller();
    long pid = createProduct(a, unique("Mine"), 100, 1, null);
    mvc.perform(get("/api/seller/products").header("Authorization", bearer(a)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].id").value(pid));
  }

  // ---------------- categories ----------------
  @Test void categoryFilteringAndManagement() throws Exception {
    String admin = admin();
    String name = unique("Cat");
    long cat = createCategory(admin, name);
    String s = seller();
    createProduct(s, unique("InCat"), 100, 2, cat);
    createProduct(s, unique("NoCat"), 100, 2, null);

    mvc.perform(get("/api/products").param("categoryId", String.valueOf(cat)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].categoryName").value(name));
    mvc.perform(get("/api/categories")).andExpect(jsonPath("$[*].name", hasItem(name)));

    mvc.perform(post("/api/categories").header("Authorization", bearer(s)).contentType(JSON)
        .content("{\"name\":\"" + unique("X") + "\"}")).andExpect(status().isForbidden());
    mvc.perform(delete("/api/categories/" + cat).header("Authorization", bearer(admin))).andExpect(status().isConflict());

    long empty = createCategory(admin, unique("Empty"));
    mvc.perform(delete("/api/categories/" + empty).header("Authorization", bearer(admin))).andExpect(status().isNoContent());
  }

  @Test void searchMatchesNameAndDescription() throws Exception {
    String s = seller();
    String name = unique("zzquartz");
    createProduct(s, name, 100, 1, null);
    mvc.perform(get("/api/products").param("q", name.toUpperCase()))
        .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
  }

  // ---------------- festival offers ----------------
  @Test void sellerOfferChangesThePriceBuyersPay() throws Exception {
    String s = seller();
    String b = buyer();
    long pid = createProduct(s, unique("Lamp"), 1000, 5, null);

    mvc.perform(get("/api/products/" + pid))
        .andExpect(jsonPath("$.finalPrice").value(1000.0)).andExpect(jsonPath("$.discountPercent").value(0));

    long offer = idOf(read(mvc.perform(post("/api/offers").header("Authorization", bearer(s)).contentType(JSON)
        .content(offerJson("Diwali Dhamaka", 20, ago(1), ahead(24), true, false, pid)))
        .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("LIVE"))));

    mvc.perform(get("/api/products/" + pid))
        .andExpect(jsonPath("$.finalPrice").value(800.0))
        .andExpect(jsonPath("$.price").value(1000.0))
        .andExpect(jsonPath("$.discountPercent").value(20))
        .andExpect(jsonPath("$.offerName").value("Diwali Dhamaka"));
    mvc.perform(get("/api/offers/active")).andExpect(jsonPath("$[*].name", hasItem("Diwali Dhamaka")));

    String order = placeOrder(b, pid, 1);                       // buyer pays the sale price
    org.junit.jupiter.api.Assertions.assertEquals(800.0, ((Number) JsonPath.read(order, "$.total")).doubleValue());

    mvc.perform(put("/api/offers/" + offer).header("Authorization", bearer(s)).contentType(JSON)   // pause the sale
        .content(offerJson("Diwali Dhamaka", 20, ago(1), ahead(24), false, false, pid)))
        .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PAUSED"));
    mvc.perform(get("/api/products/" + pid)).andExpect(jsonPath("$.finalPrice").value(1000.0));
  }

  @Test void scheduledAndExpiredOffersDoNotDiscount() throws Exception {
    String s = seller();
    long pid = createProduct(s, unique("Fan"), 1000, 5, null);
    mvc.perform(post("/api/offers").header("Authorization", bearer(s)).contentType(JSON)
            .content(offerJson("Future sale", 30, ahead(24), ahead(48), true, true)))
        .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("SCHEDULED"));
    mvc.perform(post("/api/offers").header("Authorization", bearer(s)).contentType(JSON)
            .content(offerJson("Old sale", 30, ago(48), ago(24), true, true)))
        .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("ENDED"));
    mvc.perform(get("/api/products/" + pid)).andExpect(jsonPath("$.finalPrice").value(1000.0));
  }

  @Test void offerForAllProductsAppliesOnlyToThatSellersCatalogue() throws Exception {
    String a = seller();
    String b = seller();
    long mine = createProduct(a, unique("A"), 1000, 5, null);
    long theirs = createProduct(b, unique("B"), 1000, 5, null);
    mvc.perform(post("/api/offers").header("Authorization", bearer(a)).contentType(JSON)
        .content(offerJson("Store-wide", 10, ago(1), ahead(24), true, true))).andExpect(status().isCreated());
    mvc.perform(get("/api/products/" + mine)).andExpect(jsonPath("$.finalPrice").value(900.0));
    mvc.perform(get("/api/products/" + theirs)).andExpect(jsonPath("$.finalPrice").value(1000.0));
  }

  @Test void offerRulesAreEnforced() throws Exception {
    String a = seller();
    String b = seller();
    long pid = createProduct(a, unique("Own"), 100, 1, null);

    // someone else's product
    mvc.perform(post("/api/offers").header("Authorization", bearer(b)).contentType(JSON)
        .content(offerJson("Steal", 10, ago(1), ahead(1), true, false, pid))).andExpect(status().isBadRequest());
    // end before start
    mvc.perform(post("/api/offers").header("Authorization", bearer(a)).contentType(JSON)
        .content(offerJson("Backwards", 10, ahead(2), ahead(1), true, false, pid))).andExpect(status().isBadRequest());
    // nothing selected
    mvc.perform(post("/api/offers").header("Authorization", bearer(a)).contentType(JSON)
        .content(offerJson("Empty", 10, ago(1), ahead(1), true, false))).andExpect(status().isBadRequest());
    // discount out of range
    mvc.perform(post("/api/offers").header("Authorization", bearer(a)).contentType(JSON)
        .content(offerJson("TooBig", 95, ago(1), ahead(1), true, false, pid))).andExpect(status().isBadRequest());
  }

  @Test void sellersCannotChangeEachOthersOffers() throws Exception {
    String a = seller();
    String b = seller();
    long pid = createProduct(a, unique("Own"), 100, 1, null);
    long offer = idOf(read(mvc.perform(post("/api/offers").header("Authorization", bearer(a)).contentType(JSON)
        .content(offerJson("Mine", 10, ago(1), ahead(1), true, false, pid))).andExpect(status().isCreated())));

    mvc.perform(delete("/api/offers/" + offer).header("Authorization", bearer(b))).andExpect(status().isForbidden());
    mvc.perform(get("/api/offers").header("Authorization", bearer(b)))
        .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));       // b sees none of a's offers
    mvc.perform(get("/api/offers").header("Authorization", bearer(admin())))
        .andExpect(status().isOk()).andExpect(jsonPath("$[*].name", hasItem("Mine"))); // admin sees all
    mvc.perform(delete("/api/offers/" + offer).header("Authorization", bearer(a))).andExpect(status().isNoContent());
  }

  @Test void deletingAProductRemovesItFromOffers() throws Exception {
    String a = seller();
    long p1 = createProduct(a, unique("One"), 100, 1, null);
    long p2 = createProduct(a, unique("Two"), 100, 1, null);
    mvc.perform(post("/api/offers").header("Authorization", bearer(a)).contentType(JSON)
        .content(offerJson("Pair", 10, ago(1), ahead(1), true, false, p1, p2))).andExpect(status().isCreated());
    mvc.perform(delete("/api/products/" + p1).header("Authorization", bearer(a))).andExpect(status().isNoContent());
    mvc.perform(get("/api/offers").header("Authorization", bearer(a)))
        .andExpect(jsonPath("$[0].productIds.length()").value(1));
  }

  // ---------------- buying and fulfilment ----------------
  @Test void sellersCannotBuyTheirOwnProducts() throws Exception {
    String s = seller();
    long pid = createProduct(s, unique("Mine"), 100, 5, null);
    mvc.perform(post("/api/orders").header("Authorization", bearer(s)).contentType(JSON)
        .content("{\"items\":[{\"productId\":" + pid + ",\"quantity\":1}]}")).andExpect(status().isConflict());
  }

  @Test void sellerFulfilsOnlyTheirOwnLines() throws Exception {
    String s = seller();
    String other = seller();
    String b = buyer();
    String name = unique("Gadget");
    long pid = createProduct(s, name, 100, 5, null);
    String order = placeOrder(b, pid, 2);
    long orderId = idOf(order);
    long itemId = ((Number) JsonPath.read(order, "$.items[0].id")).longValue();
    String path = "/api/seller/orders/" + orderId + "/items/" + itemId + "/status";

    mvc.perform(get("/api/seller/orders").header("Authorization", bearer(s)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].productName").value(name))
        .andExpect(jsonPath("$[0].quantity").value(2));
    mvc.perform(get("/api/seller/orders").header("Authorization", bearer(other)))
        .andExpect(jsonPath("$.length()").value(0));

    mvc.perform(patch(path).header("Authorization", bearer(other)).contentType(JSON).content("{\"status\":\"SHIPPED\"}"))
        .andExpect(status().isForbidden());
    mvc.perform(patch(path).header("Authorization", bearer(b)).contentType(JSON).content("{\"status\":\"SHIPPED\"}"))
        .andExpect(status().isForbidden());

    mvc.perform(patch(path).header("Authorization", bearer(s)).contentType(JSON).content("{\"status\":\"SHIPPED\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SHIPPED"));
    mvc.perform(patch(path).header("Authorization", bearer(s)).contentType(JSON).content("{\"status\":\"DELIVERED\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DELIVERED"));

    mvc.perform(get("/api/orders").header("Authorization", bearer(b)))                // buyer sees the new status
        .andExpect(jsonPath("$[0].items[0].status").value("DELIVERED"));
  }

  @Test void cancellingALineGivesTheStockBack() throws Exception {
    String s = seller();
    String b = buyer();
    long pid = createProduct(s, unique("Stocked"), 100, 5, null);
    String order = placeOrder(b, pid, 2);
    mvc.perform(get("/api/products/" + pid)).andExpect(jsonPath("$.stock").value(3));

    String path = "/api/seller/orders/" + idOf(order) + "/items/"
        + ((Number) JsonPath.read(order, "$.items[0].id")).longValue() + "/status";
    mvc.perform(patch(path).header("Authorization", bearer(s)).contentType(JSON).content("{\"status\":\"CANCELLED\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
    mvc.perform(get("/api/products/" + pid)).andExpect(jsonPath("$.stock").value(5));
  }

  // ---------------- admin ----------------
  @Test void adminStatsAreAdminOnly() throws Exception {
    mvc.perform(get("/api/admin/stats").header("Authorization", bearer(admin())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.products").isNumber())
        .andExpect(jsonPath("$.sellers").isNumber())
        .andExpect(jsonPath("$.commission").isNumber());
    mvc.perform(get("/api/admin/stats").header("Authorization", bearer(buyer()))).andExpect(status().isForbidden());
    mvc.perform(get("/api/admin/stats").header("Authorization", bearer(seller()))).andExpect(status().isForbidden());
  }
}

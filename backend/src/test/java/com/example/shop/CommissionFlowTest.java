package com.example.shop;

import static org.hamcrest.Matchers.hasItem;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Seller commission: each seller pays a percentage (for example 5% standard or 3% preferred) of their sales. */
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class CommissionFlowTest {
  @Autowired MockMvc mvc;

  private static final MediaType JSON = MediaType.APPLICATION_JSON;

  record Account(String email, String token) {}

  // ---------------- helpers ----------------
  private static String bearer(String t) { return "Bearer " + t; }
  private static String unique(String p) { return p + System.nanoTime(); }
  private static String read(ResultActions r) throws Exception { return r.andReturn().getResponse().getContentAsString(); }
  private static long idOf(String json) { return ((Number) JsonPath.read(json, "$.id")).longValue(); }

  private Account register(String email, String type, String store) throws Exception {
    String storePart = store == null ? "" : ",\"storeName\":\"" + store + "\"";
    String res = read(mvc.perform(post("/api/auth/register").contentType(JSON)
        .content("{\"email\":\"" + email + "\",\"password\":\"secret1\",\"accountType\":\"" + type + "\"" + storePart + "}"))
        .andExpect(status().isCreated()));
    return new Account(email, JsonPath.read(res, "$.token"));
  }

  private Account newSeller() throws Exception { return register(unique("seller") + "@t.com", "SELLER", "Store " + System.nanoTime()); }
  private Account newBuyer() throws Exception { return register(unique("buyer") + "@t.com", "BUYER", null); }

  private String admin() throws Exception {
    String res = read(mvc.perform(post("/api/auth/login").contentType(JSON)
        .content("{\"email\":\"root@test.local\",\"password\":\"Root@12345\"}")).andExpect(status().isOk()));
    return JsonPath.read(res, "$.token");
  }

  private long userId(String adminToken, String email) throws Exception {
    String res = read(mvc.perform(get("/api/users").header("Authorization", bearer(adminToken))).andExpect(status().isOk()));
    List<Integer> ids = JsonPath.read(res, "$[?(@.email=='" + email + "')].id");
    return ids.get(0);
  }

  private ResultActions setRate(String token, long userId, String percent) throws Exception {
    return mvc.perform(put("/api/admin/sellers/" + userId + "/commission").header("Authorization", bearer(token))
        .contentType(JSON).content("{\"percent\":" + percent + "}"));
  }

  private long createProduct(Account seller, int price, int stock) throws Exception {
    return idOf(read(mvc.perform(post("/api/products").header("Authorization", bearer(seller.token())).contentType(JSON)
        .content("{\"name\":\"" + unique("Item") + "\",\"description\":\"d\",\"price\":" + price + ",\"stock\":" + stock + "}"))
        .andExpect(status().isCreated())));
  }

  private String order(Account buyer, String itemsJson) throws Exception {
    return read(mvc.perform(post("/api/orders").header("Authorization", bearer(buyer.token())).contentType(JSON)
        .content("{\"items\":[" + itemsJson + "]}")).andExpect(status().isCreated()));
  }

  private static String item(long productId, int qty) { return "{\"productId\":" + productId + ",\"quantity\":" + qty + "}"; }

  private ResultActions earnings(Account seller) throws Exception {
    return mvc.perform(get("/api/seller/earnings").header("Authorization", bearer(seller.token())));
  }

  private double commissionTotal(String adminToken) throws Exception {
    String res = read(mvc.perform(get("/api/admin/stats").header("Authorization", bearer(adminToken))).andExpect(status().isOk()));
    return ((Number) JsonPath.read(res, "$.commission")).doubleValue();
  }

  // ---------------- rates ----------------
  @Test void aNewSellerStartsOnTheStandardFivePercent() throws Exception {
    Account s = newSeller();
    mvc.perform(get("/api/me").header("Authorization", bearer(s.token())))
        .andExpect(status().isOk()).andExpect(jsonPath("$.commissionPercent").value(5.0));
  }

  @Test void buyersHaveNoCommissionRate() throws Exception {
    Account b = newBuyer();
    mvc.perform(get("/api/me").header("Authorization", bearer(b.token())))
        .andExpect(jsonPath("$.commissionPercent").doesNotExist());
  }

  @Test void adminMovesASellerToThePreferredThreePercent() throws Exception {
    String admin = admin();
    Account s = newSeller();
    setRate(admin, userId(admin, s.email()), "3")
        .andExpect(status().isOk()).andExpect(jsonPath("$.commissionPercent").value(3.0));
    mvc.perform(get("/api/me").header("Authorization", bearer(s.token())))
        .andExpect(jsonPath("$.commissionPercent").value(3.0));
  }

  @Test void onlyUsersWithCommissionManageCanSetRates() throws Exception {
    String admin = admin();
    Account s = newSeller();
    Account b = newBuyer();
    long sellerId = userId(admin, s.email());

    setRate(s.token(), sellerId, "1").andExpect(status().isForbidden());
    setRate(b.token(), sellerId, "1").andExpect(status().isForbidden());
    mvc.perform(put("/api/admin/sellers/" + sellerId + "/commission").contentType(JSON).content("{\"percent\":1}"))
        .andExpect(status().isUnauthorized());
  }

  @Test void ratesMustBeBetweenZeroAndThirtyPercent() throws Exception {
    String admin = admin();
    long id = userId(admin, newSeller().email());
    setRate(admin, id, "31").andExpect(status().isBadRequest());
    setRate(admin, id, "-1").andExpect(status().isBadRequest());
    setRate(admin, id, "30").andExpect(status().isOk());
    setRate(admin, id, "0").andExpect(status().isOk());
  }

  @Test void onlySellersCanHaveARateAndUnknownUsersAreNotFound() throws Exception {
    String admin = admin();
    long buyerId = userId(admin, newBuyer().email());
    setRate(admin, buyerId, "3").andExpect(status().isConflict());
    setRate(admin, 999_999L, "3").andExpect(status().isNotFound());
  }

  @Test void adminListsEverySellerWithTheirRate() throws Exception {
    mvc.perform(get("/api/admin/sellers").header("Authorization", bearer(admin())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.email=='seller@test.local')].commissionPercent", hasItem(5.0)))
        .andExpect(jsonPath("$[?(@.email=='seller2@test.local')].commissionPercent", hasItem(3.0)));
  }

  // ---------------- earnings ----------------
  @Test void earningsReflectThePreferredRateAndPayableFollowsDelivery() throws Exception {
    String admin = admin();
    Account s = newSeller();
    setRate(admin, userId(admin, s.email()), "3").andExpect(status().isOk());
    long pid = createProduct(s, 1000, 10);

    String placed = order(newBuyer(), item(pid, 2));      // 2 x 1000 = 2000, 3% = 60
    earnings(s).andExpect(status().isOk())
        .andExpect(jsonPath("$.commissionPercent").value(3.0))
        .andExpect(jsonPath("$.grossSales").value(2000.0))
        .andExpect(jsonPath("$.commission").value(60.0))
        .andExpect(jsonPath("$.netEarnings").value(1940.0))
        .andExpect(jsonPath("$.pending").value(1940.0))
        .andExpect(jsonPath("$.payable").value(0.0))
        .andExpect(jsonPath("$.unitsSold").value(2));

    String path = "/api/seller/orders/" + idOf(placed) + "/items/"
        + ((Number) JsonPath.read(placed, "$.items[0].id")).longValue() + "/status";
    for (String st : new String[] { "SHIPPED", "DELIVERED" }) {
      mvc.perform(patch(path).header("Authorization", bearer(s.token())).contentType(JSON).content("{\"status\":\"" + st + "\"}"))
          .andExpect(status().isOk());
    }
    earnings(s).andExpect(jsonPath("$.payable").value(1940.0)).andExpect(jsonPath("$.pending").value(0.0));
  }

  @Test void aStandardSellerPaysFivePercent() throws Exception {
    Account s = newSeller();
    long pid = createProduct(s, 1000, 10);
    order(newBuyer(), item(pid, 1));
    earnings(s).andExpect(jsonPath("$.commission").value(50.0)).andExpect(jsonPath("$.netEarnings").value(950.0));
  }

  @Test void aRateChangeOnlyAffectsFutureOrders() throws Exception {
    String admin = admin();
    Account s = newSeller();                               // standard 5%
    long pid = createProduct(s, 1000, 10);
    Account buyer = newBuyer();

    order(buyer, item(pid, 1));                            // sold at 5%  -> 50
    setRate(admin, userId(admin, s.email()), "3").andExpect(status().isOk());
    order(buyer, item(pid, 1));                            // sold at 3%  -> 30

    mvc.perform(get("/api/seller/orders").header("Authorization", bearer(s.token())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].commissionPercent").value(3.0))    // newest first
        .andExpect(jsonPath("$[0].commission").value(30.0))
        .andExpect(jsonPath("$[0].earning").value(970.0))
        .andExpect(jsonPath("$[1].commissionPercent").value(5.0))
        .andExpect(jsonPath("$[1].commission").value(50.0));
    earnings(s).andExpect(jsonPath("$.commission").value(80.0)).andExpect(jsonPath("$.commissionPercent").value(3.0));
  }

  @Test void cancelledLinesCarryNoCommission() throws Exception {
    Account s = newSeller();
    long pid = createProduct(s, 1000, 10);
    String placed = order(newBuyer(), item(pid, 1));
    String path = "/api/seller/orders/" + idOf(placed) + "/items/"
        + ((Number) JsonPath.read(placed, "$.items[0].id")).longValue() + "/status";

    mvc.perform(patch(path).header("Authorization", bearer(s.token())).contentType(JSON).content("{\"status\":\"CANCELLED\"}"))
        .andExpect(status().isOk());

    earnings(s).andExpect(jsonPath("$.grossSales").value(0.0))
        .andExpect(jsonPath("$.commission").value(0.0)).andExpect(jsonPath("$.unitsSold").value(0));
  }

  @Test void twoSellersInOneOrderPayTheirOwnRates() throws Exception {
    String admin = admin();
    Account preferred = newSeller();
    Account standard = newSeller();
    setRate(admin, userId(admin, preferred.email()), "3").andExpect(status().isOk());
    long p1 = createProduct(preferred, 1000, 5);
    long p2 = createProduct(standard, 1000, 5);

    order(newBuyer(), item(p1, 1) + "," + item(p2, 1));

    earnings(preferred).andExpect(jsonPath("$.commission").value(30.0)).andExpect(jsonPath("$.netEarnings").value(970.0));
    earnings(standard).andExpect(jsonPath("$.commission").value(50.0)).andExpect(jsonPath("$.netEarnings").value(950.0));
  }

  @Test void commissionEarnedAppearsInTheMarketplaceStats() throws Exception {
    String admin = admin();
    Account s = newSeller();
    long pid = createProduct(s, 1000, 5);
    double before = commissionTotal(admin);

    order(newBuyer(), item(pid, 1));

    assertEquals(50.0, commissionTotal(admin) - before, 0.001);
  }

  @Test void earningsAreForSellersOnly() throws Exception {
    mvc.perform(get("/api/seller/earnings").header("Authorization", bearer(newBuyer().token()))).andExpect(status().isForbidden());
    mvc.perform(get("/api/seller/earnings")).andExpect(status().isUnauthorized());
  }
}

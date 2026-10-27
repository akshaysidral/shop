package com.example.shop.web;

import com.example.shop.service.OrderService;
import com.example.shop.web.Dtos.CheckoutRequest;
import com.example.shop.web.Dtos.OrderResponse;
import com.example.shop.web.Dtos.StatusRequest;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {
  private final OrderService service;

  // any logged-in customer
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public OrderResponse checkout(Principal me, @Valid @RequestBody CheckoutRequest req) {
    return service.checkout(me.getName(), req);
  }

  @GetMapping
  public List<OrderResponse> mine(Principal me) {
    return service.mine(me.getName());
  }

  // permission-protected (staff)
  @GetMapping("/all")
  @PreAuthorize("hasAuthority('ORDERS_READ_ALL')")
  public List<OrderResponse> all() {
    return service.all();
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAuthority('ORDERS_UPDATE')")
  public OrderResponse updateStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest req) {
    return service.updateStatus(id, req.status());
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasAuthority('ORDERS_DELETE')")
  public void delete(@PathVariable Long id) {
    service.delete(id);
  }
}

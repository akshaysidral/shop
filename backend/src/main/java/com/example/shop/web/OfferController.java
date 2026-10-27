package com.example.shop.web;

import com.example.shop.service.OfferService;
import com.example.shop.web.Dtos.ActiveOfferResponse;
import com.example.shop.web.Dtos.OfferRequest;
import com.example.shop.web.Dtos.OfferResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/offers")
@RequiredArgsConstructor
public class OfferController {
  private final OfferService service;

  /** Public: sales running right now (storefront banner). */
  @GetMapping("/active")
  public List<ActiveOfferResponse> active() {
    return service.active();
  }

  /** Sellers see their own offers; admins (OFFERS_MANAGE_ALL) see everyone's. */
  @GetMapping
  @PreAuthorize("hasAnyAuthority('OFFERS_MANAGE','OFFERS_MANAGE_ALL')")
  public List<OfferResponse> list() {
    return service.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('OFFERS_MANAGE')")
  public OfferResponse create(@Valid @RequestBody OfferRequest r) {
    return service.create(r);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyAuthority('OFFERS_MANAGE','OFFERS_MANAGE_ALL')")
  public OfferResponse update(@PathVariable Long id, @Valid @RequestBody OfferRequest r) {
    return service.update(id, r);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasAnyAuthority('OFFERS_MANAGE','OFFERS_MANAGE_ALL')")
  public void delete(@PathVariable Long id) {
    service.delete(id);
  }
}

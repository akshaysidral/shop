package com.example.shop.web;

import com.example.shop.service.CommissionService;
import com.example.shop.service.StatsService;
import com.example.shop.web.Dtos.CommissionRequest;
import com.example.shop.web.Dtos.SellerSummaryResponse;
import com.example.shop.web.Dtos.StatsResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/admin") @RequiredArgsConstructor
public class AdminController {
  private final StatsService stats;
  private final CommissionService commissions;

  @GetMapping("/stats") @PreAuthorize("hasAuthority('STATS_READ')")
  public StatsResponse stats() { return stats.get(); }

  /** Every seller with their commission rate and what they have sold. */
  @GetMapping("/sellers") @PreAuthorize("hasAuthority('COMMISSION_MANAGE')")
  public List<SellerSummaryResponse> sellers() { return commissions.sellers(); }

  /** Sets the percentage (0 to 30) the marketplace keeps from this seller's future sales. */
  @PutMapping("/sellers/{id}/commission") @PreAuthorize("hasAuthority('COMMISSION_MANAGE')")
  public SellerSummaryResponse setCommission(@PathVariable Long id, @Valid @RequestBody CommissionRequest req) {
    return commissions.setRate(id, req.percent());
  }
}

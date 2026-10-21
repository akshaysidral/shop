package com.example.shop.repo;

import com.example.shop.model.Offer;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OfferRepository extends JpaRepository<Offer, Long> {
  @Query("select o from Offer o where o.active = true and o.startsAt <= :now and o.endsAt >= :now")
  List<Offer> findActive(@Param("now") Instant now);

  List<Offer> findBySellerIdOrderByStartsAtDesc(Long sellerId);
  List<Offer> findAllByOrderByStartsAtDesc();
  List<Offer> findByProducts_Id(Long productId);
}

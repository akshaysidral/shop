package com.example.shop.repo;

import com.example.shop.model.OrderItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
  @Query("select i from OrderItem i where i.sellerId = :sellerId order by i.order.createdAt desc")
  List<OrderItem> findForSeller(@Param("sellerId") Long sellerId);
}

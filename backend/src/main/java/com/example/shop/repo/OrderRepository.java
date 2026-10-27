package com.example.shop.repo;

import com.example.shop.model.Order;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Long> {
  List<Order> findByUserEmailOrderByCreatedAtDesc(String email);

  List<Order> findAllByOrderByCreatedAtDesc();

  boolean existsByUserId(Long userId);
}

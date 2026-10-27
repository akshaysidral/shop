package com.example.shop.repo;

import com.example.shop.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
  Optional<User> findByEmail(String email);

  boolean existsByEmail(String email);

  long countByRoles_Name(String roleName);

  boolean existsByRoles_Id(Long roleId);
}

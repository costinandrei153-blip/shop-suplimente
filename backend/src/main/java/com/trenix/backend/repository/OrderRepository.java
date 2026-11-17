
package com.trenix.backend.repository;

import com.trenix.backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Toate comenzile unui utilizator, de la cea mai recenta
    List<Order> findByUser_IdOrderByCreatedAtDesc(Long userId);

    // Cauta o comanda care apartine unui anumit utilizator
    Optional<Order> findByIdAndUser_Id(Long orderId, Long userId);
}


package com.trenix.backend.repository;

import com.trenix.backend.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    // Toate produsele dintr-o comanda
    List<OrderItem> findByOrder_Id(Long orderId);
}

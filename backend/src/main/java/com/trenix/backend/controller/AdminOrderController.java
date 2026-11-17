package com.trenix.backend.controller;

import com.trenix.backend.dto.order.OrderItemResponse;
import com.trenix.backend.dto.order.OrderResponse;
import com.trenix.backend.entity.Order;
import com.trenix.backend.entity.OrderItem;
import com.trenix.backend.entity.OrderStatus;
import com.trenix.backend.repository.OrderRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    private final OrderRepository orderRepository;

    public AdminOrderController(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @GetMapping
    @Transactional
    public List<OrderResponse> getAllOrders() {
        return orderRepository
                .findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::mapOrder)
                .toList();
    }

    @PatchMapping("/{id}/status")
    @ResponseStatus(HttpStatus.OK)
    @Transactional
    public OrderResponse updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload
    ) {
        String rawStatus = payload.get("status");

        if (rawStatus == null || rawStatus.isBlank()) {
            throw new IllegalArgumentException("Status is required.");
        }

        OrderStatus status;

        try {
            status = OrderStatus.valueOf(
                    rawStatus.trim().toUpperCase()
            );
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Invalid order status.");
        }

        Order order = orderRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Order not found.")
                );

        order.setStatus(status);

        return mapOrder(orderRepository.save(order));
    }

    private OrderResponse mapOrder(Order order) {
        OrderResponse response = new OrderResponse();

        response.setId(order.getId());
        response.setStatus(order.getStatus());
        response.setFirstName(order.getFirstName());
        response.setLastName(order.getLastName());
        response.setEmail(order.getEmail());
        response.setPhone(order.getPhone());
        response.setShippingAddress(order.getShippingAddress());
        response.setCity(order.getCity());
        response.setCounty(order.getCounty());
        response.setPostalCode(order.getPostalCode());
        response.setNotes(order.getNotes());
        response.setSubtotal(order.getSubtotal());
        response.setShippingFee(order.getShippingFee());
        response.setTotalAmount(order.getTotalAmount());
        response.setPaymentMethod(order.getPaymentMethod());
        response.setPaymentStatus(order.getPaymentStatus());
        response.setCreatedAt(order.getCreatedAt());

        List<OrderItemResponse> items = order.getItems()
                .stream()
                .map(this::mapItem)
                .toList();

        response.setItems(items);
        return response;
    }

    private OrderItemResponse mapItem(OrderItem item) {
        return new OrderItemResponse(
                item.getId(),
                item.getProductName(),
                item.getBrand(),
                item.getImageUrl(),
                item.getUnitPrice(),
                item.getQuantity(),
                item.getLineTotal()
        );
    }
}
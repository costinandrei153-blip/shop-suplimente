package com.trenix.backend.controller;

import com.trenix.backend.dto.order.CheckoutRequest;
import com.trenix.backend.dto.order.OrderResponse;
import com.trenix.backend.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // Plasează o comandă din coșul utilizatorului autentificat.
    @PostMapping("/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse checkout(
            @Valid @RequestBody CheckoutRequest request,
            Authentication authentication
    ) {
        return orderService.checkout(
                authentication.getName(),
                request
        );
    }

    // Returnează toate comenzile utilizatorului autentificat.
    @GetMapping
    public List<OrderResponse> getMyOrders(
            Authentication authentication
    ) {
        return orderService.getMyOrders(
                authentication.getName()
        );
    }

    // Returnează detaliile unei comenzi proprii.
    @GetMapping("/{orderId}")
    public OrderResponse getMyOrder(
            @PathVariable Long orderId,
            Authentication authentication
    ) {
        return orderService.getMyOrder(
                authentication.getName(),
                orderId
        );
    }
}

package com.trenix.backend.controller;

import com.trenix.backend.dto.cart.AddToCartRequest;
import com.trenix.backend.dto.cart.CartResponse;
import com.trenix.backend.dto.cart.UpdateCartItemRequest;
import com.trenix.backend.service.CartService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    // Vizualizarea cosului
    @GetMapping
    public ResponseEntity<CartResponse> getCart(
            Authentication authentication
    ) {
        CartResponse cart = cartService.getCart(
                authentication.getName()
        );

        return ResponseEntity.ok(cart);
    }

    // Adaugarea unui produs in cos
    @PostMapping("/items")
    public ResponseEntity<CartResponse> addProduct(
            Authentication authentication,
            @Valid @RequestBody AddToCartRequest request
    ) {
        CartResponse cart = cartService.addProduct(
                authentication.getName(),
                request.productId(),
                request.quantity()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(cart);
    }

    // Modificarea cantitatii unui produs
    @PutMapping("/items/{productId}")
    public ResponseEntity<CartResponse> updateProductQuantity(
            Authentication authentication,
            @PathVariable Long productId,
            @Valid @RequestBody UpdateCartItemRequest request
    ) {
        CartResponse cart = cartService.updateProductQuantity(
                authentication.getName(),
                productId,
                request.quantity()
        );

        return ResponseEntity.ok(cart);
    }

    // Eliminarea unui produs din cos
    @DeleteMapping("/items/{productId}")
    public ResponseEntity<CartResponse> removeProduct(
            Authentication authentication,
            @PathVariable Long productId
    ) {
        CartResponse cart = cartService.removeProduct(
                authentication.getName(),
                productId
        );

        return ResponseEntity.ok(cart);
    }

    // Golirea cosului
    @DeleteMapping
    public ResponseEntity<CartResponse> clearCart(
            Authentication authentication
    ) {
        CartResponse cart = cartService.clearCart(
                authentication.getName()
        );

        return ResponseEntity.ok(cart);
    }
}

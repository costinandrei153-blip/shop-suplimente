package com.trenix.backend.service;

import com.trenix.backend.dto.order.CheckoutRequest;
import com.trenix.backend.dto.order.OrderItemResponse;
import com.trenix.backend.dto.order.OrderResponse;
import com.trenix.backend.entity.Cart;
import com.trenix.backend.entity.CartItem;
import com.trenix.backend.entity.Order;
import com.trenix.backend.entity.OrderItem;
import com.trenix.backend.entity.OrderStatus;
import com.trenix.backend.entity.Product;
import com.trenix.backend.entity.User;
import com.trenix.backend.repository.CartRepository;
import com.trenix.backend.repository.OrderRepository;
import com.trenix.backend.repository.ProductRepository;
import com.trenix.backend.repository.UserRepository;
import com.trenix.backend.websocket.InventoryWebSocketHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.util.List;

@Service
public class OrderService {

    private static final BigDecimal SHIPPING_FEE = new BigDecimal("15.00");

    private static final String PAYMENT_METHOD = "CASH_ON_DELIVERY";
    private static final String PAYMENT_STATUS = "UNPAID";

    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final InventoryWebSocketHandler inventoryWebSocketHandler;
    public OrderService(
            OrderRepository orderRepository,
            CartRepository cartRepository,
            ProductRepository productRepository,
            UserRepository userRepository,
            InventoryWebSocketHandler inventoryWebSocketHandler
    ) {
        this.orderRepository = orderRepository;
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.inventoryWebSocketHandler = inventoryWebSocketHandler;
    }

    @Transactional
    public OrderResponse checkout(String authenticatedEmail, CheckoutRequest request) {

        User user = userRepository.findByEmail(authenticatedEmail)
                .orElseThrow(() ->
                        new IllegalArgumentException("Utilizatorul nu a fost găsit")
                );

        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Coșul de cumpărături nu există")
                );

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new IllegalArgumentException(
                    "Nu poți plasa o comandă cu un coș gol"
            );
        }

        Order order = new Order();

        order.setUser(user);
        order.setStatus(OrderStatus.PENDING);

        order.setFirstName(request.getFirstName().trim());
        order.setLastName(request.getLastName().trim());
        order.setEmail(request.getEmail().trim());
        order.setPhone(request.getPhone().trim());

        order.setShippingAddress(request.getShippingAddress().trim());
        order.setCity(request.getCity().trim());
        order.setCounty(request.getCounty().trim());
        order.setPostalCode(request.getPostalCode().trim());

        order.setNotes(
                request.getNotes() == null || request.getNotes().isBlank()
                        ? null
                        : request.getNotes().trim()
        );

        order.setPaymentMethod(PAYMENT_METHOD);
        order.setPaymentStatus(PAYMENT_STATUS);

        BigDecimal subtotal = BigDecimal.ZERO;

        for (CartItem cartItem : cart.getItems()) {

            Long productId = cartItem.getProduct().getId();

            Product product = productRepository.findById(productId)
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Un produs din coș nu mai există"
                            )
                    );

            Integer quantity = cartItem.getQuantity();

            if (quantity == null || quantity <= 0) {
                throw new IllegalArgumentException(
                        "Cantitatea produsului nu este validă"
                );
            }

            if (product.getStock() == null || product.getStock() < quantity) {
                throw new IllegalArgumentException(
                        "Stoc insuficient pentru produsul: " + product.getName()
                );
            }

            if (product.getPrice() == null || product.getPrice().signum() < 0) {
                throw new IllegalArgumentException(
                        "Preț invalid pentru produsul: " + product.getName()
                );
            }

            BigDecimal unitPrice = product.getPrice();

            BigDecimal lineTotal = unitPrice.multiply(
                    BigDecimal.valueOf(quantity)
            );

            OrderItem orderItem = new OrderItem();

            orderItem.setProduct(product);
            orderItem.setProductName(product.getName());
            orderItem.setBrand(product.getBrand());
            orderItem.setImageUrl(product.getImageUrl());
            orderItem.setUnitPrice(unitPrice);
            orderItem.setQuantity(quantity);
            orderItem.setLineTotal(lineTotal);

            order.addItem(orderItem);

            product.setStock(product.getStock() - quantity);

            subtotal = subtotal.add(lineTotal);
        }

        order.setSubtotal(subtotal);
        order.setShippingFee(SHIPPING_FEE);
        order.setTotalAmount(subtotal.add(SHIPPING_FEE));

        Order savedOrder = orderRepository.save(order);

        // Coșul se golește doar după ce comanda a fost salvată.
        cart.getItems().clear();

        cartRepository.save(cart);

        // Trimitem notificarea numai dupa commit-ul comenzii.
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        inventoryWebSocketHandler.broadcastInventoryUpdated();
                    }
                }
        );

        return mapOrderToResponse(savedOrder);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrders(String authenticatedEmail) {

        User user = userRepository.findByEmail(authenticatedEmail)
                .orElseThrow(() ->
                        new IllegalArgumentException("Utilizatorul nu a fost găsit")
                );

        return orderRepository.findByUser_IdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapOrderToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse getMyOrder(
            String authenticatedEmail,
            Long orderId
    ) {

        User user = userRepository.findByEmail(authenticatedEmail)
                .orElseThrow(() ->
                        new IllegalArgumentException("Utilizatorul nu a fost găsit")
                );

        Order order = orderRepository.findByIdAndUser_Id(
                        orderId,
                        user.getId()
                )
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Comanda nu există sau nu îți aparține"
                        )
                );

        return mapOrderToResponse(order);
    }

    private OrderResponse mapOrderToResponse(Order order) {

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
                .map(this::mapOrderItemToResponse)
                .toList();

        response.setItems(items);

        return response;
    }

    private OrderItemResponse mapOrderItemToResponse(OrderItem item) {

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
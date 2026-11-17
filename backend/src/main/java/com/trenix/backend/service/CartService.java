
package com.trenix.backend.service;

import com.trenix.backend.dto.cart.CartItemResponse;
import com.trenix.backend.dto.cart.CartResponse;
import com.trenix.backend.entity.Cart;
import com.trenix.backend.entity.CartItem;
import com.trenix.backend.entity.Product;
import com.trenix.backend.entity.User;
import com.trenix.backend.repository.CartItemRepository;
import com.trenix.backend.repository.CartRepository;
import com.trenix.backend.repository.ProductRepository;
import com.trenix.backend.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

@Service
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public CartService(
            CartRepository cartRepository,
            CartItemRepository cartItemRepository,
            ProductRepository productRepository,
            UserRepository userRepository
    ) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    // Obtine cosul utilizatorului sau creeaza unul nou
    private Cart getOrCreateCart(String email) {

        User user = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new IllegalArgumentException("User not found.")
        );

        return cartRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    Cart cart = new Cart();
                    cart.setUser(user);

                    return cartRepository.save(cart);
                });
    }

    // Transforma un CartItem intr-un DTO
    private CartItemResponse mapCartItem(CartItem item) {

        Product product = item.getProduct();

        return new CartItemResponse(
                item.getId(),
                product.getId(),
                product.getName(),
                product.getBrand(),
                product.getImageUrl(),
                item.getUnitPrice(),
                item.getQuantity(),
                item.getSubtotal()
        );
    }

    // Transforma entitatea Cart in CartResponse
    private CartResponse mapCart(Cart cart) {

        List<CartItemResponse> items = cart.getItems()
                .stream()
                .map(this::mapCartItem)
                .toList();

        Integer totalItems = cart.getItems()
                .stream()
                .mapToInt(CartItem::getQuantity)
                .sum();

        BigDecimal totalPrice = cart.getItems()
                .stream()
                .map(CartItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CartResponse(
                cart.getId(),
                items,
                totalItems,
                totalPrice,
                cart.getCreatedAt(),
                cart.getUpdatedAt()
        );
    }

    // Returneaza cosul utilizatorului
    @Transactional
    public CartResponse getCart(String email) {

        Cart cart = getOrCreateCart(email);

        return mapCart(cart);
    }

    // Adauga un produs in cos
    @Transactional
    public CartResponse addProduct(
            String email,
            Long productId,
            Integer quantity
    ) {

        validateQuantity(quantity);

        Cart cart = getOrCreateCart(email);

        Product product = productRepository.findById(productId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Product not found.")
                );

        CartItem existingItem = cartItemRepository
                .findByCart_IdAndProduct_Id(cart.getId(), productId)
                .orElse(null);

        int newQuantity = quantity;

        if (existingItem != null) {
            newQuantity += existingItem.getQuantity();
        }

        validateStock(product, newQuantity);

        if (existingItem != null) {

            existingItem.setQuantity(newQuantity);

        } else {

            CartItem item = new CartItem();

            item.setProduct(product);
            item.setQuantity(quantity);
            item.setUnitPrice(product.getPrice());

            cart.addItem(item);
        }

        Cart savedCart = cartRepository.save(cart);

        return mapCart(savedCart);
    }

    // Actualizeaza cantitatea unui produs
    @Transactional
    public CartResponse updateProductQuantity(
            String email,
            Long productId,
            Integer quantity
    ) {

        validateQuantity(quantity);

        Cart cart = getOrCreateCart(email);

        CartItem item = cartItemRepository
                .findByCart_IdAndProduct_Id(cart.getId(), productId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Product not found in cart."
                        )
                );

        validateStock(item.getProduct(), quantity);

        item.setQuantity(quantity);

        Cart savedCart = cartRepository.save(cart);

        return mapCart(savedCart);
    }

    // Elimina un produs din cos
    @Transactional
    public CartResponse removeProduct(
            String email,
            Long productId
    ) {

        Cart cart = getOrCreateCart(email);

        CartItem item = cartItemRepository
                .findByCart_IdAndProduct_Id(cart.getId(), productId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Product not found in cart."
                        )
                );

        cart.removeItem(item);

        Cart savedCart = cartRepository.save(cart);

        return mapCart(savedCart);
    }

    // Goleste cosul
    @Transactional
    public CartResponse clearCart(String email) {

        Cart cart = getOrCreateCart(email);

        cart.getItems().clear();

        Cart savedCart = cartRepository.save(cart);

        return mapCart(savedCart);
    }

    // Verifica daca numarul de produse este valid
    private void validateQuantity(Integer quantity) {

        if (quantity == null || quantity < 1) {
            throw new IllegalArgumentException(
                    "Quantity must be at least 1."
            );
        }
    }

    // Verifica stocul disponibil
    private void validateStock(
            Product product,
            Integer quantity
    ) {

        if (product.getStock() == null ||
                product.getStock() < quantity) {

            throw new IllegalArgumentException(
                    "Insufficient stock for product: "
                            + product.getName()
            );
        }
    }
}

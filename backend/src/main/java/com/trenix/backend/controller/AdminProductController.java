package com.trenix.backend.controller;

import com.trenix.backend.entity.Category;
import com.trenix.backend.entity.Product;
import com.trenix.backend.repository.CategoryRepository;
import com.trenix.backend.repository.ProductRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/products")
public class AdminProductController {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public AdminProductController(
            ProductRepository productRepository,
            CategoryRepository categoryRepository
    ) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getProducts() {
        return productRepository.findAll()
                .stream()
                .map(this::toMap)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Map<String, Object> createProduct(
            @Valid @RequestBody ProductPayload payload
    ) {
        Product product = new Product();
        applyPayload(product, payload);

        return toMap(productRepository.save(product));
    }

    @PutMapping("/{id}")
    @Transactional
    public Map<String, Object> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductPayload payload
    ) {
        Product product = productRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Product not found.")
                );

        applyPayload(product, payload);

        return toMap(productRepository.save(product));
    }

    private void applyPayload(Product product, ProductPayload payload) {
        Category category = categoryRepository.findById(payload.categoryId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Category not found.")
                );

        product.setName(payload.name().trim());
        product.setBrand(payload.brand().trim());
        product.setDescription(payload.description());
        product.setPrice(payload.price());
        product.setStock(payload.stock());
        product.setImageUrl(
                payload.imageUrl() == null || payload.imageUrl().isBlank()
                        ? null
                        : payload.imageUrl().trim()
        );
        product.setCategory(category);
    }

    private Map<String, Object> toMap(Product product) {
        Map<String, Object> result = new LinkedHashMap<>();

        result.put("id", product.getId());
        result.put("name", product.getName());
        result.put("brand", product.getBrand());
        result.put("description", product.getDescription());
        result.put("price", product.getPrice());
        result.put("stock", product.getStock());
        result.put("imageUrl", product.getImageUrl());

        if (product.getCategory() != null) {
            result.put("categoryId", product.getCategory().getId());
            result.put("categoryName", product.getCategory().getName());
        }

        return result;
    }

    public record ProductPayload(
            @NotBlank
            @Size(max = 150)
            String name,

            @NotBlank
            @Size(max = 150)
            String brand,

            @Size(max = 2000)
            String description,

            @NotNull
            @DecimalMin("0.01")
            BigDecimal price,

            @NotNull
            @Min(0)
            Integer stock,

            @Size(max = 500)
            String imageUrl,

            @NotNull
            Long categoryId
    ) {}
}
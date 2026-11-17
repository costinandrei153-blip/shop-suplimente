
package com.trenix.backend.dto.cart;

import java.math.BigDecimal;

public record CartItemResponse(

        Long id,

        Long productId,

        String productName,

        String brand,

        String imageUrl,

        BigDecimal unitPrice,

        Integer quantity,

        BigDecimal subtotal

) {
}


package com.trenix.backend.dto.cart;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record CartResponse(

        Long cartId,

        List<CartItemResponse> items,

        Integer totalItems,

        BigDecimal totalPrice,

        LocalDateTime createdAt,

        LocalDateTime updatedAt

) {
}

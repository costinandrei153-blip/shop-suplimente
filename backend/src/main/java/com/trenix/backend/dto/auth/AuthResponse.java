
package com.trenix.backend.dto.auth;

public record AuthResponse(

        String accessToken,

        String tokenType,

        long expiresInSeconds,

        Long userId,

        String firstName,

        String lastName,

        String email,

        String role

) {
}

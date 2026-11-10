package com.vinnot.shared.infrastructure.web.dto;

import java.time.Instant;

/**
 * Standard API response wrapper matching the frontend {@code ApiResponse<T>} contract.
 * Used for endpoints where the frontend expects: {@code { data: T, timestamp: string }}.
 *
 * @param <T> the response data type
 */
public record ApiResponseWrapper<T>(
        T data,
        String timestamp
) {

    /**
     * Creates a wrapper around the given data.
     *
     * @param data the data to wrap
     * @param <T>  the data type
     * @return the wrapped response
     */
    public static <T> ApiResponseWrapper<T> of(T data) {
        return new ApiResponseWrapper<>(data, Instant.now().toString());
    }
}


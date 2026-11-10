package com.vinnot.shared.application.dto;

/**
 * Generic response DTO for reference data entries (types, statuses, etc.).
 *
 * @param code    the unique code used in the domain (e.g. "RED", "PUBLISHED")
 * @param nameEs  Spanish display label
 * @param nameEn  English display label
 */
public record ReferenceDataResponse(
        String code,
        String nameEs,
        String nameEn
) {
}


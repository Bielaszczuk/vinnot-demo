package com.vinnot.wine.application.query.response;

import com.vinnot.wine.application.port.out.GrapeTypeRepositoryPort;

import java.util.UUID;

/**
 * Response model for grape type reference data.
 *
 * @param id       the grape type ID
 * @param name     the grape type name (English)
 * @param nameEs   the grape type name (Spanish)
 * @param category the grape category
 */
public record GrapeTypeResponse(
        UUID id,
        String name,
        String nameEs,
        String category
) {

    /**
     * Creates a GrapeTypeResponse from a domain projection.
     *
     * @param data the domain data projection
     * @return the response DTO
     */
    public static GrapeTypeResponse fromData(GrapeTypeRepositoryPort.GrapeTypeData data) {
        return new GrapeTypeResponse(
                data.id(),
                data.name(),
                data.nameEs(),
                data.category()
        );
    }
}


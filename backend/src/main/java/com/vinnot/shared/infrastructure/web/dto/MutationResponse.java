package com.vinnot.shared.infrastructure.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.UUID;

/**
 * Typed response for write operations (create / update / delete) that previously
 * returned ad-hoc {@code Map.of(...)} bodies.
 *
 * <p>The {@code id} field is omitted from the JSON when {@code null}, so a
 * message-only acknowledgement serialises to {@code {"message": "..."}} while a
 * resource mutation serialises to {@code {"id": "...", "message": "..."}} —
 * preserving the existing API contract.</p>
 *
 * @param id      the affected resource id (nullable)
 * @param message a human-readable acknowledgement message
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record MutationResponse(
        UUID id,
        String message
) {

    /**
     * Creates a response carrying both the affected resource id and a message.
     *
     * @param id      the resource id
     * @param message the acknowledgement message
     * @return the response
     */
    public static MutationResponse of(UUID id, String message) {
        return new MutationResponse(id, message);
    }

    /**
     * Creates a message-only response (no id is serialised).
     *
     * @param message the acknowledgement message
     * @return the response
     */
    public static MutationResponse message(String message) {
        return new MutationResponse(null, message);
    }
}


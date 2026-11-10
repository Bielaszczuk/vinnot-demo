package com.vinnot.wine.domain.model;

import com.vinnot.shared.domain.exception.DomainException;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Catalog entries a submission points at. A text value without its reference is a proposal for an admin to
 * approve or merge; grapes outside the catalog are listed in {@code proposedGrapes}.
 */
public record WineSubmissionCatalogReferences(
        UUID wineryId,
        UUID countryId,
        UUID regionId,
        List<String> proposedGrapes
) {

    public WineSubmissionCatalogReferences {
        if (Objects.nonNull(regionId) && Objects.isNull(countryId)) {
            throw new DomainException("INVALID_SUBMISSION", "A catalog region requires its catalog country");
        }
        proposedGrapes = Objects.nonNull(proposedGrapes) ? List.copyOf(proposedGrapes) : List.of();
    }

    public static WineSubmissionCatalogReferences none() {
        return new WineSubmissionCatalogReferences(null, null, null, List.of());
    }
}

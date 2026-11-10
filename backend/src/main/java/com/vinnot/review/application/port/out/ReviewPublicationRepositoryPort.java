package com.vinnot.review.application.port.out;

import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.ReviewPublication;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface ReviewPublicationRepositoryPort {
    Optional<UUID> findWineId(ReviewPublication.Type type, UUID id);

    Optional<ReviewPublication> findForUpdate(ReviewPublication.Type type, UUID id);

    PageResult<ReviewPublication> pending(UUID reviewerId, PageQuery page);

    /**
     * Names a whole queue page in one lookup. Deleted or missing users and wines are absent from
     * the maps.
     */
    PublicationNames findNames(Set<UUID> authorIds, Set<UUID> wineIds);

    void decide(
            ReviewPublication content,
            UUID reviewer,
            PublicationStatus decision,
            ReviewPublication.Decision checked,
            Instant now);

    /**
     * @param authors username per author id
     * @param wines   wine name per wine id
     */
    record PublicationNames(Map<UUID, String> authors, Map<UUID, String> wines) {
        public PublicationNames {
            authors = Map.copyOf(authors);
            wines = Map.copyOf(wines);
        }
    }
}

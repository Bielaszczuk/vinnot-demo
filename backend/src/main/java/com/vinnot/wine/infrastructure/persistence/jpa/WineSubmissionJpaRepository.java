package com.vinnot.wine.infrastructure.persistence.jpa;

import com.vinnot.wine.infrastructure.persistence.entity.WineSubmissionJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import com.vinnot.wine.domain.model.WineSubmissionStatus;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;

public interface WineSubmissionJpaRepository
        extends JpaRepository<WineSubmissionJpaEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT submission FROM WineSubmissionJpaEntity submission WHERE submission.id = :id")
    Optional<WineSubmissionJpaEntity> findByIdForUpdate(UUID id);

    @Query("""
            SELECT submission FROM WineSubmissionJpaEntity submission
            WHERE (:status IS NULL OR submission.status = :status)
              AND (CAST(:search AS string) IS NULL
                   OR LOWER(submission.wineName) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))
                   OR LOWER(submission.wineryName) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')))
            """)
    Page<WineSubmissionJpaEntity> search(
            WineSubmissionStatus status, String search, Pageable pageable);

    Page<WineSubmissionJpaEntity> findBySubmittedBy(UUID submittedBy, Pageable pageable);

    List<WineSubmissionJpaEntity> findByStatusInAndUpdatedAtBefore(
            Collection<WineSubmissionStatus> statuses, Instant updatedBefore,
            Pageable pageable);
}

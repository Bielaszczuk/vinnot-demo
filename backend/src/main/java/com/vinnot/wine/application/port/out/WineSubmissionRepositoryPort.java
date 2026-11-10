package com.vinnot.wine.application.port.out;

import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineSubmissionStatus;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WineSubmissionRepositoryPort {

    WineSubmission save(WineSubmission submission);

    Optional<WineSubmission> findById(UUID id);

    Optional<WineSubmission> findByIdForUpdate(UUID id);

    PageResult<WineSubmission> search(
            WineSubmissionStatus status, String search, PageQuery pageQuery);

    PageResult<WineSubmission> findBySubmittedBy(UUID userId, PageQuery pageQuery);

    List<WineSubmission> findExpired(
            List<WineSubmissionStatus> statuses, Instant updatedBefore, int limit);

    void delete(WineSubmission submission);
}

package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.wine.application.port.out.WineSubmissionRepositoryPort;
import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.infrastructure.persistence.jpa.WineSubmissionJpaRepository;
import com.vinnot.wine.infrastructure.persistence.mapper.WineSubmissionPersistenceMapper;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.domain.model.WineSubmissionStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Objects;
import org.springframework.data.domain.Pageable;

@Component
@RequiredArgsConstructor
public class WineSubmissionPersistenceAdapter
        implements WineSubmissionRepositoryPort {

    private final WineSubmissionJpaRepository repository;

    @Override
    public WineSubmission save(WineSubmission submission) {
        return WineSubmissionPersistenceMapper.toDomain(
                repository.save(WineSubmissionPersistenceMapper.toEntity(submission)));
    }

    @Override
    public Optional<WineSubmission> findById(UUID id) {
        return repository.findById(id).map(WineSubmissionPersistenceMapper::toDomain);
    }

    @Override
    public Optional<WineSubmission> findByIdForUpdate(UUID id) {
        return repository.findByIdForUpdate(id).map(WineSubmissionPersistenceMapper::toDomain);
    }

    @Override
    public PageResult<WineSubmission> search(
            WineSubmissionStatus status, String search, PageQuery pageQuery) {
        var page = repository.search(status, clean(search), pageable(pageQuery));
        return PageResult.of(page.stream()
                        .map(WineSubmissionPersistenceMapper::toDomain).toList(),
                page.getNumber(), page.getSize(), page.getTotalElements());
    }

    @Override
    public PageResult<WineSubmission> findBySubmittedBy(
            UUID userId, PageQuery pageQuery) {
        var page = repository.findBySubmittedBy(userId, pageable(pageQuery));
        return PageResult.of(page.stream()
                        .map(WineSubmissionPersistenceMapper::toDomain).toList(),
                page.getNumber(), page.getSize(), page.getTotalElements());
    }

    @Override
    public List<WineSubmission> findExpired(
            List<WineSubmissionStatus> statuses, Instant updatedBefore, int limit) {
        return repository.findByStatusInAndUpdatedAtBefore(
                        statuses, updatedBefore, PageRequest.of(0, limit))
                .stream().map(WineSubmissionPersistenceMapper::toDomain).toList();
    }

    @Override
    public void delete(WineSubmission submission) {
        repository.deleteById(submission.getId());
    }

    private Pageable pageable(PageQuery query) {
        Sort.Direction direction = query.sortDirection() == PageQuery.SortDirection.ASC
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return PageRequest.of(query.page(), query.size(),
                Sort.by(direction, query.sortBy()));
    }

    private String clean(String value) {
        return Objects.isNull(value) || value.isBlank() ? null : value.trim();
    }
}

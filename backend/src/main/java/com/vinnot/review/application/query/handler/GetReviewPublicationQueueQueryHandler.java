package com.vinnot.review.application.query.handler;

import com.vinnot.review.application.port.in.GetReviewPublicationQueueUseCase;
import com.vinnot.review.application.port.out.ReviewPublicationRepositoryPort;
import com.vinnot.review.application.port.out.ReviewPublicationRepositoryPort.PublicationNames;
import com.vinnot.review.application.query.response.ReviewPublicationQueueItem;
import com.vinnot.review.domain.model.ReviewPublication;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GetReviewPublicationQueueQueryHandler implements GetReviewPublicationQueueUseCase {
    private static final PublicationNames NO_NAMES = new PublicationNames(Map.of(), Map.of());
    private final ReviewPublicationRepositoryPort repository;

    @Override
    @Transactional(readOnly = true)
    public PageResult<ReviewPublicationQueueItem> execute(UUID reviewerId, int page, int size) {
        PageResult<ReviewPublication> found =
                repository.pending(reviewerId, PageQuery.bounded(page, size, 50));
        PublicationNames names =
                found.content().isEmpty()
                        ? NO_NAMES
                        : repository.findNames(
                                found.content().stream()
                                        .map(ReviewPublication::authorId)
                                        .collect(Collectors.toSet()),
                                found.content().stream()
                                        .map(ReviewPublication::wineId)
                                        .collect(Collectors.toSet()));
        return found.map(publication -> ReviewPublicationQueueItem.from(publication, names));
    }
}

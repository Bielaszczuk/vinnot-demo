package com.vinnot.wine.application.query.handler;

import java.util.stream.Collectors;
import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.port.in.SearchWineSubmissionsUseCase;
import com.vinnot.wine.application.port.out.WineSubmissionRepositoryPort;
import com.vinnot.wine.application.port.out.WineSubmissionAuthorQueryPort;
import com.vinnot.wine.application.query.model.SearchWineSubmissionsQuery;
import com.vinnot.wine.application.query.response.WineSubmissionDetailsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SearchWineSubmissionsQueryHandler
        implements SearchWineSubmissionsUseCase {

    private final WineSubmissionRepositoryPort repository;
    private final WineSubmissionAuthorQueryPort authors;

    @Override
    @Transactional(readOnly = true)
    public PageResult<WineSubmissionDetailsResponse> execute(
            SearchWineSubmissionsQuery query) {
        PageQuery page = PageQuery.of(
                query.page(), query.size(), "createdAt", PageQuery.SortDirection.DESC);
        var submissions = repository.search(query.status(), query.search(), page);
        var authorIds = submissions.content().stream()
                .map(WineSubmission::getSubmittedBy).distinct().toList();
        var names = authors.findAllByIds(authorIds).stream().collect(Collectors.toMap(
                WineSubmissionAuthorQueryPort.Author::id, WineSubmissionAuthorQueryPort.Author::username));
        return submissions.map(submission -> WineSubmissionDetailsResponse.fromDomain(
                submission, true, names.get(submission.getSubmittedBy())));
    }
}

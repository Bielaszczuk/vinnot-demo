package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.port.in.GetMyWineSubmissionsUseCase;
import com.vinnot.wine.application.port.out.WineSubmissionRepositoryPort;
import com.vinnot.wine.application.query.model.GetMyWineSubmissionsQuery;
import com.vinnot.wine.application.query.response.WineSubmissionDetailsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GetMyWineSubmissionsQueryHandler
        implements GetMyWineSubmissionsUseCase {

    private final WineSubmissionRepositoryPort repository;

    @Override
    @Transactional(readOnly = true)
    public PageResult<WineSubmissionDetailsResponse> execute(
            GetMyWineSubmissionsQuery query) {
        PageQuery page = PageQuery.of(
                query.page(), query.size(), "createdAt", PageQuery.SortDirection.DESC);
        return repository.findBySubmittedBy(query.userId(), page)
                .map(submission -> WineSubmissionDetailsResponse.fromDomain(
                        submission, false));
    }
}

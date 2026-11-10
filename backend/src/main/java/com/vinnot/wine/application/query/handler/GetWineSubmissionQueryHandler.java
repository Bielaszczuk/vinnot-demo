package com.vinnot.wine.application.query.handler;

import java.util.List;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.port.in.GetWineSubmissionUseCase;
import com.vinnot.wine.application.port.out.WineSubmissionRepositoryPort;
import com.vinnot.wine.application.port.out.WineSubmissionAuthorQueryPort;
import com.vinnot.wine.application.query.model.GetWineSubmissionQuery;
import com.vinnot.wine.application.query.response.WineSubmissionDetailsResponse;
import com.vinnot.wine.domain.model.WineSubmission;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GetWineSubmissionQueryHandler implements GetWineSubmissionUseCase {

    private final WineSubmissionRepositoryPort repository;
    private final WineSubmissionAuthorQueryPort authors;

    @Override
    @Transactional(readOnly = true)
    public WineSubmissionDetailsResponse execute(GetWineSubmissionQuery query) {
        WineSubmission submission = repository.findById(query.submissionId())
                .orElseThrow(() -> new EntityNotFoundException("Wine submission not found"));
        if (!query.administrator()
                && !submission.getSubmittedBy().equals(query.requestingUserId())) {
            throw new DomainException(
                    "SUBMISSION_ACCESS_DENIED", "You cannot inspect this wine submission");
        }
        String username = query.administrator()
                ? authors.findAllByIds(List.of(submission.getSubmittedBy())).stream()
                    .map(WineSubmissionAuthorQueryPort.Author::username).findFirst().orElse(null)
                : null;
        return WineSubmissionDetailsResponse.fromDomain(
                submission, query.administrator(), username);
    }
}

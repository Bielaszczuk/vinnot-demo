package com.vinnot.community.infrastructure;

import com.vinnot.community.application.port.out.ReportedContentRemovalPort;
import com.vinnot.community.domain.model.ContentTarget;
import com.vinnot.review.application.command.model.DeleteReviewCommand;
import com.vinnot.review.application.command.model.DeleteReviewCommentCommand;
import com.vinnot.review.application.port.in.DeleteReviewCommentUseCase;
import com.vinnot.review.application.port.in.DeleteReviewUseCase;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;

import java.util.UUID;

/** Bridge to existing review use cases; their transaction joins the report resolution. */
@Component
@RequiredArgsConstructor
public class ReportedContentRemovalAdapter implements ReportedContentRemovalPort {
    private final DeleteReviewUseCase reviews;
    private final DeleteReviewCommentUseCase comments;

    @Override
    public void remove(ContentTarget target, UUID moderatorId, String reportReason) {
        switch (target.type()) {
            case REVIEW -> reviews.execute(new DeleteReviewCommand(target.id(), moderatorId, true, reportReason));
            case COMMENT ->
                    comments.execute(
                            new DeleteReviewCommentCommand(target.id(), moderatorId, true, reportReason));
            default -> throw new IllegalArgumentException("Unsupported report removal target");
        }
    }
}

package com.vinnot.review.application.command.handler;

import com.vinnot.review.application.command.model.DeleteReviewCommentCommand;
import com.vinnot.review.application.port.in.DeleteReviewCommentUseCase;
import com.vinnot.review.application.port.out.ReviewModerationNotifier;
import com.vinnot.review.application.port.out.ReviewPointsPort;
import com.vinnot.review.domain.model.ReviewPublication;
import com.vinnot.review.application.port.out.ReviewCommentRepositoryPort;
import com.vinnot.review.application.port.out.ReviewCommentRepositoryPort.ReviewCommentData;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DeleteReviewCommentCommandHandler implements DeleteReviewCommentUseCase {

    private final ReviewCommentRepositoryPort commentRepository;
    private final ReviewModerationNotifier notifier;
    private final ReviewPointsPort points;

    @Override
    @Transactional
    public void execute(DeleteReviewCommentCommand command) {
        ReviewCommentData comment = commentRepository.findById(command.commentId())
                .orElseThrow(() -> new EntityNotFoundException("ReviewComment", command.commentId()));

        if (!command.administrator() && !comment.userId().equals(command.requestingUserId())) {
            throw new BusinessRuleViolationException(
                    "REVIEW_COMMENT_OWNERSHIP",
                    "You can only delete your own comments");
        }

        if (command.administrator() && !comment.userId().equals(command.requestingUserId())) {
            notifier.contentRemoved(ReviewPublication.Type.COMMENT, command.commentId(), comment.userId(), command.reportReason());
        }
        commentRepository.delete(command.commentId());
        points.commentRemoved(comment.userId(), command.commentId());
    }
}

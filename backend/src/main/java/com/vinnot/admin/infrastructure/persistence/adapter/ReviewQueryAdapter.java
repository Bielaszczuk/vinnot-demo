package com.vinnot.admin.infrastructure.persistence.adapter;

import com.vinnot.admin.application.port.out.ReviewQueryPort;
import com.vinnot.review.application.port.out.ReviewRepositoryPort;
import com.vinnot.review.domain.model.Review;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Component("adminReviewQueryAdapter")
@RequiredArgsConstructor
public class ReviewQueryAdapter implements ReviewQueryPort {

    private final ReviewRepositoryPort reviewRepository;

    @Override
    public long count() {
        return reviewRepository.count();
    }

    @Override
    public Optional<ReviewData> findById(UUID id) {
        return reviewRepository.findById(id).map(this::toReviewData);
    }

    @Override
    public PageResult<ReviewData> findAll(PageQuery pageQuery) {
        return reviewRepository.findAll(pageQuery).map(this::toReviewData);
    }

    @Override
    public PageResult<ReviewData> searchByKeyword(String keyword, PageQuery pageQuery) {
        return reviewRepository.searchByKeyword(keyword, pageQuery).map(this::toReviewData);
    }

    private ReviewData toReviewData(Review review) {
        return new ReviewData(
                review.getId(),
                review.getWineId(),
                review.getUserId(),
                review.getRating(),
                review.getTitle(),
                review.getComment(),
                review.isVerified(),
                review.getHelpfulCount(),
                review.getLikesCount(),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }
}


package com.vinnot.review.infrastructure.web.controller;

import com.vinnot.review.application.command.model.CreateReviewCommand;
import com.vinnot.review.application.command.model.UpdateReviewCommand;
import com.vinnot.review.application.port.in.AddReviewCommentUseCase;
import com.vinnot.review.application.port.in.CheckUserReviewUseCase;
import com.vinnot.review.application.port.in.CreateReviewUseCase;
import com.vinnot.review.application.port.in.DeleteReviewCommentUseCase;
import com.vinnot.review.application.port.in.DeleteReviewUseCase;
import com.vinnot.review.application.port.in.GetReviewCommentsUseCase;
import com.vinnot.review.application.port.in.GetReviewsByWineUseCase;
import com.vinnot.review.application.port.in.LikeReviewUseCase;
import com.vinnot.review.application.port.in.UnlikeReviewUseCase;
import com.vinnot.review.application.port.in.UpdateReviewUseCase;
import com.vinnot.review.application.query.model.GetReviewsByWineQuery;
import com.vinnot.review.application.query.response.ReviewResponse;
import com.vinnot.review.infrastructure.web.request.CreateReviewRequest;
import com.vinnot.review.infrastructure.web.request.UpdateReviewRequest;
import com.vinnot.shared.domain.valueobject.PageResult;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ReviewControllerTest {

    private static final String ANONYMOUS_PRINCIPAL = "anonymousUser";
    private static final int FIRST_PAGE = 0;
    private static final int DEFAULT_PAGE_SIZE = 20;

    private final CreateReviewUseCase createReviewUseCase = mock(CreateReviewUseCase.class);
    private final UpdateReviewUseCase updateReviewUseCase = mock(UpdateReviewUseCase.class);
    private final DeleteReviewUseCase deleteReviewUseCase = mock(DeleteReviewUseCase.class);
    private final LikeReviewUseCase likeReviewUseCase = mock(LikeReviewUseCase.class);
    private final UnlikeReviewUseCase unlikeReviewUseCase = mock(UnlikeReviewUseCase.class);
    private final AddReviewCommentUseCase addReviewCommentUseCase = mock(AddReviewCommentUseCase.class);
    private final DeleteReviewCommentUseCase deleteReviewCommentUseCase = mock(DeleteReviewCommentUseCase.class);
    private final GetReviewsByWineUseCase getReviewsByWineUseCase = mock(GetReviewsByWineUseCase.class);
    private final CheckUserReviewUseCase checkUserReviewUseCase = mock(CheckUserReviewUseCase.class);
    private final GetReviewCommentsUseCase getReviewCommentsUseCase = mock(GetReviewCommentsUseCase.class);

    private final ReviewController controller = new ReviewController(
            createReviewUseCase,
            updateReviewUseCase,
            deleteReviewUseCase,
            likeReviewUseCase,
            unlikeReviewUseCase,
            addReviewCommentUseCase,
            deleteReviewCommentUseCase,
            getReviewsByWineUseCase,
            checkUserReviewUseCase,
            getReviewCommentsUseCase
    );

    @Test
    void getByWineTreatsAnonymousPrincipalAsPublicRead() {
        UUID wineId = UUID.randomUUID();
        when(getReviewsByWineUseCase.execute(any(GetReviewsByWineQuery.class)))
                .thenReturn(PageResult.empty());

        ResponseEntity<PageResult<ReviewResponse>> response = controller.getByWine(
                wineId,
                FIRST_PAGE,
                DEFAULT_PAGE_SIZE,
                "recent",
                ANONYMOUS_PRINCIPAL
        );

        ArgumentCaptor<GetReviewsByWineQuery> captor = ArgumentCaptor.forClass(GetReviewsByWineQuery.class);
        verify(getReviewsByWineUseCase).execute(captor.capture());

        assertThat(response.getBody()).isEqualTo(PageResult.empty());
        assertThat(captor.getValue().wineId()).isEqualTo(wineId);
        assertThat(captor.getValue().currentUserId()).isNull();
    }

    @Test
    void checkMyReviewTreatsAnonymousPrincipalAsNoReview() {
        UUID wineId = UUID.randomUUID();

        ResponseEntity<Map<String, Object>> response = controller.checkMyReview(wineId, ANONYMOUS_PRINCIPAL);

        assertThat(response.getBody()).containsEntry("hasReview", false);
        verifyNoInteractions(checkUserReviewUseCase);
    }

    @Test
    void checkMyReviewUsesAuthenticatedPrincipalWhenUuidIsPresent() {
        UUID wineId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(checkUserReviewUseCase.execute(wineId, userId)).thenReturn(true);

        ResponseEntity<Map<String, Object>> response = controller.checkMyReview(wineId, userId.toString());

        assertThat(response.getBody()).containsEntry("hasReview", true);
        verify(checkUserReviewUseCase).execute(wineId, userId);
    }

    @Test
    void createAndUpdatePassTheTastedVintageAndClearFlagToTheCommands() {
        UUID wineId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID reviewId = UUID.randomUUID();
        Authentication authentication = new UsernamePasswordAuthenticationToken(userId.toString(), null, List.of());

        controller.create(wineId, userId.toString(),
                new CreateReviewRequest(new BigDecimal("4.0"), "Title", "Notes", 2018));
        controller.update(wineId, reviewId, userId.toString(), authentication,
                new UpdateReviewRequest(null, null, null, 2019, null));
        controller.update(wineId, reviewId, userId.toString(), authentication,
                new UpdateReviewRequest(null, null, null, null, true));

        ArgumentCaptor<CreateReviewCommand> created = ArgumentCaptor.forClass(CreateReviewCommand.class);
        verify(createReviewUseCase).execute(created.capture());
        assertThat(created.getValue().vintage()).isEqualTo(2018);
        ArgumentCaptor<UpdateReviewCommand> updated = ArgumentCaptor.forClass(UpdateReviewCommand.class);
        verify(updateReviewUseCase, times(2)).execute(updated.capture());
        assertThat(updated.getAllValues().get(0).vintage()).isEqualTo(2019);
        assertThat(updated.getAllValues().get(0).clearVintage()).isFalse();
        assertThat(updated.getAllValues().get(1).vintage()).isNull();
        assertThat(updated.getAllValues().get(1).clearVintage()).isTrue();
    }

    @Test
    void vintageRequestBoundsMatchTheCatalogVintage() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            Validator validator = factory.getValidator();
            for (Class<?> type : List.of(CreateReviewRequest.class, UpdateReviewRequest.class)) {
                for (Integer valid : new Integer[] {null, 1800, 2100}) {
                    assertThat(validator.validateValue(type, "vintage", valid)).as("%s %s", type, valid).isEmpty();
                }
                assertThat(validator.validateValue(type, "vintage", 1799)).isNotEmpty();
                assertThat(validator.validateValue(type, "vintage", 2101)).isNotEmpty();
            }
        }
    }
}

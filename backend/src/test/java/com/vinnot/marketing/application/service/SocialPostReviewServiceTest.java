package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.EditSocialPostCommand;
import com.vinnot.marketing.application.model.SocialPostAdminResponse;
import com.vinnot.marketing.application.port.in.GenerateSocialCopyUseCase;
import com.vinnot.marketing.application.port.out.ContentPillarCatalog;
import com.vinnot.marketing.application.port.out.SocialMediaRenderQueue;
import com.vinnot.marketing.application.port.out.SocialMetricsRepository;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.application.port.out.SocialPublicationRepository;
import com.vinnot.marketing.application.port.out.WineDayCatalog;
import com.vinnot.marketing.domain.exception.InvalidPostCopyException;
import com.vinnot.marketing.domain.exception.InvalidPostTransitionException;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.service.WeeklyPlanner;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.vinnot.marketing.application.service.MarketingFixtures.NOW;
import static com.vinnot.marketing.application.service.MarketingFixtures.TAGS;
import static com.vinnot.marketing.application.service.MarketingFixtures.TUESDAY_SLOT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * S5: approve, reject, edit and regenerate through the use case, with the domain deciding what is allowed. #497: an edit
 * replaces one language; S14: an approved post may be regenerated and goes back to pending.
 */
class SocialPostReviewServiceTest {
    private final SocialPostRepository posts = mock(SocialPostRepository.class);
    private final GenerateSocialCopyUseCase copy = mock(GenerateSocialCopyUseCase.class);
    private final ContentPillarCatalog pillars = mock(ContentPillarCatalog.class);
    private final WineDayCatalog wineDays = mock(WineDayCatalog.class);
    private final SocialMediaRenderQueue renders = mock(SocialMediaRenderQueue.class);
    private final SocialPostReviewService service = new SocialPostReviewService(posts, copy,
            new SocialPostPresenter(pillars, wineDays, WeeklyPlanner.Settings.defaults(), ids -> Map.of(),
                    mock(SocialPublicationRepository.class), mock(SocialMetricsRepository.class), PublishingFixtures.SETTINGS), renders);
    private final UUID reviewer = UUID.randomUUID();

    @BeforeEach
    void catalogs() {
        when(pillars.all()).thenReturn(MarketingFixtures.PILLARS);
        when(wineDays.all()).thenReturn(List.of(MarketingFixtures.MERLOT));
        when(posts.saveIfStatus(any(), any())).thenReturn(true);
    }

    @Test
    void approvingRecordsTheReviewerAndSaves() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));

        SocialPostAdminResponse response = service.approve(post.id(), reviewer, NOW);

        assertThat(response.status()).isEqualTo(SocialPostStatus.APPROVED);
        assertThat(response.review().reviewedBy()).isEqualTo(reviewer);
        verify(posts).saveIfStatus(post, SocialPostStatus.PENDING_APPROVAL);
        assertThatThrownBy(() -> service.approve(post.id(), reviewer, NOW)).isInstanceOf(InvalidPostTransitionException.class);
        assertThatThrownBy(() -> service.approve(UUID.randomUUID(), reviewer, NOW)).isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void rejectingKeepsTheOptionalReason() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));

        SocialPostAdminResponse response = service.reject(post.id(), reviewer, "Muy largo", NOW);

        assertThat(response.status()).isEqualTo(SocialPostStatus.REJECTED);
        assertThat(response.review().reason()).isEqualTo("Muy largo");
        verify(posts).saveIfStatus(post, SocialPostStatus.PENDING_APPROVAL);
    }

    @Test
    void editingValidatesTheCopyAndReappendsTheLegalLine() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        post.approve(reviewer, NOW);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        UUID editor = UUID.randomUUID();
        EditSocialPostCommand command = new EditSocialPostCommand(PostLanguage.ES, "Nuevo hook", List.of(
                new EditSocialPostCommand.Slide("A", "a"), new EditSocialPostCommand.Slide("B", "b"), new EditSocialPostCommand.Slide("C", "c")),
                "Caption editado", TAGS, "Alt", "¿Qué opinas?");

        SocialPostAdminResponse response = service.edit(post.id(), command, editor, NOW);

        assertThat(response.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(response.copies().es().hook()).isEqualTo("Nuevo hook");
        assertThat(response.copies().es().caption()).isEqualTo("Caption editado\n\n" + PostLanguage.ES.legalLine());
        assertThat(response.copies().en().hook()).as("the other language stays").isEqualTo(MarketingFixtures.COPY_EN.hook());
        assertThat(response.review().editedBy()).isEqualTo(editor);
        verify(posts).saveIfStatus(post, SocialPostStatus.APPROVED);

        EditSocialPostCommand invalid = new EditSocialPostCommand(PostLanguage.ES, "x".repeat(61), command.slides(), "c", TAGS, "Alt", "cta");
        assertThatThrownBy(() -> service.edit(post.id(), invalid, editor, NOW)).isInstanceOf(InvalidPostCopyException.class);
    }

    @Test
    void regeneratingRunsCopyGenerationForPendingOrRejectedPostsAsBefore() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        post.reject(reviewer, null, NOW);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        when(copy.generate(post.id(), NOW)).thenAnswer(invocation -> {
            post.copyGenerated(MarketingFixtures.COPIES, MarketingFixtures.GENERATED, NOW);
            return post;
        });

        assertThat(service.regenerate(post.id(), NOW).status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);

        SocialPost scheduled = SocialPost.restore(UUID.randomUUID(), SocialPostStatus.SCHEDULED, TUESDAY_SLOT, "EDUCATION", null,
                MarketingFixtures.COPIES, MarketingFixtures.GENERATED, null, null, NOW, NOW);
        when(posts.findById(scheduled.id())).thenReturn(Optional.of(scheduled));
        assertThatThrownBy(() -> service.regenerate(scheduled.id(), NOW)).isInstanceOf(InvalidPostTransitionException.class);
        verify(copy).generate(post.id(), NOW);
    }

    @Test
    void regeneratingAnApprovedPostRewritesBothLanguagesAndReturnsItToPendingWithoutItsApproval() {
        SocialPost approved = SocialPost.restore(UUID.randomUUID(), SocialPostStatus.PENDING_APPROVAL, TUESDAY_SLOT, "EDUCATION", null,
                PostCopies.only(PostLanguage.ES, MarketingFixtures.COPY), MarketingFixtures.GENERATED, null, null, NOW, NOW);
        approved.approve(reviewer, NOW);
        when(posts.findById(approved.id())).thenReturn(Optional.of(approved));
        when(copy.generate(approved.id(), NOW)).thenAnswer(invocation -> {
            approved.copyGenerated(MarketingFixtures.COPIES, MarketingFixtures.GENERATED, NOW);
            return approved;
        });

        SocialPostAdminResponse response = service.regenerate(approved.id(), NOW);

        assertThat(response.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(response.review()).isNull();
        assertThat(response.copies().en()).as("an old approved post gets its missing English").isNotNull();
        verify(copy).generate(approved.id(), NOW);
    }

    @Test
    void editingWithoutSlidesIsInvalidCopy() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        EditSocialPostCommand command = new EditSocialPostCommand(PostLanguage.ES, "Hook", null, "Caption", TAGS, "Alt", "¿Y tú?");
        assertThatThrownBy(() -> service.edit(post.id(), command, reviewer, NOW)).isInstanceOf(InvalidPostCopyException.class)
                .hasMessageContaining("slides");
        assertThat(post.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(post.copies()).isEqualTo(MarketingFixtures.COPIES);
    }

    @Test
    void anEditQueuesTheRenderOfTheNewCopy() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        EditSocialPostCommand command = new EditSocialPostCommand(PostLanguage.EN, "New hook", List.of(new EditSocialPostCommand.Slide("A", "a"),
                new EditSocialPostCommand.Slide("B", "b"), new EditSocialPostCommand.Slide("C", "c")), "Caption", MarketingFixtures.TAGS_EN,
                "Alt", "And you?");

        SocialPostAdminResponse response = service.edit(post.id(), command, reviewer, NOW);

        verify(renders).requestFor(post);
        assertThat(post.copies().en().caption()).endsWith(PostLanguage.EN.legalLine());
        assertThat(post.media().copyHashes()).isEqualTo(post.copies().mediaHashes());
        assertThat(post.media().staleLanguages()).containsExactly(PostLanguage.ES, PostLanguage.EN);
        assertThat(response.media().status()).isEqualTo(SocialPostMedia.Status.PENDING);
    }

    @Test
    void aNewIllustrationBumpsTheVersionQueuesTheRenderAndConflictsOnceThereIsNoCopy() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));

        SocialPostAdminResponse response = service.newIllustration(post.id(), NOW);

        assertThat(post.media().illustrationVersion()).isEqualTo(2);
        assertThat(response.media().status()).isEqualTo(SocialPostMedia.Status.PENDING);
        verify(posts).saveIfStatus(post, SocialPostStatus.PENDING_APPROVAL);
        verify(renders).requestFor(post);

        SocialPost draft = MarketingFixtures.draft(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(draft.id())).thenReturn(Optional.of(draft));
        assertThatThrownBy(() -> service.newIllustration(draft.id(), NOW)).isInstanceOf(InvalidPostTransitionException.class);
        assertThatThrownBy(() -> service.newIllustration(UUID.randomUUID(), NOW)).isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void anActionOnAPostThatPublishingChangedMeanwhileConflictsAndQueuesNothing() {
        SocialPost post = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        post.approve(reviewer, NOW);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        when(posts.saveIfStatus(post, SocialPostStatus.APPROVED)).thenReturn(false);
        EditSocialPostCommand command = new EditSocialPostCommand(PostLanguage.ES, "Nuevo hook", List.of(
                new EditSocialPostCommand.Slide("A", "a"), new EditSocialPostCommand.Slide("B", "b"), new EditSocialPostCommand.Slide("C", "c")),
                "Caption editado", TAGS, "Alt", "¿Qué opinas?");

        assertThatThrownBy(() -> service.edit(post.id(), command, reviewer, NOW)).isInstanceOf(InvalidPostTransitionException.class)
                .hasMessageContaining("APPROVED");
        verify(renders, never()).requestFor(any());
        SocialPost other = MarketingFixtures.pending(TUESDAY_SLOT, "CURIOUS_FACT", null);
        other.approve(reviewer, NOW);
        when(posts.findById(other.id())).thenReturn(Optional.of(other));
        when(posts.saveIfStatus(other, SocialPostStatus.APPROVED)).thenReturn(false);
        assertThatThrownBy(() -> service.reject(other.id(), reviewer, null, NOW)).isInstanceOf(InvalidPostTransitionException.class);
    }
}

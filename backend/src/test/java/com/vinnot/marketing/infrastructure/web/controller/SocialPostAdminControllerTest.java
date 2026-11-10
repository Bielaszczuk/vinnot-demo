package com.vinnot.marketing.infrastructure.web.controller;

import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.marketing.application.model.EditSocialPostCommand;
import com.vinnot.marketing.application.model.PlanResult;
import com.vinnot.marketing.application.model.SocialPostAdminResponse;
import com.vinnot.marketing.application.port.in.BrowseSocialPostsUseCase;
import com.vinnot.marketing.application.port.in.PlanWeekUseCase;
import com.vinnot.marketing.application.port.in.RetrySocialPublicationUseCase;
import com.vinnot.marketing.application.port.in.ReviewSocialPostUseCase;
import com.vinnot.marketing.application.port.in.ScheduleSocialPostUseCase;
import com.vinnot.marketing.application.exception.SocialPostDateTakenException;
import com.vinnot.marketing.application.exception.SocialPublishingOffException;
import com.vinnot.marketing.domain.exception.SocialPostMediaNotReadyException;
import com.vinnot.marketing.domain.exception.SocialPostScheduleNotFutureException;
import com.vinnot.marketing.domain.exception.InvalidPostCopyException;
import com.vinnot.marketing.domain.exception.InvalidPostTransitionException;
import com.vinnot.marketing.domain.exception.InvalidPublicationTransitionException;
import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.config.SecurityConfig;
import com.vinnot.shared.infrastructure.security.JwtAuthenticationFilter;
import com.vinnot.shared.infrastructure.security.RateLimitingFilter;
import com.vinnot.shared.infrastructure.security.RestAuthenticationEntryPoint;
import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * S7: the admin endpoints, their wrapping, the ADMIN-only guard and the 409 of an invalid transition. #497 S9: copies and
 * slides per language, and an edit names its language. #513 S5-S7: reschedule and publish now, their error codes, and the
 * response's flags and per-network times.
 */
@WebMvcTest(SocialPostAdminController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class})
class SocialPostAdminControllerTest {
    private static final Instant SLOT = Instant.parse("2026-11-07T22:00:00Z");
    @Autowired private MockMvc mvc;
    @MockitoBean private BrowseSocialPostsUseCase browse;
    @MockitoBean private PlanWeekUseCase plan;
    @MockitoBean private ReviewSocialPostUseCase review;
    @MockitoBean private RetrySocialPublicationUseCase retry;
    @MockitoBean private ScheduleSocialPostUseCase schedule;
    @MockitoBean private ReauthenticationProofPort proofs;
    @MockitoBean private CheckWineReadAccessUseCase wineReadAccess;
    @MockitoBean private LegalAgreementUseCase legalAgreements;
    @MockitoBean private JwtAuthenticationFilter jwt;
    @MockitoBean private RateLimitingFilter limiter;
    private final UUID adminId = UUID.randomUUID();
    private final UsernamePasswordAuthenticationToken admin = token(adminId, "ROLE_ADMIN");
    private final UUID postId = UUID.randomUUID();

    @BeforeEach
    void passThroughFilters() throws Exception {
        doAnswer(invocation -> {
            invocation.getArgument(2, FilterChain.class).doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwt).doFilter(any(), any(), any());
        doAnswer(invocation -> {
            invocation.getArgument(2, FilterChain.class).doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(limiter).doFilter(any(), any(), any());
    }

    @Test
    void listsTheQueueAsAWrappedPageAndReadsTheFilters() throws Exception {
        when(browse.search(SocialPostStatus.PENDING_APPROVAL, LocalDate.of(2026, 11, 2), LocalDate.of(2026, 11, 15), 0, 20))
                .thenReturn(PageResult.of(List.of(response(SocialPostStatus.PENDING_APPROVAL)), 0, 20, 1));

        mvc.perform(get("/admin/social-posts?status=PENDING_APPROVAL&from=2026-11-02&to=2026-11-15").with(authentication(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.content[0].id").value(postId.toString()))
                .andExpect(jsonPath("$.content[0].status").value("PENDING_APPROVAL"))
                .andExpect(jsonPath("$.content[0].scheduledFor").value("2026-11-07T22:00:00Z"))
                .andExpect(jsonPath("$.content[0].language").doesNotExist())
                .andExpect(jsonPath("$.content[0].copy").doesNotExist())
                .andExpect(jsonPath("$.content[0].pillar.code").value("WINE_DAY"))
                .andExpect(jsonPath("$.content[0].wineDay.date").value("2026-11-07"))
                .andExpect(jsonPath("$.content[0].copies.es.hashtags[0]").value("#vinnot"))
                .andExpect(jsonPath("$.content[0].copies.en.hook").value("Hello"))
                .andExpect(jsonPath("$.content[0].generation.factCheck").value("PASSED"))
                .andExpect(jsonPath("$.content[0].review").isEmpty());
    }

    @Test
    void onlyAdministratorsMayUseTheQueue() throws Exception {
        mvc.perform(get("/admin/social-posts").with(authentication(token(UUID.randomUUID(), "ROLE_MODERATOR"))))
                .andExpect(status().isForbidden());
        mvc.perform(post("/admin/social-posts/plan").with(authentication(token(UUID.randomUUID(), "ROLE_USER"))))
                .andExpect(status().isForbidden());
        mvc.perform(get("/admin/social-posts/pillars")).andExpect(status().isUnauthorized());
    }

    @Test
    void planningNowReturnsWhatWasCreated() throws Exception {
        when(plan.execute(any())).thenReturn(new PlanResult(6, LocalDate.of(2026, 11, 2), LocalDate.of(2026, 11, 15)));

        mvc.perform(post("/admin/social-posts/plan").with(authentication(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.created").value(6))
                .andExpect(jsonPath("$.from").value("2026-11-02"))
                .andExpect(jsonPath("$.to").value("2026-11-15"));
    }

    @Test
    void approvalPassesTheAdminAndAnInvalidTransitionConflicts() throws Exception {
        when(review.approve(eq(postId), eq(adminId), any())).thenReturn(response(SocialPostStatus.APPROVED));
        mvc.perform(post("/admin/social-posts/" + postId + "/approve").with(authentication(admin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APPROVED"));

        when(review.reject(eq(postId), eq(adminId), eq("Muy largo"), any()))
                .thenThrow(new InvalidPostTransitionException(SocialPostStatus.REJECTED, "reject"));
        mvc.perform(post("/admin/social-posts/" + postId + "/reject").with(authentication(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Muy largo\"}"))
                .andExpect(status().isConflict());

        when(review.reject(eq(postId), eq(adminId), eq(null), any())).thenReturn(response(SocialPostStatus.REJECTED));
        mvc.perform(post("/admin/social-posts/" + postId + "/reject").with(authentication(admin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    void theResponseCarriesCopiesAndSlidesPerLanguageWithNullForAMissingLanguage() throws Exception {
        when(browse.get(postId)).thenReturn(legacyResponse());

        mvc.perform(get("/admin/social-posts/{id}", postId).with(authentication(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.copies.es.hook").value("Hola"))
                .andExpect(jsonPath("$.copies.es.slides[0].title").value("A"))
                .andExpect(jsonPath("$.copies.es.caption").value("Texto"))
                .andExpect(jsonPath("$.copies.es.altText").value("Alt"))
                .andExpect(jsonPath("$.copies.es.cta").value("¿Y tú?"))
                .andExpect(jsonPath("$.copies.es.illustration").value("a bunch of Merlot grapes"))
                .andExpect(jsonPath("$.copies.en").value(nullValue()))
                .andExpect(jsonPath("$.media.status").value("READY"))
                .andExpect(jsonPath("$.media.source").value("AI"))
                .andExpect(jsonPath("$.media.heroUrl").value("https://cdn/hero.png"))
                .andExpect(jsonPath("$.media.updatedAt").value("2026-11-07T22:00:00Z"))
                .andExpect(jsonPath("$.media.slides.es.instagram[0]").value("https://cdn/es/ig-1.jpg"))
                .andExpect(jsonPath("$.media.slides.es.tiktok[0]").value("https://cdn/es/tt-1.jpg"))
                .andExpect(jsonPath("$.media.slides.es.renderedFor").value("hash-es"))
                .andExpect(jsonPath("$.media.slides.en").value(nullValue()))
                .andExpect(jsonPath("$.media.instagram").doesNotExist())
                .andExpect(jsonPath("$.media.renderedFor").doesNotExist());
    }

    @Test
    void anEditWithoutALanguageOrWithAnotherOneIsABadRequest() throws Exception {
        String copy = """
                "hook":"Hola","slides":[{"title":"A","body":"a"},{"title":"B","body":"b"},{"title":"C","body":"c"}],
                 "caption":"Texto","hashtags":["#vinnot","#vino","#tinto","#copa","#malbec"],"altText":"Alt","cta":"¿Y tú?"
                """;
        mvc.perform(put("/admin/social-posts/" + postId).with(authentication(admin)).contentType(MediaType.APPLICATION_JSON)
                        .content("{" + copy + "}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_POST_LANGUAGE"));
        mvc.perform(put("/admin/social-posts/" + postId).with(authentication(admin)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"language\":\"fr\"," + copy + "}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_POST_LANGUAGE"));
        verify(review, never()).edit(any(), any(), any(), any());

        when(review.edit(eq(postId), any(), eq(adminId), any())).thenReturn(response(SocialPostStatus.PENDING_APPROVAL));
        mvc.perform(put("/admin/social-posts/" + postId).with(authentication(admin)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"language\":\"en\"," + copy + "}"))
                .andExpect(status().isOk());
        ArgumentCaptor<EditSocialPostCommand> command = ArgumentCaptor.forClass(EditSocialPostCommand.class);
        verify(review).edit(eq(postId), command.capture(), eq(adminId), any());
        assertThat(command.getValue().language()).isEqualTo(PostLanguage.EN);
    }

    @Test
    void editingSendsTheTypedCopyAndInvalidCopyIsABadRequest() throws Exception {
        when(review.edit(eq(postId), any(), eq(adminId), any())).thenReturn(response(SocialPostStatus.PENDING_APPROVAL));
        String body = """
                {"language":"es","hook":"Hola","slides":[{"title":"A","body":"a"},{"title":"B","body":"b"},{"title":"C","body":"c"}],
                 "caption":"Texto","hashtags":["#vinnot","#vino","#tinto","#copa","#malbec"],"altText":"Alt","cta":"¿Y vos?"}
                """;
        mvc.perform(put("/admin/social-posts/" + postId).with(authentication(admin)).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        ArgumentCaptor<EditSocialPostCommand> command = ArgumentCaptor.forClass(EditSocialPostCommand.class);
        verify(review).edit(eq(postId), command.capture(), eq(adminId), any());
        assertThat(command.getValue().language()).isEqualTo(PostLanguage.ES);
        assertThat(command.getValue().hook()).isEqualTo("Hola");
        assertThat(command.getValue().slides()).containsExactly(new EditSocialPostCommand.Slide("A", "a"),
                new EditSocialPostCommand.Slide("B", "b"), new EditSocialPostCommand.Slide("C", "c"));
        assertThat(command.getValue().hashtags()).hasSize(5);

        when(review.edit(eq(postId), any(), eq(adminId), any())).thenThrow(new InvalidPostCopyException("hook is required"));
        mvc.perform(put("/admin/social-posts/" + postId).with(authentication(admin)).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());

        when(review.regenerate(eq(postId), any())).thenReturn(response(SocialPostStatus.PENDING_APPROVAL));
        mvc.perform(post("/admin/social-posts/" + postId + "/regenerate").with(authentication(admin))).andExpect(status().isOk());
    }

    @Test
    void regeneratingAnApprovedPostAnswersItBackInPendingAndAForbiddenStatusConflicts() throws Exception {
        when(review.regenerate(eq(postId), any())).thenReturn(response(SocialPostStatus.PENDING_APPROVAL));
        mvc.perform(post("/admin/social-posts/{id}/regenerate", postId).with(authentication(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"))
                .andExpect(jsonPath("$.review").value(nullValue()))
                .andExpect(jsonPath("$.copies.en.hook").value("Hello"));

        UUID published = UUID.randomUUID();
        when(review.regenerate(eq(published), any())).thenThrow(new InvalidPostTransitionException(SocialPostStatus.PUBLISHED,
                "regenerate"));
        mvc.perform(post("/admin/social-posts/{id}/regenerate", published).with(authentication(admin)))
                .andExpect(status().isConflict());
    }

    @Test
    void theCalendarAndThePillarsAreListed() throws Exception {
        when(browse.wineDays(2026)).thenReturn(List.of());
        when(browse.pillars()).thenReturn(List.of());
        mvc.perform(get("/admin/social-posts/wine-days?year=2026").with(authentication(admin))).andExpect(status().isOk());
        mvc.perform(get("/admin/social-posts/pillars").with(authentication(admin))).andExpect(status().isOk());
        verify(browse).wineDays(2026);
        verify(browse).pillars();
    }

    @Test
    void aNewIllustrationIsAcceptedForAdminsOnlyAndConflictsWithoutCopy() throws Exception {
        when(review.newIllustration(eq(postId), any())).thenReturn(response(SocialPostStatus.PENDING_APPROVAL));

        mvc.perform(post("/admin/social-posts/{id}/illustration", postId).with(authentication(admin)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.media.status").value("PENDING"))
                .andExpect(jsonPath("$.media.heroUrl").value("https://cdn/hero.png"))
                .andExpect(jsonPath("$.media.slides.es.instagram[0]").value("https://cdn/es/ig-1.jpg"))
                .andExpect(jsonPath("$.media.slides.en.tiktok[0]").value("https://cdn/en/tt-1.jpg"))
                .andExpect(jsonPath("$.copies.es.illustration").value("a bunch of Merlot grapes"));
        verify(review).newIllustration(eq(postId), any());

        mvc.perform(post("/admin/social-posts/{id}/illustration", postId).with(authentication(token(UUID.randomUUID(), "ROLE_USER"))))
                .andExpect(status().isForbidden());

        UUID draft = UUID.randomUUID();
        when(review.newIllustration(eq(draft), any())).thenThrow(new InvalidPostTransitionException(SocialPostStatus.DRAFT,
                "request a new illustration for"));
        mvc.perform(post("/admin/social-posts/{id}/illustration", draft).with(authentication(admin)))
                .andExpect(status().isConflict());
    }

    @Test
    void retryingAFailedNetworkAnswers202WithThePublicationsAndThePublishingRecord() throws Exception {
        when(retry.retry(eq(postId), eq(SocialNetwork.INSTAGRAM), any())).thenReturn(retriedResponse());

        mvc.perform(post("/admin/social-posts/{id}/publications/{network}/retry", postId, "instagram").with(authentication(admin)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("SCHEDULED"))
                .andExpect(jsonPath("$.review.automatic").value(true))
                .andExpect(jsonPath("$.publishing.startedAt").value("2026-11-07T22:00:00Z"))
                .andExpect(jsonPath("$.publishing.finishedAt").value(nullValue()))
                .andExpect(jsonPath("$.publications[0].network").value("INSTAGRAM"))
                .andExpect(jsonPath("$.publications[0].status").value("QUEUED"))
                .andExpect(jsonPath("$.publications[0].attempts").value(0))
                .andExpect(jsonPath("$.publications[1].network").value("TIKTOK"))
                .andExpect(jsonPath("$.publications[1].status").value("DRAFT_SENT"))
                .andExpect(jsonPath("$.publications[1].externalId").value("tt-1"))
                .andExpect(jsonPath("$.publications[1].publishedAt").value("2026-11-07T22:00:00Z"))
                .andExpect(jsonPath("$.publications[1].metrics.views").value(250))
                .andExpect(jsonPath("$.publications[1].metrics.likes").value(12))
                .andExpect(jsonPath("$.publications[1].metrics.reach").value(nullValue()));
        mvc.perform(post("/admin/social-posts/{id}/publications/{network}/retry", postId, "INSTAGRAM").with(authentication(admin)))
                .andExpect(status().isAccepted());
        verify(retry, times(2)).retry(eq(postId), eq(SocialNetwork.INSTAGRAM), any());
    }

    @Test
    void retryingAPublicationThatDidNotFailConflictsAndAnUnknownNetworkIsABadRequest() throws Exception {
        when(retry.retry(eq(postId), eq(SocialNetwork.THREADS), any())).thenThrow(new InvalidPublicationTransitionException(
                PublicationStatus.PUBLISHED, "retry"));

        mvc.perform(post("/admin/social-posts/{id}/publications/{network}/retry", postId, "threads").with(authentication(admin)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_PUBLICATION_TRANSITION"));
        mvc.perform(post("/admin/social-posts/{id}/publications/{network}/retry", postId, "myspace").with(authentication(admin)))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/admin/social-posts/{id}/publications/{network}/retry", postId, "threads")
                        .with(authentication(token(UUID.randomUUID(), "ROLE_USER"))))
                .andExpect(status().isForbidden());
        verify(retry).retry(eq(postId), eq(SocialNetwork.THREADS), any());
    }

    @Test
    void reschedulingSendsTheNewInstantAndAnswersThePostWithItsFlagsAndNetworkTimes() throws Exception {
        Instant monday = Instant.parse("2026-11-09T15:00:00Z");
        when(schedule.reschedule(eq(postId), eq(monday), any())).thenReturn(response(SocialPostStatus.PENDING_APPROVAL));

        mvc.perform(put("/admin/social-posts/{id}/schedule", postId).with(authentication(admin)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"scheduledFor\":\"2026-11-09T15:00:00Z\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(postId.toString()))
                .andExpect(jsonPath("$.canReschedule").value(true))
                .andExpect(jsonPath("$.canPublishNow").value(false))
                .andExpect(jsonPath("$.networkSchedule[0].network").value("INSTAGRAM"))
                .andExpect(jsonPath("$.networkSchedule[0].publishAt").value("2026-11-07T22:00:00Z"))
                .andExpect(jsonPath("$.networkSchedule[1].network").value("TIKTOK"))
                .andExpect(jsonPath("$.networkSchedule[1].publishAt").value("2026-11-07T22:30:00Z"));
        ArgumentCaptor<Instant> now = ArgumentCaptor.forClass(Instant.class);
        verify(schedule).reschedule(eq(postId), eq(monday), now.capture());
        assertThat(now.getValue()).isBefore(Instant.now().plusSeconds(1));
    }

    @Test
    void aRescheduleWithoutAValidInstantIsABadRequest() throws Exception {
        for (String body : List.of("{}", "{\"scheduledFor\":\"next monday\"}")) {
            mvc.perform(put("/admin/social-posts/{id}/schedule", postId).with(authentication(admin)).contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }
        verify(schedule, never()).reschedule(any(), any(), any());
    }

    @Test
    void aRefusedRescheduleAnswersItsErrorCode() throws Exception {
        Instant past = Instant.parse("2026-11-01T15:00:00Z");
        Instant taken = Instant.parse("2026-11-10T15:00:00Z");
        Instant started = Instant.parse("2026-11-11T15:00:00Z");
        when(schedule.reschedule(eq(postId), eq(past), any())).thenThrow(new SocialPostScheduleNotFutureException(past));
        when(schedule.reschedule(eq(postId), eq(taken), any())).thenThrow(new SocialPostDateTakenException(LocalDate.of(2026, 11, 10)));
        when(schedule.reschedule(eq(postId), eq(started), any())).thenThrow(new InvalidPostTransitionException(SocialPostStatus.SCHEDULED,
                "reschedule"));

        reschedule(past).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("SOCIAL_POST_SCHEDULE_NOT_FUTURE"));
        reschedule(taken).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SOCIAL_POST_DATE_TAKEN"));
        reschedule(started).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INVALID_POST_TRANSITION"));
    }

    @Test
    void publishingNowIsAcceptedAndAnswersTheStartedPost() throws Exception {
        when(schedule.publishNow(eq(postId), any())).thenReturn(retriedResponse());

        mvc.perform(post("/admin/social-posts/{id}/publish-now", postId).with(authentication(admin)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("SCHEDULED"))
                .andExpect(jsonPath("$.canReschedule").value(false))
                .andExpect(jsonPath("$.canPublishNow").value(false))
                .andExpect(jsonPath("$.networkSchedule.length()").value(2));
        verify(schedule).publishNow(eq(postId), any());
    }

    @Test
    void aRefusedPublishNowAnswersItsErrorCode() throws Exception {
        UUID pending = UUID.randomUUID();
        UUID withoutMedia = UUID.randomUUID();
        UUID off = UUID.randomUUID();
        when(schedule.publishNow(eq(pending), any())).thenThrow(new InvalidPostTransitionException(SocialPostStatus.PENDING_APPROVAL,
                "publish now"));
        when(schedule.publishNow(eq(withoutMedia), any())).thenThrow(new SocialPostMediaNotReadyException());
        when(schedule.publishNow(eq(off), any())).thenThrow(new SocialPublishingOffException());

        publishNow(pending).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INVALID_POST_TRANSITION"));
        publishNow(withoutMedia).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SOCIAL_POST_MEDIA_NOT_READY"));
        publishNow(off).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SOCIAL_PUBLISHING_OFF"));
    }

    @Test
    void onlyAdministratorsMayRescheduleOrPublishNow() throws Exception {
        UsernamePasswordAuthenticationToken moderator = token(UUID.randomUUID(), "ROLE_MODERATOR");
        mvc.perform(put("/admin/social-posts/{id}/schedule", postId).with(authentication(moderator)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"scheduledFor\":\"2026-11-09T15:00:00Z\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/admin/social-posts/{id}/publish-now", postId).with(authentication(moderator))).andExpect(status().isForbidden());
        verify(schedule, never()).reschedule(any(), any(), any());
        verify(schedule, never()).publishNow(any(), any());
    }

    private ResultActions reschedule(Instant to) throws Exception {
        return mvc.perform(put("/admin/social-posts/{id}/schedule", postId).with(authentication(admin)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"scheduledFor\":\"" + to + "\"}"));
    }

    private ResultActions publishNow(UUID id) throws Exception {
        return mvc.perform(post("/admin/social-posts/{id}/publish-now", id).with(authentication(admin)));
    }

    private SocialPostAdminResponse response(SocialPostStatus status) {
        return new SocialPostAdminResponse(postId, status, SLOT, PILLAR, WINE_DAY,
                new SocialPostAdminResponse.Copies(SPANISH, new SocialPostAdminResponse.Copy("Hello", List.of(new SocialPostAdminResponse.Slide("A",
                        "a")), "Text", List.of("#vinnot", "#merlot"), "Alt", "And you?", "a bunch of Merlot grapes")),
                GENERATION, null,
                new SocialPostAdminResponse.Media(SocialPostMedia.Status.PENDING, SocialPostMedia.Source.AI, null, null, "https://cdn/hero.png",
                        new SocialPostAdminResponse.SlideSets(
                                new SocialPostAdminResponse.SlideSet(List.of("https://cdn/es/ig-1.jpg"), List.of("https://cdn/es/tt-1.jpg"), "hash-es"),
                                new SocialPostAdminResponse.SlideSet(List.of("https://cdn/en/ig-1.jpg"), List.of("https://cdn/en/tt-1.jpg"), "hash-en")),
                        SLOT),
                null, List.of(), SLOT, SLOT, true, false, NETWORK_SCHEDULE);
    }

    /** A post stored before #497: Spanish copy and slides only. */
    private SocialPostAdminResponse legacyResponse() {
        return new SocialPostAdminResponse(postId, SocialPostStatus.APPROVED, SLOT, PILLAR, WINE_DAY,
                new SocialPostAdminResponse.Copies(SPANISH, null), GENERATION, null,
                new SocialPostAdminResponse.Media(SocialPostMedia.Status.READY, SocialPostMedia.Source.AI, null, null, "https://cdn/hero.png",
                        new SocialPostAdminResponse.SlideSets(new SocialPostAdminResponse.SlideSet(List.of("https://cdn/es/ig-1.jpg"),
                                List.of("https://cdn/es/tt-1.jpg"), "hash-es"), null), SLOT),
                null, List.of(), SLOT, SLOT, true, true, NETWORK_SCHEDULE);
    }

    /** A post whose Instagram publication failed and was queued again, approved by the system, with metrics on TikTok. */
    private SocialPostAdminResponse retriedResponse() {
        return new SocialPostAdminResponse(postId, SocialPostStatus.SCHEDULED, SLOT, PILLAR, WINE_DAY,
                new SocialPostAdminResponse.Copies(SPANISH, null), GENERATION,
                new SocialPostAdminResponse.Review(null, null, SLOT, "AUTO_APPROVED", null, null, true), null,
                new SocialPostAdminResponse.Publishing(SLOT, null, null),
                List.of(new SocialPostAdminResponse.Publication(SocialNetwork.INSTAGRAM, PublicationStatus.QUEUED, null, null, 0, null, null,
                                null),
                        new SocialPostAdminResponse.Publication(SocialNetwork.TIKTOK, PublicationStatus.DRAFT_SENT, "tt-1", null, 1, null, SLOT,
                                new SocialPostAdminResponse.Metrics(250L, null, 12L, 3L, null, 1L, null))),
                SLOT, SLOT, false, false, NETWORK_SCHEDULE);
    }

    private static final List<SocialPostAdminResponse.NetworkSchedule> NETWORK_SCHEDULE = List.of(
            new SocialPostAdminResponse.NetworkSchedule(SocialNetwork.INSTAGRAM, SLOT),
            new SocialPostAdminResponse.NetworkSchedule(SocialNetwork.TIKTOK, Instant.parse("2026-11-07T22:30:00Z")));
    private static final SocialPostAdminResponse.Pillar PILLAR = new SocialPostAdminResponse.Pillar("WINE_DAY", "Día del vino", "Wine day");
    private static final SocialPostAdminResponse.WineDayRef WINE_DAY = new SocialPostAdminResponse.WineDayRef("MERLOT",
            "Día Internacional del Merlot", "International Merlot Day", LocalDate.of(2026, 11, 7));
    private static final SocialPostAdminResponse.Copy SPANISH = new SocialPostAdminResponse.Copy("Hola",
            List.of(new SocialPostAdminResponse.Slide("A", "a")), "Texto", List.of("#vinnot", "#merlot"), "Alt", "¿Y tú?",
            "a bunch of Merlot grapes");
    private static final SocialPostAdminResponse.Generation GENERATION = new SocialPostAdminResponse.Generation("openai", "gpt-4o-mini",
            false, 1, SLOT, FactCheck.PASSED, List.of(), null);

    private static UsernamePasswordAuthenticationToken token(UUID id, String role) {
        return new UsernamePasswordAuthenticationToken(id.toString(), null, List.of(new SimpleGrantedAuthority(role)));
    }
}

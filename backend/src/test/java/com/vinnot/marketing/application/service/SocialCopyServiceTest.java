package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.port.out.ContentPillarCatalog;
import com.vinnot.marketing.application.port.out.SocialMediaRenderQueue;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.application.port.out.WineDayCatalog;
import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.service.WeeklyPlanner;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.application.port.AiCompletionService;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.vinnot.marketing.application.service.MarketingFixtures.CURIOUS_FACT;
import static com.vinnot.marketing.application.service.MarketingFixtures.MERLOT;
import static com.vinnot.marketing.application.service.MarketingFixtures.NOW;
import static com.vinnot.marketing.application.service.MarketingFixtures.PILLARS;
import static com.vinnot.marketing.application.service.MarketingFixtures.SATURDAY_SLOT;
import static com.vinnot.marketing.application.service.MarketingFixtures.TAGS;
import static com.vinnot.marketing.application.service.MarketingFixtures.TAGS_EN;
import static com.vinnot.marketing.application.service.MarketingFixtures.TUESDAY_SLOT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * S4: copy comes from the AI port, is fact-checked, keeps the legal line and leaves a trace of every attempt. #497 S7: one
 * completion writes Spanish and English, the fact check reads both, and the post waits for approval only with both valid.
 */
class SocialCopyServiceTest {
    private final SocialPostRepository posts = mock(SocialPostRepository.class);
    private final ContentPillarCatalog pillars = mock(ContentPillarCatalog.class);
    private final WineDayCatalog wineDays = mock(WineDayCatalog.class);
    private final AiCompletionService ai = mock(AiCompletionService.class);
    private final SocialMediaRenderQueue renders = mock(SocialMediaRenderQueue.class);
    private final SocialCopyService service = new SocialCopyService(posts, pillars, wineDays, ai, new SocialCopyPromptBuilder(),
            new SocialCopyParser(), new MockSocialCopy(), WeeklyPlanner.Settings.defaults(), renders);

    @BeforeEach
    void catalogs() {
        when(pillars.all()).thenReturn(PILLARS);
        when(wineDays.all()).thenReturn(List.of(MERLOT));
        when(ai.configurationId()).thenReturn("openai:gpt-4o-mini");
        when(ai.isAvailable()).thenReturn(true);
        when(posts.saveIfStatus(any(), any())).thenReturn(true);
    }

    @Test
    void generatedCopyPassesTheFactCheckAndMovesThePostToPendingApproval() {
        SocialPost post = MarketingFixtures.draft(SATURDAY_SLOT, "WINE_DAY", "MERLOT");
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        when(ai.chatCompletion(contains("Día Internacional del Merlot"), anyDouble(), anyInt())).thenReturn(providerCopies("Merlot hoy"));
        when(ai.chatCompletion(contains("Fact-check"), anyDouble(), anyInt())).thenReturn(Map.of("ok", true, "issues", List.of()));

        SocialPost generated = service.generate(post.id(), NOW);

        assertThat(generated.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(generated.copies().es().hook()).isEqualTo("Merlot hoy");
        assertThat(generated.copies().es().caption()).endsWith(PostLanguage.ES.legalLine());
        assertThat(generated.copies().en().hook()).isEqualTo("Merlot hoy (en)");
        assertThat(generated.copies().en().caption()).endsWith(PostLanguage.EN.legalLine());
        assertThat(generated.generation().provider()).isEqualTo("openai");
        assertThat(generated.generation().model()).isEqualTo("gpt-4o-mini");
        assertThat(generated.generation().mock()).isFalse();
        assertThat(generated.generation().attempts()).isEqualTo(1);
        assertThat(generated.generation().generatedAt()).isEqualTo(NOW);
        assertThat(generated.generation().factCheck()).isEqualTo(FactCheck.PASSED);
        verify(posts).saveIfStatus(post, SocialPostStatus.DRAFT);
        verify(posts, never()).save(any());
        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(ai, times(2)).chatCompletion(prompt.capture(), anyDouble(), anyInt());
        assertThat(prompt.getAllValues().get(0)).contains("neutral Spanish", "Celebrate the day.", "Saturday 7 November 2026",
                "\"es\": COPY", "\"en\": COPY", "\"hook\"", "#vinnot").doesNotContain(PostLanguage.ES.legalLine());
        assertThat(prompt.getAllValues().get(1)).as("one fact check covers both languages").contains("[es]", "Merlot hoy", "[en]",
                "Merlot hoy (en)", "A short text.");
    }

    @Test
    void anAnswerWithoutValidEnglishLeavesTheDraftWaiting() {
        SocialPost post = MarketingFixtures.draft(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        Map<String, Object> spanishOnly = new HashMap<>(providerCopies("Hola"));
        spanishOnly.remove("en");
        when(ai.chatCompletion(any(), anyDouble(), anyInt())).thenReturn(spanishOnly);

        SocialPost generated = service.generate(post.id(), NOW);

        assertThat(generated.status()).isEqualTo(SocialPostStatus.DRAFT);
        assertThat(generated.copies()).isNull();
        assertThat(generated.generation().error()).isEqualTo("INVALID_POST_COPY");
        verify(ai, times(2)).chatCompletion(any(), anyDouble(), anyInt());
    }

    @Test
    void anOverlongFieldIsRewrittenOnceWithTheExactValidationError() {
        SocialPost post = MarketingFixtures.draft(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        Map<String, Object> spanish = new HashMap<>(providerCopy("Hola", "Texto", TAGS));
        spanish.put("slides", List.of(Map.of("title", "Uno", "body", "a".repeat(161)), Map.of("title", "Dos", "body", "Segundo"),
                Map.of("title", "Tres", "body", "Tercero")));
        Map<String, Object> overlong = new HashMap<>(providerCopies("Hola"));
        overlong.put("es", spanish);
        when(ai.chatCompletion(contains("N facts about X."), anyDouble(), anyInt())).thenReturn(overlong, providerCopies("Corregida"));
        when(ai.chatCompletion(contains("Fact-check"), anyDouble(), anyInt())).thenReturn(Map.of("ok", true, "issues", List.of()));

        SocialPost generated = service.generate(post.id(), NOW);

        assertThat(generated.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(generated.copies().es().hook()).isEqualTo("Corregida");
        assertThat(generated.generation().error()).isNull();
        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(ai, times(3)).chatCompletion(prompt.capture(), anyDouble(), anyInt());
        assertThat(prompt.getAllValues().get(1)).contains("N facts about X.")
                .contains("es: slide body must hold at most 160 characters");
    }

    @Test
    void copyStillInvalidAfterTheRewriteFailsTheAttempt() {
        SocialPost post = MarketingFixtures.draft(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        Map<String, Object> spanish = new HashMap<>(providerCopy("a".repeat(61), "Texto", TAGS));
        Map<String, Object> overlong = new HashMap<>(providerCopies("Hola"));
        overlong.put("es", spanish);
        when(ai.chatCompletion(any(), anyDouble(), anyInt())).thenReturn(overlong);

        SocialPost generated = service.generate(post.id(), NOW);

        assertThat(generated.status()).isEqualTo(SocialPostStatus.DRAFT);
        assertThat(generated.copies()).isNull();
        assertThat(generated.generation().error()).isEqualTo("INVALID_POST_COPY");
        assertThat(generated.generation().attempts()).isEqualTo(1);
        verify(ai, times(2)).chatCompletion(any(), anyDouble(), anyInt());
    }

    @Test
    void aFailedFactCheckRegeneratesOnceAndFlagsThePost() {
        SocialPost post = MarketingFixtures.draft(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        when(ai.chatCompletion(contains("N facts about X."), anyDouble(), anyInt())).thenReturn(providerCopies("Primera"),
                providerCopies("Segunda"));
        when(ai.chatCompletion(contains("Fact-check"), anyDouble(), anyInt())).thenReturn(Map.of("ok", false, "issues",
                List.of("El Malbec no es francés")));

        SocialPost generated = service.generate(post.id(), NOW);

        assertThat(generated.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(generated.copies().es().hook()).isEqualTo("Segunda");
        assertThat(generated.copies().en().hook()).as("both languages are rewritten").isEqualTo("Segunda (en)");
        assertThat(generated.generation().factCheck()).isEqualTo(FactCheck.FLAGGED);
        assertThat(generated.generation().factCheckIssues()).containsExactly("El Malbec no es francés");
        verify(ai, times(3)).chatCompletion(any(), anyDouble(), anyInt());
    }

    @Test
    void aProviderFailureLeavesTheDraftWithItsErrorForTheRetry() {
        SocialPost post = MarketingFixtures.draft(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        when(ai.chatCompletion(any(), anyDouble(), anyInt()))
                .thenThrow(new ExternalServiceUnavailableException("AI_BUDGET_EXHAUSTED", "The AI budget has been reached", null));

        SocialPost failed = service.generate(post.id(), NOW);

        assertThat(failed.status()).isEqualTo(SocialPostStatus.DRAFT);
        assertThat(failed.copies()).isNull();
        assertThat(failed.generation().error()).isEqualTo("AI_BUDGET_EXHAUSTED");
        assertThat(failed.generation().attempts()).isEqualTo(1);
        verify(posts).saveIfStatus(post, SocialPostStatus.DRAFT);

        when(ai.isAvailable()).thenReturn(false);
        assertThat(service.generate(post.id(), NOW).generation().error()).isEqualTo("AI_UNAVAILABLE");
        assertThat(post.generation().attempts()).isEqualTo(2);
    }

    @Test
    void invalidProviderCopyCountsAsAFailedAttempt() {
        SocialPost post = MarketingFixtures.draft(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        Map<String, Object> spanish = new HashMap<>(providerCopy("Hola", "Texto", TAGS));
        spanish.put("hashtags", List.of("#vinnot"));
        Map<String, Object> tooShort = new HashMap<>(providerCopies("Hola"));
        tooShort.put("es", spanish);
        when(ai.chatCompletion(any(), anyDouble(), anyInt())).thenReturn(tooShort);

        assertThat(service.generate(post.id(), NOW).generation().error()).isEqualTo("INVALID_POST_COPY");
        assertThat(post.status()).isEqualTo(SocialPostStatus.DRAFT);
    }

    @Test
    void mockModeWritesDeterministicCopyWithoutCallingTheProvider() {
        when(ai.isMockMode()).thenReturn(true);
        when(ai.configurationId()).thenReturn("mock:gpt-4o-mini");
        SocialPost post = MarketingFixtures.draft(SATURDAY_SLOT, "WINE_DAY", "MERLOT");
        when(posts.findById(post.id())).thenReturn(Optional.of(post));

        SocialPost generated = service.generate(post.id(), NOW);

        assertThat(generated.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(generated.generation().mock()).isTrue();
        assertThat(generated.generation().provider()).isEqualTo("mock");
        assertThat(generated.generation().factCheck()).isEqualTo(FactCheck.SKIPPED);
        assertThat(generated.copies().es().hook()).contains("Merlot");
        assertThat(generated.copies().es().caption()).endsWith(PostLanguage.ES.legalLine());
        assertThat(generated.copies().en().caption()).endsWith(PostLanguage.EN.legalLine());
        verify(ai, never()).chatCompletion(any(), anyDouble(), anyInt());
        assertThat(service.generate(post.id(), NOW).copies()).isEqualTo(generated.copies());
    }

    @Test
    void pendingDraftsAreGeneratedInTurnAndSuccessesCounted() {
        SocialPost ok = MarketingFixtures.draft(TUESDAY_SLOT, "CURIOUS_FACT", null);
        SocialPost broken = MarketingFixtures.draft(SATURDAY_SLOT, "EDUCATION", null);
        when(posts.findByStatus(eq(SocialPostStatus.DRAFT), anyInt())).thenReturn(List.of(ok, broken));
        when(posts.findById(ok.id())).thenReturn(Optional.of(ok));
        when(posts.findById(broken.id())).thenReturn(Optional.of(broken));
        when(ai.chatCompletion(contains(CURIOUS_FACT.briefEn()), anyDouble(), anyInt())).thenReturn(providerCopies("Dato"));
        when(ai.chatCompletion(contains("Fact-check"), anyDouble(), anyInt())).thenReturn(Map.of("ok", true));
        when(ai.chatCompletion(contains("One wine concept."), anyDouble(), anyInt())).thenThrow(new IllegalStateException("boom"));

        assertThat(service.generatePending(NOW)).isEqualTo(1);

        assertThat(ok.status()).isEqualTo(SocialPostStatus.PENDING_APPROVAL);
        assertThat(broken.status()).isEqualTo(SocialPostStatus.DRAFT);
        assertThat(broken.generation().error()).isEqualTo("IllegalStateException");
    }

    @Test
    void anUnknownPostOrPillarIsAnError() {
        UUID missing = UUID.randomUUID();
        when(posts.findById(missing)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.generate(missing, NOW)).isInstanceOf(EntityNotFoundException.class);

        SocialPost orphan = MarketingFixtures.draft(TUESDAY_SLOT, "NO_SUCH_PILLAR", null);
        when(posts.findById(orphan.id())).thenReturn(Optional.of(orphan));
        assertThatThrownBy(() -> service.generate(orphan.id(), NOW)).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("NO_SUCH_PILLAR");
    }

    @Test
    void aProviderIdWithoutAModelLeavesTheModelEmpty() {
        when(ai.isMockMode()).thenReturn(true);
        when(ai.configurationId()).thenReturn("mock");
        SocialPost post = MarketingFixtures.draft(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(post.id())).thenReturn(Optional.of(post));

        SocialPost generated = service.generate(post.id(), NOW);

        assertThat(generated.generation().provider()).isEqualTo("mock");
        assertThat(generated.generation().model()).isNull();
    }

    static Map<String, Object> providerCopy(String hook, String caption, List<String> hashtags) {
        return Map.of("hook", hook,
                "slides", List.of(Map.of("title", "Uno", "body", "Primero"), Map.of("title", "Dos", "body", "Segundo"),
                        Map.of("title", "Tres", "body", "Tercero")),
                "caption", caption, "hashtags", hashtags, "altText", "Copa de vino", "cta", "¿Y tú?");
    }

    /** The model's answer: the same post in Spanish and in English. */
    static Map<String, Object> providerCopies(String hook) {
        return Map.of("es", providerCopy(hook, "Un texto corto.", TAGS), "en", providerCopy(hook + " (en)", "A short text.", TAGS_EN));
    }

    @Test
    void newCopyQueuesTheRenderOfItsMediaAndAFailedAttemptQueuesNothing() {
        SocialPost post = MarketingFixtures.draft(SATURDAY_SLOT, "WINE_DAY", "MERLOT");
        when(posts.findById(post.id())).thenReturn(Optional.of(post));
        when(ai.isMockMode()).thenReturn(true);

        SocialPost generated = service.generate(post.id(), NOW);

        verify(renders).requestFor(generated);
        assertThat(generated.media().copyHashes()).isEqualTo(generated.copies().mediaHashes());

        SocialPost failing = MarketingFixtures.draft(TUESDAY_SLOT, "CURIOUS_FACT", null);
        when(posts.findById(failing.id())).thenReturn(Optional.of(failing));
        when(ai.isMockMode()).thenReturn(false);
        when(ai.isAvailable()).thenReturn(false);
        service.generate(failing.id(), NOW);
        verify(renders).requestFor(failing);
        assertThat(failing.media()).as("no copy, nothing to render").isNull();
    }

    @Test
    void copyIsWrittenOnlyOverTheStatusItWasReadSoAScheduledPostIsNeverPulledBack() {
        SocialPost read = PublishingFixtures.approved(true);
        SocialPost scheduled = PublishingFixtures.approved(true);
        when(posts.findById(read.id())).thenReturn(Optional.of(read), Optional.of(scheduled));
        when(posts.saveIfStatus(read, SocialPostStatus.APPROVED)).thenReturn(false);
        when(ai.isMockMode()).thenReturn(true);

        SocialPost result = service.generate(read.id(), NOW);

        verify(posts).saveIfStatus(read, SocialPostStatus.APPROVED);
        verify(posts, never()).save(any());
        verifyNoInteractions(renders);
        assertThat(result).as("the stored post is returned as it is").isSameAs(scheduled);
    }
}

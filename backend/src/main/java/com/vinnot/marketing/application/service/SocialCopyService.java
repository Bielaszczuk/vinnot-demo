package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.FactCheckResult;
import com.vinnot.marketing.application.port.in.GenerateSocialCopyUseCase;
import com.vinnot.marketing.application.port.out.ContentPillarCatalog;
import com.vinnot.marketing.application.port.out.SocialMediaRenderQueue;
import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.application.port.out.WineDayCatalog;
import com.vinnot.marketing.domain.exception.InvalidPostCopyException;
import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.marketing.domain.model.WineDay;
import com.vinnot.marketing.domain.service.WeeklyPlanner;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.application.port.AiCompletionService;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Writes a post's copy (#489): one completion for the copy in Spanish and English together (#497, so both state the same
 * facts), one to verify the facts of both, one regeneration when the check fails (the post is then flagged for the
 * admin). An answer with a field over its limit is written once more with the exact reason (#501). Copy reaches the post
 * only when both languages are valid. The provider's own admission already applies the AI capacity and
 * budget limits, so a refused or failed call leaves the post in its status with the error and the attempt counted. New
 * copy queues the render of the post's images (#492). The result is written only over the status the post was read in
 * (#510): when publishing started or an admin acted meanwhile nothing is written or queued and the stored post is returned.
 */
@Service
@RequiredArgsConstructor
public class SocialCopyService implements GenerateSocialCopyUseCase {
    static final String UNAVAILABLE = "AI_UNAVAILABLE";
    static final int PENDING_BATCH = 50;
    private static final Logger LOGGER = LoggerFactory.getLogger(SocialCopyService.class);
    private static final double COPY_TEMPERATURE = 0.8;
    private static final int COPY_MAX_TOKENS = 3500;
    private static final double CHECK_TEMPERATURE = 0.0;
    private static final int CHECK_MAX_TOKENS = 800;
    private final SocialPostRepository posts;
    private final ContentPillarCatalog pillars;
    private final WineDayCatalog wineDays;
    private final AiCompletionService ai;
    private final SocialCopyPromptBuilder prompts;
    private final SocialCopyParser parser;
    private final MockSocialCopy mock;
    private final WeeklyPlanner.Settings settings;
    private final SocialMediaRenderQueue renders;

    @Override
    public SocialPost generate(UUID postId, Instant now) {
        SocialPost post = posts.findById(postId).orElseThrow(() -> new EntityNotFoundException("SocialPost", postId));
        SocialPostStatus read = post.status();
        ContentPillar pillar = pillars.all().stream().filter(candidate -> candidate.code().equals(post.pillarCode())).findFirst()
                .orElseThrow(() -> new IllegalStateException("Unknown content pillar " + post.pillarCode()));
        WineDay wineDay = Objects.isNull(post.wineDayCode()) ? null
                : wineDays.all().stream().filter(candidate -> candidate.code().equals(post.wineDayCode())).findFirst().orElse(null);
        LocalDate date = post.scheduledFor().atZone(settings.zone()).toLocalDate();
        String[] configuration = ai.configurationId().split(":", 2);
        String provider = configuration[0];
        String model = configuration.length > 1 ? configuration[1] : null;
        if (ai.isMockMode()) {
            post.copyGenerated(mock.write(pillar, wineDay, date),
                    post.generation().succeeded(provider, model, true, FactCheck.SKIPPED, List.of(), now), now);
        } else if (!ai.isAvailable()) {
            post.generationFailed(post.generation().failed(UNAVAILABLE, now), now);
        } else {
            try {
                String prompt = prompts.copyPrompt(pillar, wineDay, date);
                PostCopies copies = validCopies(prompt);
                FactCheckResult check = parser.factCheck(ai.chatCompletion(prompts.factCheckPrompt(copies), CHECK_TEMPERATURE,
                        CHECK_MAX_TOKENS));
                FactCheck verdict = FactCheck.PASSED;
                if (!check.ok()) {
                    copies = validCopies(prompt);
                    verdict = FactCheck.FLAGGED;
                }
                post.copyGenerated(copies, post.generation().succeeded(provider, model, false, verdict, check.issues(), now), now);
            } catch (RuntimeException exception) {
                LOGGER.warn("Social copy generation failed for post {}: {}", postId, exception.getMessage());
                post.generationFailed(post.generation().failed(code(exception), now), now);
            }
        }
        if (!posts.saveIfStatus(post, read)) {
            LOGGER.info("Social post {} changed while its copy was written; the copy is discarded", postId);
            return posts.findById(postId).orElse(post);
        }
        renders.requestFor(post);
        return post;
    }

    @Override
    public int generatePending(Instant now) {
        int pending = 0;
        for (SocialPost draft : posts.findByStatus(SocialPostStatus.DRAFT, PENDING_BATCH)) {
            if (generate(draft.id(), now).status() == SocialPostStatus.PENDING_APPROVAL) {
                pending++;
            }
        }
        return pending;
    }

    /** The model's copy; an invalid answer is written once more with the reason it was rejected. */
    private PostCopies validCopies(String prompt) {
        Map<String, Object> answer = ai.chatCompletion(prompt, COPY_TEMPERATURE, COPY_MAX_TOKENS);
        try {
            return parser.copies(answer);
        } catch (InvalidPostCopyException invalid) {
            LOGGER.info("Social copy rejected, asking for a rewrite: {} (answer: {})", invalid.getMessage(), parser.shape(answer));
            Map<String, Object> rewrite = ai.chatCompletion(prompts.rewritePrompt(prompt, invalid.getMessage()), COPY_TEMPERATURE,
                    COPY_MAX_TOKENS);
            try {
                return parser.copies(rewrite);
            } catch (InvalidPostCopyException stillInvalid) {
                LOGGER.info("Social copy rewrite rejected: {} (answer: {})", stillInvalid.getMessage(), parser.shape(rewrite));
                throw stillInvalid;
            }
        }
    }

    private static String code(RuntimeException exception) {
        if (exception instanceof ExternalServiceUnavailableException unavailable) {
            return unavailable.getCode();
        }
        if (exception instanceof DomainException domain) {
            return domain.getCode();
        }
        return exception.getClass().getSimpleName();
    }

}

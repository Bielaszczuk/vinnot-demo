package com.vinnot.ai.application.service;

import com.vinnot.ai.application.config.AiProfileRefreshPolicy;
import com.vinnot.ai.application.config.AiProviderAdmissionPolicy;
import com.vinnot.ai.application.port.in.GenerateAiProfileUseCase;
import com.vinnot.ai.application.port.in.RefreshStaleAiProfilesUseCase;
import com.vinnot.ai.application.port.out.AiSpendingLedgerPort;
import com.vinnot.ai.domain.repository.WineAiProfileRepository;
import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Regenerates stored profiles whose generation context changed (a new prompt version or new catalog
 * facts) through the normal, non-forced generation path, so manual profiles are never overwritten and
 * admission and spending checks still apply.
 *
 * <p>A cursor kept in memory walks the profiled wines in a stable order and wraps after the last one.
 * Every generation attempt, successful or not, counts against the profiles allowed per run. A wine
 * whose regeneration fails is skipped until the next restart, so it can never be retried in a loop.
 * Once a full pass finds nothing stale (failed wines aside) the refresh stays idle; a restart scans
 * again, and current profiles are cheap to skip. The service is meant for a single scheduler thread.
 */
@Service
public class AiProfileRefreshService implements RefreshStaleAiProfilesUseCase {

    private static final Logger LOG = LoggerFactory.getLogger(AiProfileRefreshService.class);
    private static final int PAGE_SIZE = 50;
    /** Bounds the catalog reads of one run when almost every profile is current. */
    private static final int MAX_WINES_CHECKED_PER_RUN = 200;
    private static final String REFRESH_LANGUAGE = AiContentLanguage.SPANISH.code();
    /** Admission-level refusals: no provider call was made and the whole run must wait. */
    private static final Set<String> RUN_STOPPING_CODES = Set.of("AI_PAID_CALLS_PAUSED", "AI_BUDGET_EXHAUSTED",
            "AI_CAPACITY_EXCEEDED", "AI_ADMISSION_UNAVAILABLE", "AI_PRICING_UNAVAILABLE");

    private final WineAiProfileRepository profiles;
    private final WineRepositoryPort wines;
    private final AiProfilePromptBuilder promptBuilder;
    private final GenerateAiProfileUseCase generator;
    private final AiSpendingLedgerPort ledger;
    private final AiProviderAdmissionPolicy admissionPolicy;
    private final AiProfileRefreshPolicy refreshPolicy;
    private final Clock clock;

    private final Set<UUID> failedWines = new HashSet<>();
    private UUID cursor;
    private boolean staleFoundThisPass;
    private boolean idle;
    private String lastStopReason;

    @Autowired
    public AiProfileRefreshService(WineAiProfileRepository profiles, WineRepositoryPort wines,
            AiProfilePromptBuilder promptBuilder, GenerateAiProfileUseCase generator, AiSpendingLedgerPort ledger,
            AiProviderAdmissionPolicy admissionPolicy, AiProfileRefreshPolicy refreshPolicy) {
        this(profiles, wines, promptBuilder, generator, ledger, admissionPolicy, refreshPolicy, Clock.systemUTC());
    }

    AiProfileRefreshService(WineAiProfileRepository profiles, WineRepositoryPort wines,
            AiProfilePromptBuilder promptBuilder, GenerateAiProfileUseCase generator, AiSpendingLedgerPort ledger,
            AiProviderAdmissionPolicy admissionPolicy, AiProfileRefreshPolicy refreshPolicy, Clock clock) {
        this.profiles = profiles;
        this.wines = wines;
        this.promptBuilder = promptBuilder;
        this.generator = generator;
        this.ledger = ledger;
        this.admissionPolicy = admissionPolicy;
        this.refreshPolicy = refreshPolicy;
        this.clock = clock;
    }

    @Override
    public synchronized int refreshStaleProfiles() {
        // Mock content must never replace stored profiles, and without a provider there is nothing to do.
        if (idle || !promptBuilder.isProviderAvailable() || promptBuilder.isMockMode()) {
            return 0;
        }
        int attempts = 0;
        int regenerated = 0;
        Set<UUID> checked = new HashSet<>();
        while (attempts < refreshPolicy.profilesPerRun() && checked.size() < MAX_WINES_CHECKED_PER_RUN) {
            List<UUID> page = profiles.findWineIdsAfter(cursor, PAGE_SIZE);
            if (page.isEmpty()) {
                if (!startNextPass()) {
                    return regenerated;
                }
                continue;
            }
            for (UUID wineId : page) {
                if (attempts >= refreshPolicy.profilesPerRun() || checked.size() >= MAX_WINES_CHECKED_PER_RUN) {
                    return regenerated;
                }
                if (!checked.add(wineId)) {
                    // The run wrapped back to a wine it already handled: every other wine was checked.
                    return regenerated;
                }
                if (failedWines.contains(wineId) || !isStale(wineId)) {
                    cursor = wineId;
                    continue;
                }
                if (!budgetAllowsRefresh()) {
                    // The cursor stays before this wine so the next run retries it.
                    staleFoundThisPass = true;
                    return regenerated;
                }
                cursor = wineId;
                attempts++;
                Outcome outcome = regenerate(wineId);
                if (outcome == Outcome.REGENERATED) {
                    staleFoundThisPass = true;
                    regenerated++;
                } else if (outcome == Outcome.RUN_STOPPED) {
                    // Nothing was spent on this wine; a later pass tries it again.
                    staleFoundThisPass = true;
                    return regenerated;
                }
            }
        }
        return regenerated;
    }

    /** Wraps the cursor after the last wine; a pass with nothing left to regenerate makes the refresh idle. */
    private boolean startNextPass() {
        if (Objects.isNull(cursor) || !staleFoundThisPass) {
            idle = true;
            LOG.info("AI profile refresh finished: every stored profile matches the current prompt");
            return false;
        }
        cursor = null;
        staleFoundThisPass = false;
        return true;
    }

    private boolean isStale(UUID wineId) {
        return wines.findById(wineId)
                .map(wine -> AiProfileBundles.current(profiles, wineId, promptBuilder.contextFingerprint(wine)).isEmpty())
                .orElse(false);
    }

    private boolean budgetAllowsRefresh() {
        BigDecimal committed;
        try {
            committed = ledger.committedUsd(AiProviderAdmissionService.monthWindowKey(LocalDate.now(clock)));
        } catch (RuntimeException exception) {
            stopQuietly("spending-unreadable", "AI profile refresh paused: the AI spending could not be read ({})",
                    exception.getClass().getSimpleName());
            return false;
        }
        BigDecimal share = admissionPolicy.monthlyLimitUsd().multiply(refreshPolicy.budgetShare());
        if (committed.compareTo(share) >= 0) {
            stopQuietly("budget-share",
                    "AI profile refresh paused: this month's AI spending reached {} USD of the {} USD the refresh may use",
                    committed, share);
            return false;
        }
        return true;
    }

    private Outcome regenerate(UUID wineId) {
        try {
            generator.generate(wineId, REFRESH_LANGUAGE, false);
            lastStopReason = null;
            LOG.info("AI profile refreshed for wine {}", wineId);
            return Outcome.REGENERATED;
        } catch (ExternalServiceUnavailableException exception) {
            if (RUN_STOPPING_CODES.contains(exception.getCode())) {
                stopQuietly(exception.getCode(), "AI profile refresh paused: AI is unavailable ({})", exception.getCode());
                return Outcome.RUN_STOPPED;
            }
            return failed(wineId, exception);
        } catch (RuntimeException exception) {
            return failed(wineId, exception);
        }
    }

    /** A wine that fails is logged once and skipped until the next restart. */
    private Outcome failed(UUID wineId, RuntimeException exception) {
        failedWines.add(wineId);
        LOG.warn("AI profile refresh skips wine {} until the next restart: {}: {}", wineId,
                exception.getClass().getSimpleName(), exception.getMessage());
        return Outcome.FAILED;
    }

    /** Logs a stop once per reason, so a paused refresh does not repeat the same line every run. */
    private void stopQuietly(String reason, String message, Object... arguments) {
        if (!Objects.equals(reason, lastStopReason)) {
            LOG.info(message, arguments);
            lastStopReason = reason;
        }
    }

    private enum Outcome { REGENERATED, RUN_STOPPED, FAILED }
}

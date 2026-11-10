package com.vinnot.ai.application.service;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.vinnot.ai.application.config.AiProfileRefreshPolicy;
import com.vinnot.ai.application.config.AiProviderAdmissionPolicy;
import com.vinnot.ai.application.port.in.GenerateAiProfileUseCase;
import com.vinnot.ai.application.port.out.AiSpendingLedgerPort;
import com.vinnot.ai.domain.model.WineAiProfile;
import com.vinnot.ai.domain.repository.WineAiProfileRepository;
import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.ai.domain.valueobject.AiContentProvenance;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockingDetails;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AiProfileRefreshServiceTest {

    private static final String CURRENT = "current-fingerprint";
    private static final String PREVIOUS = "previous-fingerprint";
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-06T12:00:00Z"), ZoneOffset.UTC);

    private final List<UUID> profiledWineIds = new ArrayList<>();
    private WineAiProfileRepository profileRepository;
    private WineRepositoryPort wineRepository;
    private AiProfilePromptBuilder promptBuilder;
    private GenerateAiProfileUseCase generator;
    private AiSpendingLedgerPort ledger;

    @BeforeEach
    void setUp() {
        profileRepository = mock(WineAiProfileRepository.class);
        wineRepository = mock(WineRepositoryPort.class);
        promptBuilder = mock(AiProfilePromptBuilder.class);
        generator = mock(GenerateAiProfileUseCase.class);
        ledger = mock(AiSpendingLedgerPort.class);
        when(promptBuilder.isProviderAvailable()).thenReturn(true);
        when(promptBuilder.isMockMode()).thenReturn(false);
        when(promptBuilder.contextFingerprint(any())).thenReturn(CURRENT);
        when(ledger.committedUsd(anyString())).thenReturn(BigDecimal.ZERO);
        // Keyset paging over the stored wine IDs, in the order they were registered.
        when(profileRepository.findWineIdsAfter(any(), anyInt())).thenAnswer(call -> {
            UUID after = call.getArgument(0);
            int limit = call.getArgument(1);
            int start = Objects.isNull(after) ? 0 : profiledWineIds.indexOf(after) + 1;
            return List.copyOf(profiledWineIds.subList(start, Math.min(profiledWineIds.size(), start + limit)));
        });
    }

    @Test
    void regeneratesAWineWhoseProviderProfilesCameFromAnOlderPrompt() {
        UUID wineId = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);

        int regenerated = service(1).refreshStaleProfiles();

        assertThat(regenerated).isEqualTo(1);
        verify(generator).generate(wineId, "es", false);
    }

    @Test
    void regeneratesAWineThatIsMissingALanguage() {
        UUID wineId = wineWithProfiles("provider", CURRENT, null, null);

        assertThat(service(1).refreshStaleProfiles()).isEqualTo(1);
        verify(generator).generate(wineId, "es", false);
    }

    @Test
    void skipsAWineWhoseProfilesAllMatchTheCurrentPrompt() {
        wineWithProfiles("provider", CURRENT, "provider", CURRENT);

        assertThat(service(1).refreshStaleProfiles()).isZero();
        verify(generator, never()).generate(any(), anyString(), anyBoolean());
    }

    @Test
    void neverRegeneratesManualProfiles() {
        wineWithProfiles("manual", "", "manual", "");

        assertThat(service(1).refreshStaleProfiles()).isZero();
        verify(generator, never()).generate(any(), anyString(), anyBoolean());
    }

    @Test
    void skipsProfilesWhoseWineNoLongerExists() {
        UUID orphan = UUID.randomUUID();
        profiledWineIds.add(orphan);
        when(wineRepository.findById(orphan)).thenReturn(Optional.empty());

        assertThat(service(1).refreshStaleProfiles()).isZero();
        verify(generator, never()).generate(any(), anyString(), anyBoolean());
    }

    @Test
    void stopsAfterTheConfiguredNumberOfProfilesPerRunAndResumesWhereItStopped() {
        UUID first = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        UUID second = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        UUID third = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        AiProfileRefreshService service = service(2);

        assertThat(service.refreshStaleProfiles()).isEqualTo(2);
        verify(generator).generate(first, "es", false);
        verify(generator).generate(second, "es", false);
        verify(generator, never()).generate(third, "es", false);

        assertThat(service.refreshStaleProfiles()).isEqualTo(2);
        InOrder order = inOrder(generator);
        order.verify(generator).generate(first, "es", false);
        order.verify(generator).generate(second, "es", false);
        order.verify(generator).generate(third, "es", false);
        // The cursor wrapped after the last wine and continued from the first one.
        order.verify(generator).generate(first, "es", false);
    }

    @Test
    void theCursorAdvancesOneWinePerRunAndWrapsAfterTheLast() {
        UUID first = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        UUID second = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        AiProfileRefreshService service = service(1);

        assertThat(service.refreshStaleProfiles()).isEqualTo(1);
        assertThat(service.refreshStaleProfiles()).isEqualTo(1);
        assertThat(service.refreshStaleProfiles()).isEqualTo(1);

        InOrder order = inOrder(generator);
        order.verify(generator).generate(first, "es", false);
        order.verify(generator).generate(second, "es", false);
        order.verify(generator).generate(first, "es", false);
    }

    @Test
    void endsTheRunWhenItWrapsBackToAWineItAlreadyHandled() {
        UUID stale = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        wineWithProfiles("provider", CURRENT, "provider", CURRENT);

        // Two attempts are allowed, but the only stale wine was handled before the cursor wrapped.
        assertThat(service(2).refreshStaleProfiles()).isEqualTo(1);
        verify(generator, times(1)).generate(stale, "es", false);
        verify(generator, times(1)).generate(any(), anyString(), anyBoolean());
    }

    @Test
    void staysIdleAfterAFullPassFindsNothingStale() {
        wineWithProfiles("provider", CURRENT, "provider", CURRENT);
        wineWithProfiles("manual", "", "provider", CURRENT);
        AiProfileRefreshService service = service(1);

        assertThat(service.refreshStaleProfiles()).isZero();
        assertThat(service.refreshStaleProfiles()).isZero();

        // Only the first run read the catalog: a full pass found nothing stale.
        verify(profileRepository, times(2)).findWineIdsAfter(any(), anyInt());
        verify(generator, never()).generate(any(), anyString(), anyBoolean());
    }

    @Test
    void doesNothingWhenTheProviderIsUnavailable() {
        wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        when(promptBuilder.isProviderAvailable()).thenReturn(false);

        assertThat(service(1).refreshStaleProfiles()).isZero();
        verifyNoInteractions(generator, ledger);
        verify(profileRepository, never()).findWineIdsAfter(any(), anyInt());
    }

    @Test
    void doesNothingInMockMode() {
        wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        when(promptBuilder.isMockMode()).thenReturn(true);

        assertThat(service(1).refreshStaleProfiles()).isZero();
        verifyNoInteractions(generator, ledger);
        verify(profileRepository, never()).findWineIdsAfter(any(), anyInt());
    }

    @Test
    void stopsBeforeGeneratingWhenTheMonthSpendingReachesTheReservedShare() {
        UUID wineId = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        when(ledger.committedUsd("month:2026-11")).thenReturn(new BigDecimal("5.00"));
        AiProfileRefreshService service = service(1);

        assertThat(service.refreshStaleProfiles()).isZero();
        verify(generator, never()).generate(any(), anyString(), anyBoolean());

        when(ledger.committedUsd("month:2026-11")).thenReturn(new BigDecimal("4.99"));
        assertThat(service.refreshStaleProfiles()).isEqualTo(1);
        verify(generator).generate(wineId, "es", false);
    }

    @Test
    void endsTheRunWithoutGeneratingWhenTheSpendingCannotBeRead() {
        wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        when(ledger.committedUsd(anyString())).thenThrow(new IllegalStateException("database unavailable"));

        assertThat(service(1).refreshStaleProfiles()).isZero();
        verify(generator, never()).generate(any(), anyString(), anyBoolean());
    }

    @Test
    void endsTheRunQuietlyWhenAiIsUnavailable() {
        UUID first = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        UUID second = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        when(generator.generate(first, "es", false)).thenThrow(
                new ExternalServiceUnavailableException("AI_BUDGET_EXHAUSTED", "The AI budget has been reached", null));

        assertThat(service(2).refreshStaleProfiles()).isZero();
        verify(generator).generate(first, "es", false);
        verify(generator, never()).generate(second, "es", false);
    }

    @Test
    void continuesWithTheNextWineAfterAnUnexpectedFailure() {
        UUID first = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        UUID second = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        when(generator.generate(first, "es", false)).thenThrow(new IllegalStateException("broken payload"));

        assertThat(service(2).refreshStaleProfiles()).isEqualTo(1);
        verify(generator).generate(first, "es", false);
        verify(generator).generate(second, "es", false);
    }

    @Test
    void retriesAFailingWineAtMostOncePerRun() {
        UUID only = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        when(generator.generate(only, "es", false)).thenThrow(new IllegalStateException("broken payload"));

        assertThat(service(1).refreshStaleProfiles()).isZero();
        verify(generator, times(1)).generate(only, "es", false);
    }

    @Test
    void capsTheAttemptsOfARunWhenEveryProviderGenerationFails() {
        List<UUID> stale = staleWines(5);
        stale.forEach(wineId -> when(generator.generate(wineId, "es", false)).thenThrow(
                new ExternalServiceUnavailableException("AI_PROFILE_UNAVAILABLE", "incomplete profile", null)));

        assertThat(service(2).refreshStaleProfiles()).isZero();

        verify(generator).generate(stale.get(0), "es", false);
        verify(generator).generate(stale.get(1), "es", false);
        verify(generator, times(2)).generate(any(), anyString(), anyBoolean());
    }

    @Test
    void capsTheAttemptsOfARunWhenEveryGenerationFailsUnexpectedly() {
        List<UUID> stale = staleWines(5);
        stale.forEach(wineId -> when(generator.generate(wineId, "es", false))
                .thenThrow(new DomainException("CONCURRENT_UPDATE", "Wine changed during generation. Please retry.")));

        assertThat(service(1).refreshStaleProfiles()).isZero();

        verify(generator).generate(stale.get(0), "es", false);
        verify(generator, times(1)).generate(any(), anyString(), anyBoolean());
    }

    @Test
    void skipsAFailedWineOnLaterPassesAndGoesIdleWhenOnlyFailedWinesRemainStale() {
        UUID failing = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        UUID healthy = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        when(generator.generate(failing, "es", false)).thenThrow(
                new ExternalServiceUnavailableException("AI_PROFILE_UNAVAILABLE", "incomplete profile", null));
        when(generator.generate(healthy, "es", false)).thenAnswer(call -> {
            stubProfile(healthy, "es", "provider", CURRENT);
            stubProfile(healthy, "en", "provider", CURRENT);
            return null;
        });
        AiProfileRefreshService service = service(1);

        assertThat(service.refreshStaleProfiles()).isZero();
        assertThat(service.refreshStaleProfiles()).isEqualTo(1);
        // Next pass: the failed wine is skipped, the healthy one is current, so the refresh goes idle.
        assertThat(service.refreshStaleProfiles()).isZero();
        int readsBeforeIdle = mockingDetails(profileRepository).getInvocations().size();
        assertThat(service.refreshStaleProfiles()).isZero();
        assertThat(service.refreshStaleProfiles()).isZero();

        verify(generator, times(1)).generate(failing, "es", false);
        verify(generator, times(1)).generate(healthy, "es", false);
        assertThat(mockingDetails(profileRepository).getInvocations()).hasSize(readsBeforeIdle);
    }

    @Test
    void logsOneWarningPerFailingWine() {
        UUID failing = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        // Generation of this wine never updates its stored profile, so every pass finds it stale again.
        UUID stillStale = wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS);
        when(generator.generate(failing, "es", false)).thenThrow(new IllegalStateException("broken payload"));
        Logger logger = (Logger) LoggerFactory.getLogger(AiProfileRefreshService.class);
        var logs = new ListAppender<ILoggingEvent>();
        logs.start();
        logger.addAppender(logs);
        try {
            AiProfileRefreshService service = service(1);
            for (int run = 0; run < 6; run++) {
                service.refreshStaleProfiles();
            }
        } finally {
            logger.detachAppender(logs);
        }

        verify(generator, times(1)).generate(failing, "es", false);
        verify(generator, times(5)).generate(stillStale, "es", false);
        assertThat(logs.list).filteredOn(event -> event.getLevel() == Level.WARN)
                .singleElement()
                .satisfies(event -> assertThat(event.getFormattedMessage()).contains(failing.toString()));
    }

    @Test
    void regeneratesAPartlyManualWineAndPublicationKeepsTheManualLanguage() {
        UUID wineId = wineWithProfiles("manual", "", "provider", PREVIOUS);
        WineAiProfile manualSpanish = profileRepository.findByWineIdAndLanguage(wineId, "es").orElseThrow();
        Wine wine = wineRepository.findById(wineId).orElseThrow();
        when(wineRepository.findByIdForUpdate(wineId)).thenReturn(Optional.of(wine));
        when(promptBuilder.generateMultilingual(wine)).thenReturn(Optional.of(MultilingualAiContent.of(Map.of(
                AiContentLanguage.SPANISH, Map.of("summary", "Nuevo"),
                AiContentLanguage.ENGLISH, Map.of("summary", "New")))));
        when(profileRepository.saveBundle(any())).thenAnswer(call -> call.getArgument(0));
        AiGenerationCoordinator coordinator = mock(AiGenerationCoordinator.class);
        when(coordinator.execute(any(), any(), any())).thenAnswer(call -> {
            Supplier<Optional<Object>> completed = call.getArgument(1);
            Supplier<Object> generation = call.getArgument(2);
            return completed.get().orElseGet(generation);
        });
        GenerateAiProfileUseCase realGenerator = new AiProfileService(profileRepository, wineRepository, promptBuilder,
                mock(MockAiProfileGenerator.class), coordinator,
                new AiProfilePublicationService(wineRepository, profileRepository, promptBuilder));
        var admission = new AiProviderAdmissionPolicy(3, Duration.ofMinutes(2), BigDecimal.TEN, BigDecimal.ZERO, true);
        var refresh = new AiProfileRefreshService(profileRepository, wineRepository, promptBuilder, realGenerator,
                ledger, admission, new AiProfileRefreshPolicy(1, new BigDecimal("0.5")), CLOCK);

        assertThat(refresh.refreshStaleProfiles()).isEqualTo(1);

        verify(coordinator).execute(eq("wine-profile:" + wineId), any(), any());
        verify(coordinator, never()).executeExclusively(any(), any());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<WineAiProfile>> saved = ArgumentCaptor.forClass(List.class);
        verify(profileRepository).saveBundle(saved.capture());
        assertThat(saved.getValue()).hasSize(2);
        assertThat(saved.getValue()).filteredOn(profile -> "es".equals(profile.getLanguage()))
                .singleElement().isSameAs(manualSpanish);
        assertThat(saved.getValue()).filteredOn(profile -> "en".equals(profile.getLanguage()))
                .singleElement().satisfies(profile -> {
                    assertThat(profile.getProfileJson()).containsEntry("summary", "New");
                    assertThat(profile.getProfileJson().get(AiContentProvenance.KEY))
                            .isEqualTo(Map.of("source", "provider", "fingerprint", CURRENT));
                });
    }

    private List<UUID> staleWines(int count) {
        List<UUID> stale = new ArrayList<>();
        for (int index = 0; index < count; index++) {
            stale.add(wineWithProfiles("provider", PREVIOUS, "provider", PREVIOUS));
        }
        return stale;
    }

    private AiProfileRefreshService service(int profilesPerRun) {
        var admission = new AiProviderAdmissionPolicy(3, Duration.ofMinutes(2), BigDecimal.TEN, BigDecimal.ZERO, true);
        var refresh = new AiProfileRefreshPolicy(profilesPerRun, new BigDecimal("0.5"));
        return new AiProfileRefreshService(profileRepository, wineRepository, promptBuilder, generator,
                ledger, admission, refresh, CLOCK);
    }

    private UUID wineWithProfiles(String spanishSource, String spanishFingerprint,
            String englishSource, String englishFingerprint) {
        Wine wine = Wine.create("Reserva " + profiledWineIds.size(), UUID.randomUUID(), WineType.RED, null);
        UUID wineId = wine.getId();
        profiledWineIds.add(wineId);
        when(wineRepository.findById(wineId)).thenReturn(Optional.of(wine));
        stubProfile(wineId, "es", spanishSource, spanishFingerprint);
        stubProfile(wineId, "en", englishSource, englishFingerprint);
        return wineId;
    }

    private void stubProfile(UUID wineId, String language, String source, String fingerprint) {
        Optional<WineAiProfile> profile = Objects.isNull(source) ? Optional.empty()
                : Optional.of(WineAiProfile.create(wineId, language,
                        AiContentProvenance.stamp(Map.of("summary", "Texto"), source, fingerprint)));
        when(profileRepository.findByWineIdAndLanguage(wineId, language)).thenReturn(profile);
    }
}

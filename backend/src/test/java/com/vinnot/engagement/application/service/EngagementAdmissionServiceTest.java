package com.vinnot.engagement.application.service;

import com.vinnot.activity.application.port.in.ReadActivitySignalsUseCase;
import com.vinnot.activity.domain.model.ActivityRhythm;
import com.vinnot.engagement.application.model.Admission;
import com.vinnot.engagement.application.model.LedgerEntry;
import com.vinnot.engagement.application.port.out.EngagementLedgerPort;
import com.vinnot.engagement.domain.model.EngagementHistory;
import com.vinnot.engagement.domain.model.EngagementPolicy;
import com.vinnot.engagement.domain.model.EngagementSend;
import com.vinnot.engagement.domain.model.Holdout;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** S10, S12: the budget at delivery records what it admits and what the holdout would have got. */
class EngagementAdmissionServiceTest {
    private static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final Instant AT = Instant.parse("2026-10-21T22:30:00Z");
    private final EngagementHistoryReader histories = mock(EngagementHistoryReader.class);
    private final ReadActivitySignalsUseCase activity = mock(ReadActivitySignalsUseCase.class);
    private final EngagementLedgerPort ledger = mock(EngagementLedgerPort.class);

    @Test
    void admitsWithinTheBudgetRecordsThemAndCountsTheOthers() {
        UUID fresh = treated();
        UUID busy = treated();
        UUID fatigued = treated();
        UUID held = heldOut();
        when(activity.rhythms(List.of(fresh, busy, fatigued, held))).thenReturn(Map.of(fresh,
                new ActivityRhythm(fresh, AT.minus(Duration.ofHours(3)), null)));
        when(histories.read(List.of(fresh, busy, fatigued, held), Map.of(fresh, AT.minus(Duration.ofHours(3))))).thenReturn(Map.of(
                fresh, EngagementHistory.empty(),
                busy, history(send(AT.minus(Duration.ofHours(20)), true)),
                fatigued, history(send(AT.minus(Duration.ofDays(3)), false), send(AT.minus(Duration.ofDays(10)), false),
                        send(AT.minus(Duration.ofDays(17)), false)),
                held, EngagementHistory.empty()));

        Admission.Result result = service(5).admit(request(fresh, busy, fatigued, held));

        assertThat(result).isEqualTo(new Admission.Result(List.of(fresh), 1, 1, 1));
        verify(ledger).record(List.of(
                new LedgerEntry(fresh, NotificationType.TASTE_PICK, "engagement:k", "WINE:1", AT, false),
                new LedgerEntry(held, NotificationType.TASTE_PICK, "engagement:k", "WINE:1", AT, true)));
    }

    @Test
    void nobodyToAdmitReadsNothingAndReleaseForgetsTheRows() {
        EngagementAdmissionService service = service(0);

        assertThat(service.admit(new Admission.Request(NotificationType.WINBACK, "k", null, List.of(), AT)))
                .isEqualTo(new Admission.Result(List.of(), 0, 0, 0));
        service.release("k", List.of());
        verifyNoInteractions(activity, histories, ledger);

        UUID ana = UUID.randomUUID();
        service.release("k", List.of(ana));
        verify(ledger).release("k", List.of(ana));
    }

    /** S13: the 30-day come-back push still reaches an account whose other engagement pushes are paused. */
    @Test
    void aComeBackPushIsAdmittedWhileOtherEngagementPushesArePaused() {
        UUID away = treated();
        Instant lastOpen = AT.minus(Duration.ofDays(30));
        when(activity.rhythms(List.of(away))).thenReturn(Map.of(away, new ActivityRhythm(away, lastOpen, null)));
        when(histories.read(List.of(away), Map.of(away, lastOpen))).thenReturn(Map.of(away, new EngagementHistory(
                List.of(send(AT.minus(Duration.ofDays(28)), false), send(AT.minus(Duration.ofDays(21)), false)), lastOpen)));

        Admission.Result winback = service(5).admit(new Admission.Request(NotificationType.WINBACK, "engagement:w", null,
                List.of(new Admission.Account(away, BUENOS_AIRES)), AT));
        Admission.Result taste = service(5).admit(request(away));

        assertThat(winback).isEqualTo(new Admission.Result(List.of(away), 0, 0, 0));
        assertThat(taste).as("paused").isEqualTo(new Admission.Result(List.of(), 0, 1, 0));
    }

    @Test
    void withAZeroHoldoutEveryoneWithinBudgetIsAdmitted() {
        UUID ana = heldOut();
        when(activity.rhythms(anyList())).thenReturn(Map.of());
        when(histories.read(anyList(), anyMap())).thenReturn(Map.of(ana, EngagementHistory.empty()));

        assertThat(service(0).admit(request(ana)).admitted()).containsExactly(ana);
    }

    private EngagementAdmissionService service(int holdoutPercent) {
        return new EngagementAdmissionService(histories, activity, ledger, EngagementPolicy.standard(), new Holdout(holdoutPercent));
    }

    private static Admission.Request request(UUID... users) {
        return new Admission.Request(NotificationType.TASTE_PICK, "engagement:k", "WINE:1",
                Arrays.stream(users).map(id -> new Admission.Account(id, BUENOS_AIRES)).toList(), AT);
    }

    private static EngagementHistory history(EngagementSend... sends) {
        return new EngagementHistory(List.of(sends), null);
    }

    private static EngagementSend send(Instant at, boolean opened) {
        return new EngagementSend(NotificationType.CELLAR_CHECKIN, "k" + at, null, at, false, opened);
    }

    private static UUID treated() {
        return IntStream.iterate(0, index -> index + 1).mapToObj(index -> UUID.randomUUID())
                .filter(id -> !new Holdout(5).includes(id)).findFirst().orElseThrow();
    }

    private static UUID heldOut() {
        return IntStream.iterate(0, index -> index + 1).mapToObj(index -> UUID.randomUUID())
                .filter(id -> new Holdout(5).includes(id)).findFirst().orElseThrow();
    }
}

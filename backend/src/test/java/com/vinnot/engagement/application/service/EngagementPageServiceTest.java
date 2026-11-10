package com.vinnot.engagement.application.service;

import com.vinnot.activity.application.port.in.ReadActivitySignalsUseCase;
import com.vinnot.activity.domain.model.ActivityRhythm;
import com.vinnot.activity.domain.model.OpenHourHistogram;
import com.vinnot.engagement.application.model.CandidateQuery;
import com.vinnot.engagement.application.model.LedgerEntry;
import com.vinnot.engagement.application.model.PlanPage;
import com.vinnot.engagement.application.model.PlanReport;
import com.vinnot.engagement.application.model.PlanningAccount;
import com.vinnot.engagement.application.port.out.CandidateSourcePort;
import com.vinnot.engagement.application.port.out.EngagementAudiencePort;
import com.vinnot.engagement.application.port.out.EngagementLedgerPort;
import com.vinnot.engagement.domain.model.CandidateSignals;
import com.vinnot.engagement.domain.model.EngagementCandidate;
import com.vinnot.engagement.domain.model.EngagementDecision;
import com.vinnot.engagement.domain.model.EngagementHistory;
import com.vinnot.engagement.domain.model.EngagementPolicy;
import com.vinnot.engagement.domain.model.Holdout;
import com.vinnot.engagement.domain.model.PlanningMember;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.application.port.in.PushPlanningUseCase;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** S11, S12, S16: one page is planned in bulk; equal pushes share one queued request; the holdout is only recorded. */
class EngagementPageServiceTest {
    private static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");
    /** 04:00 on a Wednesday in Buenos Aires. */
    private static final Instant NOW = Instant.parse("2026-10-21T07:00:00Z");
    private static final Instant MIDNIGHT = Instant.parse("2026-10-21T03:00:00Z");
    private final EngagementAudiencePort audience = mock(EngagementAudiencePort.class);
    private final ReadActivitySignalsUseCase activity = mock(ReadActivitySignalsUseCase.class);
    private final EngagementHistoryReader histories = mock(EngagementHistoryReader.class);
    private final PushPlanningUseCase planning = mock(PushPlanningUseCase.class);
    private final CandidateSourcePort tastes = mock(CandidateSourcePort.class);
    private final CandidateSourcePort reminders = mock(CandidateSourcePort.class);
    private final EngagementLedgerPort ledger = mock(EngagementLedgerPort.class);
    private final PushNotificationPort pushes = mock(PushNotificationPort.class);
    private final UUID ana = treated();
    private final UUID bruno = treated();
    private final UUID carla = treated();
    private final UUID held = heldOut();

    @Test
    void equalPushesShareOneScheduledRequestAtTheUsualHourAndTheHoldoutIsOnlyRecorded() {
        List<UUID> all = List.of(ana, bruno, carla, held);
        when(audience.claim(all, MIDNIGHT, NOW)).thenReturn(all);
        when(activity.rhythms(all)).thenReturn(Map.of(carla, new ActivityRhythm(carla, NOW.minus(Duration.ofHours(2)),
                new OpenHourHistogram(Map.of(13, 4, 20, 2)))));
        Map<UUID, EngagementHistory> known = new HashMap<>();
        all.forEach(id -> known.put(id, EngagementHistory.empty()));
        when(histories.read(anyList(), anyMap())).thenReturn(known);
        when(planning.pushCategories(all)).thenReturn(Map.of(ana, EnumSet.allOf(NotificationCategory.class),
                bruno, EnumSet.allOf(NotificationCategory.class), carla, EnumSet.allOf(NotificationCategory.class),
                held, EnumSet.allOf(NotificationCategory.class)));
        when(tastes.find(any())).thenReturn(List.of(taste(ana), taste(bruno), taste(carla), taste(held)));
        when(reminders.find(any())).thenReturn(List.of());

        PlanReport report = service().plan(new PlanPage(BUENOS_AIRES, accounts(all), NOW, MIDNIGHT, Set.of()));

        assertThat(report).isEqualTo(new PlanReport(false, 1, 0, Map.of(EngagementDecision.Outcome.PLANNED, 4), 1));
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PushNotificationPort.ScheduledPush>> scheduled = ArgumentCaptor.forClass(List.class);
        verify(pushes).schedule(scheduled.capture());
        assertThat(scheduled.getValue()).hasSize(2);
        PushNotificationPort.ScheduledPush evening = scheduled.getValue().get(0);
        assertThat(evening.request().userIds()).containsExactly(ana, bruno);
        assertThat(evening.notBefore()).as("19:30 weekday fallback").isEqualTo(Instant.parse("2026-10-21T22:30:00Z"));
        assertThat(evening.request().type()).isEqualTo(NotificationType.TASTE_PICK);
        assertThat(evening.request().data()).containsEntry(NotificationType.CONTENT_REF, "WINE:w1").containsEntry("wineId", "w1");
        assertThat(evening.request().dedupeKey()).startsWith("engagement:taste_pick:2026-10-21:");
        assertThat(evening.request().expiresAt()).as("21:59 local").isEqualTo(Instant.parse("2026-10-22T00:59:00Z"));
        assertThat(evening.request().category()).isEqualTo(NotificationCategory.RECOMMENDATIONS);
        PushNotificationPort.ScheduledPush lunch = scheduled.getValue().get(1);
        assertThat(lunch.request().userIds()).containsExactly(carla);
        assertThat(lunch.notBefore()).as("carla usually opens at 13:00").isEqualTo(Instant.parse("2026-10-21T16:00:00Z"));
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<LedgerEntry>> recorded = ArgumentCaptor.forClass(List.class);
        verify(ledger).record(recorded.capture());
        assertThat(recorded.getValue()).singleElement().satisfies(entry -> {
            assertThat(entry.userId()).isEqualTo(held);
            assertThat(entry.holdout()).isTrue();
            assertThat(entry.contentRef()).isEqualTo("WINE:w1");
            assertThat(entry.sentAt()).isEqualTo(evening.notBefore());
            assertThat(entry.dedupeKey()).startsWith("engagement:taste_pick:2026-10-21:").endsWith(":holdout");
        });
        ArgumentCaptor<CandidateQuery> query = ArgumentCaptor.forClass(CandidateQuery.class);
        verify(tastes).find(query.capture());
        assertThat(query.getValue().members()).extracting(PlanningMember::userId).containsExactlyElementsOf(all);
        assertThat(query.getValue().members().get(2).lastSeenAt()).as("the app open is the latest").isEqualTo(NOW.minus(Duration.ofHours(2)));
        assertThat(query.getValue().members().get(0).lastSeenAt()).as("device seen yesterday").isEqualTo(NOW.minus(Duration.ofDays(1)));
    }

    @Test
    void accountsAnotherRunAlreadyClaimedAreLeftAlone() {
        when(audience.claim(List.of(ana), MIDNIGHT, NOW)).thenReturn(List.of());

        PlanReport report = service().plan(new PlanPage(BUENOS_AIRES, accounts(List.of(ana)), NOW, MIDNIGHT, Set.of()));

        assertThat(report).isEqualTo(new PlanReport(false, 1, 0, Map.of(), 0));
        verifyNoInteractions(activity, histories, planning, tastes, ledger, pushes);
    }

    @Test
    void accountsWithoutACandidateOrWithTheCategoryOffGetNothing() {
        when(audience.claim(List.of(ana, bruno), MIDNIGHT, NOW)).thenReturn(List.of(ana, bruno));
        when(activity.rhythms(anyList())).thenReturn(Map.of());
        when(histories.read(anyList(), anyMap())).thenReturn(Map.of(ana, EngagementHistory.empty(), bruno, EngagementHistory.empty()));
        when(planning.pushCategories(anyList())).thenReturn(Map.of(ana, Set.of()));
        when(tastes.find(any())).thenReturn(List.of(taste(ana)));
        when(reminders.find(any())).thenReturn(List.of());

        PlanReport report = service().plan(new PlanPage(BUENOS_AIRES, accounts(List.of(ana, bruno)), NOW, MIDNIGHT,
                Set.of(NotificationType.WINBACK)));

        assertThat(report.count(EngagementDecision.Outcome.NO_CANDIDATE)).isEqualTo(2);
        verify(pushes).schedule(List.of());
        verify(ledger).record(List.of());
    }

    @Test
    void aPageOfMoreThanAThousandEqualPushesIsSplitIntoProviderSizedRequests() {
        List<UUID> many = IntStream.range(0, 2).mapToObj(index -> treated()).toList();
        assertThat(PushRequest.MAX_USERS).isEqualTo(1000);
        when(audience.claim(many, MIDNIGHT, NOW)).thenReturn(many);
        when(activity.rhythms(anyList())).thenReturn(Map.of());
        Map<UUID, EngagementHistory> known = new HashMap<>();
        many.forEach(id -> known.put(id, EngagementHistory.empty()));
        when(histories.read(anyList(), anyMap())).thenReturn(known);
        Map<UUID, Set<NotificationCategory>> allowed = new HashMap<>();
        many.forEach(id -> allowed.put(id, EnumSet.allOf(NotificationCategory.class)));
        when(planning.pushCategories(anyList())).thenReturn(allowed);
        when(tastes.find(any())).thenReturn(many.stream().map(EngagementPageServiceTest::taste).toList());
        when(reminders.find(any())).thenReturn(List.of());

        service().plan(new PlanPage(BUENOS_AIRES, accounts(many), NOW, MIDNIGHT, Set.of()));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PushNotificationPort.ScheduledPush>> scheduled = ArgumentCaptor.forClass(List.class);
        verify(pushes).schedule(scheduled.capture());
        assertThat(scheduled.getValue()).singleElement().satisfies(push -> assertThat(push.request().userIds()).hasSize(2));
    }

    @Test
    void theSamePushForOtherAccountsGetsItsOwnKeySoTheOutboxNeverDropsItAndTheSameAccountsKeepTheirs() {
        String first = plannedKey(List.of(ana));
        String second = plannedKey(List.of(bruno));
        String again = plannedKey(List.of(ana));

        assertThat(second).as("another page of the same run").isNotEqualTo(first);
        assertThat(again).as("a repeated run for the same accounts queues nothing new").isEqualTo(first);
    }

    private String plannedKey(List<UUID> ids) {
        PushNotificationPort scheduling = mock(PushNotificationPort.class);
        when(audience.claim(ids, MIDNIGHT, NOW)).thenReturn(ids);
        when(activity.rhythms(anyList())).thenReturn(Map.of());
        Map<UUID, EngagementHistory> known = new HashMap<>();
        Map<UUID, Set<NotificationCategory>> allowed = new HashMap<>();
        ids.forEach(id -> {
            known.put(id, EngagementHistory.empty());
            allowed.put(id, EnumSet.allOf(NotificationCategory.class));
        });
        when(histories.read(anyList(), anyMap())).thenReturn(known);
        when(planning.pushCategories(anyList())).thenReturn(allowed);
        when(tastes.find(any())).thenReturn(ids.stream().map(EngagementPageServiceTest::taste).toList());
        when(reminders.find(any())).thenReturn(List.of());
        new EngagementPageService(audience, activity, histories, planning, List.of(tastes, reminders), ledger, scheduling,
                EngagementPolicy.standard(), new Holdout(5)).plan(new PlanPage(BUENOS_AIRES, accounts(ids), NOW, MIDNIGHT, Set.of()));
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PushNotificationPort.ScheduledPush>> scheduled = ArgumentCaptor.forClass(List.class);
        verify(scheduling).schedule(scheduled.capture());
        return scheduled.getValue().getFirst().request().dedupeKey();
    }

    private EngagementPageService service() {
        return new EngagementPageService(audience, activity, histories, planning, List.of(tastes, reminders), ledger, pushes,
                EngagementPolicy.standard(), new Holdout(5));
    }

    private static List<PlanningAccount> accounts(List<UUID> ids) {
        return ids.stream().map(id -> new PlanningAccount(id, NOW.minus(Duration.ofDays(200)), NOW.minus(Duration.ofDays(1)))).toList();
    }

    private static EngagementCandidate taste(UUID user) {
        return new EngagementCandidate(user, NotificationType.TASTE_PICK, "WINE:w1", Map.of("wineId", "w1", "wine", "Gran Malbec",
                "reasonKind", "TYPE", "reason", "RED"), CandidateSignals.fit(0.8));
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

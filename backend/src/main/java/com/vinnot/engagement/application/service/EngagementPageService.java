package com.vinnot.engagement.application.service;

import com.vinnot.activity.application.port.in.ReadActivitySignalsUseCase;
import com.vinnot.activity.domain.model.ActivityRhythm;
import com.vinnot.engagement.application.model.CandidateQuery;
import com.vinnot.engagement.application.model.LedgerEntry;
import com.vinnot.engagement.application.model.PlanPage;
import com.vinnot.engagement.application.model.PlanReport;
import com.vinnot.engagement.application.model.PlanningAccount;
import com.vinnot.engagement.application.port.in.PlanEngagementPageUseCase;
import com.vinnot.engagement.application.port.out.CandidateSourcePort;
import com.vinnot.engagement.application.port.out.EngagementAudiencePort;
import com.vinnot.engagement.application.port.out.EngagementLedgerPort;
import com.vinnot.engagement.domain.model.EngagementCandidate;
import com.vinnot.engagement.domain.model.EngagementDecision;
import com.vinnot.engagement.domain.model.EngagementHistory;
import com.vinnot.engagement.domain.model.EngagementPolicy;
import com.vinnot.engagement.domain.model.EngagementSelection;
import com.vinnot.engagement.domain.model.Holdout;
import com.vinnot.engagement.domain.model.PlanningMember;
import com.vinnot.engagement.domain.model.SendTime;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.application.port.in.PushPlanningUseCase;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.OptionalInt;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * Plans one page of accounts (#405, S16) with a fixed number of queries: claim, activity rhythms, ledger and opens,
 * push preferences, one query per candidate source, then one ledger write for the holdout and one batch of queued
 * pushes. Accounts that get the same push at the same time share one queued request (up to
 * {@link PushRequest#MAX_USERS}), so delivery sends them in provider batches.
 */
@Service
public class EngagementPageService implements PlanEngagementPageUseCase {
    static final String KEY_PREFIX = "engagement:";
    private final EngagementAudiencePort audience;
    private final ReadActivitySignalsUseCase activity;
    private final EngagementHistoryReader histories;
    private final PushPlanningUseCase planning;
    private final List<CandidateSourcePort> sources;
    private final EngagementLedgerPort ledger;
    private final PushNotificationPort pushes;
    private final EngagementPolicy policy;
    private final Holdout holdout;

    public EngagementPageService(EngagementAudiencePort audience, ReadActivitySignalsUseCase activity,
            EngagementHistoryReader histories, PushPlanningUseCase planning, List<CandidateSourcePort> sources,
            EngagementLedgerPort ledger, PushNotificationPort pushes, EngagementPolicy policy, Holdout holdout) {
        this.audience = audience;
        this.activity = activity;
        this.histories = histories;
        this.planning = planning;
        this.sources = List.copyOf(sources);
        this.ledger = ledger;
        this.pushes = pushes;
        this.policy = policy;
        this.holdout = holdout;
    }

    @Override
    @Transactional
    public PlanReport plan(PlanPage page) {
        Set<UUID> claimed = new HashSet<>(audience.claim(
                page.accounts().stream().map(PlanningAccount::userId).toList(), page.plannedBefore(), page.now()));
        List<PlanningAccount> accounts = page.accounts().stream().filter(account -> claimed.contains(account.userId())).toList();
        if (accounts.isEmpty()) {
            return new PlanReport(false, 1, 0, Map.of(), 0);
        }
        List<UUID> ids = accounts.stream().map(PlanningAccount::userId).toList();
        Map<UUID, ActivityRhythm> rhythms = activity.rhythms(ids);
        Map<UUID, Instant> lastActive = new HashMap<>();
        rhythms.forEach((id, rhythm) -> lastActive.put(id, rhythm.lastActiveAt()));
        Map<UUID, EngagementHistory> known = histories.read(ids, lastActive);
        List<PlanningMember> members = accounts.stream().map(account -> member(account, page.zone(), rhythms.get(account.userId())))
                .toList();
        Map<UUID, Set<NotificationCategory>> allowed = planning.pushCategories(ids);
        CandidateQuery query = new CandidateQuery(members, page.now());
        Map<UUID, List<EngagementCandidate>> candidates = new HashMap<>();
        sources.stream().flatMap(source -> source.find(query).stream())
                .forEach(candidate -> candidates.computeIfAbsent(candidate.userId(), id -> new ArrayList<>()).add(candidate));
        Map<EngagementDecision.Outcome, Integer> outcomes = new EnumMap<>(EngagementDecision.Outcome.class);
        List<LedgerEntry> heldOut = new ArrayList<>();
        Map<Group, List<UUID>> groups = new LinkedHashMap<>();
        for (PlanningMember member : members) {
            EngagementDecision decision = EngagementSelection.choose(member, known.get(member.userId()),
                    candidates.getOrDefault(member.userId(), List.of()), allowed.getOrDefault(member.userId(), Set.of()),
                    page.switchedOff(), policy, page.now());
            outcomes.merge(decision.outcome(), 1, Integer::sum);
            decision.chosen().ifPresent(chosen -> {
                Group group = Group.of(chosen, decision.sendAt(), page.zone());
                if (holdout.includes(member.userId())) {
                    heldOut.add(new LedgerEntry(member.userId(), chosen.type(), group.key() + ":holdout", chosen.contentRef(),
                            decision.sendAt(), true));
                } else {
                    groups.computeIfAbsent(group, ignored -> new ArrayList<>()).add(member.userId());
                }
            });
        }
        ledger.record(heldOut);
        List<PushNotificationPort.ScheduledPush> scheduled = new ArrayList<>();
        groups.forEach((group, users) -> PushRequest.batches(group.type(), users, group.data(), group.keyFor(users), false,
                group.expiresAt()).forEach(request -> scheduled.add(new PushNotificationPort.ScheduledPush(request, group.sendAt()))));
        pushes.schedule(scheduled);
        return new PlanReport(false, 1, 0, outcomes, heldOut.size());
    }

    /** Last seen is the latest of the last app open, the last device registration and the account's creation. */
    private static PlanningMember member(PlanningAccount account, ZoneId zone, ActivityRhythm rhythm) {
        Instant lastSeen = Stream.of(account.createdAt(), account.deviceSeenAt(),
                        Objects.isNull(rhythm) ? null : rhythm.lastActiveAt())
                .filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(account.createdAt());
        OptionalInt usualHour = Objects.isNull(rhythm) ? OptionalInt.empty() : rhythm.usualOpenHour();
        return new PlanningMember(account.userId(), zone, account.createdAt(), lastSeen, usualHour);
    }

    /**
     * Accounts that get the same push (type, data and content) at the same instant. {@link #key()} names the push;
     * each queued request adds a fingerprint of its accounts, because the outbox drops a second job with the same
     * key: another page, or another run, with the same push for other accounts needs its own. The request key is
     * stable, so a run repeated for the same accounts queues nothing new; it is also the push's ref for open tracking.
     */
    record Group(NotificationType type, Map<String, String> data, Instant sendAt, Instant expiresAt, String key) {
        static Group of(EngagementCandidate candidate, Instant sendAt, ZoneId zone) {
            Map<String, String> data = new TreeMap<>(candidate.data());
            if (Objects.nonNull(candidate.contentRef())) {
                data.put(NotificationType.CONTENT_REF, candidate.contentRef());
            }
            LocalDate day = sendAt.atZone(zone).toLocalDate();
            Instant expiresAt = day.atTime(SendTime.LATEST).atZone(zone).toInstant();
            String fingerprint = UUID.nameUUIDFromBytes((candidate.type() + "|" + data + "|" + sendAt)
                    .getBytes(StandardCharsets.UTF_8)).toString();
            return new Group(candidate.type(), Map.copyOf(data), sendAt, expiresAt,
                    KEY_PREFIX + candidate.type().name().toLowerCase(Locale.ROOT) + ":" + day + ":" + fingerprint);
        }

        String keyFor(List<UUID> users) {
            String accounts = String.join(",", users.stream().map(UUID::toString).sorted().toList());
            return key + ":" + UUID.nameUUIDFromBytes(accounts.getBytes(StandardCharsets.UTF_8));
        }
    }
}

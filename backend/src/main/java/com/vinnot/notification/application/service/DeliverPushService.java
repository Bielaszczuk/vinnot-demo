package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.in.DeliverPushUseCase;
import com.vinnot.notification.application.port.out.AnnouncementStatsPort;
import com.vinnot.notification.application.port.out.EngagementBudgetPort;
import com.vinnot.notification.application.port.out.NotificationPreferenceRepositoryPort;
import com.vinnot.notification.application.port.out.PushAudiencePort;
import com.vinnot.notification.application.port.out.PushDeviceRepositoryPort;
import com.vinnot.notification.application.port.out.PushMetricsPort;
import com.vinnot.notification.application.port.out.PushOutboxPort;
import com.vinnot.notification.application.port.out.PushReceiptStorePort;
import com.vinnot.notification.application.port.out.PushRendererPort;
import com.vinnot.notification.application.port.out.PushSendLogPort;
import com.vinnot.notification.application.port.out.PushSenderPort;
import com.vinnot.notification.application.port.out.PushTypeSwitchPort;
import com.vinnot.notification.domain.model.AnnouncementRef;
import com.vinnot.notification.domain.model.NotificationChannel;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationPreferences;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import com.vinnot.notification.domain.model.PushDevice;
import com.vinnot.notification.domain.model.PushOutcome;
import com.vinnot.notification.domain.model.PushRequest;
import com.vinnot.notification.domain.model.QuietHours;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Predicate;
import java.util.regex.Pattern;

/**
 * Fans one push request out to the devices of its accounts, in batches the provider accepts. It runs outside any
 * database transaction: each read and write is its own short statement, so no connection or row lock is held while the
 * provider answers.
 *
 * <p>Accounts that already received it (a retried job), inactive, suspended or deleted ones, and ones that turned the
 * category off for push are skipped (their preferences are read in one batch). Non-transactional pushes also wait out
 * quiet hours, 22:00 to 08:00 locally, and engagement pushes until 09:00 (#405, S11; a delayed copy of the request is
 * stored for those accounts). Only accounts with a device go on.
 *
 * <p>Delivery guarantees. A push with a limit (every non-transactional push except engagement ones stops at the daily
 * cap; some categories have their own limit; engagement pushes pass the engagement budget) is <em>reserved</em> before
 * it is sent: the limits are checked and the send recorded atomically
 * per account, so concurrent jobs never both pass a limit. If the provider then fails, the reservations of the accounts
 * not reached are released and the job retries them; if the process dies between reserving and sending, those accounts
 * miss this push (at most once). A transactional push has no limit and is recorded right after the provider accepts each
 * batch, so a provider failure later in the job retries only the accounts not reached yet; if the process dies between
 * the provider accepting a batch and recording it, that one batch is sent again (at least once). A batch the provider
 * rejects as malformed is counted as failed and this job does not send it again. A reserved account the provider did
 * not take (its batch was rejected, or none of its messages was accepted) is released, so a push it never got uses up
 * none of its limits and never counts as an unopened engagement push; a retry of the job after a later provider
 * failure may try it again.
 *
 * <p>Engagement pushes (#405) pass the engagement budget inside that same reservation ({@link EngagementBudgetPort}):
 * at most 2 a week, 1 a local day, 48 hours apart, fewer for accounts that stopped opening them and none for the
 * measurement holdout. They neither stop at nor count toward the reactive daily cap. Transactional and reactive social
 * pushes never ask the budget, so they are never blocked by it nor count toward it.
 *
 * <p>Storing the receipt tickets and forgetting unregistered tokens come after that and are best-effort: a failure there
 * is logged and never re-sends a delivered batch; so is counting outcomes, which never fails the job (the accounts a
 * batch reached leave the job's pending list as soon as the provider answers). A type an administrator turned off is
 * dropped, not deferred, quiet-hour
 * copies included (#310). Every outcome is counted per type for the admin metrics: {@link PushOutcome#SENT} counts accounts
 * with at least one message the provider accepted, {@link PushOutcome#FAILED} counts rejected messages. A job retried
 * after a provider failure counts its re-evaluated accounts again, so the counts are close, not exact. An announcement's
 * push (#490) is also counted against its announcement, the same way and as best-effort, and its receipt tickets name
 * it, so a failure reported later counts against it too.
 */
@Service
public class DeliverPushService implements DeliverPushUseCase {
    static final int MAX_DEVICES_PER_USER = 10;
    private static final Logger LOGGER = LoggerFactory.getLogger(DeliverPushService.class);
    /** Quiet hours ending this soon are treated as over, so clock drift never defers a push twice. */
    static final Duration QUIET_GRACE = Duration.ofMinutes(1);
    private static final Pattern QUIET_SUFFIX = Pattern.compile(":quiet:\\d+$");
    private final PushAudiencePort audience;
    private final NotificationPreferenceRepositoryPort preferences;
    private final PushDeviceRepositoryPort devices;
    private final PushRendererPort renderer;
    private final PushSenderPort sender;
    private final PushSendLogPort sendLog;
    private final PushReceiptStorePort receipts;
    private final PushOutboxPort outbox;
    private final PushTypeSwitchPort switches;
    private final PushMetricsPort metrics;
    private final EngagementBudgetPort engagement;
    private final AnnouncementStatsPort announcementStats;
    private final int dailyCap;
    private final Clock clock;

    @Autowired
    public DeliverPushService(PushAudiencePort audience, NotificationPreferenceRepositoryPort preferences,
            PushDeviceRepositoryPort devices, PushRendererPort renderer, PushSenderPort sender, PushSendLogPort sendLog,
            PushReceiptStorePort receipts, PushOutboxPort outbox, PushTypeSwitchPort switches, PushMetricsPort metrics,
            EngagementBudgetPort engagement, AnnouncementStatsPort announcementStats,
            @Value("${app.notifications.push.daily-cap:3}") int dailyCap) {
        this(audience, preferences, devices, renderer, sender, sendLog, receipts, outbox, switches, metrics, engagement,
                announcementStats, dailyCap, Clock.systemUTC());
    }

    DeliverPushService(PushAudiencePort audience, NotificationPreferenceRepositoryPort preferences,
            PushDeviceRepositoryPort devices, PushRendererPort renderer, PushSenderPort sender, PushSendLogPort sendLog,
            PushReceiptStorePort receipts, PushOutboxPort outbox, PushTypeSwitchPort switches, PushMetricsPort metrics,
            EngagementBudgetPort engagement, AnnouncementStatsPort announcementStats, int dailyCap, Clock clock) {
        if (dailyCap < 1) {
            throw new IllegalArgumentException("app.notifications.push.daily-cap must be at least 1");
        }
        this.audience = audience;
        this.preferences = preferences;
        this.devices = devices;
        this.renderer = renderer;
        this.sender = sender;
        this.sendLog = sendLog;
        this.receipts = receipts;
        this.outbox = outbox;
        this.switches = switches;
        this.metrics = metrics;
        this.engagement = engagement;
        this.announcementStats = announcementStats;
        this.dailyCap = dailyCap;
        this.clock = clock;
    }

    @Override
    public void deliver(PushRequest request) {
        Instant now = clock.instant();
        if (!switches.isEnabled(request.type())) {
            recordOutcomes(request.type(), Map.of(PushOutcome.SWITCHED_OFF, request.userIds().size()), now);
            return;
        }
        if (request.expiredAt(now)) {
            recordOutcomes(request.type(), Map.of(PushOutcome.EXPIRED, request.userIds().size()), now);
            return;
        }
        boolean transactional = request.category().transactional();
        boolean capped = !transactional && !request.type().engagement();
        Set<UUID> sent = sendLog.alreadySent(request.dedupeKey(), request.userIds());
        List<UUID> pending = request.userIds().stream().filter(id -> !sent.contains(id)).toList();
        if (pending.isEmpty()) {
            return;
        }
        List<PushAudiencePort.Member> members = audience.findActive(pending);
        Map<UUID, NotificationPreferences> choices = transactional || members.isEmpty() ? Map.of()
                : preferences.loadAll(members.stream().map(PushAudiencePort.Member::userId).toList());
        List<UUID> recipients = new ArrayList<>();
        Map<UUID, ZoneId> zones = new HashMap<>();
        members.forEach(member -> zones.put(member.userId(), member.timeZone()));
        Map<Instant, List<UUID>> afterQuiet = new TreeMap<>();
        Map<PushOutcome, Integer> outcomes = new EnumMap<>(PushOutcome.class);
        for (PushAudiencePort.Member member : members) {
            if (!transactional && !choices.getOrDefault(member.userId(), NotificationPreferences.defaults())
                    .allows(request.category(), NotificationChannel.PUSH)) {
                outcomes.merge(PushOutcome.BLOCKED_BY_PREFERENCES, 1, Integer::sum);
                continue;
            }
            Optional<Instant> quietEnds = !request.waitsForQuietHours() ? Optional.empty()
                    : quietEnd(request, now, member.timeZone()).filter(end -> end.isAfter(now.plus(QUIET_GRACE)));
            if (quietEnds.isPresent() && request.expiredAt(quietEnds.get())) {
                outcomes.merge(PushOutcome.EXPIRED, 1, Integer::sum);
                continue;
            }
            if (quietEnds.isPresent()) {
                afterQuiet.computeIfAbsent(quietEnds.get(), ignored -> new ArrayList<>()).add(member.userId());
                outcomes.merge(PushOutcome.DEFERRED_QUIET_HOURS, 1, Integer::sum);
            } else {
                recipients.add(member.userId());
            }
        }
        String baseKey = QUIET_SUFFIX.matcher(request.dedupeKey()).replaceFirst("");
        afterQuiet.forEach((release, users) -> outbox.store(
                request.forUsers(users, baseKey + ":quiet:" + release.getEpochSecond()), Duration.between(now, release)));
        Map<UUID, List<PushDevice>> byUser = devicesOf(recipients);
        boolean limited = !transactional || request.category().pushLimit().isPresent();
        if (limited && !byUser.isEmpty()) {
            List<UUID> kept = sendLog.reserve(request.dedupeKey(), List.copyOf(byUser.keySet()), request.category(),
                    capped, now, candidates -> withinLimits(request, candidates, capped, zones, now, outcomes));
            byUser.keySet().retainAll(new HashSet<>(kept));
        }
        if (!outcomes.isEmpty()) {
            recordOutcomes(request.type(), outcomes, now);
        }
        send(request, byUser, limited, now);
    }

    /** Engagement pushes, the event-triggered wine suggestion included, wait until 09:00; other optional ones until 08:00. */
    private static Optional<Instant> quietEnd(PushRequest request, Instant now, ZoneId zone) {
        return request.type().engagement() ? QuietHours.engagementEndOf(now, zone) : QuietHours.endOf(now, zone);
    }

    /** The accounts with at least one device, in request order, each with its most recent devices. */
    private Map<UUID, List<PushDevice>> devicesOf(List<UUID> recipients) {
        Map<UUID, List<PushDevice>> byUser = new LinkedHashMap<>();
        if (recipients.isEmpty()) {
            return byUser;
        }
        recipients.forEach(id -> byUser.put(id, new ArrayList<>()));
        for (PushDevice device : devices.findByUsers(recipients)) {
            List<PushDevice> owned = byUser.get(device.userId());
            if (owned.size() < MAX_DEVICES_PER_USER) {
                owned.add(device);
            }
        }
        byUser.values().removeIf(List::isEmpty);
        return byUser;
    }

    /**
     * Runs while the accounts are locked: drops those past the daily cap (reactive pushes only) or their category's own
     * limit, then lets the engagement budget decide (and record) an engagement push.
     */
    private List<UUID> withinLimits(PushRequest request, List<UUID> candidates, boolean capped,
            Map<UUID, ZoneId> zones, Instant now, Map<PushOutcome, Integer> outcomes) {
        List<UUID> kept = new ArrayList<>(candidates);
        if (capped) {
            Map<UUID, Integer> counts = sendLog.cappedSince(kept, now.minus(Duration.ofDays(1)));
            drop(kept, id -> counts.getOrDefault(id, 0) >= dailyCap, PushOutcome.DROPPED_DAILY_CAP, outcomes);
        }
        request.category().pushLimit().ifPresent(limit -> {
            Map<UUID, Integer> counts = sendLog.sentInCategorySince(kept, request.category(), now.minus(limit.window()));
            drop(kept, id -> counts.getOrDefault(id, 0) >= limit.count(), PushOutcome.DROPPED_CATEGORY_CAP, outcomes);
        });
        if (!request.type().engagement() || kept.isEmpty()) {
            return kept;
        }
        EngagementBudgetPort.Admission admission = engagement.admit(
                new EngagementBudgetPort.Push(request.type(), request.dedupeKey(), request.data().get(NotificationType.CONTENT_REF)),
                kept.stream().map(id -> new EngagementBudgetPort.Recipient(id, zones.get(id))).toList(), now);
        count(outcomes, PushOutcome.DROPPED_ENGAGEMENT_BUDGET, admission.overBudget());
        count(outcomes, PushOutcome.DROPPED_FATIGUE, admission.fatigued());
        count(outcomes, PushOutcome.DROPPED_HOLDOUT, admission.heldOut());
        return admission.admitted();
    }

    private static void count(Map<PushOutcome, Integer> outcomes, PushOutcome outcome, int accounts) {
        if (accounts > 0) {
            outcomes.merge(outcome, accounts, Integer::sum);
        }
    }

    private static void drop(List<UUID> recipients, Predicate<UUID> reached, PushOutcome outcome,
            Map<PushOutcome, Integer> outcomes) {
        int before = recipients.size();
        recipients.removeIf(reached);
        if (recipients.size() < before) {
            outcomes.merge(outcome, before - recipients.size(), Integer::sum);
        }
    }

    private void send(PushRequest request, Map<UUID, List<PushDevice>> byUser, boolean reserved, Instant now) {
        List<UUID> unsent = new ArrayList<>(byUser.keySet());
        try {
            Map<NotificationLocale, PushContent> contents = new EnumMap<>(NotificationLocale.class);
            Batch batch = new Batch();
            for (var entry : byUser.entrySet()) {
                if (batch.messages.size() + entry.getValue().size() > PushSenderPort.MAX_BATCH) {
                    flush(request, batch, reserved, now, unsent);
                    batch.clear();
                }
                for (PushDevice device : entry.getValue()) {
                    PushContent content = contents.computeIfAbsent(device.locale(),
                            locale -> renderer.render(request.type(), locale, request.data()));
                    batch.messages.add(new PushSenderPort.Message(device.token().value(), content, request.urgent(),
                            request.type(), request.dedupeKey(), request.expiresAt(), device.channels()));
                    batch.owners.add(entry.getKey());
                }
                batch.users.add(entry.getKey());
            }
            flush(request, batch, reserved, now, unsent);
        } catch (RuntimeException failure) {
            if (reserved) {
                try {
                    release(request, unsent);
                } catch (RuntimeException releaseFailure) {
                    // Those accounts stay recorded, so the retried job skips them: they miss this push.
                    LOGGER.warn("Push job failed and could not release {} unsent reservation(s)", unsent.size(), releaseFailure);
                }
            }
            throw failure;
        }
    }

    /** Forgets the reservations (and engagement ledger rows) of accounts this push did not reach. */
    private void release(PushRequest request, List<UUID> users) {
        sendLog.release(request.dedupeKey(), users);
        if (request.type().engagement()) {
            engagement.release(request.dedupeKey(), users);
        }
    }

    /**
     * Sends one batch. Its accounts leave {@code unsent} as soon as the provider answers, before anything else that could
     * fail, so a later failure of the job never releases (and re-sends to) accounts the provider already took.
     */
    private void flush(PushRequest request, Batch batch, boolean reserved, Instant now, List<UUID> unsent) {
        if (batch.messages.isEmpty()) {
            return;
        }
        List<UUID> users = List.copyOf(batch.users);
        UUID announcement = AnnouncementRef.of(request.dedupeKey()).map(AnnouncementRef::announcementId).orElse(null);
        List<PushSenderPort.Ticket> tickets;
        try {
            tickets = sender.send(List.copyOf(batch.messages));
        } catch (PushSenderPort.RejectedException rejected) {
            unsent.removeAll(users);
            LOGGER.warn("Push provider rejected a batch of {} {} message(s); it is not sent again: {}",
                    batch.messages.size(), request.type(), rejected.getMessage());
            if (reserved) {
                bestEffort("release the reservations of a rejected batch", () -> release(request, users));
            } else {
                sendLog.record(request.dedupeKey(), users, request.category(), false, now);
            }
            recordOutcomes(request.type(), Map.of(PushOutcome.FAILED, batch.messages.size()), now);
            countAnnouncement(announcement, 0, batch.messages.size());
            return;
        }
        unsent.removeAll(users);
        if (!reserved) {
            sendLog.record(request.dedupeKey(), users, request.category(), false, now);
        }
        bestEffort("save push receipts", () -> receipts.save(tickets.stream().filter(PushSenderPort.Ticket::accepted)
                .map(ticket -> new PushReceiptStorePort.Pending(ticket.id(), ticket.token(), request.type(), announcement))
                .toList(), now));
        bestEffort("forget unregistered push tokens", () -> devices.deleteTokens(tickets.stream()
                .filter(PushSenderPort.Ticket::deviceNotRegistered).map(PushSenderPort.Ticket::token).toList()));
        Set<UUID> reached = new HashSet<>();
        int rejected = 0;
        for (int index = 0; index < tickets.size(); index++) {
            if (tickets.get(index).accepted()) {
                reached.add(batch.owners.get(index));
            } else {
                rejected++;
            }
        }
        List<UUID> missed = users.stream().filter(id -> !reached.contains(id)).toList();
        if (reserved && !missed.isEmpty()) {
            bestEffort("release the reservations of accounts without an accepted message", () -> release(request, missed));
        }
        Map<PushOutcome, Integer> outcomes = new EnumMap<>(PushOutcome.class);
        if (!reached.isEmpty()) {
            outcomes.put(PushOutcome.SENT, reached.size());
        }
        if (rejected > 0) {
            outcomes.put(PushOutcome.FAILED, rejected);
        }
        if (!outcomes.isEmpty()) {
            recordOutcomes(request.type(), outcomes, now);
        }
        countAnnouncement(announcement, reached.size(), rejected);
    }

    /** Counts a push of an announcement (#490) against it; nothing for other pushes. Best-effort like the metrics. */
    private void countAnnouncement(UUID announcement, int sent, int failed) {
        if (Objects.nonNull(announcement)) {
            bestEffort("count an announcement push", () -> announcementStats.recordPush(announcement, sent, failed));
        }
    }

    /** Counting outcomes is best-effort: a failure is logged and never fails the job, which could send a batch again. */
    private void recordOutcomes(NotificationType type, Map<PushOutcome, Integer> outcomes, Instant now) {
        bestEffort("record its " + type + " outcomes", () -> metrics.record(type, outcomes, now));
    }

    /** Follow-up work of a batch the provider answered: a failure is logged and never fails the job, which would send it again. */
    private static void bestEffort(String step, Runnable work) {
        try {
            work.run();
        } catch (RuntimeException failure) {
            LOGGER.warn("Push job could not {}", step, failure);
        }
    }

    /** The messages of one provider request, the account of each message, and the accounts it covers. */
    private static final class Batch {
        private final List<PushSenderPort.Message> messages = new ArrayList<>();
        private final List<UUID> owners = new ArrayList<>();
        private final List<UUID> users = new ArrayList<>();

        private void clear() {
            messages.clear();
            owners.clear();
            users.clear();
        }
    }
}

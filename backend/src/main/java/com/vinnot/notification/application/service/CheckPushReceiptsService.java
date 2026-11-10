package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.in.CheckPushReceiptsUseCase;
import com.vinnot.notification.application.port.out.AnnouncementStatsPort;
import com.vinnot.notification.application.port.out.PushDeviceRepositoryPort;
import com.vinnot.notification.application.port.out.PushMetricsPort;
import com.vinnot.notification.application.port.out.PushReceiptStorePort;
import com.vinnot.notification.application.port.out.PushSendLogPort;
import com.vinnot.notification.application.port.out.PushSenderPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushOutcome;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Receipts become available some minutes after a send and expire after a day. Each run first drops tickets older than
 * a day (the provider no longer has their receipt; a younger ticket is never dropped unchecked), then walks every ticket
 * older than fifteen minutes, oldest first, in chunks of {@value PushSenderPort#MAX_RECEIPTS}, until none is left or the
 * run's time budget is spent. Per chunk it forgets devices reported as no longer registered and drops the tickets that
 * have a receipt; tickets without a receipt yet stay for the next run. An undelivered receipt counts as a failure of its
 * push type in the admin metrics (#310), and of its announcement when it was sent for one (#490).
 *
 * <p>No database transaction spans a provider call: every read and write is its own short statement. If the process
 * stops halfway, the next run reads the remaining receipts again, which may count a failure twice.
 */
@Service
public class CheckPushReceiptsService implements CheckPushReceiptsUseCase {
    static final Duration RECEIPT_DELAY = Duration.ofMinutes(15);
    static final Duration RECEIPT_EXPIRY = Duration.ofDays(1);
    static final Duration SEND_LOG_RETENTION = Duration.ofDays(7);
    private static final Logger LOGGER = LoggerFactory.getLogger(CheckPushReceiptsService.class);
    private final PushReceiptStorePort store;
    private final PushSenderPort sender;
    private final PushDeviceRepositoryPort devices;
    private final PushSendLogPort sendLog;
    private final PushMetricsPort metrics;
    private final AnnouncementStatsPort announcementStats;
    private final Duration budget;
    private final Clock clock;

    @Autowired
    public CheckPushReceiptsService(PushReceiptStorePort store, PushSenderPort sender, PushDeviceRepositoryPort devices,
            PushSendLogPort sendLog, PushMetricsPort metrics, AnnouncementStatsPort announcementStats,
            @Value("${app.notifications.push.receipts-budget:4m}") Duration budget) {
        this(store, sender, devices, sendLog, metrics, announcementStats, budget, Clock.systemUTC());
    }

    CheckPushReceiptsService(PushReceiptStorePort store, PushSenderPort sender, PushDeviceRepositoryPort devices,
            PushSendLogPort sendLog, PushMetricsPort metrics, AnnouncementStatsPort announcementStats, Duration budget,
            Clock clock) {
        if (budget.isNegative() || budget.isZero()) {
            throw new IllegalArgumentException("app.notifications.push.receipts-budget must be positive");
        }
        this.store = store;
        this.sender = sender;
        this.devices = devices;
        this.sendLog = sendLog;
        this.metrics = metrics;
        this.announcementStats = announcementStats;
        this.budget = budget;
        this.clock = clock;
    }

    @Override
    public int execute(Instant now) {
        store.purgeBefore(now.minus(RECEIPT_EXPIRY));
        sendLog.purgeBefore(now.minus(SEND_LOG_RETENTION));
        Instant deadline = clock.instant().plus(budget);
        Instant dueBefore = now.minus(RECEIPT_DELAY);
        PushReceiptStorePort.Cursor after = null;
        int checked = 0;
        do {
            PushReceiptStorePort.Chunk chunk = store.due(dueBefore, after, PushSenderPort.MAX_RECEIPTS);
            if (chunk.tickets().isEmpty()) {
                break;
            }
            checked += check(chunk.tickets(), now);
            after = chunk.next();
        } while (Objects.nonNull(after) && clock.instant().isBefore(deadline));
        return checked;
    }

    private int check(List<PushReceiptStorePort.Pending> due, Instant now) {
        Map<String, PushSenderPort.Receipt> found;
        try {
            found = sender.receipts(due.stream().map(PushReceiptStorePort.Pending::ticketId).toList());
        } catch (PushSenderPort.RejectedException rejected) {
            // These ids can never be read; they expire with the other tickets after a day.
            LOGGER.warn("Push provider rejected a receipts request for {} ticket(s): {}", due.size(), rejected.getMessage());
            return 0;
        }
        devices.deleteTokens(due.stream().filter(ticket -> found.containsKey(ticket.ticketId())
                && found.get(ticket.ticketId()).deviceNotRegistered()).map(PushReceiptStorePort.Pending::token).distinct().toList());
        List<PushReceiptStorePort.Pending> undelivered = due.stream()
                .filter(ticket -> found.containsKey(ticket.ticketId()) && !found.get(ticket.ticketId()).delivered()).toList();
        Map<NotificationType, Integer> failures = new EnumMap<>(NotificationType.class);
        undelivered.stream().filter(ticket -> Objects.nonNull(ticket.type()))
                .forEach(ticket -> failures.merge(ticket.type(), 1, Integer::sum));
        failures.forEach((type, count) -> metrics.record(type, Map.of(PushOutcome.FAILED, count), now));
        Map<UUID, Integer> byAnnouncement = new HashMap<>();
        undelivered.stream().filter(ticket -> Objects.nonNull(ticket.announcementId()))
                .forEach(ticket -> byAnnouncement.merge(ticket.announcementId(), 1, Integer::sum));
        byAnnouncement.forEach((announcement, count) -> announcementStats.recordPush(announcement, 0, count));
        store.delete(found.keySet());
        return found.size();
    }
}

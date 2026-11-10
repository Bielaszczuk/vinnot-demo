package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.port.out.PushReceiptStorePort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.domain.util.EnumNames;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Component
public class JdbcPushReceiptStore implements PushReceiptStorePort {
    private static final String COLUMNS = "ticket_id, token, notification_type, announcement_id, created_at";
    private final JdbcTemplate jdbc;
    private final TransactionTemplate ownTransaction;

    public JdbcPushReceiptStore(JdbcTemplate jdbc, PlatformTransactionManager transactions) {
        this.jdbc = jdbc;
        this.ownTransaction = new TransactionTemplate(transactions);
        this.ownTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Override
    public void save(Collection<Pending> tickets, Instant at) {
        if (tickets.isEmpty()) {
            return;
        }
        ownTransaction.executeWithoutResult(status -> jdbc.batchUpdate(
                "INSERT INTO push_receipts(ticket_id, token, created_at, notification_type, announcement_id)"
                        + " VALUES (?,?,?,?,?) ON CONFLICT (ticket_id) DO NOTHING",
                tickets.stream().map(ticket -> new Object[]{ticket.ticketId(), ticket.token(), Timestamp.from(at),
                        Objects.isNull(ticket.type()) ? null : ticket.type().name(), ticket.announcementId()}).toList()));
    }

    @Override
    public Chunk due(Instant createdBefore, Cursor after, int limit) {
        List<Due> rows = Objects.isNull(after)
                ? jdbc.query("SELECT " + COLUMNS + " FROM push_receipts WHERE created_at <= ?"
                        + " ORDER BY created_at, ticket_id LIMIT ?", JdbcPushReceiptStore::due, Timestamp.from(createdBefore), limit)
                : jdbc.query("SELECT " + COLUMNS + " FROM push_receipts WHERE created_at <= ?"
                        + " AND (created_at, ticket_id) > (?, ?) ORDER BY created_at, ticket_id LIMIT ?", JdbcPushReceiptStore::due,
                        Timestamp.from(createdBefore), Timestamp.from(after.createdAt()), after.ticketId(), limit);
        Cursor next = rows.size() < limit ? null : rows.getLast().cursor();
        return new Chunk(rows.stream().map(Due::ticket).toList(), next);
    }

    private static Due due(ResultSet row, int index) throws SQLException {
        return new Due(new Pending(row.getString("ticket_id"), row.getString("token"), type(row.getString("notification_type")),
                row.getObject("announcement_id", UUID.class)),
                new Cursor(row.getTimestamp("created_at").toInstant(), row.getString("ticket_id")));
    }

    private record Due(Pending ticket, Cursor cursor) {
    }

    /** A type this binary no longer knows is treated like a ticket stored before #310. */
    private static NotificationType type(String name) {
        return EnumNames.find(NotificationType.class, name).orElse(null);
    }

    @Override
    public void delete(Collection<String> ticketIds) {
        if (ticketIds.isEmpty()) {
            return;
        }
        jdbc.update("DELETE FROM push_receipts WHERE ticket_id = ANY (?)", (Object) ticketIds.toArray(String[]::new));
    }

    @Override
    public void purgeBefore(Instant before) {
        jdbc.update("DELETE FROM push_receipts WHERE created_at < ?", Timestamp.from(before));
    }
}

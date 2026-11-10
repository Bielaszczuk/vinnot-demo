package com.vinnot.event.infrastructure.persistence.adapter;

import com.vinnot.event.application.port.out.EventTicketReader;
import com.vinnot.event.application.query.response.EventTicketResponse;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;
import java.util.Optional;
import java.util.UUID;
import java.util.Objects;

@Component
@RequiredArgsConstructor
public class PostgresEventTicketReader implements EventTicketReader {
    private final JdbcTemplate jdbc;
    private static final String SELECT = """
            SELECT r.id,r.event_id,e.title,e.description,e.image_url,e.status AS event_status,
                   e.start_date,e.end_date,e.location_name,e.location_address,e.location_city,
                   e.contact_email,e.contact_phone,r.status,r.payment_status,r.attendee_count,
                   r.total_amount,r.currency,r.expires_at
            FROM event_registrations r JOIN events e ON e.id=r.event_id WHERE r.user_id=?
            """;
    private static final RowMapper<EventTicketResponse> MAPPER = (row, index) -> {
        var expiry = row.getTimestamp("expires_at");
        return new EventTicketResponse(row.getObject("id", UUID.class),row.getObject("event_id", UUID.class),
                row.getString("title"),row.getString("description"),row.getString("image_url"),row.getString("event_status"),
                row.getTimestamp("start_date").toInstant(),row.getTimestamp("end_date").toInstant(),
                row.getString("location_name"),row.getString("location_address"),row.getString("location_city"),
                row.getString("contact_email"),row.getString("contact_phone"),row.getString("status"),
                row.getString("payment_status"),row.getInt("attendee_count"),row.getBigDecimal("total_amount"),
                row.getString("currency"),Objects.isNull(expiry) ? null : expiry.toInstant());
    };
    @Override
    public PageResult<EventTicketResponse> findByAttendee(UUID attendeeId, PageQuery page) {
        long count = jdbc.queryForObject("SELECT count(*) FROM event_registrations r JOIN events e ON e.id=r.event_id WHERE r.user_id=?", Long.class, attendeeId);
        var rows = jdbc.query(SELECT + " ORDER BY r.created_at DESC,r.id DESC LIMIT ? OFFSET ?", MAPPER,
                attendeeId,page.size(),page.page() * page.size());
        return PageResult.of(rows,page.page(),page.size(),count);
    }
    @Override
    public Optional<EventTicketResponse> findByIdAndAttendee(UUID ticketId, UUID attendeeId) {
        return jdbc.query(SELECT + " AND r.id=?", MAPPER, attendeeId,ticketId).stream().findFirst();
    }
}

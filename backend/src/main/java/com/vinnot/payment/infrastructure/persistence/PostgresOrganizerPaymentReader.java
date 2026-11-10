package com.vinnot.payment.infrastructure.persistence;

import com.vinnot.payment.application.port.out.OrganizerPaymentReader;
import com.vinnot.payment.application.service.PaymentExecutionPolicy.Environment;
import com.vinnot.payment.domain.model.OrganizerPayment;
import com.vinnot.payment.domain.model.ProviderPayment;
import com.vinnot.payment.domain.model.RefundIntent;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.vinnot.event.domain.valueobject.EventRegistrationStatus;
import java.util.Objects;

public class PostgresOrganizerPaymentReader implements OrganizerPaymentReader {
    private final NamedParameterJdbcTemplate jdbc;
    private final Environment environment;
    public PostgresOrganizerPaymentReader(JdbcTemplate jdbc, Environment environment) {
        this.jdbc = new NamedParameterJdbcTemplate(jdbc);
        this.environment = environment;
    }
    @Override
    public List<OrganizerPayment> find(UUID eventId, List<UUID> registrationIds) {
        if (registrationIds.isEmpty()) {
            return List.of();
        }
        return jdbc.query("""
            SELECT a.id,a.registration_id,a.total_amount,a.currency,p.status,p.refunded_amount,p.needs_review,
                   r.status AS registration_status,f.status AS refund_status
            FROM payment_checkout_attempts a
            JOIN event_registrations r ON r.id=a.registration_id AND r.event_id=a.event_id
            LEFT JOIN payment_observations p ON p.attempt_id=a.id AND p.credited
            LEFT JOIN payment_refund_intents f ON f.payment_id=p.payment_id AND f.attempt_id=a.id
            WHERE a.event_id=:event AND a.environment=:environment AND a.registration_id IN (:registrations)
            ORDER BY a.registration_id
            """, Map.of("event",eventId,"environment",environment.name(),"registrations",registrationIds), (row,index) -> {
                String payment = row.getString("status");
                String refund = row.getString("refund_status");
                String registration = row.getString("registration_status");
                boolean holds = EventRegistrationStatus.valueOf(registration).holdsCapacity();
                return new OrganizerPayment(row.getObject("registration_id", UUID.class),row.getObject("id", UUID.class),
                        row.getBigDecimal("total_amount"),row.getString("currency"),
                        Objects.isNull(payment) ? null : ProviderPayment.Status.valueOf(payment),row.getBigDecimal("refunded_amount"),
                        Objects.isNull(refund) ? null : RefundIntent.Status.valueOf(refund),row.getBoolean("needs_review"),holds);
            });
    }
}

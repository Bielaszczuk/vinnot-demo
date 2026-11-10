package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.email.EmailPreviewFiles;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Renders a sample of every notification type. A new type must add its sample here, which keeps the
 * local preview (scripts/preview_transactional_emails.py) complete.
 */
class NotificationEmailPreviewTest {
    @Test
    void everyTypeRendersInTheBrandedLayoutAndCanBeExportedForPreview() throws IOException {
        String site = EmailPreviewFiles.baseUrl();
        var registry = new NotificationTemplateRegistry(NotificationTemplates.all(EmailPreviewFiles.template(), site));
        Map<NotificationType, Sample> samples = new EnumMap<>(NotificationType.class);
        samples.put(NotificationType.ACCOUNT_EMAIL_VERIFICATION, new Sample("verification", NotificationLocale.ES,
                Map.of(NotificationType.ACTION_URL, site + "/verify-email?token=demo-verification&source=email")));
        samples.put(NotificationType.ACCOUNT_PASSWORD_RESET, new Sample("password-reset", NotificationLocale.ES,
                Map.of(NotificationType.ACTION_URL, site + "/reset-password?token=demo-reset")));
        samples.put(NotificationType.ACCOUNT_EMAIL_CHANGE_CONFIRMATION, new Sample("email-confirmation", NotificationLocale.ES,
                Map.of(NotificationType.ACTION_URL, site + "/confirm-email-change?token=demo-change")));
        samples.put(NotificationType.ACCOUNT_EMAIL_CHANGED, new Sample("email-changed", NotificationLocale.ES,
                Map.of("newEmail", "new@example.test")));
        samples.put(NotificationType.ACCOUNT_WELCOME, new Sample("welcome", NotificationLocale.ES, Map.of()));
        samples.put(NotificationType.ACCOUNT_PASSWORD_CHANGED, new Sample("password-changed", NotificationLocale.ES, Map.of()));
        samples.put(NotificationType.ACCOUNT_SOCIAL_LINKED, new Sample("social-linked", NotificationLocale.ES,
                Map.of(NotificationType.PROVIDER, "GOOGLE")));
        samples.put(NotificationType.ACCOUNT_DEACTIVATED, new Sample("account-deactivated", NotificationLocale.ES, Map.of()));
        samples.put(NotificationType.ACCOUNT_LOGIN_LOCKED, new Sample("account-login-locked", NotificationLocale.ES, Map.of()));
        samples.put(NotificationType.ACCOUNT_DELETED, new Sample("account-deleted", NotificationLocale.ES, Map.of()));
        samples.put(NotificationType.WINE_SUBMISSION_STATUS, new Sample("wine-submission", NotificationLocale.ES,
                Map.of("wineName", "Reserva Malbec", "status", "NEEDS_REVIEW",
                        "reason", "Recibimos tu propuesta. Te avisaremos cuando termine la revisión.")));
        samples.put(NotificationType.SUPPORT_REQUEST, new Sample("support", NotificationLocale.EN,
                Map.of("requestId", "f0da7948-e767-458d-9681-43a38ed9d6c9", "name", "Name", "email", "reply@example.org",
                        "subject", "privacy", "message", "Hello")));
        Map<String, String> event = Map.of("registrationId", "11111111-2222-3333-4444-555555555555", "title", "Tasting",
                "status", "AWAITING_PAYMENT", "paymentStatus", "PENDING", "attendees", "2",
                "startDate", "2026-10-20T12:00:00Z", "expiresAt", "2026-10-19T18:45:00Z", "contactName", "Guest",
                "timeZone", "America/Argentina/Buenos_Aires");
        samples.put(NotificationType.EVENT_REGISTRATION_ATTENDEE, new Sample("event-attendee", NotificationLocale.ES, event));
        samples.put(NotificationType.EVENT_REGISTRATION_ORGANIZER, new Sample("event-organizer", NotificationLocale.EN, event));
        samples.put(NotificationType.EVENT_CANCELLED_ORGANIZER_SUMMARY, new Sample("event-cancelled-summary", NotificationLocale.ES,
                Map.of("title", "Tasting", "cancelledRegistrations", "12", "startDate", "2026-10-20T12:00:00Z",
                        "timeZone", "America/Argentina/Buenos_Aires")));
        Map<String, String> payment = Map.of("title", "Tasting", "amount", "15000", "currency", "ARS", "reference", "1234567890",
                "registrationId", "11111111-2222-3333-4444-555555555555", "paidAt", "2026-10-19T15:00:00Z",
                "timeZone", "America/Argentina/Buenos_Aires", "audience", "BUYER");
        samples.put(NotificationType.PAYMENT_RECEIPT, new Sample("payment-receipt", NotificationLocale.ES, payment));
        samples.put(NotificationType.PAYMENT_REFUND_REQUESTED, new Sample("payment-refund-requested", NotificationLocale.ES, payment));
        samples.put(NotificationType.PAYMENT_REFUNDED, new Sample("payment-refunded", NotificationLocale.ES, payment));
        samples.put(NotificationType.PAYMENT_CHARGEBACK, new Sample("payment-chargeback", NotificationLocale.ES, payment));
        samples.put(NotificationType.PAYMENT_REFUND_REJECTED, new Sample("payment-refund-rejected", NotificationLocale.ES,
                withReason(payment)));
        samples.put(NotificationType.PAYMENT_ACCOUNT_CONNECTED, new Sample("payment-account-connected", NotificationLocale.ES, Map.of()));
        samples.put(NotificationType.PAYMENT_ACCOUNT_RECONNECT_REQUIRED, new Sample("payment-account-reconnect", NotificationLocale.ES,
                Map.of("reason", "REVOKED")));
        samples.put(NotificationType.EVENT_CANCELLED_ATTENDEE, new Sample("event-cancelled-attendee", NotificationLocale.ES,
                Map.of("title", "Tasting", "startDate", "2026-10-20T12:00:00Z", "timeZone", "America/Argentina/Buenos_Aires",
                        "reason", "VENUE_UNAVAILABLE", "refund", "ONLINE")));
        samples.put(NotificationType.EVENT_CHANGED_ATTENDEE, new Sample("event-changed-attendee", NotificationLocale.ES,
                Map.of("title", "Tasting", "startDate", "2026-10-21T21:00:00Z", "endDate", "2026-10-21T23:00:00Z",
                        "previousStartDate", "2026-10-20T21:00:00Z", "previousEndDate", "2026-10-20T23:00:00Z",
                        "timeZone", "America/Argentina/Buenos_Aires", "venue", "Bodega Norte, Mendoza",
                        "registrationId", "11111111-2222-3333-4444-555555555555")));
        samples.put(NotificationType.EVENT_REMINDER, new Sample("event-reminder", NotificationLocale.ES,
                Map.of("title", "Tasting", "startDate", "2026-10-21T21:00:00Z", "timeZone", "America/Argentina/Buenos_Aires",
                        "venue", "Bodega Norte, Mendoza", "registrationId", "11111111-2222-3333-4444-555555555555")));
        samples.put(NotificationType.REVIEW_PUBLICATION_DECISION, new Sample("review-publication-rejected", NotificationLocale.ES,
                Map.of("kind", "REVIEW", "status", "REJECTED", "reasonCode", "OFF_TOPIC",
                        "wineId", "11111111-2222-3333-4444-555555555555", "wineName", "Gran Malbec 2021")));
        samples.put(NotificationType.CONTENT_REMOVED, new Sample("content-removed", NotificationLocale.ES,
                Map.of("kind", "COMMENT", "wineName", "Gran Malbec 2021", "reportReason", "HARASSMENT")));
        samples.put(NotificationType.REPORT_OUTCOME, new Sample("report-outcome", NotificationLocale.ES,
                Map.of("outcome", "REMOVED", "targetType", "REVIEW", "reason", "SPAM")));
        samples.put(NotificationType.MODERATION_QUEUE_DIGEST, new Sample("moderation-digest", NotificationLocale.ES,
                Map.of("submissions", "3", "reports", "1", "reportReason", "SPAM")));
        samples.put(NotificationType.REVIEW_COMMENT, new Sample("review-comment", NotificationLocale.ES,
                Map.of("commenter", "Lucía Pérez", "wineId", "11111111-2222-3333-4444-555555555555", "wineName", "Gran Malbec 2021")));
        samples.put(NotificationType.REVIEW_LIKES_WEEKLY, new Sample("review-likes", NotificationLocale.ES,
                Map.of("likes", "7", "reviews", "3", "wineId", "11111111-2222-3333-4444-555555555555", "wineName", "Gran Malbec 2021")));
        samples.put(NotificationType.SUPPORT_REQUEST_RECEIVED, new Sample("support-received", NotificationLocale.ES,
                Map.of("requestId", "11111111-2222-3333-4444-555555555555", "subject", "support")));
        samples.put(NotificationType.TERMS_UPDATED, new Sample("terms-updated", NotificationLocale.ES,
                Map.of("version", "2026-11-01.1", "requiredFrom", "2026-12-01T03:00:00Z", "timeZone", "America/Argentina/Buenos_Aires")));
        samples.put(NotificationType.ACCOUNT_ROLE_CHANGED, new Sample("account-role-changed", NotificationLocale.ES,
                Map.of("role", "PARTNER")));
        samples.put(NotificationType.ACCOUNT_SUSPENDED, new Sample("account-suspended", NotificationLocale.ES,
                Map.of("reasonCode", "HARASSMENT")));
        samples.put(NotificationType.ACCOUNT_REINSTATED, new Sample("account-reinstated", NotificationLocale.ES, Map.of()));
        samples.put(NotificationType.SOCIAL_BATCH_READY, new Sample("social-batch-ready", NotificationLocale.ES,
                Map.of("count", "6", "from", "2026-11-02", "to", "2026-11-15")));
        samples.put(NotificationType.SOCIAL_POST_FAILED, new Sample("social-post-failed", NotificationLocale.ES,
                Map.of("postId", "11111111-2222-3333-4444-555555555555", "network", "INSTAGRAM", "error", "TOKEN_INVALID")));
        samples.put(NotificationType.SOCIAL_TIKTOK_DRAFT_WAITING, new Sample("social-tiktok-draft-waiting", NotificationLocale.ES,
                Map.of("postId", "11111111-2222-3333-4444-555555555555")));
        samples.put(NotificationType.SOCIAL_ACCOUNT_RECONNECT, new Sample("social-account-reconnect", NotificationLocale.ES,
                Map.of("network", "THREADS")));
        samples.put(NotificationType.ACCOUNT_DELETED_BY_ADMIN, new Sample("account-deleted-by-admin", NotificationLocale.ES, Map.of()));
        String announcement = "## Vendimia 2026\nLlegan **nuevos vinos** y eventos cerca tuyo. Mirá la [agenda](" + site
                + "/events).\n\n[[Ver eventos]](" + site + "/events)";
        samples.put(NotificationType.NEWSLETTER, new Sample("newsletter", NotificationLocale.ES,
                Map.of(NotificationType.SUBJECT, "Novedades de octubre", NotificationType.BODY, announcement,
                        NotificationType.UNSUBSCRIBE_URL, site + "/unsubscribe?token=demo-unsubscribe")));
        samples.put(NotificationType.SERVICE_NOTICE, new Sample("service-notice", NotificationLocale.ES,
                Map.of(NotificationType.SUBJECT, "Mantenimiento programado", NotificationType.BODY,
                        "El domingo de 2 a 4 h la app puede no estar disponible.\n\nGracias por tu paciencia.")));
        samples.put(NotificationType.ANNOUNCEMENT_TEST, new Sample("announcement-test", NotificationLocale.ES,
                Map.of(NotificationType.KIND, "NEWS", NotificationType.SUBJECT, "Vendimia en Mendoza", NotificationType.BODY,
                        "Catas **todo el mes**.", NotificationType.UNSUBSCRIBE_URL, "https://vinnot.com/unsubscribe")));
        assertThat(samples.keySet()).containsExactlyInAnyOrder(Arrays.stream(NotificationType.values())
                .filter(NotificationType::emails).toArray(NotificationType[]::new));
        for (var entry : samples.entrySet()) {
            var sample = entry.getValue();
            var rendered = registry.render(NotificationRequest.of(entry.getKey(),
                    NotificationRecipient.address("preview@example.test", "Ana & María"), sample.locale(), sample.data(), "preview"));
            assertThat(rendered.html()).contains("lang=\"" + sample.locale().language() + "\"", "alt=\"Vinnot\"");
            assertThat(rendered.text()).contains("\n---\nVinnot\n");
            EmailPreviewFiles.write(sample.name(), rendered.html(), rendered.text());
        }
    }

    private static Map<String, String> withReason(Map<String, String> payment) {
        Map<String, String> data = new HashMap<>(payment);
        data.put("reason", "HTTP_428:insufficient_money_for_refund");
        return data;
    }

    private record Sample(String name, NotificationLocale locale, Map<String, String> data) { }
}

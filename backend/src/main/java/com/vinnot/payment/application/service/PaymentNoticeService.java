package com.vinnot.payment.application.service;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import com.vinnot.payment.application.port.out.EventTimeZones;
import com.vinnot.payment.domain.model.CheckoutSnapshot;
import com.vinnot.payment.domain.model.ProviderPayment;
import com.vinnot.payment.domain.model.RefundIntent;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Payment emails, built from the same checkout snapshot and provider payment the settlement uses. They are
 * queued in the caller's transaction, so a rolled-back settlement sends nothing. Recipients are user ids:
 * delivery uses their current address and language. Each dedupe key names the money movement it reports.
 * The buyer's payment outcomes reach their phone through the registration push; only a chargeback also pushes,
 * to the organizer, outside their quiet hours. A deleted account is never written to: once the buyer's registration
 * or the organizer is gone (see {@link CheckoutSnapshot#linked()}), only whoever still exists is told.
 */
public class PaymentNoticeService {
    /** Who a refund email is written for; templates choose the wording from it. */
    public enum Audience { BUYER, ORGANIZER }

    private final NotificationPort notifications;
    private final EventTimeZones timeZones;
    private final PushNotificationPort pushes;

    public PaymentNoticeService(NotificationPort notifications, EventTimeZones timeZones, PushNotificationPort pushes) {
        this.notifications = notifications;
        this.timeZones = timeZones;
        this.pushes = pushes;
    }

    /** The buyer's receipt for a credited payment; one per payment. */
    public void receipt(CheckoutSnapshot snapshot, ProviderPayment payment) {
        Map<String, String> data = common(snapshot, payment, payment.amount());
        data.put("paidAt", Objects.requireNonNull(payment.approvedAt(), "approvedAt").toString());
        data.put("timeZone", timeZones.of(snapshot.eventId()));
        send(NotificationType.PAYMENT_RECEIPT, snapshot.buyerId(), data, "payment-receipt:" + payment.id());
    }

    /** A refund intent was created for this payment; buyer and organizer are told the amount. */
    public void refundRequested(CheckoutSnapshot snapshot, ProviderPayment payment) {
        toBoth(NotificationType.PAYMENT_REFUND_REQUESTED, snapshot, payment, payment.amount(),
                "payment-refund-requested:" + payment.id());
    }

    /** The provider reports more money returned than before; the key carries the new refunded total. */
    public void refunded(CheckoutSnapshot snapshot, ProviderPayment payment) {
        toBoth(NotificationType.PAYMENT_REFUNDED, snapshot, payment, payment.refundedAmount(),
                "payment-refunded:" + payment.id() + ":" + payment.refundedAmount().toPlainString());
    }

    /** The buyer disputed the payment with their bank; only the organizer is told. */
    public void chargeback(CheckoutSnapshot snapshot, ProviderPayment payment) {
        if (Objects.isNull(snapshot.organizerId())) {
            return;
        }
        String key = "payment-chargeback:" + payment.id();
        send(NotificationType.PAYMENT_CHARGEBACK, snapshot.organizerId(), common(snapshot, payment, payment.amount()), key);
        pushes.push(new PushRequest(NotificationType.PAYMENT_CHARGEBACK, List.of(snapshot.organizerId()),
                Map.of("title", snapshot.title()), key, true));
    }

    /**
     * Mercado Pago definitively rejected the refund, so no money moved; only the organizer is told, once per rejection
     * ({@code rejection} is its number for this intent), with the short reason code and that it can be requested again.
     */
    public void refundRejected(CheckoutSnapshot snapshot, RefundIntent refund, String reason, int rejection) {
        Map<String, String> data = new HashMap<>();
        data.put("title", snapshot.title());
        data.put("amount", refund.amount().toPlainString());
        data.put("currency", snapshot.quote().currency());
        data.put("reference", refund.paymentId());
        putRegistration(data, snapshot);
        data.put("reason", reason);
        send(NotificationType.PAYMENT_REFUND_REJECTED, snapshot.organizerId(), data,
                "payment-refund-rejected:" + refund.paymentId() + ":" + rejection);
    }

    private void toBoth(NotificationType type, CheckoutSnapshot snapshot, ProviderPayment payment, BigDecimal amount,
            String dedupeKey) {
        for (Audience audience : Audience.values()) {
            Map<String, String> data = common(snapshot, payment, amount);
            data.put("audience", audience.name());
            // The buyer's email links to the ticket, so it is only sent while the registration exists.
            UUID recipient = audience == Audience.ORGANIZER ? snapshot.organizerId()
                    : Objects.isNull(snapshot.registrationId()) ? null : snapshot.buyerId();
            send(type, recipient, data, dedupeKey + ":" + audience.name());
        }
    }

    private static Map<String, String> common(CheckoutSnapshot snapshot, ProviderPayment payment, BigDecimal amount) {
        Map<String, String> data = new HashMap<>();
        data.put("title", snapshot.title());
        data.put("amount", amount.toPlainString());
        data.put("currency", payment.currency());
        data.put("reference", payment.id());
        putRegistration(data, snapshot);
        return data;
    }

    private static void putRegistration(Map<String, String> data, CheckoutSnapshot snapshot) {
        if (Objects.nonNull(snapshot.registrationId())) {
            data.put("registrationId", snapshot.registrationId().toString());
        }
    }

    private void send(NotificationType type, UUID recipient, Map<String, String> data, String dedupeKey) {
        if (Objects.isNull(recipient)) {
            return;
        }
        // The locale is only a fallback: user recipients are written in their current language.
        notifications.enqueue(NotificationRequest.of(type, NotificationRecipient.user(recipient), NotificationLocale.ES,
                data, dedupeKey));
    }
}

package com.vinnot.event.domain.valueobject;

/** What a cancelled registration means for the attendee's money. */
public enum CancellationRefund {
    /** Paid online through the platform: reconciliation requests the refund to the same payment method automatically. */
    ONLINE,
    /** Paid to the organizer directly (transfer or reported payment): the organizer arranges the refund. */
    ORGANIZER,
    /** Nothing was paid, or it was to be paid at the venue. */
    NONE;

    public static CancellationRefund of(EventPaymentStatus paymentStatus, boolean externallyManagedPayment) {
        if (paymentStatus == EventPaymentStatus.APPROVED && externallyManagedPayment) {
            return ONLINE;
        }
        if (paymentStatus == EventPaymentStatus.APPROVED || paymentStatus == EventPaymentStatus.REPORTED) {
            return ORGANIZER;
        }
        return NONE;
    }
}

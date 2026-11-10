package com.vinnot.notification.application.model;

/**
 * What happened to one announcement's messages (#490), counted as delivery goes. {@code emailsSent}: emails the
 * provider accepted. {@code emailsFailed}: emails that will not arrive, because the address was suppressed at delivery
 * (an earlier hard bounce or complaint) or the outbox gave up after its last attempt. {@code pushesSent}: accounts with
 * at least one push the provider accepted. {@code pushesFailed}: push messages (one per device) the provider rejected
 * when sent or reported undelivered in their receipt later. {@code pushesOpened}: accounts that opened the push, from
 * app versions that report opens. A job retried after a provider failure may count some messages again, so the counts
 * are close, not exact; like the per-type push metrics.
 */
public record AnnouncementStats(long emailsSent, long emailsFailed, long pushesSent, long pushesFailed, long pushesOpened) {
    /** An announcement nothing was counted for yet. */
    public static final AnnouncementStats NONE = new AnnouncementStats(0, 0, 0, 0, 0);
}

package com.vinnot.notification.domain.model;

import java.time.Duration;
import java.util.Optional;
import java.util.Set;

/**
 * Every notification the platform can send. Adding a type means adding a value here and a template
 * for each locale it supports; the template registry refuses to start while a type that emails has no template.
 * Push-only types have a push template instead.
 */
public enum NotificationType {
    ACCOUNT_EMAIL_VERIFICATION(NotificationCategory.ACCOUNT, Set.of(NotificationType.ACTION_URL), null),
    ACCOUNT_PASSWORD_RESET(NotificationCategory.SECURITY, Set.of(NotificationType.ACTION_URL), null),
    ACCOUNT_EMAIL_CHANGE_CONFIRMATION(NotificationCategory.SECURITY, Set.of(NotificationType.ACTION_URL), null),
    ACCOUNT_EMAIL_CHANGED(NotificationCategory.SECURITY, Set.of(), null),
    /** Sent once, when a new account's email is first verified (dedupe {@code welcome:<userId>}). */
    ACCOUNT_WELCOME(NotificationCategory.ACCOUNT, Set.of(), null),
    /** Security notices: always sent, they cannot be turned off in preferences. */
    ACCOUNT_PASSWORD_CHANGED(NotificationCategory.SECURITY, Set.of(), null),
    /** Data key {@link #PROVIDER}: the identity provider now linked to the account. */
    ACCOUNT_SOCIAL_LINKED(NotificationCategory.SECURITY, Set.of(), null),
    ACCOUNT_DEACTIVATED(NotificationCategory.SECURITY, Set.of(), null),
    /** Sign-in was blocked for a while after too many wrong passwords (#482); dedupe {@code login-locked:<userId>:<untilMillis>}. */
    ACCOUNT_LOGIN_LOCKED(NotificationCategory.SECURITY, Set.of(), null),
    /** Sent to the address captured before the account was deleted. */
    ACCOUNT_DELETED(NotificationCategory.SECURITY, Set.of(), null),
    /** An administrator changed the account's role (#309); data role (the role granted). */
    ACCOUNT_ROLE_CHANGED(NotificationCategory.SECURITY, Set.of(), null),
    /** An administrator suspended the account (#309); reasonCode, optional note (only with OTHER). Sent to the captured address. */
    ACCOUNT_SUSPENDED(NotificationCategory.SECURITY, Set.of(), null),
    /** An administrator lifted the suspension (#309). */
    ACCOUNT_REINSTATED(NotificationCategory.SECURITY, Set.of(), null),
    /** An administrator deleted the account (#309); sent to the address captured before deletion. */
    ACCOUNT_DELETED_BY_ADMIN(NotificationCategory.SECURITY, Set.of(), null),
    /** A new terms revision (#309): version, requiredFrom (when acceptance becomes required) and timeZone. */
    TERMS_UPDATED(NotificationCategory.ACCOUNT, Set.of(), null),
    WINE_SUBMISSION_STATUS(NotificationCategory.SUBMISSIONS, Set.of(), null),
    EVENT_REGISTRATION_ATTENDEE(NotificationCategory.TICKETS, Set.of(), null),
    EVENT_REGISTRATION_ORGANIZER(NotificationCategory.TICKETS, Set.of(), null),
    EVENT_CANCELLED_ORGANIZER_SUMMARY(NotificationCategory.TICKETS, Set.of(), null),
    /** Attendee of a cancelled event: title, startDate, timeZone, reason, optional note, refund (ONLINE/ORGANIZER/NONE). */
    EVENT_CANCELLED_ATTENDEE(NotificationCategory.TICKETS, Set.of(), null),
    /** Confirmed attendee after a date, time or venue change: title, registrationId, timeZone, startDate, endDate, venue; previous* only for what changed. */
    EVENT_CHANGED_ATTENDEE(NotificationCategory.TICKETS, Set.of(), null),
    /** Confirmed attendee, about 24 hours before the event: title, startDate, timeZone, registrationId, optional venue. */
    EVENT_REMINDER(NotificationCategory.TICKETS, Set.of(), null),
    /** Buyer's receipt for a credited payment: title, amount, currency, paidAt, timeZone, reference, registrationId. */
    PAYMENT_RECEIPT(NotificationCategory.TICKETS, Set.of(), null),
    /** Sent to buyer and organizer ({@code audience}) with the amount being returned. */
    PAYMENT_REFUND_REQUESTED(NotificationCategory.TICKETS, Set.of(), null),
    /** Sent to buyer and organizer ({@code audience}) with the refunded total the provider reports. */
    PAYMENT_REFUNDED(NotificationCategory.TICKETS, Set.of(), null),
    /** Sent to the organizer when the buyer's bank reverses the payment. */
    PAYMENT_CHARGEBACK(NotificationCategory.TICKETS, Set.of(), null),
    /**
     * Sent to the organizer each time Mercado Pago definitively rejects a refund (no money moved): title, amount,
     * currency, reference, registrationId and reason (a short status/code token). The refund can be requested again.
     */
    PAYMENT_REFUND_REJECTED(NotificationCategory.TICKETS, Set.of(), null),
    /** The organizer connected a Mercado Pago account to receive event payments (#309). */
    PAYMENT_ACCOUNT_CONNECTED(NotificationCategory.PAYMENTS, Set.of(), null),
    /**
     * Email and push (#309): the organizer must connect Mercado Pago again; reason REVOKED (the grant was withdrawn)
     * or EXPIRED (renewal kept failing until the connection expired). Sent once per connection.
     */
    PAYMENT_ACCOUNT_RECONNECT_REQUIRED(NotificationCategory.PAYMENTS, Set.of(), null),
    /** Push only: a new event was published in the user's area; title, eventId, startDate, timeZone, optional place. */
    EVENT_NEARBY(NotificationCategory.EVENTS_NEARBY, Set.of(), null, false),
    /**
     * A wine matching the user's taste (#306): push only, opens the wine. Sent when a wine is added or featured, it
     * counts toward the engagement budget like the planned pushes below.
     */
    WINE_RECOMMENDATION(NotificationCategory.RECOMMENDATIONS, Set.of(), null, false, false, true),
    /** Engagement (#405), weekly: the best wine for the user's taste they have not rated or kept; wineId, wine, reason. */
    TASTE_PICK(NotificationCategory.RECOMMENDATIONS, Set.of(), null, false, false, true),
    /** Engagement (#405), every 2-3 weeks: a route like the ones the user viewed or of a region or type they like; routeId, route. */
    ROUTE_PICK(NotificationCategory.RECOMMENDATIONS, Set.of(), null, false, false, true),
    /** Engagement (#405): a wine viewed twice or more and not rated, 5-10 days after the last view; wineId, wine. */
    VIEWED_NOT_RATED(NotificationCategory.REMINDERS, Set.of(), null, false, false, true),
    /** Engagement (#405), monthly: a cellar wine still unrated after 30 days; wineId, wine. */
    CELLAR_CHECKIN(NotificationCategory.REMINDERS, Set.of(), null, false, false, true),
    /** Engagement (#405), Thursdays: the weekend's events in the user's area, grouped; count, event, optional eventId. */
    WEEKEND_EVENTS(NotificationCategory.EVENTS_NEARBY, Set.of(), null, false, false, true),
    /** Engagement (#405), every 2-3 weeks: a winery of a region the user likes; wineryId, winery. */
    WINERY_PICK(NotificationCategory.RECOMMENDATIONS, Set.of(), null, false, false, true),
    /** Engagement (#405), once each: step 1 (day 1) scan a label, 2 (day 3) rate three wines, 3 (day 7) a first suggestion. */
    ONBOARDING(NotificationCategory.REMINDERS, Set.of(), null, false, false, true),
    /** Engagement (#405): attempt 1 after 14 days away (the best content), 2 after 30 (what is new), then silence. */
    WINBACK(NotificationCategory.REMINDERS, Set.of(), null, false, false, true),
    /** Engagement (#405): the user's reviews reached a likes milestone or they rated a milestone number of wines. */
    MILESTONE(NotificationCategory.COMMUNITY, Set.of(), null, false, false, true),
    /** Engagement (#405), once: the day after an event the user attended; eventId, event. */
    POST_EVENT(NotificationCategory.REMINDERS, Set.of(), null, false, false, true),
    SUPPORT_REQUEST(NotificationCategory.SUPPORT, Set.of(), Duration.ofDays(7)),
    /** The requester's acknowledgement (#309) at the address they typed: requestId (shown as the reference) and subject. */
    SUPPORT_REQUEST_RECEIVED(NotificationCategory.SUPPORT, Set.of(), Duration.ofDays(7)),
    /** The author learns whether their review or comment was published; kind, status, wineId, wineName, reasonCode, note. */
    REVIEW_PUBLICATION_DECISION(NotificationCategory.MODERATION, Set.of(), null),
    /** A moderator removed the author's review or comment; kind, wineName, optional wineId and reportReason. */
    CONTENT_REMOVED(NotificationCategory.MODERATION, Set.of(), null),
    /** The reporter learns how their report ended; outcome REMOVED, RESOLVED or DISMISSED, targetType, reason. */
    REPORT_OUTCOME(NotificationCategory.MODERATION, Set.of(), null),
    /** New moderation work for staff; submissions and reports counts, optional wineName and reportReason for one item. */
    MODERATION_QUEUE_DIGEST(NotificationCategory.MODERATION, Set.of(), null),
    /** A batch of social posts waits for the owner's approval (#489); count, from and to (Argentina dates). Administrators only. */
    SOCIAL_BATCH_READY(NotificationCategory.MODERATION, Set.of(), null),
    /**
     * A social post failed for good on a network (#510); postId, error (the error code) and network (absent when the post
     * failed before publishing, such as media that never got ready). Administrators only.
     */
    SOCIAL_POST_FAILED(NotificationCategory.MODERATION, Set.of(), null),
    /** A social post waits as a draft in the TikTok inbox to be published by hand in the TikTok app (#510); postId. */
    SOCIAL_TIKTOK_DRAFT_WAITING(NotificationCategory.MODERATION, Set.of(), null),
    /** A connected social account stopped working and must be connected again from the admin (#510); network. */
    SOCIAL_ACCOUNT_RECONNECT(NotificationCategory.MODERATION, Set.of(), null),
    /** Email and push to a review's author when a comment on it is published (#308); commenter, wineId, wineName. */
    REVIEW_COMMENT(NotificationCategory.COMMUNITY, Set.of(), null),
    /** Push only, at most once a day: the likes the member's reviews got that day; likes, reviews, wineId, wineName, optional liker. */
    REVIEW_LIKES_DAILY(NotificationCategory.COMMUNITY, Set.of(), null, false),
    /** Weekly email with the likes the member's reviews got that week; likes, reviews, wineId, wineName, optional liker. */
    REVIEW_LIKES_WEEKLY(NotificationCategory.COMMUNITY, Set.of(), null),
    /** Push only, once per tier (#455): the member's points reached a new wax-seal tier; tier (the tier key). */
    TIER_REACHED(NotificationCategory.COMMUNITY, Set.of(), null, false),
    /** Push only (#541): someone started following the member; followerId and follower (their public name). */
    NEW_FOLLOWER(NotificationCategory.COMMUNITY, Set.of(), null, false),
    /**
     * Promotional news written by an administrator (#310), by email and push: {@link #SUBJECT}, {@link #BODY} in the
     * {@link AnnouncementBody} format and, for the push, an optional in-app {@link #ROUTE}.
     */
    NEWSLETTER(NotificationCategory.NEWSLETTER, Set.of(), null, true, true),
    /**
     * A service notice written by an administrator (#310) for every active account, such as maintenance or an
     * important change; never commercial content. Same data keys as {@link #NEWSLETTER}.
     */
    SERVICE_NOTICE(NotificationCategory.ACCOUNT, Set.of(), null, true, true),
    /**
     * An administrator's test of an announcement, by email and push to their own account only (#310): {@link #KIND}
     * ({@code NEWS} or {@code SERVICE}) plus the data of that kind. Always delivered, it never waits for consent.
     */
    ANNOUNCEMENT_TEST(NotificationCategory.ACCOUNT, Set.of(), null, true, true);

    /** Data key of a single-use account link; it carries a raw token, so it is sealed while queued. */
    public static final String ACTION_URL = "actionUrl";

    /** Data key of {@link #ACCOUNT_SOCIAL_LINKED}: GOOGLE, APPLE or FACEBOOK. */
    public static final String PROVIDER = "provider";

    /** Data keys of a {@link #NEWSLETTER}. */
    public static final String SUBJECT = "subject";
    public static final String BODY = "body";
    /** Data key of an {@link #ANNOUNCEMENT_TEST}: the kind of announcement being tested. */
    public static final String KIND = "kind";
    /** In-app path a pushed announcement opens; {@code /} opens the app. */
    public static final String ROUTE = "route";

    /**
     * Data key of an engagement push: the content it suggests ({@code WINE:<id>}, {@code ROUTE:<id>}, ...), so the same
     * content is never suggested to the same account twice.
     */
    public static final String CONTENT_REF = "contentRef";

    /** Added at delivery to every promotional message: the page where the recipient unsubscribes. */
    public static final String UNSUBSCRIBE_URL = "unsubscribeUrl";

    private final NotificationCategory category;
    private final Set<String> secretDataKeys;
    private final Duration undeliveredRetention;
    private final boolean emails;
    private final boolean keepsRequestLocale;
    private final boolean engagement;

    NotificationType(NotificationCategory category, Set<String> secretDataKeys, Duration undeliveredRetention) {
        this(category, secretDataKeys, undeliveredRetention, true);
    }

    NotificationType(NotificationCategory category, Set<String> secretDataKeys, Duration undeliveredRetention, boolean emails) {
        this(category, secretDataKeys, undeliveredRetention, emails, false);
    }

    NotificationType(NotificationCategory category, Set<String> secretDataKeys, Duration undeliveredRetention, boolean emails,
            boolean keepsRequestLocale) {
        this(category, secretDataKeys, undeliveredRetention, emails, keepsRequestLocale, false);
    }

    NotificationType(NotificationCategory category, Set<String> secretDataKeys, Duration undeliveredRetention, boolean emails,
            boolean keepsRequestLocale, boolean engagement) {
        this.category = category;
        this.secretDataKeys = Set.copyOf(secretDataKeys);
        this.undeliveredRetention = undeliveredRetention;
        this.emails = emails;
        this.keepsRequestLocale = keepsRequestLocale;
        this.engagement = engagement;
    }

    /**
     * Engagement pushes (#405) share one budget: at most 2 per rolling 7 days, 1 per local day and 48 hours apart, with
     * fatigue and holdout rules. Transactional and reactive social pushes are never engagement: they are never blocked
     * by that budget and never count toward it.
     */
    public boolean engagement() {
        return engagement;
    }

    /**
     * Announcements carry an administrator's words in one language, so their email is laid out in that language
     * rather than the account's (#310): a Spanish-only notice never gets an English greeting and footer.
     */
    public boolean keepsRequestLocale() {
        return keepsRequestLocale;
    }

    /** Whether this type is ever sent by email; push-only types are not. */
    public boolean emails() {
        return emails;
    }

    public NotificationCategory category() {
        return category;
    }

    /** Data values that grant account access (for example a reset link); they are never stored in clear. */
    public Set<String> secretDataKeys() {
        return secretDataKeys;
    }

    /** How long an undelivered message may keep its personal data before it is discarded. */
    public Optional<Duration> undeliveredRetention() {
        return Optional.ofNullable(undeliveredRetention);
    }
}

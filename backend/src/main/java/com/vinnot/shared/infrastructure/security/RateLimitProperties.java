package com.vinnot.shared.infrastructure.security;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.Objects;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.security.rate-limit")
public class RateLimitProperties {

    private static final long DEFAULT_MAXIMUM_BUCKETS = 100_000;
    private static final long DEFAULT_CREDENTIAL_LIMIT = 10;
    private static final long DEFAULT_ACCOUNT_ACTION_LIMIT = 5;
    private static final long DEFAULT_REPORT_LIMIT = 10;
    private static final long DEFAULT_REFRESH_LIMIT = 60;
    private static final long DEFAULT_AI_LIMIT = 20;
    private static final long DEFAULT_WINE_SCAN_LIMIT = 30;
    private static final long DEFAULT_WINE_SUBMISSION_LIMIT = 10;
    private static final long DEFAULT_WINE_CATALOG_LIMIT = 60;
    private static final long DEFAULT_PUBLIC_CATALOG_LIMIT = 180;
    private static final long DEFAULT_GENERAL_LIMIT = 300;
    /** A person browsing the catalog never comes close; reaching it locks the account (#431). */
    private static final long DEFAULT_CATALOG_DAILY_LIMIT = 1500;
    /** One Swagger UI page load requests about ten files. */
    private static final long DEFAULT_API_DOCUMENTATION_LIMIT = 30;
    private static final Duration DEFAULT_BUCKET_IDLE_EXPIRATION = Duration.ofHours(25);
    private static final Duration ONE_MINUTE = Duration.ofMinutes(1);
    private static final Duration FIFTEEN_MINUTES = Duration.ofMinutes(15);
    private static final Duration ONE_HOUR = Duration.ofHours(1);
    private static final Duration ONE_DAY = Duration.ofDays(1);

    private boolean enabled = true;
    private boolean trustForwardedFor;
    private long maximumBuckets = DEFAULT_MAXIMUM_BUCKETS;
    private Duration bucketIdleExpiration = DEFAULT_BUCKET_IDLE_EXPIRATION;
    private Limit credential =
            new Limit(DEFAULT_CREDENTIAL_LIMIT, DEFAULT_CREDENTIAL_LIMIT, ONE_MINUTE);
    private Limit accountAction =
            new Limit(DEFAULT_ACCOUNT_ACTION_LIMIT, DEFAULT_ACCOUNT_ACTION_LIMIT, FIFTEEN_MINUTES);
    private Limit registration =
            new Limit(DEFAULT_ACCOUNT_ACTION_LIMIT, DEFAULT_ACCOUNT_ACTION_LIMIT, ONE_HOUR);
    /** Community reports have their own hourly quota so they never use up support requests (#345). */
    private Limit report = new Limit(DEFAULT_REPORT_LIMIT, DEFAULT_REPORT_LIMIT, ONE_HOUR);
    private Limit refresh = new Limit(DEFAULT_REFRESH_LIMIT, DEFAULT_REFRESH_LIMIT, ONE_MINUTE);
    private Limit ai = new Limit(DEFAULT_AI_LIMIT, DEFAULT_AI_LIMIT, ONE_HOUR);
    private Limit wineScan = new Limit(
            DEFAULT_WINE_SCAN_LIMIT, DEFAULT_WINE_SCAN_LIMIT, ONE_HOUR);
    private Limit wineSubmission = new Limit(
            DEFAULT_WINE_SUBMISSION_LIMIT, DEFAULT_WINE_SUBMISSION_LIMIT, ONE_DAY);
    private Limit wineCatalog =
            new Limit(DEFAULT_WINE_CATALOG_LIMIT, DEFAULT_WINE_CATALOG_LIMIT, ONE_MINUTE);
    private Limit publicCatalog =
            new Limit(DEFAULT_PUBLIC_CATALOG_LIMIT, DEFAULT_PUBLIC_CATALOG_LIMIT, ONE_MINUTE);
    private Limit wineCatalogDaily =
            new Limit(DEFAULT_CATALOG_DAILY_LIMIT, DEFAULT_CATALOG_DAILY_LIMIT, ONE_DAY);
    private Limit publicCatalogDaily =
            new Limit(DEFAULT_CATALOG_DAILY_LIMIT, DEFAULT_CATALOG_DAILY_LIMIT, ONE_DAY);
    private Limit apiDocumentation = new Limit(
            DEFAULT_API_DOCUMENTATION_LIMIT, DEFAULT_API_DOCUMENTATION_LIMIT, ONE_MINUTE);
    private Limit general = new Limit(DEFAULT_GENERAL_LIMIT, DEFAULT_GENERAL_LIMIT, ONE_MINUTE);

    public RateLimitPolicy toPolicy(String name, Limit limit) {
        return new RateLimitPolicy(
                name, limit.getCapacity(), limit.getRefillTokens(), limit.getRefillPeriod());
    }

    /**
     * Prevents cache eviction from silently resetting a quota before its
     * longest configured refill window has elapsed.
     */
    public Duration requireSafeBucketIdleExpiration() {
        if (Objects.isNull(bucketIdleExpiration)
                || bucketIdleExpiration.isZero()
                || bucketIdleExpiration.isNegative()) {
            throw new IllegalStateException(
                    "Rate-limit bucket idle expiration must be positive");
        }
        Duration longestRefillPeriod = List.of(
                        credential,
                        accountAction,
                        registration,
                        report,
                        refresh,
                        ai,
                        wineScan,
                        wineSubmission,
                        wineCatalog,
                        publicCatalog,
                        wineCatalogDaily,
                        publicCatalogDaily,
                        apiDocumentation,
                        general)
                .stream()
                .map(Limit::getRefillPeriod)
                .max(Duration::compareTo)
                .orElseThrow();
        if (bucketIdleExpiration.compareTo(longestRefillPeriod) < 0) {
            throw new IllegalStateException(
                    "Rate-limit bucket idle expiration must be at least as long as "
                            + "the longest refill period");
        }
        return bucketIdleExpiration;
    }

    @Getter
    @Setter
    public static class Limit {

        private long capacity;
        private long refillTokens;
        private Duration refillPeriod;

        public Limit() {
        }

        public Limit(long capacity, long refillTokens, Duration refillPeriod) {
            this.capacity = capacity;
            this.refillTokens = refillTokens;
            this.refillPeriod = refillPeriod;
        }
    }
}

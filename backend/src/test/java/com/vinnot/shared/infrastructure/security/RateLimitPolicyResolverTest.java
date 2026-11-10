package com.vinnot.shared.infrastructure.security;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitPolicyResolverTest {

    private final RateLimitPolicyResolver resolver =
            new RateLimitPolicyResolver(new RateLimitProperties());

    @Test
    void selectsDedicatedPoliciesForSensitiveEndpoints() {
        assertThat(resolver.resolve("POST", "/payments/mercadopago/connection/callback").name()).isEqualTo("account-action");
        assertThat(resolver.resolve("POST", "/auth/login").name()).isEqualTo("credential");
        assertThat(resolver.resolve("POST", "/auth/social").name()).isEqualTo("credential");
        assertThat(resolver.resolve("POST", "/auth/register").name()).isEqualTo("registration");
        assertThat(resolver.resolve("POST", "/support/requests").name()).isEqualTo("support");
        assertThat(resolver.resolve("GET", "/support/requests").name()).isEqualTo("general");
        assertThat(resolver.resolve("POST", "/community/reports").name()).isEqualTo("report");
        assertThat(resolver.resolve("POST", "/community/reports").capacity()).isEqualTo(10);
        assertThat(resolver.resolve("POST", "/community/reports").refillPeriod()).isEqualTo(Duration.ofHours(1));
        assertThat(resolver.resolve("GET", "/community/reports").name()).isEqualTo("general");
        assertThat(resolver.resolve("POST", "/auth/refresh").name()).isEqualTo("refresh");
        assertThat(resolver.resolve("POST", "/auth/forgot-password").name())
                .isEqualTo("account-action");
        assertThat(resolver.resolve("POST", "/users/me/change-password").name())
                .isEqualTo("account-action");
        assertThat(resolver.resolve("POST", "/users/me/email-change").name())
                .isEqualTo("account-action");
        assertThat(resolver.resolve("DELETE", "/users/me").name())
                .isEqualTo("account-action");
        assertThat(resolver.resolve("DELETE", "/users/me/permanent").name())
                .isEqualTo("account-action");
        assertThat(resolver.resolve("PATCH", "/users/me").name()).isEqualTo("general");
    }

    @Test
    void selectsAiAndPublicCatalogPoliciesBeforeGeneralPolicy() {
        assertThat(resolver.resolve("POST", "/wines/compare").name()).isEqualTo("ai");
        assertThat(resolver.resolve("POST", "/wines/scan").name())
                .isEqualTo("wine-scan");
        assertThat(resolver.resolve("POST", "/wines/submissions").name())
                .isEqualTo("wine-submission");
        assertThat(resolver.resolve("POST", "/wines/123/label-image").name())
                .isEqualTo("wine-submission");
        assertThat(resolver.resolve("POST", "/wines/123/ai-profile").name()).isEqualTo("ai");
        assertThat(resolver.resolve("POST", "/wines/123/ai-profile/generate").name()).isEqualTo("ai");
        assertThat(resolver.resolve("GET", "/wines/123/ai-profile").name())
                .isEqualTo("wine-catalog");
        assertThat(resolver.resolve("GET", "/wines/123/ai-profile/status").name())
                .isEqualTo("wine-catalog");
        assertThat(resolver.resolve("GET", "/wines").name()).isEqualTo("wine-catalog");
        assertThat(resolver.resolve("GET", "/wines/123").name()).isEqualTo("wine-catalog");
        assertThat(resolver.resolve("GET", "/wineries").name()).isEqualTo("public-catalog");
        assertThat(resolver.resolve("GET", "/events/123").name()).isEqualTo("public-catalog");
        assertThat(resolver.resolve("POST", "/events").name()).isEqualTo("general");
    }
    @Test
    void coverUploadHasItsOwnBoundedProcessingBucketWithoutChangingOtherPolicies() {
        var resolver = new RateLimitPolicyResolver(new RateLimitProperties());
        assertThat(resolver.resolve("POST", "/uploads/covers").name()).isEqualTo("media-upload");
        assertThat(resolver.resolve("GET", "/uploads/covers/id.webp").name()).isEqualTo("general");
        assertThat(resolver.resolve("POST", "/wines/submissions").name()).isEqualTo("wine-submission");
    }

    @Test
    void appliesADailyQuotaOnlyToCatalogReads() {
        RateLimitPolicy wines = resolver.resolve("GET", "/wines");
        RateLimitPolicy wineries = resolver.resolve("GET", "/wineries");

        assertThat(resolver.resolveDailyQuota(wines, "/wines")).get()
                .satisfies(daily -> {
                    assertThat(daily.name()).isEqualTo("wine-catalog-daily");
                    assertThat(daily.capacity()).isEqualTo(1500);
                    assertThat(daily.refillPeriod()).isEqualTo(Duration.ofDays(1));
                });
        assertThat(resolver.resolveDailyQuota(wineries, "/wineries")).get()
                .extracting(RateLimitPolicy::name).isEqualTo("public-catalog-daily");
        assertThat(resolver.resolveDailyQuota(resolver.resolve("POST", "/auth/login"), "/auth/login")).isEmpty();
        assertThat(resolver.resolveDailyQuota(resolver.resolve("PATCH", "/users/me"), "/users/me")).isEmpty();
    }

    @Test
    void neverCountsTheCallersOwnDataAgainstTheDailyQuota() {
        String registration = "/events/" + java.util.UUID.randomUUID() + "/registrations/me";
        String ownReview = "/wines/" + java.util.UUID.randomUUID() + "/reviews/mine";

        assertThat(resolver.resolveDailyQuota(resolver.resolve("GET", registration), registration)).isEmpty();
        assertThat(resolver.resolveDailyQuota(resolver.resolve("GET", ownReview), ownReview)).isEmpty();
        assertThat(resolver.resolveDailyQuota(resolver.resolve("GET", "/wines/mineral"), "/wines/mineral")).isPresent();
    }

    @Test
    void limitsApiDocumentationPathsWithTheirOwnPolicy() {
        assertThat(resolver.resolve("GET", "/swagger-ui/index.html").name()).isEqualTo("api-documentation");
        assertThat(resolver.resolve("GET", "/swagger-ui.html").name()).isEqualTo("api-documentation");
        assertThat(resolver.resolve("GET", "/api-docs").name()).isEqualTo("api-documentation");
        assertThat(resolver.resolve("GET", "/api-docs/swagger-config").name()).isEqualTo("api-documentation");
        assertThat(resolver.resolve("GET", "/api-docs.yaml").name()).isEqualTo("api-documentation");
        assertThat(resolver.resolve("GET", "/webjars/swagger-ui/index.html").name()).isEqualTo("api-documentation");
        assertThat(resolver.resolve("GET", "/api-docs").capacity()).isEqualTo(30);
        assertThat(resolver.resolveDailyQuota(resolver.resolve("GET", "/api-docs"), "/api-docs")).isEmpty();
    }
}

package com.vinnot.shared.infrastructure.security;

import com.vinnot.shared.application.port.AutomatedAccountSuspensionPort;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RateLimitingFilterTest {

    private static final UUID USER_ID = UUID.fromString("7a1c4f0e-2b9d-4c8e-9f31-5d6e7a8b9c01");

    private final List<UUID> suspended = new ArrayList<>();
    private final AutomatedAccountSuspensionPort suspensions = suspended::add;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void returnsStructuredTooManyRequestsResponseAfterCapacityIsConsumed() throws Exception {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setCredential(new RateLimitProperties.Limit(1, 1, Duration.ofHours(1)));
        ObjectMapper objectMapper = new ObjectMapper();
        RateLimitingFilter filter = filter(properties, objectMapper);

        MockHttpServletResponse firstResponse = execute(filter);
        MockHttpServletResponse secondResponse = execute(filter);

        assertThat(firstResponse.getStatus()).isEqualTo(200);
        assertThat(firstResponse.getHeader("X-RateLimit-Limit")).isEqualTo("1");
        assertThat(firstResponse.getHeader("X-RateLimit-Remaining")).isEqualTo("0");

        assertThat(secondResponse.getStatus()).isEqualTo(429);
        assertThat(secondResponse.getHeader("Retry-After")).isNotBlank();
        JsonNode body = objectMapper.readTree(secondResponse.getContentAsString());
        assertThat(body.get("code").asText()).isEqualTo("RATE_LIMIT_EXCEEDED");
        assertThat(body.get("path").asText()).isEqualTo("/api/auth/login");
        assertThat(suspended).as("credential limits never lock an account").isEmpty();
    }

    @Test
    void rejectsBucketRetentionShorterThanAConfiguredQuotaWindow() {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setBucketIdleExpiration(Duration.ofMinutes(30));

        assertThatThrownBy(() -> filter(properties, new ObjectMapper()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("longest refill period");
    }

    @Test
    void rejectsBucketRetentionShorterThanTheDailyCatalogQuota() {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setBucketIdleExpiration(Duration.ofHours(23));

        assertThatThrownBy(() -> filter(properties, new ObjectMapper()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("longest refill period");
    }

    @Test
    void reportsAndSupportRequestsSpendSeparateQuotas() throws Exception {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setRegistration(new RateLimitProperties.Limit(1, 1, Duration.ofHours(1)));
        RateLimitingFilter filter = filter(properties, new ObjectMapper());

        MockHttpServletResponse report = execute(filter, "POST", "/api/community/reports");
        MockHttpServletResponse firstSupport = execute(filter, "POST", "/api/support/requests");
        MockHttpServletResponse secondSupport = execute(filter, "POST", "/api/support/requests");

        assertThat(report.getStatus()).isEqualTo(200);
        assertThat(firstSupport.getStatus()).as("a report never spends the support quota").isEqualTo(200);
        assertThat(secondSupport.getStatus()).as("support keeps its own quota").isEqualTo(429);
    }

    @Test
    void locksASignedInAccountThatExhaustsTheDailyCatalogQuota() throws Exception {
        RateLimitProperties properties = dailyCatalogQuotaOf(2);
        ObjectMapper objectMapper = new ObjectMapper();
        RateLimitingFilter filter = filter(properties, objectMapper);
        signIn("ROLE_USER");

        MockHttpServletResponse first = execute(filter, "GET", "/api/wines");
        MockHttpServletResponse second = execute(filter, "GET", "/api/wines/" + UUID.randomUUID());
        MockHttpServletResponse third = execute(filter, "GET", "/api/wines");

        assertThat(first.getStatus()).isEqualTo(200);
        assertThat(second.getStatus()).isEqualTo(200);
        assertThat(third.getStatus()).isEqualTo(429);
        assertThat(third.getHeader("Retry-After")).isNotBlank();
        assertThat(objectMapper.readTree(third.getContentAsString()).get("code").asText())
                .isEqualTo("RATE_LIMIT_EXCEEDED");
        assertThat(suspended).containsExactly(USER_ID);
    }

    @Test
    void anUnlockedAccountStartsAFreshDailyQuota() throws Exception {
        RateLimitingFilter filter = filter(dailyCatalogQuotaOf(1), new ObjectMapper());
        signIn("ROLE_USER");

        execute(filter, "GET", "/api/wines");
        execute(filter, "GET", "/api/wines");
        MockHttpServletResponse afterUnlock = execute(filter, "GET", "/api/wines");

        assertThat(suspended).containsExactly(USER_ID);
        assertThat(afterUnlock.getStatus())
                .as("an admin unlock must not be undone by the old exhausted quota")
                .isEqualTo(200);
    }

    @Test
    void theWineryListingSharesTheDailyPublicCatalogQuota() throws Exception {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setPublicCatalogDaily(new RateLimitProperties.Limit(1, 1, Duration.ofDays(1)));
        RateLimitingFilter filter = filter(properties, new ObjectMapper());
        signIn("ROLE_USER");

        MockHttpServletResponse first = execute(filter, "GET", "/api/wineries");
        MockHttpServletResponse second = execute(filter, "GET", "/api/events");

        assertThat(first.getStatus()).isEqualTo(200);
        assertThat(second.getStatus()).isEqualTo(429);
        assertThat(suspended).containsExactly(USER_ID);
    }

    @Test
    void pollingTheOwnEventRegistrationNeverLocksTheAccount() throws Exception {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setPublicCatalogDaily(new RateLimitProperties.Limit(1, 1, Duration.ofDays(1)));
        RateLimitingFilter filter = filter(properties, new ObjectMapper());
        signIn("ROLE_USER");
        String registration = "/api/events/" + UUID.randomUUID() + "/registrations/me";

        for (int poll = 0; poll < 5; poll++) {
            assertThat(execute(filter, "GET", registration).getStatus()).isEqualTo(200);
        }
        assertThat(suspended).isEmpty();
    }

    @Test
    void aConcurrentLockConflictStillRejectsWithoutFailingTheRequest() throws Exception {
        AutomatedAccountSuspensionPort racing = userId -> {
            throw new org.springframework.orm.ObjectOptimisticLockingFailureException("User", userId);
        };
        RateLimitProperties properties = dailyCatalogQuotaOf(1);
        RateLimitingFilter filter = new RateLimitingFilter(
                properties, new RateLimitPolicyResolver(properties),
                new RateLimitClientResolver(properties), new ObjectMapper(), racing);
        signIn("ROLE_USER");

        execute(filter, "GET", "/api/wines");
        assertThat(execute(filter, "GET", "/api/wines").getStatus()).isEqualTo(429);
    }

    @Test
    void administratorsAndModeratorsAreExemptFromTheDailyCatalogQuota() throws Exception {
        for (String role : List.of("ROLE_ADMIN", "ROLE_MODERATOR")) {
            RateLimitingFilter filter = filter(dailyCatalogQuotaOf(1), new ObjectMapper());
            signIn(role);

            MockHttpServletResponse first = execute(filter, "GET", "/api/wines");
            MockHttpServletResponse second = execute(filter, "GET", "/api/wines");

            assertThat(first.getStatus()).isEqualTo(200);
            assertThat(second.getStatus()).as(role).isEqualTo(200);
        }
        assertThat(suspended).isEmpty();
    }

    @Test
    void anonymousClientsOnlyReceiveTooManyRequestsWhenTheDailyQuotaRunsOut() throws Exception {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setPublicCatalogDaily(new RateLimitProperties.Limit(1, 1, Duration.ofDays(1)));
        RateLimitingFilter filter = filter(properties, new ObjectMapper());

        MockHttpServletResponse first = execute(filter, "GET", "/api/share/wine/abc");
        MockHttpServletResponse second = execute(filter, "GET", "/api/share/wine/abc");

        assertThat(first.getStatus()).isEqualTo(200);
        assertThat(second.getStatus()).isEqualTo(429);
        assertThat(suspended).isEmpty();
    }

    @Test
    void theMinuteLimitAloneNeverLocksAnAccount() throws Exception {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setWineCatalog(new RateLimitProperties.Limit(1, 1, Duration.ofMinutes(1)));
        RateLimitingFilter filter = filter(properties, new ObjectMapper());
        signIn("ROLE_USER");

        execute(filter, "GET", "/api/wines");
        MockHttpServletResponse second = execute(filter, "GET", "/api/wines");

        assertThat(second.getStatus()).isEqualTo(429);
        assertThat(suspended).isEmpty();
    }

    @Test
    void stillRejectsTheRequestWhenTheAutomaticLockFails() throws Exception {
        AutomatedAccountSuspensionPort failing = userId -> {
            throw new IllegalStateException("database unavailable");
        };
        RateLimitProperties properties = dailyCatalogQuotaOf(1);
        RateLimitingFilter filter = new RateLimitingFilter(
                properties, new RateLimitPolicyResolver(properties),
                new RateLimitClientResolver(properties), new ObjectMapper(), failing);
        signIn("ROLE_USER");

        execute(filter, "GET", "/api/wines");
        MockHttpServletResponse second = execute(filter, "GET", "/api/wines");

        assertThat(second.getStatus()).isEqualTo(429);
    }

    @Test
    void rateLimitsApiDocumentationPerAddress() throws Exception {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setApiDocumentation(new RateLimitProperties.Limit(1, 1, Duration.ofMinutes(1)));
        RateLimitingFilter filter = filter(properties, new ObjectMapper());

        MockHttpServletResponse first = execute(filter, "GET", "/api/swagger-ui/index.html");
        MockHttpServletResponse second = execute(filter, "GET", "/api/api-docs");

        assertThat(first.getStatus()).isEqualTo(200);
        assertThat(second.getStatus()).isEqualTo(429);
    }

    @Test
    void healthAndVersionStayOutsideRateLimiting() throws Exception {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setGeneral(new RateLimitProperties.Limit(1, 1, Duration.ofMinutes(1)));
        RateLimitingFilter filter = filter(properties, new ObjectMapper());

        for (int attempt = 0; attempt < 3; attempt++) {
            assertThat(execute(filter, "GET", "/api/health").getStatus()).isEqualTo(200);
            assertThat(execute(filter, "GET", "/api/version").getStatus()).isEqualTo(200);
        }
    }

    private RateLimitProperties dailyCatalogQuotaOf(long capacity) {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setWineCatalogDaily(new RateLimitProperties.Limit(capacity, capacity, Duration.ofDays(1)));
        return properties;
    }

    private RateLimitingFilter filter(RateLimitProperties properties, ObjectMapper objectMapper) {
        return new RateLimitingFilter(
                properties,
                new RateLimitPolicyResolver(properties),
                new RateLimitClientResolver(properties),
                objectMapper,
                suspensions);
    }

    private void signIn(String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                USER_ID.toString(), null, List.of(new SimpleGrantedAuthority(role))));
    }

    private MockHttpServletResponse execute(RateLimitingFilter filter) throws Exception {
        return execute(filter, "POST", "/api/auth/login");
    }

    private MockHttpServletResponse execute(RateLimitingFilter filter, String method, String uri) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        request.setContextPath("/api");
        request.setRemoteAddr("203.0.113.7");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }
}

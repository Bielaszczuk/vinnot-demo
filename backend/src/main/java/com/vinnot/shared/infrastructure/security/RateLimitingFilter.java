package com.vinnot.shared.infrastructure.security;

import com.vinnot.shared.application.port.AutomatedAccountSuspensionPort;
import tools.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(RateLimitingFilter.class);
    private static final String USER_CLIENT_PREFIX = "user:";
    /** Staff browse the catalog to moderate it, so the daily quota never applies to them. */
    private static final Set<String> QUOTA_EXEMPT_AUTHORITIES = Set.of("ROLE_ADMIN", "ROLE_MODERATOR");

    private final RateLimitProperties properties;
    private final RateLimitPolicyResolver policyResolver;
    private final RateLimitClientResolver clientResolver;
    private final ObjectMapper objectMapper;
    private final AutomatedAccountSuspensionPort suspensions;
    private final Cache<String, Bucket> buckets;

    public RateLimitingFilter(
            RateLimitProperties properties,
            RateLimitPolicyResolver policyResolver,
            RateLimitClientResolver clientResolver,
            ObjectMapper objectMapper,
            AutomatedAccountSuspensionPort suspensions) {
        this.properties = properties;
        this.policyResolver = policyResolver;
        this.clientResolver = clientResolver;
        this.objectMapper = objectMapper;
        this.suspensions = suspensions;
        this.buckets = Caffeine.newBuilder()
                .maximumSize(properties.getMaximumBuckets())
                .expireAfterAccess(properties.requireSafeBucketIdleExpiration())
                .build();
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String path = pathWithinApplication(request);
        RateLimitPolicy policy = policyResolver.resolve(request.getMethod(), path);
        String client = clientResolver.resolve(request);
        Bucket bucket = buckets.get(policy.name() + ":" + client, ignored -> createBucket(policy));
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        response.setHeader("X-RateLimit-Limit", Long.toString(policy.capacity()));
        response.setHeader("X-RateLimit-Remaining", Long.toString(probe.getRemainingTokens()));

        if (!probe.isConsumed()) {
            reject(request, response, policy, client, path, probe);
            return;
        }

        Optional<RateLimitPolicy> dailyQuota = policyResolver.resolveDailyQuota(policy, path)
                .filter(ignored -> !isQuotaExempt());
        if (dailyQuota.isPresent()) {
            RateLimitPolicy daily = dailyQuota.get();
            String dailyKey = daily.name() + ":" + client;
            ConsumptionProbe dailyProbe = buckets.get(dailyKey, ignored -> createBucket(daily))
                    .tryConsumeAndReturnRemaining(1);
            if (!dailyProbe.isConsumed()) {
                suspendScrapingAccount(client, dailyKey);
                reject(request, response, daily, client, path, dailyProbe);
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    /**
     * Only an account can be locked; an exhausted anonymous address just keeps
     * receiving 429. The quota is reset so that an admin unlock starts clean.
     */
    private void suspendScrapingAccount(String client, String dailyKey) {
        if (!client.startsWith(USER_CLIENT_PREFIX)) {
            return;
        }
        UUID userId;
        try {
            userId = UUID.fromString(client.substring(USER_CLIENT_PREFIX.length()));
        } catch (IllegalArgumentException invalidPrincipal) {
            return;
        }
        try {
            suspensions.suspendForCatalogScraping(userId);
            buckets.invalidate(dailyKey);
            LOGGER.warn("Daily catalog quota exhausted; account locked: client={}", client);
        } catch (OptimisticLockingFailureException concurrentLock) {
            // A parallel request of the same burst is locking the account at this moment.
            LOGGER.warn("Daily catalog quota exhausted; lock already in progress: client={}", client);
        } catch (RuntimeException failure) {
            LOGGER.error("Daily catalog quota exhausted but the account could not be locked: client={}",
                    client, failure);
        }
    }

    private boolean isQuotaExempt() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return Objects.nonNull(authentication)
                && authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(QUOTA_EXEMPT_AUTHORITIES::contains);
    }

    private void reject(
            HttpServletRequest request,
            HttpServletResponse response,
            RateLimitPolicy policy,
            String client,
            String path,
            ConsumptionProbe probe) throws IOException {
        long retryAfterSeconds = Math.max(
                1, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()) + 1);
        response.setHeader("X-RateLimit-Limit", Long.toString(policy.capacity()));
        response.setHeader("X-RateLimit-Remaining", Long.toString(probe.getRemainingTokens()));
        response.setHeader("Retry-After", Long.toString(retryAfterSeconds));
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        Map<String, Object> error = new LinkedHashMap<>();
        error.put("timestamp", Instant.now());
        error.put("path", request.getRequestURI());
        error.put("status", HttpStatus.TOO_MANY_REQUESTS.value());
        error.put("code", "RATE_LIMIT_EXCEEDED");
        error.put("message", "Too many requests. Please retry later");
        error.put("details", null);
        objectMapper.writeValue(response.getWriter(), error);

        LOGGER.warn(
                "Rate limit exceeded: policy={} client={} method={} path={} retryAfterSeconds={}",
                policy.name(), client, request.getMethod(), path, retryAfterSeconds);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!properties.isEnabled() || "OPTIONS".equals(request.getMethod())) {
            return true;
        }
        String path = pathWithinApplication(request);
        return path.equals("/health")
                || path.equals("/version")
                || path.equals("/actuator/health");
    }

    private Bucket createBucket(RateLimitPolicy policy) {
        Bandwidth bandwidth = Bandwidth.builder()
                .capacity(policy.capacity())
                .refillGreedy(policy.refillTokens(), policy.refillPeriod())
                .build();
        return Bucket.builder().addLimit(bandwidth).build();
    }

    private String pathWithinApplication(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (!contextPath.isBlank() && uri.startsWith(contextPath)) {
            return uri.substring(contextPath.length());
        }
        return uri;
    }
}

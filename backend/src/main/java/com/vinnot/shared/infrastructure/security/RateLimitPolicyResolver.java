package com.vinnot.shared.infrastructure.security;

import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public class RateLimitPolicyResolver {

    private static final Set<String> CREDENTIAL_PATHS = Set.of(
            "/auth/login",
            "/auth/social",
            "/auth/web/login",
            "/auth/reauthenticate",
            "/auth/web/social"
    );
    private static final Set<String> ACCOUNT_ACTION_PATHS = Set.of(
            "/auth/forgot-password",
            "/auth/reset-password",
            "/auth/reset-password/validate",
            "/auth/verify-email",
            "/auth/resend-verification",
            "/auth/email-change/confirm",
            "/users/me/change-password",
            "/users/me/email-change",
            "/users/me/permanent"
    );

    private static final Pattern OWN_DATA_PATH = Pattern.compile(".*/(me|mine)(/.*)?");

    private final RateLimitPolicy credential;
    private final RateLimitPolicy accountAction;
    private final RateLimitPolicy registration;
    private final RateLimitPolicy support;
    private final RateLimitPolicy report;
    private final RateLimitPolicy refresh;
    private final RateLimitPolicy ai;
    private final RateLimitPolicy wineScan;
    private final RateLimitPolicy wineSubmission;
    private final RateLimitPolicy mediaUpload;
    private final RateLimitPolicy wineCatalog;
    private final RateLimitPolicy publicCatalog;
    private final RateLimitPolicy wineCatalogDaily;
    private final RateLimitPolicy publicCatalogDaily;
    private final RateLimitPolicy apiDocumentation;
    private final RateLimitPolicy general;

    public RateLimitPolicyResolver(RateLimitProperties properties) {
        this.credential = properties.toPolicy("credential", properties.getCredential());
        this.accountAction = properties.toPolicy("account-action", properties.getAccountAction());
        this.registration = properties.toPolicy("registration", properties.getRegistration());
        this.support = properties.toPolicy("support", properties.getRegistration());
        this.report = properties.toPolicy("report", properties.getReport());
        this.refresh = properties.toPolicy("refresh", properties.getRefresh());
        this.ai = properties.toPolicy("ai", properties.getAi());
        this.wineScan = properties.toPolicy("wine-scan", properties.getWineScan());
        this.wineSubmission = properties.toPolicy(
                "wine-submission", properties.getWineSubmission());
        this.mediaUpload = properties.toPolicy("media-upload", properties.getWineSubmission());
        this.wineCatalog = properties.toPolicy(
                "wine-catalog", properties.getWineCatalog());
        this.publicCatalog = properties.toPolicy(
                "public-catalog", properties.getPublicCatalog());
        this.wineCatalogDaily = properties.toPolicy(
                "wine-catalog-daily", properties.getWineCatalogDaily());
        this.publicCatalogDaily = properties.toPolicy(
                "public-catalog-daily", properties.getPublicCatalogDaily());
        this.apiDocumentation = properties.toPolicy(
                "api-documentation", properties.getApiDocumentation());
        this.general = properties.toPolicy("general", properties.getGeneral());
    }

    public RateLimitPolicy resolve(String method, String path) {
        if (isApiDocumentationPath(path)) {
            return apiDocumentation;
        }
        if (CREDENTIAL_PATHS.contains(path)) {
            return credential;
        }
        if (HttpMethod.POST.matches(method) && "/support/requests".equals(path)) {
            return support;
        }
        if (HttpMethod.POST.matches(method) && "/community/reports".equals(path)) {
            return report;
        }
        if (ACCOUNT_ACTION_PATHS.contains(path)
                || (HttpMethod.DELETE.matches(method) && "/users/me".equals(path))) {
            return accountAction;
        }
        if (HttpMethod.POST.matches(method) && "/payments/mercadopago/connection/callback".equals(path)) {
            return accountAction;
        }
        if ("/auth/register".equals(path)) {
            return registration;
        }
        if ("/auth/refresh".equals(path) || "/auth/web/refresh".equals(path)) {
            return refresh;
        }
        if ("/wines/scan".equals(path)) {
            return wineScan;
        }
        if (HttpMethod.POST.matches(method) && "/uploads/covers".equals(path)) {
            return mediaUpload;
        }
        if ("/wines/submissions".equals(path)
                && HttpMethod.POST.matches(method)) {
            return wineSubmission;
        }
        if (HttpMethod.POST.matches(method)
                && path.matches("/wines/[^/]+/label-image")) {
            return wineSubmission;
        }
        if (isAiGenerationPath(method, path)) {
            return ai;
        }
        if (HttpMethod.GET.matches(method) && isWineCatalogPath(path)) {
            return wineCatalog;
        }
        if ((HttpMethod.GET.matches(method) || HttpMethod.HEAD.matches(method))
                && (path.equals("/share") || path.startsWith("/share/") || isPublicCatalogPath(path))) {
            return publicCatalog;
        }
        return general;
    }

    /**
     * Returns the daily quota that applies on top of a per-minute catalog
     * policy, so a single account cannot walk the whole catalog in one day.
     * The caller's own data (`.../me`, `.../mine`, such as a registration the
     * web polls while a payment is pending) is not catalog and never counts.
     */
    public Optional<RateLimitPolicy> resolveDailyQuota(RateLimitPolicy policy, String path) {
        if (isOwnDataPath(path)) {
            return Optional.empty();
        }
        if (policy == wineCatalog) {
            return Optional.of(wineCatalogDaily);
        }
        if (policy == publicCatalog) {
            return Optional.of(publicCatalogDaily);
        }
        return Optional.empty();
    }

    private boolean isOwnDataPath(String path) {
        return OWN_DATA_PATH.matcher(path).matches();
    }

    private boolean isApiDocumentationPath(String path) {
        return path.equals("/swagger-ui.html")
                || path.startsWith("/swagger-ui/")
                || path.startsWith("/webjars/swagger-ui/")
                || path.equals("/api-docs")
                || path.equals("/api-docs.yaml")
                || path.startsWith("/api-docs/");
    }

    private boolean isAiGenerationPath(String method, String path) {
        return HttpMethod.POST.matches(method)
                && ("/wines/compare".equals(path)
                || path.matches("/wines/[^/]+/ai-profile(?:/generate)?"));
    }

    private boolean isWineCatalogPath(String path) {
        return path.equals("/wines") || path.startsWith("/wines/");
    }

    private boolean isPublicCatalogPath(String path) {
        return path.equals("/wineries")
                || path.startsWith("/wineries/")
                || path.equals("/events")
                || path.startsWith("/events/")
                || path.equals("/wine-routes")
                || path.startsWith("/wine-routes/");
    }
}

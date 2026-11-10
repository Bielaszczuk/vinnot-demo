package com.vinnot.legal.infrastructure.web;

import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.UUID;
import java.util.Objects;

/** Opt-in enforcement. Authentication, legal information, account exit and the app update policy stay reachable. */
@Configuration
public class LegalAccessConfiguration implements WebMvcConfigurer, HandlerInterceptor {
    private final LegalAgreementUseCase agreements;

    public LegalAccessConfiguration(LegalAgreementUseCase agreements) {
        this.agreements = agreements;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(this).excludePathPatterns(
                "/auth/**", "/legal/**", "/support/**", "/notifications/unsubscribe", "/error", "/health", "/version",
                "/actuator/**", "/api-docs/**", "/swagger-ui/**", "/uploads/**", "/app-versions/**");
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!agreements.enforcementEnabled() || Objects.isNull(authentication) || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken || "OPTIONS".equals(request.getMethod())) {
            return true;
        }
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if ("DELETE".equals(request.getMethod())
                && ("/users/me".equals(path) || "/users/me/permanent".equals(path))) {
            return true;
        }
        UUID userId = UUID.fromString(authentication.getName());
        if (agreements.status(userId, "es").required()) {
            throw new BusinessRuleViolationException("TERMS_ACCEPTANCE_REQUIRED", "Review and accept the current terms to continue");
        }
        return true;
    }
}

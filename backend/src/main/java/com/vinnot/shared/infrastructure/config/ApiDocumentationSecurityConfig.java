package com.vinnot.shared.infrastructure.config;

import com.vinnot.shared.application.port.ApiDocumentationAccessPort;
import com.vinnot.shared.infrastructure.security.RateLimitingFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

import java.util.List;
import java.util.Objects;

/**
 * Swagger UI and the OpenAPI spec ask for a Vinnot administrator's email and
 * password through the browser's basic-auth prompt, instead of being public (#431).
 * This chain runs before the JWT chain and only for documentation paths.
 */
@Configuration
public class ApiDocumentationSecurityConfig {

    /** Springdoc also serves the spec as `/api-docs.yaml` and the UI files under `/webjars/swagger-ui`. */
    static final String[] DOCUMENTATION_PATHS = {
            "/swagger-ui.html", "/swagger-ui/**", "/webjars/swagger-ui/**",
            "/api-docs", "/api-docs.yaml", "/api-docs/**"};
    static final String REALM = "Vinnot API documentation";

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public SecurityFilterChain apiDocumentationFilterChain(
            HttpSecurity http,
            ApiDocumentationAccessPort access,
            RateLimitingFilter rateLimitingFilter) throws Exception {
        http
                .securityMatcher(DOCUMENTATION_PATHS)
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationManager(attempt -> authenticate(access, attempt))
                .httpBasic(basic -> basic.realmName(REALM))
                .authorizeHttpRequests(auth -> auth.anyRequest().hasRole("ADMIN"))
                // Throttle by address before checking credentials, so passwords cannot be guessed quickly.
                .addFilterBefore(rateLimitingFilter, BasicAuthenticationFilter.class);
        return http.build();
    }

    private static Authentication authenticate(ApiDocumentationAccessPort access, Authentication attempt) {
        String email = attempt.getName();
        String password = Objects.toString(attempt.getCredentials(), null);
        if (!access.allows(email, password)) {
            throw new BadCredentialsException("Invalid API documentation credentials");
        }
        return UsernamePasswordAuthenticationToken.authenticated(
                email, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }
}

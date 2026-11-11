package com.vinnot.shared.infrastructure.config;

import com.vinnot.shared.infrastructure.security.JwtAuthenticationFilter;
import com.vinnot.shared.infrastructure.security.RateLimitingFilter;
import com.vinnot.shared.infrastructure.security.RestAuthenticationEntryPoint;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import jakarta.servlet.DispatcherType;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RateLimitingFilter rateLimitingFilter;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173}")
    private String allowedOrigins;

    /**
     * Constructor.
     *
     * @param jwtAuthenticationFilter the JWT authentication filter
     */
    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            RateLimitingFilter rateLimitingFilter,
            RestAuthenticationEntryPoint authenticationEntryPoint) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.rateLimitingFilter = rateLimitingFilter;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    /**
     * Configures the security filter chain.
     *
     * @param http the HttpSecurity to configure
     * @return the configured SecurityFilterChain
     * @throws Exception if configuration fails
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(authenticationEntryPoint))
                .authorizeHttpRequests(auth -> auth
                        // Preserve the original status during the container's internal error dispatch.
                        // This does not make a direct request to /error public.
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        // Public auth endpoints
                        .requestMatchers(
                                "/auth/login",
                                "/auth/register",
                                "/auth/refresh",
                                "/auth/logout",
                                "/auth/social",
                                "/auth/web/login",
                                "/auth/web/social",
                                "/auth/web/refresh",
                                "/auth/web/logout",
                                "/auth/forgot-password",
                                "/auth/reset-password",
                                "/auth/reset-password/validate",
                                "/auth/verify-email",
                                "/auth/resend-verification",
                                "/auth/email-change/confirm"
                        ).permitAll()
                        .requestMatchers(HttpMethod.GET, "/share", "/share/", "/share/en", "/share/*/*", "/share/*/*/en").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/share", "/share/", "/share/en", "/share/*/*", "/share/*/*/en").permitAll()
                        .requestMatchers(HttpMethod.POST, "/support/requests").permitAll()
                        .requestMatchers(HttpMethod.POST, "/notifications/unsubscribe").permitAll()
                        .requestMatchers(HttpMethod.POST, "/payments/mercadopago/webhooks", "/payments/mercadopago/webhooks/*").permitAll()
                        .requestMatchers(HttpMethod.POST, "/payments/mercadopago/connection/callback").permitAll()
                        // OAuth redirect target of the social agent's Threads and TikTok connections (#510); the state proves who started it.
                        .requestMatchers(HttpMethod.GET, "/public/social-accounts/*/callback").permitAll()
                        .requestMatchers(HttpMethod.GET, "/payments/receipt").permitAll()
                        .requestMatchers(HttpMethod.GET, "/legal/terms/current", "/legal/terms/versions/*").permitAll()
                        // The mobile app checks its update policy before, and without, a session.
                        .requestMatchers(HttpMethod.GET, "/app-versions/minimum").permitAll()
                        // Infrastructure (API docs have their own chain: ApiDocumentationSecurityConfig)
                        .requestMatchers(
                                "/health",
                                "/version",
                                "/actuator/health",
                                "/uploads/**"
                        ).permitAll()
                        .requestMatchers("/actuator/**").hasRole("ADMIN")
                        // Product functionality requires a session, including reference data.
                        .requestMatchers(HttpMethod.GET,
                                "/grape-types/**",
                                "/regions/**",
                                "/reference/**"
                        ).authenticated()
                        // User submissions contain private moderation data and must not be
                        // exposed without a session.
                        .requestMatchers("/wines/submissions/**").authenticated()
                        // Catalog and community reads require a session; role/ownership rules remain.
                        .requestMatchers(HttpMethod.GET,
                                "/wines/**",
                                "/wineries/**",
                                "/events/**",
                                "/wine-routes/**",
                                "/users/*/profile",
                                // Public profile activity (#541): approved reviews and the visible cellar.
                                "/users/*/reviews",
                                "/users/*/cellar"
                        ).authenticated()
                        // Admin panel — role enforced; method-level @PreAuthorize provides fine-grained control
                        .requestMatchers("/admin/users", "/admin/users/**", "/admin/notifications/**",
                                "/admin/app-versions", "/admin/app-versions/**").hasRole("ADMIN")
                        .requestMatchers("/admin/**").hasAnyRole("ADMIN", "MODERATOR")
                        // Everything else (including write operations on public resources) requires auth
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(rateLimitingFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    /**
     * CORS configuration source.
     *
     * @return the CORS configuration source
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(
                Arrays.stream(allowedOrigins.split(","))
                        .map(String::trim)
                        .filter(origin -> !origin.isBlank())
                        .toList()
        );
        configuration.setAllowedMethods(
                List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        );
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of(
                "X-Request-ID",
                "X-RateLimit-Limit",
                "X-RateLimit-Remaining",
                "Retry-After"
        ));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Password encoder bean.
     *
     * @return BCrypt password encoder
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter> jwtFilterRegistration(
            JwtAuthenticationFilter filter) {
        FilterRegistrationBean<JwtAuthenticationFilter> registration =
                new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public FilterRegistrationBean<RateLimitingFilter> rateLimitFilterRegistration(
            RateLimitingFilter filter) {
        FilterRegistrationBean<RateLimitingFilter> registration =
                new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }
}

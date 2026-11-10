package com.vinnot.shared.infrastructure.security;

import com.vinnot.shared.application.port.AccountAccessPort;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final int BEARER_PREFIX_LENGTH = 7;

    private final JwtTokenService jwtTokenService;
    private final AccountAccessPort accountAccess;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        if ("/auth/refresh".equals(request.getServletPath())
                || request.getServletPath().startsWith("/auth/web/")) {
            filterChain.doFilter(request, response);
            return;
        }
        String authHeader = request.getHeader("Authorization");

        if (Objects.isNull(authHeader) || !authHeader.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(BEARER_PREFIX_LENGTH);

        if (jwtTokenService.validateToken(token) && !jwtTokenService.isTokenExpired(token)) {
            UUID userId = jwtTokenService.extractUserId(token);
            List<String> roles = jwtTokenService.extractRoles(token);
            if (!accountAccess.permits(userId, roles, jwtTokenService.extractSessionVersion(token))) {
                SecurityContextHolder.clearContext();
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Session permissions have changed");
                return;
            }
            List<String> permissions = jwtTokenService.extractPermissions(token);

            // Roles as ROLE_xxx authorities + permissions as plain authority codes
            List<SimpleGrantedAuthority> authorities = new ArrayList<>();
            roles.stream()
                    .map(role -> new SimpleGrantedAuthority(role.startsWith("ROLE_") ? role : "ROLE_" + role))
                    .forEach(authorities::add);
            permissions.stream().map(SimpleGrantedAuthority::new).forEach(authorities::add);

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userId.toString(),
                            null,
                            authorities
                    );

            authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request)
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
        } else if ("GET".equals(request.getMethod())
                && request.getServletPath().startsWith("/uploads/covers/")) {
            // Covers also support anonymous public reads. A supplied stale token
            // must trigger client refresh instead of becoming an anonymous 404.
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Media session expired");
            return;
        }

        filterChain.doFilter(request, response);
    }
}

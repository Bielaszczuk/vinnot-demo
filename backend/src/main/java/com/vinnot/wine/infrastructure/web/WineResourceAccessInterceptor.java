package com.vinnot.wine.infrastructure.web;

import com.vinnot.shared.infrastructure.security.AuthorizationUtils;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/** Applies wine visibility to nested resources, including cached AI and review responses. */
@Component
@RequiredArgsConstructor
public class WineResourceAccessInterceptor implements HandlerInterceptor {
    private final CheckWineReadAccessUseCase access;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Object variables = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        if (variables instanceof Map<?, ?> pathVariables) {
            Object wineId = pathVariables.get("wineId");
            if (Objects.isNull(wineId)) {
                wineId = pathVariables.get("id");
            }
            if (wineId instanceof String value) {
                access.check(UUID.fromString(value), AuthorizationUtils.resourceReader(
                        SecurityContextHolder.getContext().getAuthentication()));
            }
        }
        return true;
    }
}

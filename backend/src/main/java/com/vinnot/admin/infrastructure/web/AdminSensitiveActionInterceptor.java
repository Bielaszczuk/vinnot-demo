package com.vinnot.admin.infrastructure.web;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.infrastructure.security.AuthorizationUtils;
import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import com.vinnot.user.infrastructure.security.SignedReauthenticationProofAdapter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Objects;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AdminSensitiveActionInterceptor implements HandlerInterceptor {
    private final ReauthenticationProofPort proofs;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String method = request.getMethod();
        String path = request.getServletPath();
        boolean readOnly = method.equals("GET") || method.equals("HEAD") || method.equals("OPTIONS");
        // Changing users, push switches, the minimum app versions (#428) and sending notifications to many accounts
        // need a fresh proof (#310). Rendering a preview changes nothing and runs while the administrator types.
        boolean preview = method.equals("POST") && path.equals("/admin/notifications/announcements/preview");
        boolean userMutation = (path.startsWith("/admin/users/") || path.startsWith("/admin/notifications/")
                || path.startsWith("/admin/app-versions"))
                && !readOnly && !preview;
        boolean catalogDeletion = method.equals("DELETE") && (path.startsWith("/admin/")
                || path.matches("/(?:wines|events|wine-routes|wineries)/[0-9a-fA-F-]+"));
        // Account takeover would be permanent: every account holder confirms these with the same proof.
        boolean ownAccountTakeoverRisk = (method.equals("POST") && path.equals("/users/me/email-change"))
                || (method.equals("DELETE") && path.equals("/users/me/permanent"));
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean adminAction = (userMutation || catalogDeletion) && AuthorizationUtils.hasAuthority(authentication, "ROLE_ADMIN");
        if (adminAction || (ownAccountTakeoverRisk && Objects.nonNull(authentication))) {
            String authorization = request.getHeader("Authorization");
            String proof = request.getHeader("X-Admin-Reauthentication");
            if (Objects.isNull(authorization) || !proofs.permits(proof, UUID.fromString(authentication.getName()),
                    SignedReauthenticationProofAdapter.sessionBinding(authorization))) {
                throw new BusinessRuleViolationException("REAUTHENTICATION_REQUIRED", "Confirm your identity before this sensitive action");
            }
        }
        return true;
    }
}

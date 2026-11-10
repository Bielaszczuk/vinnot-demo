package com.vinnot.marketing.infrastructure.web.controller;

import com.vinnot.marketing.application.model.SocialAccountDisconnectResult;
import com.vinnot.marketing.application.model.SocialAccountResponse;
import com.vinnot.marketing.application.port.in.ManageSocialAccountsUseCase;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.infrastructure.web.dto.SocialAccountConnectResponse;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.infrastructure.web.GlobalExceptionHandler;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** The networks the agent publishes to and their connections (#510 S5 C5), administrators only. Tokens never leave the server. */
@RestController
@RequestMapping("/admin/social-accounts")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin - Social accounts", description = "Network connections of the social media agent")
@RequiredArgsConstructor
public class SocialAccountAdminController {
    static final String CONFIGURED_BY_SECRETS = "SOCIAL_ACCOUNT_CONFIGURED_BY_SECRETS";
    private final ManageSocialAccountsUseCase accounts;

    @GetMapping
    @Operation(summary = "Connection of every network (admin)")
    public ResponseEntity<List<SocialAccountResponse>> list() {
        return ResponseEntity.ok(accounts.list());
    }

    @GetMapping("/{network}/connect")
    @Operation(summary = "OAuth consent URL to connect Threads or TikTok (admin)")
    public ResponseEntity<SocialAccountConnectResponse> connect(@PathVariable String network, @AuthenticationPrincipal String principal) {
        return ResponseEntity.ok(new SocialAccountConnectResponse(accounts.connectUrl(network(network), UUID.fromString(principal))));
    }

    @DeleteMapping("/{network}")
    @Operation(summary = "Remove a connected Threads or TikTok account (admin); Meta is configured by secrets")
    public ResponseEntity<?> disconnect(@PathVariable String network, HttpServletRequest request) {
        SocialAccountDisconnectResult result = accounts.disconnect(network(network));
        return switch (result) {
            case REMOVED -> ResponseEntity.noContent().build();
            case NOT_CONNECTED -> throw new EntityNotFoundException("No connected account for " + network);
            default -> ResponseEntity.status(HttpStatus.CONFLICT).body(new GlobalExceptionHandler.ErrorResponse(Instant.now(),
                    request.getRequestURI(), HttpStatus.CONFLICT.value(), CONFIGURED_BY_SECRETS,
                    "Instagram and Facebook are configured by secrets and cannot be removed here", null));
        };
    }

    private static SocialNetwork network(String value) {
        return Arrays.stream(SocialNetwork.values()).filter(network -> network.name().equals(value.toUpperCase(Locale.ROOT))).findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Unknown social network"));
    }
}

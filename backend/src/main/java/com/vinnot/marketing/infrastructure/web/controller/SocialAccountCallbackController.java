package com.vinnot.marketing.infrastructure.web.controller;

import com.vinnot.marketing.application.port.in.ManageSocialAccountsUseCase;
import com.vinnot.marketing.domain.model.SocialNetwork;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/**
 * Where Threads and TikTok send the admin's browser back after consent (#510 S5 C5), public because the redirect carries
 * no session: the single-use state proves who started it. It always answers 302 to the web admin's social posts page
 * with only the network and the outcome, never the code, the state or a token.
 */
@RestController
@RequestMapping("/public/social-accounts")
@Tag(name = "Social accounts - OAuth callback", description = "OAuth redirect target for Threads and TikTok")
public class SocialAccountCallbackController {
    private final ManageSocialAccountsUseCase accounts;
    private final String frontendBaseUrl;

    public SocialAccountCallbackController(ManageSocialAccountsUseCase accounts,
            @Value("${app.auth.frontend-base-url:http://localhost:5173}") String frontendBaseUrl) {
        this.accounts = accounts;
        this.frontendBaseUrl = frontendBaseUrl.endsWith("/") ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1) : frontendBaseUrl;
    }

    @GetMapping("/{network}/callback")
    @Operation(summary = "OAuth redirect target (public, state-checked)")
    public ResponseEntity<Void> callback(@PathVariable String network, @RequestParam(required = false) String code,
            @RequestParam(required = false) String state, @RequestParam(required = false) String error) {
        Optional<SocialNetwork> parsed = Arrays.stream(SocialNetwork.values())
                .filter(candidate -> candidate.name().equals(network.toUpperCase(Locale.ROOT))).findFirst();
        String target = parsed.map(value -> {
            boolean connected = accounts.completeConnection(value, code, state, error);
            return "?account=" + value.name().toLowerCase(Locale.ROOT) + "&result=" + (connected ? "connected" : "error");
        }).orElse("?result=error");
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(frontendBaseUrl + "/admin/social-posts" + target))
                .cacheControl(CacheControl.noStore()).header("Referrer-Policy", "no-referrer").build();
    }
}

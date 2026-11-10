package com.vinnot.user.infrastructure.web.controller;

import com.vinnot.user.application.command.model.ReauthenticateCommand;
import com.vinnot.user.application.port.in.ReauthenticateUseCase;
import com.vinnot.user.domain.valueobject.SocialProvider;
import com.vinnot.user.infrastructure.security.SignedReauthenticationProofAdapter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ReauthenticationController {
    private final ReauthenticateUseCase reauthenticate;

    @PostMapping("/auth/reauthenticate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> confirm(@AuthenticationPrincipal String principal,
            @RequestHeader("Authorization") String authorization, @Valid @RequestBody ConfirmationRequest body) {
        String proof = reauthenticate.execute(new ReauthenticateCommand(UUID.fromString(principal),
                SignedReauthenticationProofAdapter.sessionBinding(authorization), body.password(),
                body.provider(), body.token(), body.nonce()));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("proof", proof));
    }

    /** Either {@code password}, or {@code provider} + {@code token} (Google ID token / Apple identity token). */
    public record ConfirmationRequest(@Size(max = 128) String password,
                                      SocialProvider provider,
                                      @Size(max = 10000) String token,
                                      @Size(max = 512) String nonce) {

        public ConfirmationRequest(String password) {
            this(password, null, null, null);
        }

        @AssertTrue(message = "Provide either a password or a provider token")
        public boolean isSingleCredential() {
            boolean passwordOnly = present(password) && Objects.isNull(provider) && Objects.isNull(token);
            boolean providerOnly = Objects.isNull(password) && Objects.nonNull(provider) && present(token);
            return passwordOnly || providerOnly;
        }

        private static boolean present(String value) {
            return Objects.nonNull(value) && !value.isBlank();
        }
    }
}

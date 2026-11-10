package com.vinnot.user.infrastructure.web.controller;

import com.vinnot.user.application.command.model.LoginCommand;
import com.vinnot.user.application.command.model.LogoutCommand;
import com.vinnot.user.application.command.model.RefreshTokenCommand;
import com.vinnot.user.application.command.model.SocialLoginCommand;
import com.vinnot.user.application.command.response.AuthSessionResponse;
import com.vinnot.user.application.command.response.AuthenticatedUserResponse;
import com.vinnot.user.application.port.in.LoginUserUseCase;
import com.vinnot.user.application.port.in.LogoutUserUseCase;
import com.vinnot.user.application.port.in.RefreshTokenUseCase;
import com.vinnot.user.application.port.in.SocialLoginUseCase;
import com.vinnot.user.infrastructure.web.request.LoginRequest;
import com.vinnot.user.infrastructure.web.request.LogoutRequest;
import com.vinnot.user.infrastructure.web.request.RefreshTokenRequest;
import com.vinnot.user.infrastructure.web.request.SocialLoginRequest;
import com.vinnot.user.infrastructure.web.session.BrowserSessionPolicy;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Objects;

/** Browser-only transport adapter. Refresh credentials never enter its JSON response. */
@RestController
@RequestMapping("/auth/web")
@RequiredArgsConstructor
public class BrowserAuthController {
    private final LoginUserUseCase login;
    private final SocialLoginUseCase social;
    private final RefreshTokenUseCase refresh;
    private final LogoutUserUseCase logout;
    private final BrowserSessionPolicy policy;

    @PostMapping("/login")
    public ResponseEntity<BrowserSessionResponse> login(@Valid @RequestBody LoginRequest body,
                                                       HttpServletRequest request) {
        policy.verify(request);
        return session(login.execute(new LoginCommand(body.usernameOrEmail(), body.password(),
                Boolean.TRUE.equals(body.reactivate()))));
    }

    @PostMapping("/social")
    public ResponseEntity<BrowserSessionResponse> social(@Valid @RequestBody SocialLoginRequest body,
                                                        HttpServletRequest request) {
        policy.verify(request);
        return session(social.execute(new SocialLoginCommand(body.provider(), body.token(), body.nonce(),
                body.firstName(), body.lastName(), Boolean.TRUE.equals(body.reactivate()))));
    }

    @PostMapping("/refresh")
    public ResponseEntity<BrowserSessionResponse> refresh(
            @Valid @RequestBody(required = false) RefreshTokenRequest legacy,
            HttpServletRequest request) {
        policy.verify(request);
        String token = policy.refreshToken(request);
        // One-time migration of existing browser installations. Rotation invalidates the old token.
        if (Objects.isNull(token) && Objects.nonNull(legacy)) {
            token = legacy.refreshToken();
        }
        if (Objects.isNull(token) || token.isBlank()) {
            // An anonymous bootstrap is normal, not invalid authentication input.
            // Do not expire cookies: a concurrent login may already have installed one.
            return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
        }
        return session(refresh.execute(new RefreshTokenCommand(token)));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody(required = false) LogoutRequest legacy, HttpServletRequest request) {
        policy.verify(request);
        String token = policy.refreshToken(request);
        if (Objects.isNull(token) && Objects.nonNull(legacy)) {
            token = legacy.refreshToken();
        }
        logout.execute(new LogoutCommand(token));
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore())
                .header(HttpHeaders.SET_COOKIE, policy.cookie(null)).build();
    }

    private ResponseEntity<BrowserSessionResponse> session(AuthSessionResponse result) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .header(HttpHeaders.SET_COOKIE, policy.cookie(result.refreshToken()))
                .body(new BrowserSessionResponse(result.accessToken(), result.tokenType(),
                        result.expiresIn(), result.user()));
    }

    public record BrowserSessionResponse(String accessToken, String tokenType, long expiresIn,
                                         AuthenticatedUserResponse user) { }
}

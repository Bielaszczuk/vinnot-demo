package com.vinnot.user.application.service;

import com.vinnot.shared.application.port.TokenService;
import com.vinnot.user.application.command.response.AuthSessionResponse;
import com.vinnot.user.application.port.out.RefreshTokenRepositoryPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthSessionIssuer {

    private final UserRepositoryPort userRepository;
    private final RefreshTokenRepositoryPort refreshTokenRepository;
    private final TokenService tokenService;
    private final AuthSessionResponseFactory responseFactory;

    /** Records the sign-in and stores the refresh token together; joins the caller's transaction when there is one. */
    @Transactional
    public AuthSessionResponse issue(User user) {
        user.recordLogin();
        User savedUser = userRepository.save(user);

        String rawRefreshToken = tokenService.generateRefreshToken();
        String tokenHash = RefreshTokenHasher.hash(rawRefreshToken);
        refreshTokenRepository.save(
                savedUser.getId(), tokenHash,
                Instant.now().plusMillis(tokenService.getRefreshTokenExpiration()), savedUser.getSessionVersion());

        return responseFactory.create(savedUser, rawRefreshToken);
    }
}

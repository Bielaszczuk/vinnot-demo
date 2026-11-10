package com.vinnot.user.application.command.handler;

import com.vinnot.shared.application.port.TokenService;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.user.application.command.model.RefreshTokenCommand;
import com.vinnot.user.application.command.response.AuthSessionResponse;
import com.vinnot.user.application.port.in.RefreshTokenUseCase;
import com.vinnot.user.application.port.out.RefreshTokenRepositoryPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.service.AuthSessionResponseFactory;
import com.vinnot.user.application.service.RefreshTokenHasher;
import com.vinnot.user.application.service.RefreshTokenReuseResponder;
import com.vinnot.user.domain.model.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RefreshTokenCommandHandler implements RefreshTokenUseCase {

    private final RefreshTokenRepositoryPort refreshTokenRepository;
    private final UserRepositoryPort userRepository;
    private final TokenService tokenService;
    private final AuthSessionResponseFactory responseFactory;
    private final RefreshTokenReuseResponder reuse;

    @Override
    @Transactional
    public AuthSessionResponse execute(RefreshTokenCommand command) {
        String tokenHash = RefreshTokenHasher.hash(command.refreshToken());

        RefreshTokenRepositoryPort.RefreshTokenData storedToken = refreshTokenRepository
                .findByTokenHash(tokenHash)
                .orElseThrow(() -> new BusinessRuleViolationException(
                        "INVALID_TOKEN", "Invalid or expired refresh token"));

        if (!storedToken.valid()) {
            return recoverRotation(command, storedToken);
        }

        User user = userRepository.findById(storedToken.userId())
                .orElseThrow(() -> new BusinessRuleViolationException(
                        "USER_NOT_FOUND", "User not found"));
        validateAccountStatus(user);
        if (storedToken.sessionVersion() != user.getSessionVersion()) {
            throw new BusinessRuleViolationException("INVALID_TOKEN", "Invalid or expired refresh token");
        }

        String newRawRefreshToken = Objects.isNull(command.rotationId())
                ? tokenService.generateRefreshToken()
                : tokenService.deriveRefreshToken(command.refreshToken(), command.rotationId());
        String newHash = RefreshTokenHasher.hash(newRawRefreshToken);

        refreshTokenRepository.revoke(tokenHash, "rotated", newHash);
        refreshTokenRepository.save(
                storedToken.userId(), newHash,
                Instant.now().plusMillis(tokenService.getRefreshTokenExpiration()), user.getSessionVersion());

        return responseFactory.create(user, newRawRefreshToken);
    }

    /**
     * A rotated token is only accepted back through the idempotent recovery: the same {@code rotationId} derives the
     * same live successor. Any other replay of it is reuse, which {@link RefreshTokenReuseResponder} answers by ending
     * every session unless it is a parallel refresh that just lost the race (#482).
     */
    private AuthSessionResponse recoverRotation(
            RefreshTokenCommand command, RefreshTokenRepositoryPort.RefreshTokenData previous) {
        if (!"rotated".equals(previous.revokedReason()) || !previous.expiresAt().isAfter(Instant.now())) {
            throw invalidToken();
        }
        String recovered = Objects.isNull(command.rotationId())
                ? null
                : tokenService.deriveRefreshToken(command.refreshToken(), command.rotationId());
        String recoveredHash = Objects.isNull(recovered) ? null : RefreshTokenHasher.hash(recovered);
        if (Objects.isNull(recoveredHash) || !recoveredHash.equals(previous.replacedByTokenHash())) {
            reuse.replayed(previous);
            throw invalidToken();
        }
        var successor = refreshTokenRepository.findByTokenHash(recoveredHash).orElseThrow(this::invalidToken);
        if (!successor.valid() || !successor.userId().equals(previous.userId())
                || successor.sessionVersion() != previous.sessionVersion()) {
            throw invalidToken();
        }
        User user = userRepository.findById(successor.userId()).orElseThrow(() ->
                new BusinessRuleViolationException("USER_NOT_FOUND", "User not found"));
        validateAccountStatus(user);
        if (user.getSessionVersion() != successor.sessionVersion()) {
            throw invalidToken();
        }
        // Same operation, same live successor. Never extend its expiry or follow later rotations.
        return responseFactory.create(user, recovered);
    }

    private BusinessRuleViolationException invalidToken() {
        return new BusinessRuleViolationException("INVALID_TOKEN", "Invalid or expired refresh token");
    }

    private void validateAccountStatus(User user) {
        if (!user.isActive()) {
            throw new BusinessRuleViolationException(
                    "ACCOUNT_DEACTIVATED", "Account is deactivated");
        }
        if (user.isLocked()) {
            throw new BusinessRuleViolationException("ACCOUNT_LOCKED", "Account is locked");
        }
        if (!user.isEmailVerified()) {
            throw new BusinessRuleViolationException(
                    "EMAIL_NOT_VERIFIED", "Verify your email before refreshing the session");
        }
    }

}

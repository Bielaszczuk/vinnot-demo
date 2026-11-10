package com.vinnot.user.application.command.handler;

import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.user.application.command.model.LogoutCommand;
import com.vinnot.user.application.port.in.LogoutUserUseCase;
import com.vinnot.user.application.port.out.RefreshTokenRepositoryPort;
import com.vinnot.user.application.service.RefreshTokenHasher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LogoutCommandHandler implements LogoutUserUseCase {

    private final RefreshTokenRepositoryPort refreshTokenRepository;
    private final ManagePushDevicesUseCase pushDevices;

    @Override
    @Transactional
    public void execute(LogoutCommand command) {
        String tokenHash = Objects.isNull(command.refreshToken()) ? null : RefreshTokenHasher.hash(command.refreshToken());
        if (Objects.nonNull(command.pushToken())) {
            forgetDevice(tokenHash, command.pushToken());
        }
        if (Objects.nonNull(tokenHash)) {
            refreshTokenRepository.revoke(tokenHash, "logout", null);
        }
    }

    /**
     * The device signing out stops receiving pushes even when its session already expired or was revoked. A known
     * session, live or not, limits the removal to its account; without one only this exact token is forgotten.
     */
    private void forgetDevice(String tokenHash, String pushToken) {
        Optional<RefreshTokenRepositoryPort.RefreshTokenData> session = Objects.isNull(tokenHash) ? Optional.empty()
                : refreshTokenRepository.findByTokenHash(tokenHash);
        session.ifPresentOrElse(known -> pushDevices.unregister(known.userId(), pushToken),
                () -> pushDevices.forgetToken(pushToken));
    }

}

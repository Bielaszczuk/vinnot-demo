package com.vinnot.event.infrastructure.gamification;

import com.vinnot.event.application.port.out.EventRegistrationPointsPort;
import com.vinnot.gamification.application.command.model.AwardPointsCommand;
import com.vinnot.gamification.application.command.model.RevokePointsCommand;
import com.vinnot.gamification.application.port.in.AwardPointsUseCase;
import com.vinnot.gamification.domain.model.PointSource;
import com.vinnot.gamification.domain.model.PointSubject;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** A confirmed registration is keyed by itself, so a later registration to the same event is another award. */
@Component
@RequiredArgsConstructor
public class GamificationEventRegistrationPointsAdapter implements EventRegistrationPointsPort {
    private final AwardPointsUseCase points;

    @Override
    public void registrationConfirmed(UUID userId, UUID registrationId, UUID eventId) {
        points.award(new AwardPointsCommand(userId, PointSource.EVENT_REGISTRATION, registrationId.toString(),
                PointSubject.event(eventId)));
    }

    @Override
    public void registrationEnded(UUID userId, UUID registrationId) {
        points.revoke(RevokePointsCommand.of(userId, PointSource.EVENT_REGISTRATION, registrationId.toString()));
    }
}

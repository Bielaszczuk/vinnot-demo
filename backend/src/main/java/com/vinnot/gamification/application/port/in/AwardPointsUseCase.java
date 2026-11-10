package com.vinnot.gamification.application.port.in;

import com.vinnot.gamification.application.command.model.AwardPointsCommand;
import com.vinnot.gamification.application.command.model.RevokePointsCommand;

/**
 * How other modules give and take back points (#455). Both join the caller's transaction, so points change
 * together with the content they are for, and both serialise on the member's points row.
 */
public interface AwardPointsUseCase {
    void award(AwardPointsCommand command);

    void revoke(RevokePointsCommand command);
}

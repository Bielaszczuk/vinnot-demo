package com.vinnot.gamification.application.port.in;

import com.vinnot.gamification.application.command.model.CelebratePointsCommand;

/** Records that the member saw a tier celebration or dismissed the welcome card. */
public interface CelebratePointsUseCase {
    void execute(CelebratePointsCommand command);
}

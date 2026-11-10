package com.vinnot.gamification.application.command.handler;

import com.vinnot.gamification.application.command.model.CelebratePointsCommand;
import com.vinnot.gamification.application.port.in.CelebratePointsUseCase;
import com.vinnot.gamification.application.port.out.PointsLedgerPort;
import com.vinnot.gamification.domain.model.PointsAccount;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/** Marks a tier (and every lower one) as celebrated and/or dismisses the welcome card. */
@Service
@RequiredArgsConstructor
public class CelebratePointsCommandHandler implements CelebratePointsUseCase {
    private final PointsLedgerPort ledger;

    @Override
    @Transactional
    public void execute(CelebratePointsCommand command) {
        PointsAccount account = ledger.lockAccount(command.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", command.userId()));
        if (Objects.nonNull(command.tier())) {
            account.celebrate(command.tier());
        }
        if (command.welcome()) {
            account.dismissWelcome();
        }
        ledger.saveAccount(account);
    }
}

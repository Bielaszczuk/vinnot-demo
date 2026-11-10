package com.vinnot.user.application.query.handler;

import com.vinnot.user.application.port.in.ValidatePasswordResetTokenUseCase;
import com.vinnot.user.application.query.model.ValidatePasswordResetTokenQuery;
import com.vinnot.user.application.service.AccountActionTokenService;
import com.vinnot.user.domain.valueobject.UserActionTokenStatus;
import com.vinnot.user.domain.valueobject.UserActionTokenType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ValidatePasswordResetTokenQueryHandler
        implements ValidatePasswordResetTokenUseCase {

    private final AccountActionTokenService tokenService;

    @Override
    @Transactional(readOnly = true)
    public UserActionTokenStatus execute(ValidatePasswordResetTokenQuery query) {
        return tokenService.getStatus(query.token(), UserActionTokenType.PASSWORD_RESET);
    }
}

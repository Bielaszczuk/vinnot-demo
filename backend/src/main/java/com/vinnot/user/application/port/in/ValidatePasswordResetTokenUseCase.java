package com.vinnot.user.application.port.in;

import com.vinnot.user.application.query.model.ValidatePasswordResetTokenQuery;
import com.vinnot.user.domain.valueobject.UserActionTokenStatus;

public interface ValidatePasswordResetTokenUseCase {
    UserActionTokenStatus execute(ValidatePasswordResetTokenQuery query);
}

package com.vinnot.user.application.port.out;

import com.vinnot.user.domain.valueobject.AccountRecoveryAction;
import com.vinnot.user.domain.valueobject.Email;

/**
 * Durably records a recovery request in the caller's transaction. The account is resolved later, so the
 * request does the same work whether or not an account uses the address.
 */
public interface AccountRecoveryRequestPort {
    void request(AccountRecoveryAction action, Email email);
}

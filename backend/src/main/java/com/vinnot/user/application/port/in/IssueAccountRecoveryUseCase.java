package com.vinnot.user.application.port.in;

import com.vinnot.user.domain.valueobject.AccountRecoveryAction;
import com.vinnot.user.domain.valueobject.Email;

/** Turns a queued recovery request into a link for the matching eligible account, if there is one. */
public interface IssueAccountRecoveryUseCase {
    void issue(AccountRecoveryAction action, Email email);
}

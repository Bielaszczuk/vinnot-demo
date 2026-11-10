package com.vinnot.user.domain.valueobject;

import com.vinnot.user.domain.model.User;

/** A link a person can ask for by email address alone, without signing in. */
public enum AccountRecoveryAction {
    PASSWORD_RESET {
        @Override
        public boolean appliesTo(User user) {
            return user.isActive() && !user.isLocked();
        }
    },
    EMAIL_VERIFICATION {
        @Override
        public boolean appliesTo(User user) {
            return user.isActive() && !user.isEmailVerified();
        }
    };

    /** Whether the account may receive this link; other accounts are silently skipped. */
    public abstract boolean appliesTo(User user);
}

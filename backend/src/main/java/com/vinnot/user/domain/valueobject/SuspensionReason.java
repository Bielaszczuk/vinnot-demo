package com.vinnot.user.domain.valueobject;

/** Why an administrator suspended an account (#309); the account holder is told the reason, never free text alone. */
public enum SuspensionReason {
    SPAM,
    HARASSMENT,
    FRAUD,
    IMPERSONATION,
    TERMS_VIOLATION,
    OTHER
}

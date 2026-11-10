package com.vinnot.user.domain.valueobject;

/**
 * What happened to an account, as recorded in {@code security_events} (#482). The names are stored, and the V73
 * check constraint lists them, so a new type needs a migration that widens that list.
 */
public enum SecurityEventType {
    LOGIN_SUCCEEDED,
    LOGIN_FAILED,
    LOGIN_LOCKED,
    REFRESH_REUSE_DETECTED,
    PASSWORD_CHANGED,
    PASSWORD_RESET,
    EMAIL_CHANGED,
    ROLE_CHANGED,
    ACCOUNT_BANNED,
    ACCOUNT_UNBANNED,
    ACCOUNT_DELETED,
    ACCOUNT_AUTO_SUSPENDED
}

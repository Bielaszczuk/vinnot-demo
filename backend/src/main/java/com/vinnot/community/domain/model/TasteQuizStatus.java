package com.vinnot.community.domain.model;

/** Where a member stands with the taste quiz (#541); PENDING is never stored, it means no answer yet. */
public enum TasteQuizStatus {
    PENDING,
    COMPLETED,
    SKIPPED
}

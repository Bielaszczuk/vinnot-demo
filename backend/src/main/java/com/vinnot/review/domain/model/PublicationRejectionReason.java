package com.vinnot.review.domain.model;

/** Why a moderator did not publish a review or comment (#307); the author is told this reason. */
public enum PublicationRejectionReason {
    OFFENSIVE,
    SPAM,
    OFF_TOPIC,
    PERSONAL_DATA,
    OTHER
}

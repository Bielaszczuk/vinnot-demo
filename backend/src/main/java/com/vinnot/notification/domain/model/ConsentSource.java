package com.vinnot.notification.domain.model;

/** Where a marketing consent decision was made. An unsubscribe link only turns a channel off, never the consent. */
public enum ConsentSource {
    WEB,
    MOBILE
}

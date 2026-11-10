package com.vinnot.marketing.domain.model;

/** The state of an account connected with OAuth (#510 S5): working, or its token could not be refreshed. */
public enum SocialAccountStatus { CONNECTED, REFRESH_FAILED }

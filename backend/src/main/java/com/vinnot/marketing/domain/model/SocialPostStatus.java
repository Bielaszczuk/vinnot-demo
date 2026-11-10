package com.vinnot.marketing.domain.model;

/**
 * Where a post is in the approval queue (#489) and in publishing (#510): an approved post is {@code SCHEDULED} once its
 * publishing starts, then {@code PUBLISHED} when every enabled network succeeded or {@code FAILED} when one failed for
 * good (the admin may retry it).
 */
public enum SocialPostStatus { DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, SCHEDULED, PUBLISHED, FAILED }

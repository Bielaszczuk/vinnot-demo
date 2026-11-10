package com.vinnot.marketing.infrastructure.web.dto;

/** Body of {@code POST /admin/social-posts/{id}/reject}; the reason is optional. */
public record RejectSocialPostRequest(String reason) { }

package com.vinnot.community.application.query.response;

import java.util.Map;

/**
 * The member's own taste quiz (#541). Only its owner reads it; public profiles never carry the answers.
 *
 * @param status       PENDING (never answered), COMPLETED or SKIPPED
 * @param answers      question key to option key in quiz order when completed, else {@code null}
 * @param shouldPrompt whether the apps offer the quiz after sign-in: pending and fewer than five rated wines
 */
public record TasteQuizResponse(String status, Map<String, String> answers, boolean shouldPrompt) { }

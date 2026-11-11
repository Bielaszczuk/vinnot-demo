package com.vinnot.community.application.command.model;

import java.util.Map;
import java.util.UUID;

/** Complete (or retake) the taste quiz with an option key for every question key. */
public record CompleteTasteQuizCommand(UUID userId, Map<String, String> answers) { }

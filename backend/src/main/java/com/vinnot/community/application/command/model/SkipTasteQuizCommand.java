package com.vinnot.community.application.command.model;

import java.util.UUID;

/** Skip the taste quiz so the apps stop offering it after sign-in. */
public record SkipTasteQuizCommand(UUID userId) { }

package com.vinnot.community.application.command.model;

import java.util.UUID;

/** Clear every manual palate value of the member, so each trait shows its computed value again. */
public record ResetTasteTraitsCommand(UUID userId) { }

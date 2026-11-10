package com.vinnot.community.application.command.model;

import java.util.UUID;

public record ChangeUserBlockCommand(UUID userId, UUID targetUserId, boolean blocked) { }

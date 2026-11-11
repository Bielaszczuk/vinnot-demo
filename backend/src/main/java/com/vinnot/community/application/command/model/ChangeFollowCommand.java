package com.vinnot.community.application.command.model;

import java.util.UUID;

/** Start ({@code following}) or stop following a member. */
public record ChangeFollowCommand(UUID followerId, UUID followeeId, boolean following) { }

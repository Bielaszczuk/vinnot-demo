package com.vinnot.event.application.command.model;

import java.util.UUID;

public record ConfirmEventAttendanceCommand(
        UUID registrationId,
        UUID userId
) {
}

package com.vinnot.event.application.port.in;
import java.util.UUID;
public interface NotifyEventRegistrationUseCase { void notify(UUID registrationId, long version, boolean organizer); }

package com.vinnot.user.application.port.out;

import java.util.UUID;

/** Tells whether an organizer still owes buyers an event they paid for, or are paying for. */
public interface UpcomingPaidEventsPort {

    /**
     * True when the user organizes an event that is not cancelled or completed and has not ended, with at least one
     * active registration that went through a Mercado Pago checkout.
     */
    boolean organizesUpcomingPaidEvents(UUID userId);
}

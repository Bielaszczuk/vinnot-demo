package com.vinnot.user.application.port.out;

import com.vinnot.user.application.port.out.model.RequestOrigin;

/** Where the current request came from, without the application layer touching HTTP (#482). */
public interface RequestOriginPort {

    /** The client address and browser of the current request, or {@link RequestOrigin#UNKNOWN} outside one. */
    RequestOrigin current();
}

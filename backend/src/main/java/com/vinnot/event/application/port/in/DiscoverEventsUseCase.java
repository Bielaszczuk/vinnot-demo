package com.vinnot.event.application.port.in;

import com.vinnot.event.application.query.model.DiscoverEventsQuery;
import com.vinnot.event.application.query.response.EventDiscoveryResponse;

public interface DiscoverEventsUseCase {

    EventDiscoveryResponse execute(DiscoverEventsQuery query);
}

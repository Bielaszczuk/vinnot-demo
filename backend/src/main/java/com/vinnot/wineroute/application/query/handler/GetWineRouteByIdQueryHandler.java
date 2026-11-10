package com.vinnot.wineroute.application.query.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wineroute.application.port.in.GetWineRouteByIdUseCase;
import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.application.port.out.WineryQueryPort;
import com.vinnot.wineroute.application.query.model.GetWineRouteByIdQuery;
import com.vinnot.wineroute.application.query.response.WineRouteDetailsResponse.RouteWineryInfo;
import com.vinnot.wineroute.application.query.response.WineRouteDetailsResponse;
import com.vinnot.wineroute.domain.model.RouteStop;
import com.vinnot.wineroute.domain.model.WineRoute;
import com.vinnot.wineroute.domain.valueobject.RouteStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * Handler for GetWineRouteByIdQuery.
 */
@Service
@RequiredArgsConstructor
public class GetWineRouteByIdQueryHandler implements GetWineRouteByIdUseCase {

    private final WineRouteRepositoryPort repository;
    private final WineryQueryPort wineryQueryPort;

    @Override
    @Transactional(readOnly = true)
    public WineRouteDetailsResponse execute(GetWineRouteByIdQuery query) {
        WineRoute route = repository.findById(query.routeId())
                .filter(value -> query.reader().mayRead(value.getStatus() == RouteStatus.PUBLISHED, value.getCreatedBy()))
                .orElseThrow(() -> new EntityNotFoundException("WineRoute", query.routeId()));

        // Resolve winery details for stops of type "winery"
        List<RouteWineryInfo> wineryInfos = resolveWineryInfos(route);

        return WineRouteDetailsResponse.fromDomainWithWineries(route, wineryInfos);
    }

    private List<RouteWineryInfo> resolveWineryInfos(WineRoute route) {
        Map<String, String> names = new LinkedHashMap<>();
        for (RouteStop stop : route.getStops()) {
            if ("winery".equalsIgnoreCase(stop.getType()) && Objects.nonNull(stop.getName()) && !stop.getName().isBlank()) {
                names.putIfAbsent(stop.getName().toLowerCase(Locale.ROOT), stop.getName());
            }
        }
        if (names.isEmpty()) {
            return List.of();
        }
        try {
            Map<String, WineryQueryPort.WineryDetailData> matches = new LinkedHashMap<>();
            for (var data : wineryQueryPort.findByExactNames(List.copyOf(names.values()))) {
                matches.putIfAbsent(data.name().toLowerCase(Locale.ROOT), data);
            }
            List<RouteWineryInfo> result = new ArrayList<>();
            for (String name : names.keySet()) {
                var data = matches.get(name);
                if (Objects.nonNull(data)) {
                    result.add(new RouteWineryInfo(data.id(), data.name(), data.country(), data.region(),
                            data.subregion(), data.description(), data.websiteUrl(), data.logoUrl(),
                            data.established(), data.email(), data.phone(), data.address()));
                }
            }
            return result;
        } catch (Exception e) {
            // Optional enrichment must not prevent reading the route and its own stops.
            return List.of();
        }
    }
}

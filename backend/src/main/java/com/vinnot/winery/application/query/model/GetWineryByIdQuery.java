package com.vinnot.winery.application.query.model;

import com.vinnot.shared.application.query.Query;
import com.vinnot.winery.application.query.response.WineryDetailsResponse;

import java.util.UUID;

/**
 * Query to get winery details by ID.
 *
 * @param wineryId the winery ID
 */
public record GetWineryByIdQuery(UUID wineryId) implements Query<WineryDetailsResponse> {
}


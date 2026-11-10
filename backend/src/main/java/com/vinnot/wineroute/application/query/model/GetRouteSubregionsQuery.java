package com.vinnot.wineroute.application.query.model;

/**
 * Query to get subregions by country and region.
 */
public record GetRouteSubregionsQuery(String country, String region) {
}


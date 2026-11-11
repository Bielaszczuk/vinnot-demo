package com.vinnot.community.application.query.response;

import com.vinnot.community.application.port.out.SocialQueryPort.WineRow;

import java.util.UUID;

/** The wine of a review or a cellar entry on a social screen. */
public record WineSummary(UUID id, String name, String imageUrl, String type, String wineryName) {
    static WineSummary from(WineRow wine) {
        return new WineSummary(wine.id(), wine.name(), wine.imageUrl(), wine.type(), wine.wineryName());
    }
}

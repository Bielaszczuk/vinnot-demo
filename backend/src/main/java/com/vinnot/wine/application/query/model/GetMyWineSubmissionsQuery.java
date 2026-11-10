package com.vinnot.wine.application.query.model;

import java.util.UUID;

public record GetMyWineSubmissionsQuery(UUID userId, int page, int size) {
}

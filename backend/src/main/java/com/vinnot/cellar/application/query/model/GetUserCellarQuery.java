package com.vinnot.cellar.application.query.model;

import java.util.UUID;

public record GetUserCellarQuery(UUID userId, int page, int size) {
}


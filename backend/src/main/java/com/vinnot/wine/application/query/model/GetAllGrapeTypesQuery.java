package com.vinnot.wine.application.query.model;

import com.vinnot.shared.application.query.Query;
import com.vinnot.wine.application.query.response.GrapeTypeResponse;

import java.util.List;

public record GetAllGrapeTypesQuery() implements Query<List<GrapeTypeResponse>> {
}


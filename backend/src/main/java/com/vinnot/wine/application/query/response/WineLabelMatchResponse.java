package com.vinnot.wine.application.query.response;

public record WineLabelMatchResponse(
        WineSummaryResponse wine,
        double score
) {
}

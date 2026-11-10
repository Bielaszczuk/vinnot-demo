package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.wine.application.port.in.GetWineHighlightsUseCase;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.query.model.GetWineHighlightsQuery;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GetWineHighlightsQueryHandler implements GetWineHighlightsUseCase {

    private static final int MAX_HIGHLIGHTS = 10;
    private final WineRepositoryPort wines;

    @Override
    @Transactional(readOnly = true)
    public List<WineSummaryResponse> execute(GetWineHighlightsQuery query) {
        if (query.limit() <= 0) {
            throw new DomainException("INVALID_RESULT_LIMIT", "Result limit must be greater than zero");
        }
        return wines.findHighlights(Math.min(query.limit(), MAX_HIGHLIGHTS)).stream()
                .map(WineSummaryResponse::fromDomain)
                .toList();
    }
}

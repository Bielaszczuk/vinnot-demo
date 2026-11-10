package com.vinnot.cellar.application.query.handler;

import com.vinnot.cellar.application.port.in.GetUserCellarUseCase;
import com.vinnot.cellar.application.port.out.CellarWineRepositoryPort;
import com.vinnot.cellar.application.port.out.WineQueryPort;
import com.vinnot.cellar.application.port.out.ReviewQueryPort;
import com.vinnot.cellar.application.port.out.WineQueryPort.WineDetailData;
import com.vinnot.cellar.application.query.model.GetUserCellarQuery;
import com.vinnot.cellar.application.query.response.CellarWineResponse;
import com.vinnot.cellar.domain.model.CellarWine;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GetUserCellarQueryHandler implements GetUserCellarUseCase {
    // Existing web/native clients and command responses use this bounded legacy window.
    private static final int LEGACY_WINDOW_SIZE = 1000;
    private static final int DATABASE_PAGE_SIZE = 200;

    private final CellarWineRepositoryPort cellarWineRepository;
    private final WineQueryPort wineQueryPort;
    private final ReviewQueryPort reviewQueryPort;

    @Override
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public PageResult<CellarWineResponse> execute(GetUserCellarQuery query) {
        PageResult<CellarWine> cellarPage = loadWindow(query);
        Map<UUID, WineDetailData> winesById = wineQueryPort.findAllByIds(
                        cellarPage.content().stream().map(CellarWine::getWineId).toList())
                .stream().collect(Collectors.toMap(WineDetailData::id, wine -> wine));
        Map<UUID, UUID> reviewsByWineId = reviewQueryPort.findReviewIds(query.userId(),
                cellarPage.content().stream().map(CellarWine::getWineId).toList());
        return cellarPage.map(cellarWine -> CellarWineResponse.fromDomain(
                cellarWine,
                Optional.ofNullable(winesById.get(cellarWine.getWineId()))
                        .map(this::toWineInfo)
                        .orElse(null), reviewsByWineId.get(cellarWine.getWineId())));
    }

    private PageResult<CellarWine> loadWindow(GetUserCellarQuery query) {
        if (query.size() != LEGACY_WINDOW_SIZE) {
            return cellarWineRepository.findByUserId(query.userId(),
                    PageQuery.of(query.page(), query.size(), "id", PageQuery.SortDirection.ASC));
        }
        if (query.page() < 0
                || (long) query.page() * LEGACY_WINDOW_SIZE > Integer.MAX_VALUE - (long) LEGACY_WINDOW_SIZE) {
            throw new BusinessRuleViolationException("INVALID_PAGINATION", "Cellar page offset is outside the supported range");
        }
        int pagesPerWindow = LEGACY_WINDOW_SIZE / DATABASE_PAGE_SIZE;
        List<CellarWine> entries = new ArrayList<>();
        long total = 0;
        for (int index = 0; index < pagesPerWindow; index++) {
            int page = query.page() * pagesPerWindow + index;
            PageResult<CellarWine> batch = cellarWineRepository.findByUserId(query.userId(),
                    PageQuery.of(page, DATABASE_PAGE_SIZE, "id", PageQuery.SortDirection.ASC));
            entries.addAll(batch.content());
            total = batch.totalElements();
            if ((long) (page + 1) * DATABASE_PAGE_SIZE >= total) {
                break;
            }
        }
        return PageResult.of(List.copyOf(entries), query.page(), query.size(), total);
    }

    private CellarWineResponse.WineInfo toWineInfo(WineDetailData data) {
        return new CellarWineResponse.WineInfo(
                data.id(),
                data.name(),
                data.vintage(),
                data.wineType(),
                data.style(),
                data.grapes(),
                data.wineryName(),
                data.region(),
                data.country(),
                data.priceMin(),
                data.priceMax(),
                data.imageUrl(),
                data.ratingAverage()
        );
    }
}

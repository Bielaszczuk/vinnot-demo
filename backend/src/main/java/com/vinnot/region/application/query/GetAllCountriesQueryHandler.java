package com.vinnot.region.application.query;

import com.vinnot.region.application.dto.CountryResponse;
import com.vinnot.region.application.port.in.GetAllCountriesUseCase;
import com.vinnot.region.domain.repository.CountryRepository;
import com.vinnot.shared.application.query.QueryHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GetAllCountriesQueryHandler implements
        QueryHandler<GetAllCountriesQuery, List<CountryResponse>>,
        GetAllCountriesUseCase {

    private final CountryRepository countryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CountryResponse> handle(GetAllCountriesQuery query) {
        return countryRepository.findAll().stream()
                .map(CountryResponse::fromDomain)
                .sorted((a, b) -> a.name().compareToIgnoreCase(b.name()))
                .toList();
    }

    @Override
    public List<CountryResponse> getAllCountries() {
        return handle(new GetAllCountriesQuery());
    }
}

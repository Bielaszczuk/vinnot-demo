package com.vinnot.cellar.infrastructure.web.controller;

import java.math.BigDecimal;
import com.vinnot.cellar.application.command.model.AddWineToCellarCommand;
import com.vinnot.cellar.application.command.model.UpdateCellarEntryCommand;
import com.vinnot.cellar.application.port.in.AddWineToCellarUseCase;
import com.vinnot.cellar.application.port.in.GetCellarStatsUseCase;
import com.vinnot.cellar.application.port.in.GetUserCellarUseCase;
import com.vinnot.cellar.application.port.in.RemoveWineFromCellarUseCase;
import com.vinnot.cellar.application.port.in.UpdateCellarEntryUseCase;
import com.vinnot.cellar.application.query.model.GetUserCellarQuery;
import com.vinnot.cellar.infrastructure.web.request.AddWineToCellarRequest;
import com.vinnot.cellar.infrastructure.web.request.UpdateCellarEntryRequest;
import com.vinnot.shared.domain.valueobject.PageResult;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CellarControllerTest {

    private final AddWineToCellarUseCase addWineToCellarUseCase = mock(AddWineToCellarUseCase.class);
    private final UpdateCellarEntryUseCase updateCellarEntryUseCase = mock(UpdateCellarEntryUseCase.class);
    private final GetUserCellarUseCase getUserCellarUseCase = mock(GetUserCellarUseCase.class);
    private final CellarController controller = new CellarController(
            addWineToCellarUseCase,
            mock(RemoveWineFromCellarUseCase.class),
            updateCellarEntryUseCase,
            getUserCellarUseCase,
            mock(GetCellarStatsUseCase.class));

    @Test
    void addAndUpdatePassTheTastedVintageAndClearFlagToTheCommands() {
        UUID userId = UUID.randomUUID();
        UUID wineId = UUID.randomUUID();
        UUID entryId = UUID.randomUUID();
        when(getUserCellarUseCase.execute(any(GetUserCellarQuery.class)))
                .thenReturn(PageResult.of(List.of(), 0, 1000, 0));

        controller.addWine(userId.toString(), new AddWineToCellarRequest(wineId, null, null, null, 2018));
        controller.updateEntry(entryId, userId.toString(), new UpdateCellarEntryRequest(new BigDecimal("4"), null, null, 2019, null));
        controller.updateEntry(entryId, userId.toString(), new UpdateCellarEntryRequest(null, null, null, null, true));

        ArgumentCaptor<AddWineToCellarCommand> added = ArgumentCaptor.forClass(AddWineToCellarCommand.class);
        verify(addWineToCellarUseCase).execute(added.capture());
        assertThat(added.getValue().vintage()).isEqualTo(2018);
        ArgumentCaptor<UpdateCellarEntryCommand> updated = ArgumentCaptor.forClass(UpdateCellarEntryCommand.class);
        verify(updateCellarEntryUseCase, times(2)).execute(updated.capture());
        assertThat(updated.getAllValues().get(0).vintage()).isEqualTo(2019);
        assertThat(updated.getAllValues().get(0).clearVintage()).isFalse();
        assertThat(updated.getAllValues().get(1).vintage()).isNull();
        assertThat(updated.getAllValues().get(1).clearVintage()).isTrue();
    }

    @Test
    void vintageRequestBoundsMatchTheCatalogVintage() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            Validator validator = factory.getValidator();
            for (Class<?> type : List.of(AddWineToCellarRequest.class, UpdateCellarEntryRequest.class)) {
                for (Integer valid : new Integer[] {null, 1800, 2100}) {
                    assertThat(validator.validateValue(type, "vintage", valid)).as("%s %s", type, valid).isEmpty();
                }
                assertThat(validator.validateValue(type, "vintage", 1799)).isNotEmpty();
                assertThat(validator.validateValue(type, "vintage", 2101)).isNotEmpty();
            }
        }
    }
}

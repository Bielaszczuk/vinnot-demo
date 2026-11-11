package com.vinnot.community.application.command.handler;

import com.vinnot.community.application.command.model.AdjustTasteTraitsCommand;
import com.vinnot.community.application.command.model.ResetTasteTraitsCommand;
import com.vinnot.community.application.port.out.TasteAdjustmentRepositoryPort;
import com.vinnot.community.domain.exception.InvalidTasteAdjustmentException;
import com.vinnot.community.domain.model.TasteAdjustment;
import com.vinnot.community.domain.model.TasteTrait;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/** #541 S11: adjusting stores only a validated partial change; resetting clears every manual value. */
class TasteAdjustmentCommandHandlersTest {
    private final UUID member = UUID.randomUUID();
    private final TasteAdjustmentRepositoryPort adjustments = mock(TasteAdjustmentRepositoryPort.class);

    @Test
    void adjustingStoresTheValidatedChange() {
        Map<String, Object> structure = new HashMap<>();
        structure.put("ACIDITY", 80);
        structure.put("BODY", null);

        new AdjustTasteTraitsCommandHandler(adjustments).execute(new AdjustTasteTraitsCommand(member, structure));

        ArgumentCaptor<TasteAdjustment> adjustment = ArgumentCaptor.forClass(TasteAdjustment.class);
        verify(adjustments).save(eq(member), adjustment.capture());
        assertThat(adjustment.getValue().scores()).containsExactly(Map.entry(TasteTrait.ACIDITY, 80));
        assertThat(adjustment.getValue().cleared()).containsExactly(TasteTrait.BODY);
    }

    @Test
    void anInvalidChangeIsRejectedBeforeAnythingIsStored() {
        assertThatThrownBy(() -> new AdjustTasteTraitsCommandHandler(adjustments).execute(
                new AdjustTasteTraitsCommand(member, Map.of("ACIDITY", 101))))
                .isInstanceOf(InvalidTasteAdjustmentException.class);
        verifyNoInteractions(adjustments);
    }

    @Test
    void resettingClearsEveryManualValue() {
        new ResetTasteTraitsCommandHandler(adjustments).execute(new ResetTasteTraitsCommand(member));
        verify(adjustments).clear(member);
    }
}

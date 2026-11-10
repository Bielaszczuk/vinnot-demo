package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.ContentPillarResponse;
import com.vinnot.marketing.application.port.in.ManageContentPillarsUseCase;
import com.vinnot.marketing.application.port.out.ContentPillarCatalog;
import com.vinnot.marketing.domain.exception.LastRotatingPillarException;
import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/** The admin's pillar switches (#510): auto-approval of its pending posts, and whether the planner plans it at all. */
@Service
@RequiredArgsConstructor
public class ContentPillarAdminService implements ManageContentPillarsUseCase {
    private final ContentPillarCatalog pillars;
    private final PillarPerformanceService performance;

    @Override
    public ContentPillarResponse setAutoApprove(String code, boolean enabled) {
        pillars.setAutoApprove(code, enabled);
        return find(code);
    }

    @Override
    public ContentPillarResponse setActive(String code, boolean enabled) {
        if (!enabled && isLastActiveRotatingPillar(code)) {
            throw new LastRotatingPillarException(code);
        }
        pillars.setActive(code, enabled);
        return find(code);
    }

    /** Whether switching this pillar off would leave the planner without a rotating pillar (APP_FEATURE needs company). */
    private boolean isLastActiveRotatingPillar(String code) {
        List<ContentPillar> all = pillars.all();
        boolean rotating = all.stream().anyMatch(pillar -> pillar.code().equals(code) && rotatesFreely(pillar));
        return rotating && all.stream().noneMatch(pillar -> !pillar.code().equals(code) && pillar.active() && rotatesFreely(pillar));
    }

    private static boolean rotatesFreely(ContentPillar pillar) {
        return pillar.rotates() && !ContentPillar.APP_FEATURE.equals(pillar.code());
    }

    private ContentPillarResponse find(String code) {
        return performance.present(pillars.all()).stream().filter(pillar -> pillar.code().equals(code)).findFirst()
                .orElseThrow(() -> new EntityNotFoundException("ContentPillar", code));
    }
}

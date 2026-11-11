package com.vinnot.community.infrastructure.ai;

import com.vinnot.ai.application.port.in.ClassifySensoryFamiliesUseCase;
import com.vinnot.community.application.port.out.SensoryFamilyPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Set;

/** Classifies descriptors through the ai module, which owns the illustrated notes and their families. */
@Component
@RequiredArgsConstructor
public class AiSensoryFamilyAdapter implements SensoryFamilyPort {
    private final ClassifySensoryFamiliesUseCase classifier;

    @Override
    public Set<String> familiesOf(Collection<String> descriptors) {
        return classifier.classify(descriptors);
    }
}

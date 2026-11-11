package com.vinnot.ai.application.service;

import com.vinnot.ai.application.port.in.ClassifySensoryFamiliesUseCase;
import com.vinnot.ai.domain.model.SensoryFamily;
import com.vinnot.ai.domain.model.SensoryNote;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/** Classifies each descriptor into its illustrated note and the note into its family, without calling any AI. */
@Service
public class SensoryFamilyClassificationService implements ClassifySensoryFamiliesUseCase {

    @Override
    public Set<String> classify(Collection<String> descriptors) {
        Set<SensoryFamily> families = EnumSet.noneOf(SensoryFamily.class);
        if (Objects.nonNull(descriptors)) {
            descriptors.stream()
                    .map(SensoryNote::fromDescriptor)
                    .flatMap(Optional::stream)
                    .map(SensoryFamily::of)
                    .flatMap(Optional::stream)
                    .forEach(families::add);
        }
        Set<String> keys = new LinkedHashSet<>();
        families.forEach(family -> keys.add(family.name()));
        return keys;
    }
}

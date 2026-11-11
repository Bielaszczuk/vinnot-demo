package com.vinnot.ai.application.port.in;

import java.util.Collection;
import java.util.Set;

/** Groups free-text aroma and flavor descriptors, in any supported language, into aroma families (#541). */
public interface ClassifySensoryFamiliesUseCase {

    /**
     * @param descriptors aroma or flavor descriptors such as "Cereza negra" or "Toasted oak"; blank, missing or
     *                    unknown ones are ignored
     * @return the family keys (FRUIT, FLORAL, HERBAL, SPICE, OAK, MINERAL) at least one descriptor belongs to, in
     *         that order
     */
    Set<String> classify(Collection<String> descriptors);
}

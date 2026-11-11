package com.vinnot.community.application.port.out;

import java.util.Collection;
import java.util.Set;

/** The aroma families of a wine's aroma and flavor descriptors (#541). */
public interface SensoryFamilyPort {

    /** @return family keys such as FRUIT or OAK; empty when no descriptor belongs to a family */
    Set<String> familiesOf(Collection<String> descriptors);
}

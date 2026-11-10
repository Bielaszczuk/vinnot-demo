package com.vinnot.marketing.application.port.out;

import com.vinnot.shared.application.port.ReferenceImage;

import java.util.List;

/** The app illustrations sent as style references with every hero request (#492); empty when none can be loaded. */
public interface StyleReferenceCatalog {
    List<ReferenceImage> references();
}

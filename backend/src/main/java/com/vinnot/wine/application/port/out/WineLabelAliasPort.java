package com.vinnot.wine.application.port.out;

import com.vinnot.wine.domain.model.WineLabelAliasCategory;

public interface WineLabelAliasPort {

    String canonicalize(WineLabelAliasCategory category, String value);
}

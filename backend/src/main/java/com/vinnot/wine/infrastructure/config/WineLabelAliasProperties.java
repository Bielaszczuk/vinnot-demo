package com.vinnot.wine.infrastructure.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.wine-label.aliases")
public class WineLabelAliasProperties {

    private Map<String, String> wineries = new LinkedHashMap<>();
    private Map<String, String> grapes = new LinkedHashMap<>();
    private Map<String, String> regions = new LinkedHashMap<>();
}

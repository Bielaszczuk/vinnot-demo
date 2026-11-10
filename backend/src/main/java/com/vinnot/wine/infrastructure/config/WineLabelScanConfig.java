package com.vinnot.wine.infrastructure.config;

import com.vinnot.wine.domain.service.WineLabelMatchScorer;
import com.vinnot.wine.application.service.WineLabelScanPolicy;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(WineLabelRecognitionProperties.class)
public class WineLabelScanConfig {

    @Bean
    WineLabelMatchScorer wineLabelMatchScorer() {
        return new WineLabelMatchScorer();
    }

    @Bean
    WineLabelScanPolicy wineLabelScanPolicy() {
        return new WineLabelScanPolicy();
    }
}

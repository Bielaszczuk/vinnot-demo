package com.vinnot.wine.infrastructure.config;

import com.vinnot.wine.application.command.handler.ScanWineLabelCommandHandler;
import com.vinnot.wine.domain.service.WineLabelMatchScorer;
import com.vinnot.wine.application.service.WineLabelScanPolicy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.ThreadPoolExecutor;

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

    /**
     * Lets a scan's local lookup and label recognition overlap. It has no queue: when every thread is busy the work
     * runs on the scan's own request thread instead, so a busy server loses the overlap but never drops a scan.
     */
    @Bean(name = ScanWineLabelCommandHandler.SCAN_EXECUTOR)
    ThreadPoolTaskExecutor wineLabelScanExecutor(@Value("${app.wine-label.scan-threads:8}") int threads) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(threads);
        executor.setMaxPoolSize(threads);
        executor.setQueueCapacity(0);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setThreadNamePrefix("wine-label-scan-");
        // Scans still in flight while the server shuts down finish instead of losing their work.
        executor.setAcceptTasksAfterContextClose(true);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(20);
        executor.initialize();
        return executor;
    }
}

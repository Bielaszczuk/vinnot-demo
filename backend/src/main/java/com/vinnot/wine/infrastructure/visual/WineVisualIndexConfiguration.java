package com.vinnot.wine.infrastructure.visual;

import com.vinnot.wine.application.port.out.WineImageEmbeddingPort;
import com.vinnot.wine.application.port.out.WineVisualIndexPort;
import com.vinnot.wine.application.service.WineVisualIndexService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class WineVisualIndexConfiguration {

    @Bean
    WineVisualIndexPort wineVisualIndex(WineImageEmbeddingPort embeddings) {
        return new InMemoryWineVisualIndex(embeddings.dimensions());
    }

    /**
     * Runs a scan's visual search beside label recognition. It is small and bounded: when it is full the scan just
     * goes on without visual candidates instead of queueing behind other scans.
     */
    @Bean(name = WineVisualIndexService.SEARCH_EXECUTOR)
    ThreadPoolTaskExecutor wineVisualSearchExecutor(
            @Value("${app.wine-label.visual-index.search-threads:2}") int threads,
            @Value("${app.wine-label.visual-index.search-queue:4}") int queue) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(threads);
        executor.setMaxPoolSize(threads);
        executor.setQueueCapacity(queue);
        executor.setThreadNamePrefix("wine-visual-search-");
        executor.initialize();
        return executor;
    }
}

package com.vinnot.shared.infrastructure.config;

import com.vinnot.payment.infrastructure.config.PaymentSettlementConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/** #405: one slow scheduled job (an outbox drain, a receipts check) must not hold every other scheduled job back. */
class SchedulingPoolTest {
    @Test
    void theSharedSchedulerHasSeveralThreadsByDefault() throws IOException {
        var environment = new StandardEnvironment();
        new YamlPropertySourceLoader().load("application", new ClassPathResource("application.yml"))
                .forEach(source -> environment.getPropertySources().addLast(source));

        assertThat(environment.getProperty("spring.task.scheduling.pool.size", Integer.class)).isGreaterThan(1);
    }

    @Test
    void theDefaultSchedulerOfThePaymentConfigurationRunsAJobWhileAnotherIsBlocked() throws InterruptedException {
        var scheduler = new PaymentSettlementConfiguration().defaultTaskScheduler();
        scheduler.initialize();
        var blocking = new CountDownLatch(1);
        var started = new CountDownLatch(1);
        var other = new CountDownLatch(1);
        try {
            assertThat(scheduler.getScheduledThreadPoolExecutor().getCorePoolSize()).isEqualTo(4);
            scheduler.execute(() -> {
                started.countDown();
                try {
                    blocking.await(10, TimeUnit.SECONDS);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                }
            });
            assertThat(started.await(5, TimeUnit.SECONDS)).isTrue();
            scheduler.execute(other::countDown);

            assertThat(other.await(5, TimeUnit.SECONDS)).as("a second job runs while the first is blocked").isTrue();
        } finally {
            blocking.countDown();
            scheduler.shutdown();
        }
    }
}

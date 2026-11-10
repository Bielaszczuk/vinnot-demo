package com.vinnot.notification.infrastructure.feedback;

import com.vinnot.notification.application.port.in.RecordEmailFeedbackUseCase;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import software.amazon.awssdk.services.sqs.SqsClient;
import tools.jackson.databind.ObjectMapper;

/** Active only when a feedback queue is configured; without one the app sends exactly as before. */
@Configuration
@ConditionalOnExpression("!'${app.notifications.feedback.queue-url:}'.isBlank()")
public class EmailFeedbackConfiguration {

    // Long polls must not delay the outbox, retention or other maintenance on the shared scheduler.
    @Bean(name = "emailFeedbackTaskScheduler")
    public ThreadPoolTaskScheduler emailFeedbackTaskScheduler() {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("email-feedback-");
        scheduler.setRemoveOnCancelPolicy(true);
        return scheduler;
    }

    @Bean
    public SqsEmailFeedbackPoller sqsEmailFeedbackPoller(SqsClient sqsClient,
            @Value("${app.notifications.feedback.queue-url}") String queueUrl, ObjectMapper mapper,
            RecordEmailFeedbackUseCase feedback) {
        return new SqsEmailFeedbackPoller(sqsClient, queueUrl.trim(), new SesFeedbackEvents(mapper), feedback);
    }
}

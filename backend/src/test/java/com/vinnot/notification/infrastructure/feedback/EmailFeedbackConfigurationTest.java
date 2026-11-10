package com.vinnot.notification.infrastructure.feedback;

import com.vinnot.notification.application.port.in.RecordEmailFeedbackUseCase;
import com.vinnot.shared.infrastructure.config.AwsServiceClientConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.convert.ApplicationConversionService;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import software.amazon.awssdk.services.sqs.SqsClient;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class EmailFeedbackConfigurationTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withInitializer(context -> context.getBeanFactory()
                    .setConversionService(ApplicationConversionService.getSharedInstance()))
            .withUserConfiguration(AwsServiceClientConfiguration.class, EmailFeedbackConfiguration.class)
            .withBean(ObjectMapper.class, ObjectMapper::new)
            .withBean(RecordEmailFeedbackUseCase.class, () -> mock(RecordEmailFeedbackUseCase.class));

    @Test
    void withoutAQueueNothingPollsAndNoSqsClientIsBuilt() {
        runner.run(context -> assertThat(context).doesNotHaveBean(SqsClient.class)
                .doesNotHaveBean(SqsEmailFeedbackPoller.class));
        runner.withPropertyValues("app.notifications.feedback.queue-url= ")
                .run(context -> assertThat(context).doesNotHaveBean(SqsEmailFeedbackPoller.class));
    }

    @Test
    void aConfiguredQueueGetsAPollerOnItsOwnScheduler() {
        runner.withPropertyValues("app.notifications.feedback.queue-url=https://sqs.us-east-1.amazonaws.com/1/q")
                .run(context -> {
                    assertThat(context).hasSingleBean(SqsClient.class).hasSingleBean(SqsEmailFeedbackPoller.class)
                            .hasBean("emailFeedbackTaskScheduler");
                    assertThat(context.getBean(SqsEmailFeedbackPoller.class)).extracting("queueUrl")
                            .isEqualTo("https://sqs.us-east-1.amazonaws.com/1/q");
                });
    }
}

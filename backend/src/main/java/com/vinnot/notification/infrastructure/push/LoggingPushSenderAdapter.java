package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.application.port.out.PushSenderPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Local and test provider: logs how many pushes would be sent, never tokens or content. Every message gets a synthetic
 * accepted ticket and every receipt reads as delivered, so local metrics count sends the way the real provider would.
 */
public class LoggingPushSenderAdapter implements PushSenderPort {
    static final String TICKET_PREFIX = "log-";
    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingPushSenderAdapter.class);

    @Override
    public List<Ticket> send(List<Message> messages) {
        LOGGER.info("Push provider is log: {} push message(s) not sent", messages.size());
        return messages.stream().map(message -> new Ticket(message.token(), TICKET_PREFIX + UUID.randomUUID(), null)).toList();
    }

    @Override
    public Map<String, Receipt> receipts(Collection<String> ticketIds) {
        return ticketIds.stream().distinct().collect(Collectors.toMap(Function.identity(), id -> new Receipt(true, null)));
    }
}

package com.vinnot.shared.application.command;

/**
 * Interface for command handlers.
 * Handlers process commands and return results.
 *
 * @param <CommandType> the command type
 * @param <Result> the result type
 */
public interface CommandHandler<CommandType extends Command<Result>, Result> {

    /**
     * Handles the given command.
     *
     * @param command the command to handle
     * @return the result of the command execution
     */
    Result handle(CommandType command);
}

package com.vinnot.activity.application.port.in;

import com.vinnot.activity.application.command.model.RecordContentViewCommand;

/** Records a detail view. Content ids are not looked up: views of unknown content are kept and never match. */
public interface RecordContentViewUseCase {
    void execute(RecordContentViewCommand command);
}

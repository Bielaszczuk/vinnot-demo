package com.vinnot.wine.application.port.in;

import com.vinnot.wine.application.command.model.SubmitWineLabelScanFeedbackCommand;

/** Records what a member said about the result of one of their label scans; sending it again replaces it. */
public interface SubmitWineLabelScanFeedbackUseCase {

    void execute(SubmitWineLabelScanFeedbackCommand command);
}

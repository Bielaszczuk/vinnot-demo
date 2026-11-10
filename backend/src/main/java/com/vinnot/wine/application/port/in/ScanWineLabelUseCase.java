package com.vinnot.wine.application.port.in;

import com.vinnot.wine.application.command.model.ScanWineLabelCommand;
import com.vinnot.wine.application.query.response.WineLabelScanResponse;

public interface ScanWineLabelUseCase {

    WineLabelScanResponse execute(ScanWineLabelCommand command);
}

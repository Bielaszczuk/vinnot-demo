package com.vinnot.wine.application.port.out;

import com.vinnot.wine.domain.model.WineSubmission;

public interface WineSubmissionNotificationPort {
    void notifyStatusChanged(WineSubmission submission);
}

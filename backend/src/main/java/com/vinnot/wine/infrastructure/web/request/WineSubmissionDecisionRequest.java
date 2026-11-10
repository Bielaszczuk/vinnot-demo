package com.vinnot.wine.infrastructure.web.request;

import com.vinnot.wine.domain.model.WineSubmissionDecision;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class WineSubmissionDecisionRequest {

    @NotNull
    private WineSubmissionDecision decision;

    @NotBlank
    @Size(max = 500)
    private String reason;

    private UUID targetWineId;

    @Size(max = 255)
    private String wineName;

    @Size(max = 255)
    private String wineryName;

    @Size(max = 50)
    private String wineType;

    @Min(1800)
    @Max(Year.MAX_VALUE)
    private Integer vintage;

    @Size(max = 10)
    private List<@Size(max = 100) String> grapes = new ArrayList<>();

    @Size(max = 100)
    private String country;

    @Size(max = 100)
    private String region;

    @DecimalMin("0.0")
    @DecimalMax("100.0")
    private BigDecimal alcoholContent;
}

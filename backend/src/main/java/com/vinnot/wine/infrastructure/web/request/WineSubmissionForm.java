package com.vinnot.wine.infrastructure.web.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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
public class WineSubmissionForm {

    @NotBlank
    @Size(max = 255)
    private String wineName;

    @NotBlank
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

    @Size(max = 1000)
    private String notes;

    /** Catalog picks; each is optional and the matching text field keeps the name for older readers. */
    private UUID wineryId;

    private UUID countryId;

    private UUID regionId;
}

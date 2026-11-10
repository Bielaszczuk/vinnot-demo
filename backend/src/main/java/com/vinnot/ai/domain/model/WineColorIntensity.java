package com.vinnot.ai.domain.model;

/**
 * How deep the core of a wine's color reads in the glass, on the tasting grid's three steps. The profile text is
 * free; {@link WineColorTone#intensityFromDescription(String)} maps whatever words it uses for depth ("capa alta",
 * "deja ver el fondo de la copa", "casi negro") to one of these.
 */
public enum WineColorIntensity {
    PALE,
    MEDIUM,
    DEEP
}

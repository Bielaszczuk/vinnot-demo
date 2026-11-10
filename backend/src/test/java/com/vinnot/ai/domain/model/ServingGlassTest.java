package com.vinnot.ai.domain.model;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class ServingGlassTest {

    /** Real glassware lines from generated profiles, in both languages, and the glass each one shows. */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Copa flauta                                                                                         | FLUTE
            Copa para espumante                                                                                 | FLUTE
            Copa tulipa de espumoso, que permite apreciar la burbuja y concentrar los aromas.                   | SPARKLING_TULIP
            A tulip-shaped sparkling-wine glass helps retain the bubbles and express Syrah's aromas.            | SPARKLING_TULIP
            Use a tulip-shaped glass to focus the aromas and retain effervescence; avoid an overly narrow flute. | SPARKLING_TULIP
            Copa amplia tipo Borgoña                                                                            | RED_BALLOON
            Use a broad red-wine glass with a spacious bowl to let the dark fruit and spice unfold.             | RED_BALLOON
            Copa de tinto de tamaño medio, con cáliz amplio para desplegar los aromas.                          | RED_BALLOON
            A Pinot Noir glass with a broad bowl and slightly tapered rim helps express the aromas.             | RED_BALLOON
            Copa de vino tinto de gran tamaño                                                                   | RED_BALLOON
            Red wine glass                                                                                      | RED_BALLOON
            Use a large-bowled glass for structured reds, allowing room for the aromas to open.                 | RED_BALLOON
            Copa bordelesa                                                                                      | BORDEAUX
            Bordeaux glass                                                                                      | BORDEAUX
            Copa de vino tinto con forma de tulipa                                                              | BORDEAUX
            Copa para vino blanco                                                                               | WHITE_TULIP
            Copa mediana de vino blanco, con una abertura algo estrecha que concentre los aromas.               | WHITE_TULIP
            A medium-sized white-wine glass with a slightly tapered bowl concentrates the aromas.               | WHITE_TULIP
            Copa de vino blanco, preferiblemente con forma de tulipán para concentrar los aromas                | WHITE_TULIP
            A medium-sized Chardonnay glass with a slightly broad bowl and a moderately narrow opening.          | WHITE_BOWL
            Use a medium-sized white-wine glass with a slightly generous bowl to gather the aromas.             | WHITE_BOWL
            Vaso de vino blanco con boca amplia                                                                 | WHITE_BOWL
            Copa de blanco de tamaño medio, algo más amplia que una copa estrecha, para airear la fruta.        | WHITE_BOWL
            Copa para rosados                                                                                   | ROSE
            Rosé wine glass with a slightly flared lip                                                          | ROSE
            Use a small fortified-wine glass or a moderately sized white-wine glass to focus the aromas.        | DESSERT
            Copa pequeña de Oporto o copa de vino blanco de tamaño moderado.                                    | DESSERT
            Copa de postre                                                                                      | DESSERT
            Copa universal                                                                                      | UNIVERSAL
            ISO tasting glass                                                                                   | UNIVERSAL
            Copa de vino tinto estándar                                                                         | RED_BALLOON
            Standard white wine glass                                                                           | WHITE_TULIP
            """)
    void showsTheGlassTheGlasswareNames(String glassware, ServingGlass expected) {
        assertThat(ServingGlass.fromGlassware(glassware)).contains(expected);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"  ", "A medium-sized glass with a generous bowl.", "Copa de cristal fino"})
    void showsNoGlassWhenNeitherTheLineNorTheColorNameAWine(String glassware) {
        assertThat(ServingGlass.fromGlassware(glassware)).isEmpty();
    }

    /** A line that names no wine family takes it from the wine's color; its shape words still pick the glass. */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            A medium-sized glass with a generous bowl allows the aromas to open. | RED_RUBY_LIGHT | RED_BALLOON
            A tall glass with a narrow opening.                                  | RED_GARNET     | BORDEAUX
            Copa de cristal fino                                                 | RED_PURPLE     | RED_BALLOON
            A medium-sized glass with a generous bowl.                           | WHITE_GOLD     | WHITE_BOWL
            Copa de cristal fino                                                 | WHITE_STRAW    | WHITE_TULIP
            Copa de cristal fino                                                 | AMBER          | WHITE_TULIP
            Copa de cristal fino                                                 | ROSE_SALMON    | ROSE
            Copa de cristal fino                                                 | ROSE_RASPBERRY_LIGHT | ROSE
            Copa de cristal fino                                                 | WHITE_OLD_GOLD | WHITE_TULIP
            Copa de cristal fino                                                 | MAHOGANY       | DESSERT
            Copa para vino blanco                                                | RED_RUBY       | WHITE_TULIP
            Copa de cristal fino                                                 | RED_INKY       | RED_BALLOON
            Copa de cristal fino                                                 | ROSE_PEACH     | ROSE
            Copa de cristal fino                                                 | ORANGE         | WHITE_TULIP
            Copa de cristal fino                                                 | WHITE_WATER    | WHITE_TULIP
            Copa de cristal fino                                                 | WHITE_BROWN    | DESSERT
            """)
    void fallsBackToTheWineColorForTheFamily(String glassware, WineColorTone color, ServingGlass expected) {
        assertThat(ServingGlass.of(glassware, color)).contains(expected);
    }
}

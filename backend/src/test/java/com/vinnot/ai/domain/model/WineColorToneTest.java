package com.vinnot.ai.domain.model;

import java.util.Arrays;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class WineColorToneTest {

    /** Real color lines from production profiles, in both languages, and the glass each one shows. */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Amarillo pálido con destellos verdosos.                                         | WHITE_STRAW
            Pale yellow with greenish highlights.                                           | WHITE_STRAW
            Amarillo verdoso pálido, de aspecto fresco.                                     | WHITE_GREEN
            Amarillo pajizo pálido, con reflejos verdosos y un leve destello dorado.         | WHITE_STRAW
            Amarillo pajizo con reflejos verdosos, acorde con un blanco de perfil fresco.    | WHITE_STRAW
            Straw yellow with soft golden highlights, in keeping with an aromatic white wine.| WHITE_STRAW
            Amarillo dorado de intensidad media, acorde con la madurez de la fruta.          | WHITE_GOLD
            Intense golden yellow.                                                          | WHITE_GOLD
            Amarillo dorado pálido, con reflejos verdosos que conservan una impresión fresca.| WHITE_GOLD
            Naranja cobrizo con reflejos ámbar, acorde con el estilo naranjo de Moscatel.    | ORANGE
            Coppery orange with amber glints, consistent with a Moscatel orange-wine style.  | ORANGE
            Caoba oscuro con ribete ámbar verdoso.                                          | MAHOGANY
            Dark mahogany with an olive-green rim.                                          | MAHOGANY
            Rosa pálido con destellos brillantes.                                           | ROSE_PALE
            Pale pink with bright highlights.                                               | ROSE_PALE
            Rosa frambuesa claro, con reflejos cereza y matices salmón en el borde.          | ROSE_RASPBERRY_LIGHT
            Medium raspberry pink with violet reflections, in keeping with a fruit-led rosé. | ROSE_RASPBERRY
            Salmón pálido con reflejos cobrizos.                                            | ROSE_SALMON
            Rosa salmón intenso, con un borde más claro.                                    | ROSE_SALMON
            Deep salmon pink with a lighter rim.                                            | ROSE_SALMON
            Rosa salmón profundo y luminoso.                                                | ROSE_SALMON
            Pale salmon pink with copper glints.                                            | ROSE_SALMON
            Rojo violáceo profundo, con reflejos púrpura propios de un Malbec joven.         | RED_PURPLE
            Deep purplish red with purple highlights typical of a young Malbec.             | RED_PURPLE
            Rojo púrpura profundo, con ribete violáceo.                                     | RED_PURPLE
            Rojo rubí claro, con reflejos granate en el borde, propio de un Pinot Noir.      | RED_RUBY_LIGHT
            Light ruby red, with cherry-toned reflections at the rim.                       | RED_RUBY_LIGHT
            Rojo rubí brillante.                                                            | RED_RUBY
            Rojo rubí de intensidad media, con reflejos violáceos juveniles.                | RED_RUBY
            Medium-intensity ruby red, with garnet reflections at the rim.                  | RED_RUBY
            Rojo profundo con matices violáceos.                                            | RED_RUBY_DEEP
            Rojo rubí intenso con matices granate.                                          | RED_RUBY_DEEP
            Deep ruby red with violet highlights, typical of a ripe-fruited Malbec.         | RED_RUBY_DEEP
            Rojo granate con ribete anaranjado.                                             | RED_GARNET
            Garnet red with an orange rim.                                                  | RED_GARNET
            Rojo teja con ribete ocre.                                                      | RED_TAWNY
            Tawny brick red with an amber rim.                                              | RED_TAWNY
            Ámbar profundo, con reflejos caoba que corresponden a su estilo concentrado.     | AMBER_DARK
            Ámbar dorado, con reflejos cobrizos propios del estilo naranjo.                 | AMBER
            Rojo granate de intensidad media, con reflejos teja en los bordes.              | RED_GARNET
            Rosa tenue con matiz salmón.                                                    | ROSE_PALE
            Rosa frambuesa intenso, con matiz cobrizo tenue en el borde.                     | ROSE_DEEP
            Rojo rubí violáceo, propio de un espumoso elaborado con Syrah.                  | RED_PURPLE
            Amarillo pálido a dorado, con el matiz condicionado por el estilo.              | WHITE_GOLD
            Pale rosé with salmon-hued highlights.                                          | ROSE_PALE
            Rojo cereza de intensidad media, con borde rubí y reflejos granate.              | RED_CHERRY
            Medium cherry red with a ruby rim.                                              | RED_CHERRY
            Rojo cereza oscuro, con ribete granate y reflejos limpios.                      | RED_RUBY_DEEP
            Rojo cereza claro, de capa ligera, con borde rubí.                              | RED_RUBY_LIGHT
            Centro cereza oscura con matiz granate; el borde se aclara hacia el rubí.        | RED_RUBY_DEEP
            Centro de tono picota oscuro con matices púrpura.                               | RED_RUBY_DEEP
            Deep black cherry red with a purple rim.                                        | RED_RUBY_DEEP
            Amarillo limón pálido, con destellos verdosos y un borde luminoso.              | WHITE_LEMON
            Pale lemon yellow with steely glints.                                           | WHITE_LEMON
            Rosa fresa de intensidad media, con borde más claro.                            | ROSE_RASPBERRY
            Rosa coral pálido, con reflejos cobrizos.                                       | ROSE_CORAL
            A deep, nearly opaque purple core has a ruby rim and violet reflections.        | RED_PURPLE
            Deep, nearly opaque purple core, with a violet rim and garnet glints.           | RED_PURPLE
            Translucent, medium-intensity cherry red, with a ruby rim and garnet glints.    | RED_CHERRY
            Rojo cereza translúcido, de intensidad tenue, con borde rubí claro.             | RED_RUBY_LIGHT
            Moderate-intensity cherry red, translucent at the core and lighter toward the rim. | RED_CHERRY
            An intense cherry-red core fades to a slightly lighter ruby rim with garnet glints. | RED_RUBY_DEEP
            A medium-intensity cherry-ruby core remains visibly translucent, lightening to a faint garnet rim. | RED_CHERRY
            Rojo cereza de intensidad media-baja, translúcido en el centro.                 | RED_RUBY_LIGHT
            Medium-low-intensity cherry red, with a translucent core.                       | RED_RUBY_LIGHT
            """)
    void picksTheGlassFromTheMainHueOfTheColorLine(String color, WineColorTone expected) {
        assertThat(WineColorTone.fromDescription(color)).contains(expected);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "Brillante y limpio.", "Bright and clear.", "Brillante, con reflejos verdosos."})
    void leavesTheGlassOutWhenTheLineNamesNoHue(String color) {
        assertThat(WineColorTone.fromDescription(color)).isEmpty();
    }

    /** The rim is the first nuance after the main hue that names a different tone of the same wine family. */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Rojo granate de intensidad media, con reflejos teja en los bordes.              | RED_TAWNY
            Rojo granate con ribete anaranjado.                                             | RED_BRICK
            Rojo rubí de intensidad media, con reflejos violáceos juveniles.                | RED_PURPLE
            Rojo rubí intenso con matices granate.                                          | RED_GARNET
            Medium-intensity ruby red, with garnet reflections at the rim.                  | RED_GARNET
            Rojo teja con ribete ocre.                                                      | AMBER
            Tawny brick red with an amber rim.                                              | AMBER
            Amarillo pajizo con reflejos verdosos, acorde con un blanco de perfil fresco.    | WHITE_GREEN
            Amarillo pálido con reflejos verdosos, acorde con un Sauvignon Blanc de perfil fresco. | WHITE_GREEN
            Pale yellow with greenish highlights.                                           | WHITE_GREEN
            Straw yellow with soft golden highlights, in keeping with an aromatic white wine.| WHITE_GOLD
            Amarillo dorado intenso, con reflejos anaranjados propios del estilo.           | ORANGE
            Rosa pálido con reflejos frambuesa.                                             | ROSE_RASPBERRY
            Rosa frambuesa claro, con reflejos cereza y matices salmón en el borde.          | ROSE_RASPBERRY
            Ámbar profundo, con reflejos caoba que corresponden a su estilo concentrado.     | MAHOGANY
            Caoba oscuro con ribete ámbar verdoso.                                          | AMBER
            Dark mahogany with an olive-green rim.                                          | WHITE_GREEN
            Salmón pálido con reflejos cobrizos.                                            | ROSE_COPPER
            Ámbar dorado, con reflejos cobrizos propios del estilo naranjo.                 | RED_TAWNY
            Deep amber with copper highlights, consistent with the concentrated Amontillado style. | RED_TAWNY
            Amarillo pajizo de intensidad media, con reflejos limón en el borde.            | WHITE_LEMON
            Amarillo limón pálido, con destellos acerados.                                  | WHITE_STEEL
            Rojo rubí de intensidad media, con borde cereza.                                | RED_CHERRY
            Rosa salmón claro, con reflejos frutilla en el borde.                           | ROSE_RASPBERRY
            Deep, nearly opaque purple core, with a violet rim and garnet glints.           | RED_GARNET
            A very dark, nearly opaque purple core shifts to violet-tinged ruby at the rim.  | RED_RUBY
            An intense cherry-red core fades to a slightly lighter ruby rim with garnet glints. | RED_RUBY
            """)
    void picksTheRimFromTheFirstDifferentNuance(String color, WineColorTone expected) {
        assertThat(WineColorTone.rimFromDescription(color)).contains(expected);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {
            "Rojo rubí brillante.",
            "Rojo violáceo profundo, con reflejos púrpura propios de un Malbec joven.",
            "Brillante y limpio, con reflejos intensos."})
    void leavesTheRimOutWhenNoNuanceNamesAnotherTone(String color) {
        assertThat(WineColorTone.rimFromDescription(color)).isEmpty();
    }

    /** Any light play the line names (reflections, glints, flashes, rim, brightness) shows as a glint on the stroke. */
    @ParameterizedTest
    @ValueSource(strings = {
            "Rojo rubí profundo con reflejos violáceos en el borde.",
            "Amarillo pálido con destellos verdosos.",
            "Rojo granate con ribete anaranjado.",
            "Rojo rubí brillante.",
            "Rojo profundo con matices violáceos.",
            "Deep ruby red with violet glints at the rim.",
            "Pale yellow with greenish highlights.",
            "Pale yellow with greenish hints",
            "Medium-intensity ruby red, with garnet reflections.",
            "Straw yellow with a golden sheen.",
            "Pale straw with glimmers of green",
            "Deep ruby red with violet hues"})
    void seesHighlightsWhenTheLineNamesAPlayOfLight(String color) {
        assertThat(WineColorTone.namesHighlights(color)).isTrue();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "Deep ruby red", "Rojo rubí intenso", "Rosa salmón", "Amarillo pajizo pálido.",
            "Rojo rubí intenso, sin reflejos."})
    void seesNoHighlightsInAPlainColorLine(String color) {
        assertThat(WineColorTone.namesHighlights(color)).isFalse();
    }

    /** Every reflection tone the line names after its main hue, in text order, the core's own tone included. */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Rojo rubí profundo, con reflejos violáceos y matices teja.                | RED_PURPLE RED_TAWNY
            Rojo granate con reflejos ladrillo y ribete ocre.                         | RED_BRICK AMBER
            Deep red with bluish glints.                                             | RED_PURPLE
            Rojo rubí intenso con reflejos cobrizos.                                  | RED_TAWNY
            Rojo rubí con ribete negruzco.                                            | RED_INKY
            Amarillo pálido, con reflejos verdosos y un leve destello dorado.         | WHITE_GREEN WHITE_GOLD
            Rojo violáceo profundo, con reflejos púrpura.                             | RED_PURPLE
            Rosa salmón pálido, con reflejos cobrizos sutiles.                        | ROSE_COPPER
            Ámbar profundo con reflejos cobrizos, propio del estilo del Amontillado.  | RED_TAWNY
            Amarillo pajizo con reflejos plateados.                                   | WHITE_STEEL
            Straw yellow with silvery and golden highlights.                         | WHITE_STEEL WHITE_GOLD
            Rosa salmón pálido, con destellos violáceos.                              | ROSE_RASPBERRY
            Rosa frambuesa con reflejos ámbar.                                        | AMBER
            Ámbar profundo, con reflejos caoba y destellos verdosos.                  | MAHOGANY WHITE_GREEN
            Centro rubí de intensidad media, con un matiz cereza; hacia el borde el tono aclara a granate, sin señales marcadas de evolución teja. | RED_CHERRY RED_GARNET
            Amarillo dorado de intensidad media, con centro luminoso y reflejos pajizos; mantiene un aspecto fresco, sin tonos de oro viejo. | WHITE_STRAW
            Rosa pálido con un matiz cobrizo sutil en el borde; el centro mantiene un tono claro, sin señales de evolución hacia el ámbar. | ROSE_COPPER
            Medium ruby with a garnet rim, without any brick tones.                  | RED_GARNET
            Amarillo pajizo de intensidad media, con reflejos de oro pálido.          | WHITE_GOLD
            """)
    void namesEveryReflectionToneInTextOrder(String color, String expected) {
        assertThat(WineColorTone.reflectionsFromDescription(color))
                .containsExactly(Arrays.stream(expected.split(" ")).map(WineColorTone::valueOf)
                        .toArray(WineColorTone[]::new));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "Rojo rubí brillante.", "Rojo rubí intenso", "Bright."})
    void namesNoReflectionToneWhenTheLineAddsNone(String color) {
        assertThat(WineColorTone.reflectionsFromDescription(color)).isEmpty();
    }

    /** Hues of fresh real profiles the glass did not show: old gold, a light raspberry pink, chestnut, magenta (#531). */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Oro viejo intenso, con reflejos ámbar.                                    | WHITE_OLD_GOLD
            Old gold with amber glints.                                               | WHITE_OLD_GOLD
            Rosa frambuesa claro, con un centro translúcido que se aclara hacia un borde salmón tenue. | ROSE_RASPBERRY_LIGHT
            Rosa frutilla muy pálido, con un núcleo claro que se abre hacia un borde de piel de cebolla. | ROSE_RASPBERRY_LIGHT
            Pale raspberry pink with a salmon rim.                                    | ROSE_RASPBERRY_LIGHT
            Rosa frambuesa de intensidad media, con reflejos cereza.                  | ROSE_RASPBERRY
            Castaño oscuro con ribete ámbar.                                          | MAHOGANY
            """)
    void showsTheHuesOfFreshProfiles(String color, WineColorTone expected) {
        assertThat(WineColorTone.fromDescription(color)).contains(expected);
    }

    /** Old gold, chestnut and magenta nuances paint their own tone at the rim and in the reflections (#531). */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Dorado intenso, con un centro luminoso que vira hacia oro viejo en el borde; reflejos ámbar leves. | WHITE_OLD_GOLD AMBER
            Intense gold, with a luminous core shifting toward old gold at the rim; faint amber reflections.  | WHITE_OLD_GOLD AMBER
            Caoba muy oscuro, casi opaco en el centro, con bordes castaños más claros y reflejos ámbar.       | MAHOGANY AMBER
            Ámbar oscuro con centro castaño y bordes más claros, de reflejos cobrizos y dorados.             | MAHOGANY RED_TAWNY WHITE_GOLD
            Dark amber with a chestnut core and lighter edges, showing coppery and golden reflections.        | MAHOGANY RED_TAWNY WHITE_GOLD
            Rojo rubí con destellos magenta.                                                                  | RED_PURPLE
            Rosa salmón pálido, con destellos magenta.                                                        | ROSE_RASPBERRY
            Rojo granate con ribete castaño.                                                                  | RED_TAWNY
            """)
    void paintsOldGoldChestnutAndMagentaNuances(String color, String expected) {
        assertThat(WineColorTone.reflectionsFromDescription(color))
                .containsExactly(Arrays.stream(expected.split(" ")).map(WineColorTone::valueOf)
                        .toArray(WineColorTone[]::new));
    }

    /** A tone the line gives the core ("un centro algo más dorado que el borde") is never painted at the rim (#531 whites). */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Amarillo pajizo de intensidad media, con un centro algo más dorado que el borde, reflejos limón y un brillo limpio. | WHITE_LEMON
            Medium-intensity straw yellow, with a slightly more golden core than rim, lemon reflections, and a clean sheen. | WHITE_LEMON
            Amarillo pajizo de intensidad media, con un centro apenas dorado que se aclara hacia un borde limón.               | WHITE_LEMON
            Dorado intenso, con un centro ámbar claro que se vuelve oro viejo hacia el borde.                                  | WHITE_OLD_GOLD
            Deep gold, with a light amber core that shifts to old gold at the rim.                                             | WHITE_OLD_GOLD
            Dorado profundo con un núcleo ámbar y reflejos de oro viejo en el borde.                                           | WHITE_OLD_GOLD
            Medium-intensity straw yellow, with a clear core shifting to greenish and pale lemon reflections.                  | WHITE_GREEN
            """)
    void keepsTheCoreToneOffTheRim(String color, WineColorTone expected) {
        assertThat(WineColorTone.rimFromDescription(color)).contains(expected);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Amarillo pajizo de intensidad media, con un matiz dorado suave en el centro y bordes más claros.",
            "Medium-intensity straw yellow, with a soft golden hue at the core and paler edges."})
    void leavesTheRimOutWhenOnlyTheCoreNamesAnotherTone(String color) {
        assertThat(WineColorTone.rimFromDescription(color)).isEmpty();
    }

    /**
     * Terroir- and age-driven hues of profile-v12 lines get their own glass (#531): inky high-altitude reds, plum,
     * bright violet, brick, steely or almost colorless whites, topaz, orange skin-contact wines, dark amber and the
     * copper, coral, peach and deep rosé pinks.
     */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Negro violáceo, casi opaco, con un ribete violeta brillante.               | RED_INKY
            Rojo tinta, de capa muy alta, con borde púrpura.                           | RED_INKY
            Almost black purple with a vivid violet rim.                               | RED_INKY
            Inky purple core with a narrow magenta rim.                                | RED_INKY
            Rojo cereza negra profundo con borde rubí.                                 | RED_RUBY_DEEP
            Rojo ciruela profundo, con borde rubí y reflejos granate.                  | RED_PLUM
            Deep plum red with a ruby rim.                                             | RED_PLUM
            Violeta brillante y vivaz, de capa media, con borde magenta.               | RED_VIOLET_BRIGHT
            Bright violet-purple with a magenta rim.                                   | RED_VIOLET_BRIGHT
            Púrpura oscuro brillante con borde violáceo.                               | RED_PURPLE
            Rojo ladrillo con borde anaranjado y centro granate apagado.               | RED_BRICK
            Rojo teja marcada, con borde ocre.                                         | RED_BRICK
            Rojo granate anaranjado, con ribete ocre.                                  | RED_BRICK
            Brick red with an orange rim.                                              | RED_BRICK
            Rojo teja con ribete ocre.                                                 | RED_TAWNY
            Rojo cereza de intensidad media con borde rubí.                            | RED_CHERRY
            Amarillo verdoso acerado, con reflejos plateados.                          | WHITE_STEEL
            Plateado brillante con destellos verdes.                                   | WHITE_STEEL
            Steely pale lemon with silver glints.                                      | WHITE_STEEL
            Amarillo verdoso pálido, de aspecto fresco.                                | WHITE_GREEN
            Casi incoloro, con destellos verdosos acuosos.                             | WHITE_WATER
            Amarillo acuoso, casi transparente, con reflejos plateados.                | WHITE_WATER
            Water-white, almost colorless with green glints.                           | WHITE_WATER
            Topacio luminoso con reflejos dorados y ámbar.                             | WHITE_TOPAZ
            Dorado topacio intenso con borde ámbar.                                    | WHITE_TOPAZ
            Topaz gold with amber glints.                                              | WHITE_TOPAZ
            Naranja intenso con reflejos cobrizos.                                     | ORANGE
            Ámbar anaranjado, levemente turbio, con borde dorado.                      | ORANGE
            Deep orange with copper glints.                                            | ORANGE
            Dorado cobrizo con reflejos ámbar.                                         | AMBER
            Ámbar de intensidad media con reflejos dorados.                            | AMBER
            Ámbar oscuro, con reflejos caoba.                                          | AMBER_DARK
            Dark amber with a mahogany rim.                                            | AMBER_DARK
            Caoba oscuro con ribete ámbar verdoso.                                     | MAHOGANY
            Rosa piel de cebolla con reflejos cobrizos.                                | ROSE_COPPER
            Piel de cebolla pálido, con borde cobrizo.                                 | ROSE_COPPER
            Pale copper pink with onion-skin glints.                                   | ROSE_COPPER
            Salmón pálido con reflejos cobrizos.                                       | ROSE_SALMON
            Coral brillante con reflejos salmón.                                       | ROSE_CORAL
            Pale coral pink.                                                           | ROSE_CORAL
            Rosa durazno pálido, con borde melocotón.                                  | ROSE_PEACH
            Rosa damasco luminoso con reflejos dorados.                                | ROSE_PEACH
            Pale peach pink with an apricot rim.                                       | ROSE_PEACH
            Rosado intenso con reflejos violáceos.                                     | ROSE_DEEP
            Rosa clarete con reflejos cereza.                                          | ROSE_DEEP
            Rosa cereza claro, con borde frambuesa.                                    | ROSE_DEEP
            Deep pink with violet glints.                                              | ROSE_DEEP
            Rosa frambuesa de intensidad media, con reflejos cereza.                   | ROSE_RASPBERRY
            Rosa frambuesa claro, con borde salmón.                                    | ROSE_RASPBERRY_LIGHT
            """)
    void showsTerroirAndAgeDrivenHues(String color, WineColorTone expected) {
        assertThat(WineColorTone.fromDescription(color)).contains(expected);
    }

    /** The new tones paint the rim and reflections too; copper stays gold or amber on whites and tawny on reds. */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Rojo rubí profundo, con un ribete violeta brillante.                       | RED_VIOLET_BRIGHT
            Púrpura intenso con reflejos violáceos vivos y matices ciruela.            | RED_VIOLET_BRIGHT RED_PLUM
            Deep ruby with bright violet glints.                                       | RED_VIOLET_BRIGHT
            Rojo rubí con borde negruzco y destellos de tinta.                         | RED_INKY
            Rojo rubí con reflejos de cereza negra.                                    | RED_RUBY_DEEP
            Deep ruby with black cherry glints.                                        | RED_RUBY_DEEP
            Rubí brillante, con el fondo visible; el borde es violeta y los reflejos son rojizos. | RED_PURPLE RED_RUBY
            Deep ruby with black-cherry glints.                                        | RED_RUBY_DEEP
            Granate con borde ladrillo y matices teja.                                 | RED_BRICK RED_TAWNY
            Rojo rubí intenso con reflejos cobrizos.                                   | RED_TAWNY
            Amarillo pajizo con reflejos verdosos y plateados.                         | WHITE_GREEN WHITE_STEEL
            Amarillo limón con reflejos acuosos casi incoloros en el borde.            | WHITE_WATER
            Dorado intenso con reflejos topacio y cobrizos.                            | WHITE_TOPAZ AMBER
            Dorado intenso con reflejos cobrizos.                                      | AMBER
            Ámbar con reflejos anaranjados y topacio.                                  | ORANGE WHITE_TOPAZ
            Rosa salmón con reflejos cobrizos y piel de cebolla.                       | ROSE_COPPER
            Rosa salmón con borde coral y reflejos durazno.                            | ROSE_CORAL ROSE_PEACH
            Rosa salmón pálido, con un centro delicado y reflejos de piel de durazno.  | ROSE_PEACH
            Rosa pálido, sin reflejos cobrizos.                                        | NONE
            Rojo rubí, sin borde ladrillo.                                             | NONE
            """)
    void paintsTheNewTonesInTheNuances(String color, String expected) {
        WineColorTone[] tones = "NONE".equals(expected) ? new WineColorTone[0]
                : Arrays.stream(expected.split(" ")).map(WineColorTone::valueOf).toArray(WineColorTone[]::new);
        assertThat(WineColorTone.reflectionsFromDescription(color)).containsExactly(tones);
    }

    /** Brown aged whites and generosos (amontillado, oloroso, white tawny Port) are lighter than mahogany (#531). */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Marrón medio con reflejos ámbar y un borde verdoso.                        | WHITE_BROWN
            Castaño claro, con ribete dorado.                                          | WHITE_BROWN
            Light brown with amber glints.                                             | WHITE_BROWN
            Castaño oscuro con ribete ámbar.                                           | MAHOGANY
            Marrón oscuro, casi opaco, con ribete verde oliva.                         | MAHOGANY
            Caoba con reflejos castaños.                                               | MAHOGANY
            Ébano opaco con ribete ámbar verdoso.                                      | MAHOGANY
            """)
    void showsBrownAgedWhitesApartFromMahogany(String color, WineColorTone expected) {
        assertThat(WineColorTone.fromDescription(color)).contains(expected);
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Amarillo dorado con reflejos marrones.                                     | WHITE_BROWN
            Ámbar con borde castaño claro.                                             | WHITE_BROWN
            """)
    void paintsBrownReflectionsOnWhitesAndAmbers(String color, WineColorTone expected) {
        assertThat(WineColorTone.reflectionsFromDescription(color)).containsExactly(expected);
    }

    /** The depth of the core: pale, medium or deep, read from the main hue or the clause right after it. */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Amarillo pajizo pálido, con reflejos verdosos.                             | PALE
            Rojo cereza claro, de capa ligera, con borde rubí.                         | PALE
            Rojo cereza translúcido, con borde rubí claro.                             | PALE
            Casi incoloro, con destellos verdosos.                                     | PALE
            Pale lemon with green glints.                                              | PALE
            Rojo cereza de intensidad media-baja, translúcido en el centro.            | PALE
            Rojo granate de intensidad media, con reflejos teja en los bordes.         | MEDIUM
            Medium-intensity ruby red, with garnet reflections at the rim.             | MEDIUM
            Amarillo pajizo, de intensidad media, con reflejos limón.                  | MEDIUM
            Rojo rubí, de capa media, con borde violáceo.                              | MEDIUM
            Translucent, medium-intensity cherry red, with a ruby rim.                 | MEDIUM
            Rojo violáceo profundo, con reflejos púrpura.                              | DEEP
            Centro púrpura oscuro, casi opaco, que vira a rubí violáceo en el borde.   | DEEP
            Negro violáceo, con ribete violeta brillante.                              | DEEP
            Rojo picota de capa alta, con borde violáceo.                              | DEEP
            Rojo rubí de intensidad media-alta, con borde granate.                     | DEEP
            Intense golden yellow.                                                     | DEEP
            Deep, nearly opaque purple core, with a violet rim.                        | DEEP
            Amarillo pajizo con un centro de intensidad media y un borde algo más claro. | MEDIUM
            Centro granate-púrpura de intensidad alta, con borde rubí violáceo.        | DEEP
            Cherry-toned at the core, with a lighter ruby rim; moderately translucent. | MEDIUM
            Rosa salmón de intensidad baja, con borde cobrizo.                         | PALE
            El centro muestra un tono denso de cereza negra y ciruela, con un borde rubí violáceo. | DEEP
            Rubí brillante, con una capa que deja ver el fondo de la copa.             | MEDIUM
            Rubí brillante, con el fondo de la copa todavía visible; el borde es violeta. | MEDIUM
            Rosa salmón con reflejos de frutilla; el tono deja ver el fondo de la copa. | PALE
            Rojo rubí; el tono no deja ver el fondo de la copa.                        | DEEP
            Ámbar tostado con reflejos caoba; el color es profundo, aunque deja pasar algo de luz. | DEEP
            Straw yellow with golden glints; the hue stays pale and becomes lighter at the rim. | PALE
            Luminous straw yellow with green reflections; light passes readily through the glass. | PALE
            Salmon pink with strawberry tones, lightly colored; the rim is paler.     | PALE
            Rojo picota con borde rubí; la capa es alta y apenas deja ver el fondo de la copa. | DEEP
            Rosa frambuesa cálido, con un centro de color marcado y reflejos cereza.  | MEDIUM
            Rosa frutilla con reflejos frambuesa, de tono definido y luminoso; el borde conserva una tonalidad rosada más clara. | MEDIUM
            Strawberry pink with raspberry reflections, clearly defined and luminous; the rim retains a lighter pink hue. | MEDIUM
            Light catches salmon reflections over a pale, bright pink hue; the rim turns slightly coppery. | PALE
            A raspberry-pink hue with a cherry tint; it has enough depth to color the glass, with a pink rim. | MEDIUM
            Rosa frambuesa con matiz cereza; tiene profundidad suficiente para teñir la copa. | MEDIUM
            Rubí definido y profundo, con un borde violeta.                           | DEEP
            El borde muestra destellos verdosos y plateados; el amarillo limón pálido del vino apenas se profundiza en la copa. | PALE
            Light catches violet reflections over a purple-ruby hue; the center is densely inked, edged by brighter, livelier tones. | DEEP
            A vivid violet rim frames an intensely purple center, with plum reflections and saturated color.  | DEEP
            The wine looks densely colored, with plum and black-cherry tones at the center of the glass.     | DEEP
            Rubí violáceo saturado, con borde púrpura vivo.                           | DEEP
            De dorado marcado, con reflejos topacio que se vuelven algo más pálidos en el borde.              | MEDIUM
            El color se ve de un rosa frutilla bastante marcado, con reflejos frambuesa y un borde algo más claro. | MEDIUM
            The wine reads as a fairly pronounced strawberry pink, with raspberry reflections and a slightly paler rim. | MEDIUM
            Rojo picota de capa marcada, con borde violáceo.                          | DEEP
            Straw yellow with golden reflections; the color has good depth and lightens at the edge.         | DEEP
            The straw-gold color has noticeable depth, with warm yellow reflections and discreet green glints at the rim. | MEDIUM
            Straw yellow with golden reflections and a faint green glint; there is some depth to the hue, yet it remains luminous in the glass. | MEDIUM
            Rosa frambuesa brillante, con un tono rosado nítido y reflejos violáceos; el color tiene presencia, pero permite ver la luz a través de la copa. | MEDIUM
            Rosa frutilla con reflejos coralinos; el color conserva buena presencia en la copa, pero permite apreciar el fondo. | MEDIUM
            Rosa salmón con reflejos cobrizos; permite ver el fondo de la copa.       | PALE
            La luz recoge reflejos violáceos sobre un rubí de buena profundidad, con una franja púrpura en el borde. | DEEP
            Amarillo dorado con cierta profundidad y reflejos verdosos.               | MEDIUM
            """)
    void readsTheIntensityOfTheCore(String color, WineColorIntensity expected) {
        assertThat(WineColorTone.intensityFromDescription(color)).contains(expected);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "Rojo rubí con borde claro.", "Amarillo pajizo con reflejos verdosos.",
            "Rojo rubí, sin ser profundo.", "Brillante y limpio."})
    void leavesTheIntensityOutWhenTheCoreNamesNone(String color) {
        assertThat(WineColorTone.intensityFromDescription(color)).isEmpty();
    }

    /** Free openings (the light, the glass, the rim, the tears) still find the core and the rim (#531, profile-v12). */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            A la luz, un ribete violeta brillante enmarca un centro casi negro.        | RED_INKY      | RED_VIOLET_BRIGHT | DEEP
            Ribete granate sobre un centro picota profundo.                            | RED_RUBY_DEEP | RED_GARNET        | DEEP
            En la copa, deja ver apenas el fondo: rubí claro con borde violáceo.       | RED_RUBY_LIGHT| RED_PURPLE        | PALE
            Brilla con limpidez. Rojo rubí de capa media.                              | RED_RUBY      | NONE              | MEDIUM
            Lágrimas lentas y un púrpura casi negro en el centro.                      | RED_INKY      | NONE              | DEEP
            A thin violet rim frames an almost black core.                             | RED_INKY      | RED_PURPLE        | DEEP
            Reflejos verdosos sobre un amarillo pajizo pálido.                         | WHITE_STRAW   | WHITE_GREEN       | PALE
            No deja ver el fondo de la copa: rojo picota con borde violáceo.           | RED_RUBY_DEEP | RED_PURPLE        | DEEP
            El corazón es tinta, casi opaco; el contorno muestra un rubí vivo.         | RED_INKY      | RED_RUBY          | DEEP
            Rubí translúcido, con una orilla violeta fresca.                           | RED_RUBY_LIGHT| RED_PURPLE        | PALE
            The dense core is black-cherry and plum, with a ruby rim.                  | RED_PLUM      | RED_RUBY          | DEEP
            El clima cálido se refleja en un rosa frambuesa con matiz de cereza; el color tiene profundidad suficiente para teñir la copa. | ROSE_RASPBERRY | NONE | MEDIUM
            The glass reflects a pale lemon yellow with green glints.                  | WHITE_LEMON   | WHITE_GREEN       | PALE
            El borde muestra reflejos plateados y verdosos alrededor de un tono limón pálido, apenas más intenso hacia el centro. | WHITE_LEMON | WHITE_STEEL | PALE
            El borde plateado acompaña un amarillo limón muy pálido, con destellos verdosos. | WHITE_LEMON | WHITE_STEEL | PALE
            La crianza de Reserva suaviza el aspecto juvenil sin quitarle profundidad: luce un rubí oscuro con reflejos púrpura y un matiz de cereza negra en la parte más densa de la copa. | RED_RUBY_DEEP | RED_PURPLE | DEEP
            Reserva ageing softens the wine’s youthful look without diminishing its depth: it appears dark ruby with purple reflections and a black-cherry hue in the densest part of the glass. | RED_RUBY_DEEP | RED_PURPLE | DEEP
            El color tiene profundidad media, con un tono rubí granate en la parte central y un borde ladrillo; los reflejos rojizos conservan cierta vivacidad. | RED_GARNET | RED_BRICK | MEDIUM
            The wine reads as moderately deep, with a ruby-garnet hue through the center and a brick-colored rim; reddish reflections retain some liveliness. | RED_GARNET | RED_BRICK | MEDIUM
            """)
    void findsTheCoreOfAFreelyWorded(String color, WineColorTone core, String rim, WineColorIntensity intensity) {
        assertThat(WineColorTone.fromDescription(color)).contains(core);
        assertThat(WineColorTone.rimFromDescription(color).map(Enum::name).orElse("NONE")).isEqualTo(rim);
        assertThat(WineColorTone.intensityFromDescription(color)).contains(intensity);
    }
}

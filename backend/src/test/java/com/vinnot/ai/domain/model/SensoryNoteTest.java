package com.vinnot.ai.domain.model;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class SensoryNoteTest {

    /** Real aroma and flavor descriptors from production profiles, in both languages, and the note each one shows. */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Hierbas secas                  | DRIED_HERBS
            Dried herbs                    | DRIED_HERBS
            Frambuesa                      | RASPBERRY
            Raspberry                      | RASPBERRY
            Mora                           | BLACKBERRY
            Moras maduras                  | BLACKBERRY
            Blackberry                     | BLACKBERRY
            Pimienta negra                 | BLACK_PEPPER
            Black pepper                   | BLACK_PEPPER
            Flores blancas                 | WHITE_FLOWERS
            White flowers                  | WHITE_FLOWERS
            Cereza                         | CHERRY
            Red cherry                     | CHERRY
            Ciruela                        | PLUM
            Plum                           | PLUM
            Violeta                        | VIOLET
            Violet                         | VIOLET
            Manzana                        | APPLE
            Apple                          | APPLE
            Pera                           | PEAR
            Pear                           | PEAR
            Limón                          | LEMON
            Lemon                          | LEMON
            Frutilla                       | STRAWBERRY
            Strawberry                     | STRAWBERRY
            Durazno                        | PEACH
            Peach                          | PEACH
            Naranja                        | ORANGE
            Orange                         | ORANGE
            Piedra húmeda                  | MINERAL
            Wet stone                      | MINERAL
            Tierra húmeda                  | WET_EARTH
            Wet earth                      | WET_EARTH
            Woodland                       | WET_EARTH
            Té negro                       | TEA
            Black tea                      | TEA
            Nuez                           | NUTS
            Walnut                         | NUTS
            Caramelo                       | CARAMEL
            Caramel                        | CARAMEL
            Membrillo                      | QUINCE
            Quince                         | QUINCE
            Pomelo                         | GRAPEFRUIT
            Grapefruit                     | GRAPEFRUIT
            Masa de pan                    | BREAD
            Bread dough                    | BREAD
            Miel                           | HONEY
            Honey                          | HONEY
            Ciruela pasa                   | DRIED_FRUIT
            Prune                          | DRIED_FRUIT
            Higo seco                      | DRIED_FRUIT
            Higo                           | FIG
            Manzana verde                  | GREEN_APPLE
            Green apple                    | GREEN_APPLE
            Frambuesa en compota           | RASPBERRY
            Cáscara de naranja confitada   | ORANGE
            Nuez moscada                   | SWEET_SPICE
            Nutmeg                         | SWEET_SPICE
            Especias                       | SWEET_SPICE
            Pimiento asado                 | ROASTED_PEPPER
            Green bell pepper              | GREEN_PEPPER
            Hierbas silvestres             | FRESH_HERBS
            Mint                           | FRESH_HERBS
            Grano de café                  | COFFEE
            Roble tostado                  | OAK
            Toasted oak                    | OAK
            Vainilla                       | VANILLA
            Cuero                          | LEATHER
            Tabaco                         | TOBACCO
            Regaliz                        | ANISE
            Chocolate amargo               | CHOCOLATE
            Levadura                       | BREAD
            Mantequilla                    | BUTTER
            Sal marina                     | SALINE
            Salty finish                   | SALINE
            Mermelada de frutos rojos      | JAM
            Ahumado                        | SMOKE
            Arándanos                      | BLUEBERRY
            Cassis                         | BLACKCURRANT
            Anana                          | PINEAPPLE
            Uva                            | GRAPE
            Rosa                           | ROSE
            Azahar                         | WHITE_FLOWERS
            Orange blossom                 | WHITE_FLOWERS
            Damasco                        | APRICOT
            Stone fruit                    | PEACH
            Blackcurrant                   | BLACKCURRANT
            Redcurrant                     | RED_CURRANT
            Red cranberry                  | RED_CURRANT
            Mandarin                       | ORANGE
            Ripe mandarin                  | ORANGE
            Granada                        | POMEGRANATE
            Pomegranate                    | POMEGRANATE
            Melón fresco                   | MELON
            Fresh melon                    | MELON
            Manzanilla seca                | CHAMOMILE
            Dried chamomile                | CHAMOMILE
            """)
    void showsTheNoteThatMatchesTheDescriptor(String descriptor, SensoryNote expected) {
        assertThat(SensoryNote.fromDescriptor(descriptor)).contains(expected);
    }

    /** Descriptors whose picture showed another ingredient or nothing in real profiles (#528). */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Pimiento rojo asado            | ROASTED_PEPPER
            Roasted red pepper             | ROASTED_PEPPER
            Pimiento rojo                  | RED_PEPPER
            Pimiento rojo fresco           | RED_PEPPER
            Fresh red pepper               | RED_PEPPER
            Red bell pepper                | RED_PEPPER
            Pimiento verde                 | GREEN_PEPPER
            Damasco maduro                 | APRICOT
            Albaricoque                    | APRICOT
            Ripe apricot                   | APRICOT
            Durazno blanco                 | PEACH
            Madreselva                     | HONEYSUCKLE
            Honeysuckle                    | HONEYSUCKLE
            Grosella espinosa              | GOOSEBERRY
            A hint of gooseberry           | GOOSEBERRY
            Grosella negra                 | BLACKCURRANT
            Grosella roja                  | RED_CURRANT
            Arándano rojo                  | RED_CURRANT
            Arándano                       | BLUEBERRY
            Lima                           | LIME
            Cítricos (lima)                | LIME
            Lime                           | LIME
            Limón                          | LEMON
            Lichi maduro                   | LYCHEE
            Lychee                         | LYCHEE
            Jengibre suave                 | GINGER
            Ginger                         | GINGER
            Maracuyá                       | PASSION_FRUIT
            Passion fruit                  | PASSION_FRUIT
            Ananá                          | PINEAPPLE
            Fruta seca                     | DRIED_FRUIT
            Dátil                          | DRIED_FRUIT
            Frutos secos                   | NUTS
            Dried Mediterranean herbs      | DRIED_HERBS
            Gentle Mediterranean herbs     | DRIED_HERBS
            Balsamic herbs                 | DRIED_HERBS
            Flores rojas                   | ROSE
            Red flowers                    | ROSE
            Ruda suave                     | FRESH_HERBS
            Cera sutil                     | HONEY
            Subtle wax                     | HONEY
            """)
    void showsTheFaithfulPictureForDescriptorsThatShowedAnotherIngredient(String descriptor, SensoryNote expected) {
        assertThat(SensoryNote.fromDescriptor(descriptor)).contains(expected);
    }

    /** A red, black or red-variety grape is a red grape, never the green one; a white or unnamed grape stays green (#531). */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Uva roja                       | RED_GRAPE
            Red grape                      | RED_GRAPE
            Uvas tintas maduras            | RED_GRAPE
            Black grapes                   | RED_GRAPE
            Uva negra                      | RED_GRAPE
            Uva Corvina madura             | RED_GRAPE
            Ripe Barbera grape             | RED_GRAPE
            Uva de Malbec                  | RED_GRAPE
            Uva blanca                     | GRAPE
            Fresh white grape              | GRAPE
            Uva moscatel madura            | GRAPE
            Uva fresca                     | GRAPE
            Uva pasa                       | DRIED_FRUIT
            """)
    void showsARedGrapeOnlyWhenTheGrapeIsRed(String descriptor, SensoryNote expected) {
        assertThat(SensoryNote.fromDescriptor(descriptor)).contains(expected);
    }

    /** Descriptors of fresh real profiles that showed another ingredient, lost a qualifier or showed nothing (#531). */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Black cherry                   | BLACK_CHERRY
            Cereza negra                   | BLACK_CHERRY
            Cereza oscura                  | BLACK_CHERRY
            Dark cherry                    | BLACK_CHERRY
            Picota                         | BLACK_CHERRY
            Pimienta blanca tenue          | WHITE_PEPPER
            A faint white-pepper note      | WHITE_PEPPER
            Hoja de tomate                 | TOMATO_LEAF
            Hojas de tomatera              | TOMATO_LEAF
            Tomato leaf                    | TOMATO_LEAF
            Hojas secas                    | DRIED_LEAF
            Hojarasca                      | DRIED_LEAF
            Autumn leaves                  | DRIED_LEAF
            Dried leaves                   | DRIED_LEAF
            Hoja de laurel                 | BAY_LEAF
            Bay leaf                       | BAY_LEAF
            Laurel                         | BAY_LEAF
            Aceituna negra                 | BLACK_OLIVE
            Black olive                    | BLACK_OLIVE
            Bergamota                      | BERGAMOT
            Bergamot                       | BERGAMOT
            Melaza                         | MOLASSES
            Molasses                       | MOLASSES
            Hoja de grosellero             | BLACKCURRANT
            Blackcurrant leaf              | BLACKCURRANT
            Cáscara de cítrico confitada   | LEMON
            Candied citrus peel            | LEMON
            Ciruela desecada               | DRIED_FRUIT
            Dried plum                     | DRIED_FRUIT
            Dark-fruit skin                | BLACKBERRY
            Piel de fruta oscura           | BLACKBERRY
            Flores rosadas                 | ROSE
            Pink flowers                   | ROSE
            Panificación sutil             | BREAD
            Melón blanco                   | WHITE_MELON
            White melon                    | WHITE_MELON
            Honeydew                       | WHITE_MELON
            Melón                          | MELON
            Grosella oscura                | BLACKCURRANT
            Dark currant                   | BLACKCURRANT
            Pimienta dulce                 | SWEET_SPICE
            Pimienta de Jamaica            | SWEET_SPICE
            Allspice                       | SWEET_SPICE
            Flores silvestres              | WHITE_FLOWERS
            Flores delicadas               | WHITE_FLOWERS
            Wildflowers                    | WHITE_FLOWERS
            Delicate flowers               | WHITE_FLOWERS
            Casís                          | BLACKCURRANT
            Panadería                      | BREAD
            Notas de panadería             | BREAD
            Bready note from autolysis     | BREAD
            Autólisis                      | BREAD
            """)
    void showsTheFaithfulPictureForDescriptorsOfFreshProfiles(String descriptor, SensoryNote expected) {
        assertThat(SensoryNote.fromDescriptor(descriptor)).contains(expected);
    }

    /** Citrus, peel, petals, florals, toast and fruit are generic: a named fruit, flower or food in the same descriptor wins. */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Ralladura de naranja        | ORANGE
            Orange zest                 | ORANGE
            Notas cítricas              | LEMON
            Citrus                      | LEMON
            Pétalos de violeta          | VIOLET
            Rose petals                 | ROSE
            Pétalos                     | ROSE
            Floral de violetas          | VIOLET
            Floral                      | WHITE_FLOWERS
            Avellanas tostadas          | NUTS
            Pan tostado                 | BREAD
            Notas tostadas              | OAK
            Amargor de cáscara          | LEMON
            Frutos rojos maduros        | RASPBERRY
            Ripe red fruits             | RASPBERRY
            Black fruits                | BLACKBERRY
            Frutos negros               | BLACKBERRY
            Fruits                      | MIXED_FRUIT
            Frutas maduras              | MIXED_FRUIT
            Fruity                      | MIXED_FRUIT
            Citrus fruits               | LEMON
            Passion fruit               | PASSION_FRUIT
            Mermelada de frutos rojos   | JAM
            """)
    void letsTheNamedIngredientWinOverAGenericWord(String descriptor, SensoryNote expected) {
        assertThat(SensoryNote.fromDescriptor(descriptor)).contains(expected);
    }

    /** Short keywords only match whole words: "salvia" is not salt, "rosado" not a rose, "melancolico" not a melon. */
    @ParameterizedTest
    @ValueSource(strings = {"Salvia", "Rosado", "Morado", "Temperatura", "Panceta", "Fermentación",
            "Especial", "Melancólico"})
    void showsNoNoteForAnUnknownDescriptor(String descriptor) {
        assertThat(SensoryNote.fromDescriptor(descriptor)).isEmpty();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void showsNoNoteWithoutADescriptor(String descriptor) {
        assertThat(SensoryNote.fromDescriptor(descriptor)).isEmpty();
    }
}

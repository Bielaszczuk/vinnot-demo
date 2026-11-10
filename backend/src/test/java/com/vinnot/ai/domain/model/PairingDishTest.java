package com.vinnot.ai.domain.model;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class PairingDishTest {

    /** Real pairings from production profiles, in both languages: the dish named first leads. */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Pollo asado con hierbas                           | POULTRY
            Roast chicken with lemon and herbs                | POULTRY
            Cordero al horno                                  | LAMB
            Roasted lamb                                      | LAMB
            Bife de chorizo                                   | BEEF
            Grilled ribeye steak                              | BEEF
            Pato asado con salsa de ciruelas                  | DUCK
            Duck breast with cherry sauce                     | DUCK
            Trucha a la manteca                               | FISH
            Grilled trout                                     | FISH
            Ostras frescas                                    | SEAFOOD
            Oysters                                           | SEAFOOD
            Risotto de hongos porcini con parmesano curado    | RISOTTO
            Porcini mushroom risotto with aged Parmesan       | RISOTTO
            Pastas con salsa de tomate                        | PASTA
            Pasta with ragu                                   | PASTA
            Quesos curados                                    | CHEESE
            Aged cheeses                                      | CHEESE
            Queso de cabra fresco con pera                    | GOAT_CHEESE
            Fresh goat cheese                                 | GOAT_CHEESE
            Jamón crudo                                       | CHARCUTERIE
            Prosciutto                                        | CHARCUTERIE
            Berenjenas grilladas                              | VEGETABLES
            Grilled eggplant                                  | VEGETABLES
            Guiso de lentejas con panceta ahumada             | LEGUMES
            Lentil salad                                      | LEGUMES
            Osobuco braseado                                  | STEW
            Braised osso buco with gremolata                  | STEW
            Pizza napolitana                                  | PIZZA
            Empanadas salteñas                                | EMPANADAS
            Postre de chocolate amargo                        | DESSERT
            Dark chocolate cake                               | DESSERT
            Cerdo a la parrilla                               | PORK
            Pork belly                                        | PORK
            Hongos portobello a la parrilla con polenta cremosa | MUSHROOMS
            Sautéed mushrooms over creamy polenta             | MUSHROOMS
            Tarta salada de hongos y cebolla caramelizada     | SAVORY_TART
            Mushroom and caramelized onion tart               | SAVORY_TART
            Almendras tostadas y aceitunas verdes             | OLIVES
            Toasted almonds and green olives                  | OLIVES
            Sushi                                             | FISH
            Grilled sardines with fresh herbs                 | FISH
            Gambas cocidas con un toque de sal                | SEAFOOD
            Ricotta and chard tortellini with butter and sage | PASTA
            Alcachofas a la plancha con limón                 | GREEN_VEGETABLES
            Roasted asparagus with a light lemon sauce        | GREEN_VEGETABLES
            Tarta de tomate y mostaza suave                   | SAVORY_TART
            Tomato tart with mild mustard                     | SAVORY_TART
            Foie gras sellado con compota de damasco          | DUCK
            Shepherd's pie with potato purée and herbs        | MEAT_PIE
            Tarta de duraznos y almendras                     | FRUIT_TART
            Peach and almond tart                             | FRUIT_TART
            Tarta fina de frutillas y crema poco dulce        | FRUIT_TART
            Spiced baked pears                                | FRUIT_TART
            Peras asadas con especias                         | FRUIT_TART
            Pan de especias con compota de higos              | DESSERT
            """)
    void showsTheDishTheTextNamesFirst(String pairing, PairingDish expected) {
        assertThat(PairingDish.fromDescription(pairing)).contains(expected);
    }

    /** Side words (generic meat, mushrooms, olives, tomato) yield to the dish they qualify; generic meat alone is beef. */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Carnes rojas a la parrilla        | BEEF
            Grilled red meats                 | BEEF
            Asado                             | BEEF
            Lomo de cerdo con manzanas        | PORK
            Carne de cordero                  | LAMB
            Carnes blancas                    | POULTRY
            Empanadas de carne                | EMPANADAS
            Asparagus risotto                 | RISOTTO
            Tomato pasta                      | PASTA
            Pizza with olives                 | PIZZA
            Olive-crusted lamb                | LAMB
            """)
    void letsTheNamedAnimalWinOverAGenericMeatWord(String pairing, PairingDish expected) {
        assertThat(PairingDish.fromDescription(pairing)).contains(expected);
    }

    /** Keywords are whole words: "hamburguesa" holds no "ham" and "patitas" no "pato". */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Hamburguesas caseras              | BEEF
            Patitas de cerdo                  | PORK
            Lasaña de verduras                | PASTA
            """)
    void matchesKeywordsAtWordStartsOnly(String pairing, PairingDish expected) {
        assertThat(PairingDish.fromDescription(pairing)).contains(expected);
    }

    /** Pairings whose picture showed another dish, or a topping the dish does not have, in real profiles (#528). */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Hamburguesa de cordero con yogur                  | LAMB
            Hamburguesa de hongos portobello con queso        | MUSHROOMS
            Portobello mushroom burger with semi-hard cheese  | MUSHROOMS
            Guiso de porotos negros                           | LEGUMES
            Estofado de lentejas con chorizo                  | LEGUMES
            Oven-baked hake with olive oil and lemon          | FISH
            Lubina a la sal                                   | FISH
            Croquetas de bacalao                              | FISH
            Ensalada de camarones a la parrilla               | SEAFOOD
            Ensalada de pollo con cítricos                    | POULTRY
            Ensalada de queso de cabra, hojas verdes y nueces | GOAT_CHEESE
            Calamari and vegetable fritto misto               | SEAFOOD
            Almejas a la marinera                             | SEAFOOD
            Pumpkin and sage risotto                          | RISOTTO
            Leek and Parmesan risotto                         | RISOTTO
            Fresh goat’s cheese with herbs                    | GOAT_CHEESE
            Spicy salami and mozzarella pizza                 | PIZZA
            Oven-baked, spiced lamb empanada                  | EMPANADAS
            Beef stew with root vegetables                    | STEW
            Herb-braised lamb shoulder                        | LAMB
            Short ribs braised in red wine                    | BEEF
            Grilled zucchini with mint                        | VEGETABLES
            Semi-aged Gouda                                   | CHEESE
            Tarta de puerro y queso suave                     | SAVORY_TART
            Goat cheese and caramelized onion tart            | SAVORY_TART
            Quiche lorraine                                   | SAVORY_TART
            Tarta de ciruelas y almendras                     | FRUIT_TART
            Apple crumble                                     | FRUIT_TART
            Ensaladas frescas                                 | SALAD
            Fennel and orange salad                           | SALAD
            Espárragos grillados con huevo                    | GREEN_VEGETABLES
            Thai green curry with chicken                     | CURRY
            Curry de calabaza y garbanzos                     | CURRY
            Paella de mariscos                                | SEAFOOD_RICE
            Arroz con mariscos                                | SEAFOOD_RICE
            Seafood paella                                    | SEAFOOD_RICE
            Paté de ave con chutney de durazno                | PATE
            Poultry liver pâté with peach chutney             | PATE
            Terrina de campo                                  | PATE
            Lomo de cerdo asado                               | PORK
            Postre de chocolate amargo                        | DESSERT
            Dark chocolate and cherry tart                    | DESSERT
            Queso azul cremoso con pera asada                 | CHEESE
            Queso curado de pasta dura                        | CHEESE
            Savory asparagus tart with fresh goat cheese      | SAVORY_TART
            Mild salami with rosemary focaccia                | CHARCUTERIE
            """)
    void showsTheDishTheTextIsAbout(String pairing, PairingDish expected) {
        assertThat(PairingDish.fromDescription(pairing)).contains(expected);
    }

    /** Pairings of fresh real profiles that showed another dish or nothing, in either language (#531). */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Queso azul de pasta cremosa con nueces tostadas   | CHEESE
            Queso semiduro de pasta cremosa                   | CHEESE
            Tart with toasted almonds                         | FRUIT_TART
            Tarta de albaricoque con masa poco dulce          | FRUIT_TART
            Lemon meringue tart with restrained sweetness     | FRUIT_TART
            Peras escalfadas con especias                     | FRUIT_TART
            Griddled provolone with mild chimichurri          | CHEESE
            Herb-braised pork belly                           | PORK
            Slow-braised pork ribs with a plum reduction      | PORK
            Tarta de berenjena y tomate confitado             | SAVORY_TART
            Eggplant tart with slow-roasted tomatoes          | SAVORY_TART
            Portobellos rellenos de lentejas y cocidos al horno | MUSHROOMS
            Oven-baked portobellos stuffed with lentils       | MUSHROOMS
            Lomo de ciervo con salsa de cerezas poco dulce    | GAME
            Venison loin with a dark-fruit reduction          | GAME
            Entrecot a la plancha con costra de pimienta      | BEEF
            Pepper-crusted grilled entrecôte                  | BEEF
            Costilla de res cocida a fuego lento con pimienta negra | BEEF
            Costillas de res braseadas lentamente con reducción de su jugo | BEEF
            Slow-braised beef short ribs with a reduction of their cooking juices | BEEF
            Tajadas de pecorino semicurado con membrillo      | CHEESE
            Tarta fina de tomate, cebolla morada y hierbas    | SAVORY_TART
            Salmonete a la parrilla con salsa de tomate fresco y alcaparras | FISH
            Grilled red mullet with fresh tomato and caper sauce | FISH
            Empanaditas de humita al horno                    | EMPANADAS
            Baked humita pastries                             | EMPANADAS
            Thin tart with roasted tomato and onion           | SAVORY_TART
            Thin-crust tart with caramelized onion            | SAVORY_TART
            Tarta de naranja amarga                           | FRUIT_TART
            Bitter-orange tart                                | FRUIT_TART
            Mature cheddar with onion chutney                 | CHEESE
            Costilla de tira a la parrilla con chimichurri    | BEEF
            Grilled beef tenderloin with pepper sauce         | BEEF
            Pork tenderloin with apples                       | PORK
            Veal ragù over soft polenta                       | BEEF
            Polenta con ragú de ternera                       | BEEF
            Remolachas asadas con queso de cabra              | VEGETABLES
            Roasted beets with herbs                          | VEGETABLES
            """)
    void showsTheDishOfFreshProfilePairings(String pairing, PairingDish expected) {
        assertThat(PairingDish.fromDescription(pairing)).contains(expected);
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Flan casero                                | FLAN
            Caramel flan                               | FLAN
            Crème caramel                              | FLAN
            Pecan tart with caramel                    | NUT_TART
            Walnut tart with a thin layer of caramel   | NUT_TART
            Tarta de nueces con masa poco dulce        | NUT_TART
            Tarta de nuez pecan                        | NUT_TART
            Cuscús con verduras                        | COUSCOUS
            Couscous with roasted vegetables           | COUSCOUS
            """)
    void showsTheNewDessertAndCouscousPictures(String pairing, PairingDish expected) {
        assertThat(PairingDish.fromDescription(pairing)).contains(expected);
    }

    /** No faithful picture exists, so these show nothing rather than a wrong dish (#528). */
    @ParameterizedTest
    @ValueSource(strings = {"Tarta de queso al horno con ralladura de limón", "Cheesecake", "Focaccia con romero",
            "Ensalada de frutas", "Fresh fruit", "Köfte de cordero", "Panna cotta", "Helado de vainilla"})
    void showsNoDishWithoutAFaithfulPicture(String pairing) {
        assertThat(PairingDish.fromDescription(pairing)).isEmpty();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "Comida especiada", "Picada casera"})
    void showsNoDishForAnUnknownPairing(String pairing) {
        assertThat(PairingDish.fromDescription(pairing)).isEmpty();
    }

    /** Dish forms with no illustration yet: their own code, never the steak, lamb or fruit tart the filling names (#531). */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Pastel de carne con puré de papa dorado           | MEAT_PIE
            Beef cottage pie with browned potato topping      | MEAT_PIE
            Meat pie with mashed potatoes and black pepper    | MEAT_PIE
            Tortilla de papas poco cuajada                    | OMELETTE
            Soft-centered Spanish potato omelette             | OMELETTE
            Frittata de zucchini y queso de cabra             | OMELETTE
            Zucchini and goat cheese frittata                 | OMELETTE
            Biscotti de almendra                              | BISCOTTI
            Almond biscuits                                   | BISCOTTI
            Galletas de almendra                              | BISCOTTI
            Cantucci                                          | BISCOTTI
            Schnitzel de ternera con limón                    | BREADED_CUTLET
            Veal schnitzel with lemon                         | BREADED_CUTLET
            Pork schnitzel with a bitter-leaf salad           | BREADED_CUTLET
            Milanesa de pollo con limón                       | BREADED_CUTLET
            """)
    void showsTheDishFormEvenWithoutItsIllustrationYet(String pairing, PairingDish expected) {
        assertThat(PairingDish.fromDescription(pairing)).contains(expected);
    }

    /** A goat cheese named with its age or milk in between ("queso semiduro de cabra") is goat cheese (#531 whites). */
    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            Queso semiduro de cabra                           | GOAT_CHEESE
            Queso curado de leche de cabra con membrillo      | GOAT_CHEESE
            Semi-hard goat’s-milk cheese                      | GOAT_CHEESE
            Fresh goat-cheese salad                           | GOAT_CHEESE
            Queso semiduro de vaca                            | CHEESE
            Boquerones en vinagre con perejil                 | FISH
            Vinegar-marinated anchovies with parsley          | FISH
            """)
    void showsGoatCheeseWhateverWordsSitBetween(String pairing, PairingDish expected) {
        assertThat(PairingDish.fromDescription(pairing)).contains(expected);
    }
}

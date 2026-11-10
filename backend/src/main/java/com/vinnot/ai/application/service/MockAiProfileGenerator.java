package com.vinnot.ai.application.service;

import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import com.vinnot.wine.domain.model.Wine;

/**
 * Generates deterministic mock AI profiles for development and testing.
 * Extracted from AiProfileService following SRP.
 */
@Service
public class MockAiProfileGenerator {

    private static final int SERVING_TEMP_RED_MIN = 16;
    private static final int SERVING_TEMP_RED_MAX = 18;
    private static final int SERVING_TEMP_WHITE_MIN = 8;
    private static final int SERVING_TEMP_WHITE_MAX = 10;
    private static final int SERVING_TEMP_ROSE_MIN = 8;
    private static final int SERVING_TEMP_ROSE_MAX = 12;
    private static final int SERVING_TEMP_SPARKLING_MIN = 6;
    private static final int SERVING_TEMP_SPARKLING_MAX = 8;
    private static final int SERVING_TEMP_DEFAULT_MIN = 12;
    private static final int SERVING_TEMP_DEFAULT_MAX = 16;

    /**
     * Generates a complete mock profile for the given wine and language.
     */
    public Map<String, Object> generateMockProfile(
            Wine wine, String language, boolean needsEnrichment) {
        boolean isSpanish = language.startsWith("es");
        String wineType = Objects.nonNull(wine.getWineType())
                ? wine.getWineType().name().toLowerCase() : "red";
        String name = wine.getName();

        Map<String, Object> result = new HashMap<>();
        String region = "Mendoza";
        String country = isSpanish ? "Argentina" : "Argentina";

        if (isSpanish) {
            String typeDesc = switch (wineType) {
                case "red" -> "tinto robusto";
                case "white" -> "blanco fresco";
                case "rose" -> "rosado elegante";
                case "sparkling" -> "espumante festivo";
                default -> "vino especial";
            };
            result.put("summary", String.format(
                    "El %s es un %s de %s, %s. Presenta una expresion autentica del terroir local.",
                    name, typeDesc, region, country));
        } else {
            String typeDesc = switch (wineType) {
                case "red" -> "robust red";
                case "white" -> "fresh white";
                case "rose" -> "elegant rose";
                case "sparkling" -> "festive sparkling";
                default -> "special wine";
            };
            result.put("summary", String.format(
                    "%s is a %s from %s, %s. It showcases an authentic expression of local terroir.",
                    name, typeDesc, region, country));
        }

        result.put("visualAnalysis", buildVisualAnalysis(wineType, isSpanish));
        result.put("aromaticProfile", buildAromaticProfile(wineType, isSpanish));
        result.put("palateAnalysis", buildPalateAnalysis(wineType, isSpanish));
        result.put("flavorProfile", buildFlavorProfile(wineType, isSpanish));
        result.put("foodPairings", buildFoodPairings(wineType, isSpanish));
        result.put("servingRecommendations", buildServingRecommendations(wineType, isSpanish));

        if (needsEnrichment) {
            result.put("enrichment", buildMockEnrichment(wine, wineType, isSpanish, name));
        }

        return result;
    }

    private Map<String, Object> buildMockEnrichment(Wine wine,
                                                      String wineType, boolean isSpanish, String name) {
        Map<String, Object> enrichment = new HashMap<>();

        if (Objects.isNull(wine.getGrapes()) || wine.getGrapes().isEmpty()) {
            enrichment.put("grapes", getDefaultGrapes(wineType));
        }
        if (Objects.isNull(wine.getAllergens()) || wine.getAllergens().isEmpty()) {
            enrichment.put("allergens", List.of("Sulfitos"));
        }
        if (Objects.isNull(wine.getDescriptionEs()) || wine.getDescriptionEs().isBlank()) {
            enrichment.put("descriptionEs", String.format(
                    "%s es un vino de caracter unico, con aromas frutales y buena estructura en boca.", name));
        }
        if (Objects.isNull(wine.getDescriptionEn()) || wine.getDescriptionEn().isBlank()) {
            enrichment.put("descriptionEn", String.format(
                    "%s is a wine of unique character, with fruity aromas and good structure on the palate.", name));
        }
        if (Objects.isNull(wine.getAlcoholContent())) {
            enrichment.put("alcoholContent", getMockAlcohol(wineType));
        }
        if (Objects.isNull(wine.getServingTemperature())) {
            int[] temps = getMockServingTemps(wineType);
            enrichment.put("servingTempMin", temps[0]);
            enrichment.put("servingTempMax", temps[1]);
        }
        if (Objects.isNull(wine.getFoodPairing()) || wine.getFoodPairing().isBlank()) {
            enrichment.put("foodPairing", getMockFoodPairing(wineType, isSpanish));
        }

        return enrichment;
    }

    private List<String> getDefaultGrapes(String wineType) {
        return switch (wineType) {
            case "red" -> Arrays.asList("Malbec", "Cabernet Sauvignon");
            case "white" -> Arrays.asList("Chardonnay", "Sauvignon Blanc");
            case "rose" -> List.of("Malbec");
            case "sparkling" -> Arrays.asList("Chardonnay", "Pinot Noir");
            default -> List.of("Malbec");
        };
    }

    private String getMockAlcohol(String wineType) {
        return switch (wineType) {
            case "red" -> "14.0";
            case "white" -> "12.5";
            case "rose", "sparkling" -> "12.0";
            default -> "13.0";
        };
    }

    private int[] getMockServingTemps(String wineType) {
        return switch (wineType) {
            case "red" -> new int[]{SERVING_TEMP_RED_MIN, SERVING_TEMP_RED_MAX};
            case "white" -> new int[]{SERVING_TEMP_WHITE_MIN, SERVING_TEMP_WHITE_MAX};
            case "rose" -> new int[]{SERVING_TEMP_ROSE_MIN, SERVING_TEMP_ROSE_MAX};
            case "sparkling" -> new int[]{SERVING_TEMP_SPARKLING_MIN, SERVING_TEMP_SPARKLING_MAX};
            default -> new int[]{SERVING_TEMP_DEFAULT_MIN, SERVING_TEMP_DEFAULT_MAX};
        };
    }

    private String getMockFoodPairing(String wineType, boolean isSpanish) {
        if (isSpanish) {
            return switch (wineType) {
                case "red" -> "Carnes rojas, Pastas con salsa, Quesos duros";
                case "white" -> "Pescados, Mariscos, Ensaladas, Quesos suaves";
                case "rose" -> "Ensaladas, Sushi, Tapas, Pollo";
                case "sparkling" -> "Aperitivos, Mariscos, Postres ligeros";
                default -> "Carnes, Quesos, Pastas";
            };
        }
        return switch (wineType) {
            case "red" -> "Red meats, Pasta with sauce, Hard cheeses";
            case "white" -> "Fish, Seafood, Salads, Soft cheeses";
            case "rose" -> "Salads, Sushi, Tapas, Chicken";
            case "sparkling" -> "Appetizers, Seafood, Light desserts";
            default -> "Meats, Cheeses, Pasta";
        };
    }

    private Map<String, Object> buildVisualAnalysis(String wineType, boolean isSpanish) {
        Map<String, Object> visual = new HashMap<>();
        if (isSpanish) {
            switch (wineType) {
                case "red" -> {
                    visual.put("color", "Rojo rubí profundo, con reflejos violáceos en el borde");
                    visual.put("clarity", "Cristalino");
                    visual.put("intensity", "Profundo");
                    visual.put("viscosity", "Lagrimas pronunciadas indicando cuerpo medio-alto");
                }
                case "white" -> {
                    visual.put("color", "Amarillo pálido, con reflejos verdosos y un leve destello dorado");
                    visual.put("clarity", "Brillante");
                    visual.put("intensity", "Medio");
                    visual.put("viscosity", "Lagrimas finas");
                }
                case "rose" -> {
                    visual.put("color", "Rosa salmón pálido, con destellos cobrizos en el borde");
                    visual.put("clarity", "Cristalino");
                    visual.put("intensity", "Medio");
                    visual.put("viscosity", "Lagrimas delicadas");
                }
                default -> {
                    visual.put("color", "Color caracteristico");
                    visual.put("clarity", "Brillante");
                    visual.put("intensity", "Medio");
                    visual.put("viscosity", "Lagrimas normales");
                }
            }
        } else {
            switch (wineType) {
                case "red" -> {
                    visual.put("color", "Deep ruby red, with violet reflections at the rim");
                    visual.put("clarity", "Crystal clear");
                    visual.put("intensity", "Deep");
                    visual.put("viscosity", "Pronounced legs indicating medium-full body");
                }
                case "white" -> {
                    visual.put("color", "Pale yellow, with greenish reflections and a faint golden glint");
                    visual.put("clarity", "Bright");
                    visual.put("intensity", "Medium");
                    visual.put("viscosity", "Fine legs");
                }
                case "rose" -> {
                    visual.put("color", "Pale salmon pink, with coppery glints at the rim");
                    visual.put("clarity", "Crystal clear");
                    visual.put("intensity", "Medium");
                    visual.put("viscosity", "Delicate legs");
                }
                default -> {
                    visual.put("color", "Characteristic color");
                    visual.put("clarity", "Bright");
                    visual.put("intensity", "Medium");
                    visual.put("viscosity", "Normal legs");
                }
            }
        }
        return visual;
    }

    private Map<String, Object> buildAromaticProfile(String wineType, boolean isSpanish) {
        Map<String, Object> aromatic = new HashMap<>();
        if (isSpanish) {
            switch (wineType) {
                case "red" -> {
                    aromatic.put("intensity", "Pronunciada");
                    aromatic.put("primaryAromas", Arrays.asList("Frutos rojos maduros", "Ciruela", "Especias"));
                    aromatic.put("secondaryAromas", Arrays.asList("Vainilla", "Roble tostado"));
                    aromatic.put("bouquet", "Aromas bien integrados con notas de fruta madura y toques especiados.");
                }
                case "white" -> {
                    aromatic.put("intensity", "Moderada");
                    aromatic.put("primaryAromas", Arrays.asList("Citricos", "Manzana verde", "Flores blancas"));
                    aromatic.put("secondaryAromas", Arrays.asList("Levadura", "Mantequilla"));
                    aromatic.put("bouquet", "Perfil aromatico fresco y limpio con buena complejidad.");
                }
                default -> {
                    aromatic.put("intensity", "Moderada");
                    aromatic.put("primaryAromas", Arrays.asList("Frutas", "Notas florales"));
                    aromatic.put("secondaryAromas", List.of("Fermentacion"));
                    aromatic.put("bouquet", "Perfil aromatico equilibrado.");
                }
            }
        } else {
            switch (wineType) {
                case "red" -> {
                    aromatic.put("intensity", "Pronounced");
                    aromatic.put("primaryAromas", Arrays.asList("Ripe red fruits", "Plum", "Spices"));
                    aromatic.put("secondaryAromas", Arrays.asList("Vanilla", "Toasted oak"));
                    aromatic.put("bouquet", "Well-integrated aromas with ripe fruit notes and spicy oak touches.");
                }
                case "white" -> {
                    aromatic.put("intensity", "Moderate");
                    aromatic.put("primaryAromas", Arrays.asList("Citrus", "Green apple", "White flowers"));
                    aromatic.put("secondaryAromas", Arrays.asList("Yeast", "Butter"));
                    aromatic.put("bouquet", "Fresh and clean aromatic profile with good complexity.");
                }
                default -> {
                    aromatic.put("intensity", "Moderate");
                    aromatic.put("primaryAromas", Arrays.asList("Fruits", "Floral notes"));
                    aromatic.put("secondaryAromas", List.of("Fermentation"));
                    aromatic.put("bouquet", "Balanced aromatic profile.");
                }
            }
        }
        return aromatic;
    }

    @SuppressWarnings("checkstyle:MagicNumber")
    private Map<String, Object> buildPalateAnalysis(String wineType, boolean isSpanish) {
        Map<String, Object> palate = new HashMap<>();
        if (isSpanish) {
            switch (wineType) {
                case "red" -> {
                    palate.put("sweetness", "Seco");
                    palate.put("sweetnessScore", 15);
                    palate.put("acidity", "Media+ - acidez vibrante");
                    palate.put("acidityScore", 70);
                    palate.put("tannin", "Medio - taninos sedosos");
                    palate.put("tanninScore", 55);
                    palate.put("alcohol", "Medio");
                    palate.put("body", "Medio-Plus");
                    palate.put("bodyScore", 72);
                    palate.put("texture", "Sedoso con estructura firme");
                    palate.put("balance", "Excelente equilibrio entre fruta, acidez y taninos");
                }
                case "white" -> {
                    palate.put("sweetness", "Seco");
                    palate.put("sweetnessScore", 10);
                    palate.put("acidity", "Alta - acidez crujiente");
                    palate.put("acidityScore", 82);
                    palate.put("tannin", "Ninguno");
                    palate.put("tanninScore", 5);
                    palate.put("alcohol", "Medio");
                    palate.put("body", "Medio");
                    palate.put("bodyScore", 45);
                    palate.put("texture", "Cremoso con buena frescura");
                    palate.put("balance", "Acidez y fruta bien balanceadas");
                }
                default -> {
                    palate.put("sweetness", "Seco");
                    palate.put("sweetnessScore", 15);
                    palate.put("acidity", "Media");
                    palate.put("acidityScore", 50);
                    palate.put("tannin", "Bajo");
                    palate.put("tanninScore", 25);
                    palate.put("alcohol", "Medio");
                    palate.put("body", "Medio");
                    palate.put("bodyScore", 50);
                    palate.put("texture", "Suave");
                    palate.put("balance", "Equilibrado");
                }
            }
        } else {
            switch (wineType) {
                case "red" -> {
                    palate.put("sweetness", "Dry");
                    palate.put("sweetnessScore", 15);
                    palate.put("acidity", "Medium+ - vibrant acidity");
                    palate.put("acidityScore", 70);
                    palate.put("tannin", "Medium - silky tannins");
                    palate.put("tanninScore", 55);
                    palate.put("alcohol", "Medium");
                    palate.put("body", "Medium-Plus");
                    palate.put("bodyScore", 72);
                    palate.put("texture", "Silky with firm structure");
                    palate.put("balance", "Excellent balance between fruit, acidity and tannins");
                }
                case "white" -> {
                    palate.put("sweetness", "Dry");
                    palate.put("sweetnessScore", 10);
                    palate.put("acidity", "High - crisp and refreshing");
                    palate.put("acidityScore", 82);
                    palate.put("tannin", "None");
                    palate.put("tanninScore", 5);
                    palate.put("alcohol", "Medium");
                    palate.put("body", "Medium");
                    palate.put("bodyScore", 45);
                    palate.put("texture", "Creamy with good freshness");
                    palate.put("balance", "Well-balanced acidity and fruit");
                }
                default -> {
                    palate.put("sweetness", "Dry");
                    palate.put("sweetnessScore", 15);
                    palate.put("acidity", "Medium");
                    palate.put("acidityScore", 50);
                    palate.put("tannin", "Low");
                    palate.put("tanninScore", 25);
                    palate.put("alcohol", "Medium");
                    palate.put("body", "Medium");
                    palate.put("bodyScore", 50);
                    palate.put("texture", "Smooth");
                    palate.put("balance", "Balanced");
                }
            }
        }
        return palate;
    }

    private Map<String, Object> buildFlavorProfile(String wineType, boolean isSpanish) {
        Map<String, Object> flavor = new HashMap<>();
        if (isSpanish) {
            switch (wineType) {
                case "red" -> {
                    flavor.put("primaryFlavors", Arrays.asList("Cereza negra", "Ciruela", "Especias"));
                    flavor.put("secondaryFlavors", Arrays.asList("Vainilla", "Chocolate"));
                    flavor.put("intensity", "Pronunciada");
                    flavor.put("finish", "Largo - persisten sabores de fruta madura mas de 30 segundos");
                }
                case "white" -> {
                    flavor.put("primaryFlavors", Arrays.asList("Limon", "Manzana", "Pera"));
                    flavor.put("secondaryFlavors", Arrays.asList("Mantequilla", "Avellana"));
                    flavor.put("intensity", "Moderada");
                    flavor.put("finish", "Medio - final fresco y limpio");
                }
                default -> {
                    flavor.put("primaryFlavors", List.of("Frutas"));
                    flavor.put("secondaryFlavors", List.of("Notas secundarias"));
                    flavor.put("intensity", "Moderada");
                    flavor.put("finish", "Medio");
                }
            }
        } else {
            switch (wineType) {
                case "red" -> {
                    flavor.put("primaryFlavors", Arrays.asList("Black cherry", "Plum", "Spices"));
                    flavor.put("secondaryFlavors", Arrays.asList("Vanilla", "Chocolate"));
                    flavor.put("intensity", "Pronounced");
                    flavor.put("finish", "Long - ripe fruit and spice flavors persist over 30 seconds");
                }
                case "white" -> {
                    flavor.put("primaryFlavors", Arrays.asList("Lemon", "Apple", "Pear"));
                    flavor.put("secondaryFlavors", Arrays.asList("Butter", "Hazelnut"));
                    flavor.put("intensity", "Moderate");
                    flavor.put("finish", "Medium - fresh and clean finish");
                }
                default -> {
                    flavor.put("primaryFlavors", List.of("Fruits"));
                    flavor.put("secondaryFlavors", List.of("Secondary notes"));
                    flavor.put("intensity", "Moderate");
                    flavor.put("finish", "Medium");
                }
            }
        }
        return flavor;
    }

    private Map<String, Object> buildFoodPairings(String wineType, boolean isSpanish) {
        Map<String, Object> pairings = new HashMap<>();
        if (isSpanish) {
            List<String> foods = switch (wineType) {
                case "red" -> Arrays.asList("Carnes rojas a la parrilla", "Cordero asado", "Quesos curados", "Pasta con ragu");
                case "white" -> Arrays.asList("Pescado grillado", "Mariscos", "Pollo a la crema", "Ensaladas");
                case "rose" -> Arrays.asList("Salmon", "Ensaladas", "Sushi", "Quesos suaves");
                default -> Arrays.asList("Quesos", "Embutidos");
            };
            pairings.put("pairings", foods);
            pairings.put("explanation", "Los maridajes se basan en complementar la estructura del vino con la intensidad de los platos.");
        } else {
            List<String> foods = switch (wineType) {
                case "red" -> Arrays.asList("Grilled red meats", "Roasted lamb", "Aged cheeses", "Pasta with ragu");
                case "white" -> Arrays.asList("Grilled fish", "Seafood", "Creamy chicken", "Salads");
                case "rose" -> Arrays.asList("Salmon", "Salads", "Sushi", "Soft cheeses");
                default -> Arrays.asList("Cheeses", "Charcuterie");
            };
            pairings.put("pairings", foods);
            pairings.put("explanation", "Pairings are based on complementing the wine structure with dish intensity.");
        }
        return pairings;
    }

    private Map<String, Object> buildServingRecommendations(String wineType, boolean isSpanish) {
        Map<String, Object> serving = new HashMap<>();
        String temp = switch (wineType) {
            case "red" -> "16-18C";
            case "white" -> "8-12C";
            case "sparkling" -> "6-8C";
            default -> "14-16C";
        };
        String glass = isSpanish
                ? (wineType.equals("red") ? "Copa bordelesa" : "Copa de vino blanco")
                : (wineType.equals("red") ? "Bordeaux glass" : "White wine glass");
        String decanting = isSpanish
                ? (wineType.equals("red") ? "Si, 30 minutos" : "No necesario")
                : (wineType.equals("red") ? "Yes, 30 minutes" : "Not necessary");
        String aging = isSpanish ? "Beber ahora o guardar 2-5 anos" : "Drink now or age 2-5 years";

        serving.put("temperature", temp);
        serving.put("glassware", glass);
        serving.put("decanting", decanting);
        serving.put("agingPotential", aging);
        return serving;
    }
}


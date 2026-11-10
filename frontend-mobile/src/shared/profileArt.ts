/**
 * Bundled watercolor art for the AI profile sections. Metro needs one static import per file.
 * File names are the kebab case of the key (WET_EARTH -> notes/wet-earth.webp).
 */
import type { DishArt, NoteArt, ServingArt } from "@/domain/wine/wine.profile-art";
import noteDriedFruit from "../../assets/images/profile-art/notes/dried-fruit.webp";
import noteGreenApple from "../../assets/images/profile-art/notes/green-apple.webp";
import noteWhiteFlowers from "../../assets/images/profile-art/notes/white-flowers.webp";
import noteChamomile from "../../assets/images/profile-art/notes/chamomile.webp";
import noteGreenPepper from "../../assets/images/profile-art/notes/green-pepper.webp";
import noteDriedHerbs from "../../assets/images/profile-art/notes/dried-herbs.webp";
import noteTomatoLeaf from "../../assets/images/profile-art/notes/tomato-leaf.webp";
import noteDriedLeaf from "../../assets/images/profile-art/notes/dried-leaf.webp";
import noteBayLeaf from "../../assets/images/profile-art/notes/bay-leaf.webp";
import noteSweetSpice from "../../assets/images/profile-art/notes/sweet-spice.webp";
import noteRaspberry from "../../assets/images/profile-art/notes/raspberry.webp";
import noteStrawberry from "../../assets/images/profile-art/notes/strawberry.webp";
import noteBlackCherry from "../../assets/images/profile-art/notes/black-cherry.webp";
import noteCherry from "../../assets/images/profile-art/notes/cherry.webp";
import noteBlackberry from "../../assets/images/profile-art/notes/blackberry.webp";
import noteBlueberry from "../../assets/images/profile-art/notes/blueberry.webp";
import noteRedCurrant from "../../assets/images/profile-art/notes/red-currant.webp";
import notePlum from "../../assets/images/profile-art/notes/plum.webp";
import noteFig from "../../assets/images/profile-art/notes/fig.webp";
import noteLemon from "../../assets/images/profile-art/notes/lemon.webp";
import noteOrange from "../../assets/images/profile-art/notes/orange.webp";
import noteGrapefruit from "../../assets/images/profile-art/notes/grapefruit.webp";
import noteApple from "../../assets/images/profile-art/notes/apple.webp";
import notePear from "../../assets/images/profile-art/notes/pear.webp";
import notePeach from "../../assets/images/profile-art/notes/peach.webp";
import noteQuince from "../../assets/images/profile-art/notes/quince.webp";
import notePineapple from "../../assets/images/profile-art/notes/pineapple.webp";
import noteRedGrape from "../../assets/images/profile-art/notes/red-grape.webp";
import noteGrape from "../../assets/images/profile-art/notes/grape.webp";
import noteWhiteMelon from "../../assets/images/profile-art/notes/white-melon.webp";
import noteMelon from "../../assets/images/profile-art/notes/melon.webp";
import notePomegranate from "../../assets/images/profile-art/notes/pomegranate.webp";
import noteRose from "../../assets/images/profile-art/notes/rose.webp";
import noteViolet from "../../assets/images/profile-art/notes/violet.webp";
import noteFreshHerbs from "../../assets/images/profile-art/notes/fresh-herbs.webp";
import noteTea from "../../assets/images/profile-art/notes/tea.webp";
import noteAnise from "../../assets/images/profile-art/notes/anise.webp";
import noteWhitePepper from "../../assets/images/profile-art/notes/white-pepper.webp";
import noteBlackPepper from "../../assets/images/profile-art/notes/black-pepper.webp";
import noteWetEarth from "../../assets/images/profile-art/notes/wet-earth.webp";
import noteBlackOlive from "../../assets/images/profile-art/notes/black-olive.webp";
import noteMineral from "../../assets/images/profile-art/notes/mineral.webp";
import noteLeather from "../../assets/images/profile-art/notes/leather.webp";
import noteTobacco from "../../assets/images/profile-art/notes/tobacco.webp";
import noteVanilla from "../../assets/images/profile-art/notes/vanilla.webp";
import noteCoffee from "../../assets/images/profile-art/notes/coffee.webp";
import noteChocolate from "../../assets/images/profile-art/notes/chocolate.webp";
import noteOak from "../../assets/images/profile-art/notes/oak.webp";
import noteHoney from "../../assets/images/profile-art/notes/honey.webp";
import noteCaramel from "../../assets/images/profile-art/notes/caramel.webp";
import noteMolasses from "../../assets/images/profile-art/notes/molasses.webp";
import noteBread from "../../assets/images/profile-art/notes/bread.webp";
import noteNuts from "../../assets/images/profile-art/notes/nuts.webp";
import noteButter from "../../assets/images/profile-art/notes/butter.webp";
import noteSaline from "../../assets/images/profile-art/notes/saline.webp";
import noteJam from "../../assets/images/profile-art/notes/jam.webp";
import noteSmoke from "../../assets/images/profile-art/notes/smoke.webp";
import noteMixedFruit from "../../assets/images/profile-art/notes/mixed-fruit.webp";
import noteHoneysuckle from "../../assets/images/profile-art/notes/honeysuckle.webp";
import noteRoastedPepper from "../../assets/images/profile-art/notes/roasted-pepper.webp";
import noteRedPepper from "../../assets/images/profile-art/notes/red-pepper.webp";
import noteGooseberry from "../../assets/images/profile-art/notes/gooseberry.webp";
import noteBlackcurrant from "../../assets/images/profile-art/notes/blackcurrant.webp";
import noteBergamot from "../../assets/images/profile-art/notes/bergamot.webp";
import noteLime from "../../assets/images/profile-art/notes/lime.webp";
import noteApricot from "../../assets/images/profile-art/notes/apricot.webp";
import notePassionFruit from "../../assets/images/profile-art/notes/passion-fruit.webp";
import noteLychee from "../../assets/images/profile-art/notes/lychee.webp";
import noteGinger from "../../assets/images/profile-art/notes/ginger.webp";
import dishBiscotti from "../../assets/images/profile-art/dishes/biscotti.webp";
import dishGoatCheese from "../../assets/images/profile-art/dishes/goat-cheese.webp";
import dishCheese from "../../assets/images/profile-art/dishes/cheese.webp";
import dishBeef from "../../assets/images/profile-art/dishes/beef.webp";
import dishLamb from "../../assets/images/profile-art/dishes/lamb.webp";
import dishPork from "../../assets/images/profile-art/dishes/pork.webp";
import dishPoultry from "../../assets/images/profile-art/dishes/poultry.webp";
import dishDuck from "../../assets/images/profile-art/dishes/duck.webp";
import dishGame from "../../assets/images/profile-art/dishes/game.webp";
import dishFish from "../../assets/images/profile-art/dishes/fish.webp";
import dishSeafood from "../../assets/images/profile-art/dishes/seafood.webp";
import dishPasta from "../../assets/images/profile-art/dishes/pasta.webp";
import dishRisotto from "../../assets/images/profile-art/dishes/risotto.webp";
import dishCharcuterie from "../../assets/images/profile-art/dishes/charcuterie.webp";
import dishVegetables from "../../assets/images/profile-art/dishes/vegetables.webp";
import dishMushrooms from "../../assets/images/profile-art/dishes/mushrooms.webp";
import dishOlives from "../../assets/images/profile-art/dishes/olives.webp";
import dishLegumes from "../../assets/images/profile-art/dishes/legumes.webp";
import dishStew from "../../assets/images/profile-art/dishes/stew.webp";
import dishPizza from "../../assets/images/profile-art/dishes/pizza.webp";
import dishMeatPie from "../../assets/images/profile-art/dishes/meat-pie.webp";
import dishOmelette from "../../assets/images/profile-art/dishes/omelette.webp";
import dishBreadedCutlet from "../../assets/images/profile-art/dishes/breaded-cutlet.webp";
import dishEmpanadas from "../../assets/images/profile-art/dishes/empanadas.webp";
import dishDessert from "../../assets/images/profile-art/dishes/dessert.webp";
import dishPate from "../../assets/images/profile-art/dishes/pate.webp";
import dishSeafoodRice from "../../assets/images/profile-art/dishes/seafood-rice.webp";
import dishCurry from "../../assets/images/profile-art/dishes/curry.webp";
import dishSavoryTart from "../../assets/images/profile-art/dishes/savory-tart.webp";
import dishFlan from "../../assets/images/profile-art/dishes/flan.webp";
import dishNutTart from "../../assets/images/profile-art/dishes/nut-tart.webp";
import dishCouscous from "../../assets/images/profile-art/dishes/couscous.webp";
import dishFruitTart from "../../assets/images/profile-art/dishes/fruit-tart.webp";
import dishSalad from "../../assets/images/profile-art/dishes/salad.webp";
import dishGreenVegetables from "../../assets/images/profile-art/dishes/green-vegetables.webp";
import servingRedBalloon from "../../assets/images/profile-art/serving/red-balloon.webp";
import servingWhiteTulip from "../../assets/images/profile-art/serving/white-tulip.webp";
import servingFlute from "../../assets/images/profile-art/serving/flute.webp";
import servingSparklingTulip from "../../assets/images/profile-art/serving/sparkling-tulip.webp";
import servingBordeaux from "../../assets/images/profile-art/serving/bordeaux.webp";
import servingWhiteBowl from "../../assets/images/profile-art/serving/white-bowl.webp";
import servingRose from "../../assets/images/profile-art/serving/rose.webp";
import servingDessert from "../../assets/images/profile-art/serving/dessert.webp";
import servingUniversal from "../../assets/images/profile-art/serving/universal.webp";
import servingDecanter from "../../assets/images/profile-art/serving/decanter.webp";
import servingOpenBottle from "../../assets/images/profile-art/serving/open-bottle.webp";
import servingCellar from "../../assets/images/profile-art/serving/cellar.webp";

/** Asset file name of an art key. */
export function profileArtFileName(key: string): string {
  return `${key.toLowerCase().replace(/_/g, "-")}.webp`;
}

/** Aroma and flavor notes. */
export const NOTE_ART: Record<NoteArt, number> = {
  DRIED_FRUIT: noteDriedFruit,
  GREEN_APPLE: noteGreenApple,
  HONEYSUCKLE: noteHoneysuckle,
  WHITE_FLOWERS: noteWhiteFlowers,
  CHAMOMILE: noteChamomile,
  ROASTED_PEPPER: noteRoastedPepper,
  RED_PEPPER: noteRedPepper,
  GREEN_PEPPER: noteGreenPepper,
  DRIED_HERBS: noteDriedHerbs,
  TOMATO_LEAF: noteTomatoLeaf,
  DRIED_LEAF: noteDriedLeaf,
  BAY_LEAF: noteBayLeaf,
  SWEET_SPICE: noteSweetSpice,
  RASPBERRY: noteRaspberry,
  STRAWBERRY: noteStrawberry,
  BLACK_CHERRY: noteBlackCherry,
  CHERRY: noteCherry,
  BLACKBERRY: noteBlackberry,
  GOOSEBERRY: noteGooseberry,
  BLACKCURRANT: noteBlackcurrant,
  RED_CURRANT: noteRedCurrant,
  BLUEBERRY: noteBlueberry,
  PLUM: notePlum,
  FIG: noteFig,
  BERGAMOT: noteBergamot,
  LIME: noteLime,
  LEMON: noteLemon,
  ORANGE: noteOrange,
  GRAPEFRUIT: noteGrapefruit,
  APPLE: noteApple,
  PEAR: notePear,
  APRICOT: noteApricot,
  PEACH: notePeach,
  QUINCE: noteQuince,
  PASSION_FRUIT: notePassionFruit,
  PINEAPPLE: notePineapple,
  LYCHEE: noteLychee,
  RED_GRAPE: noteRedGrape,
  GRAPE: noteGrape,
  WHITE_MELON: noteWhiteMelon,
  MELON: noteMelon,
  POMEGRANATE: notePomegranate,
  ROSE: noteRose,
  VIOLET: noteViolet,
  FRESH_HERBS: noteFreshHerbs,
  TEA: noteTea,
  GINGER: noteGinger,
  ANISE: noteAnise,
  WHITE_PEPPER: noteWhitePepper,
  BLACK_PEPPER: noteBlackPepper,
  WET_EARTH: noteWetEarth,
  BLACK_OLIVE: noteBlackOlive,
  MINERAL: noteMineral,
  LEATHER: noteLeather,
  TOBACCO: noteTobacco,
  VANILLA: noteVanilla,
  COFFEE: noteCoffee,
  CHOCOLATE: noteChocolate,
  OAK: noteOak,
  HONEY: noteHoney,
  CARAMEL: noteCaramel,
  MOLASSES: noteMolasses,
  BREAD: noteBread,
  NUTS: noteNuts,
  BUTTER: noteButter,
  SALINE: noteSaline,
  JAM: noteJam,
  SMOKE: noteSmoke,
  MIXED_FRUIT: noteMixedFruit,
};

/** Food pairing dishes. */
export const DISH_ART: Record<DishArt, number> = {
  PATE: dishPate,
  PIZZA: dishPizza,
  MEAT_PIE: dishMeatPie,
  OMELETTE: dishOmelette,
  BREADED_CUTLET: dishBreadedCutlet,
  EMPANADAS: dishEmpanadas,
  SEAFOOD_RICE: dishSeafoodRice,
  RISOTTO: dishRisotto,
  CURRY: dishCurry,
  SAVORY_TART: dishSavoryTart,
  FLAN: dishFlan,
  NUT_TART: dishNutTart,
  COUSCOUS: dishCouscous,
  FRUIT_TART: dishFruitTart,
  PASTA: dishPasta,
  BISCOTTI: dishBiscotti,
  GOAT_CHEESE: dishGoatCheese,
  CHEESE: dishCheese,
  BEEF: dishBeef,
  LAMB: dishLamb,
  PORK: dishPork,
  POULTRY: dishPoultry,
  DUCK: dishDuck,
  GAME: dishGame,
  FISH: dishFish,
  SEAFOOD: dishSeafood,
  CHARCUTERIE: dishCharcuterie,
  SALAD: dishSalad,
  GREEN_VEGETABLES: dishGreenVegetables,
  VEGETABLES: dishVegetables,
  MUSHROOMS: dishMushrooms,
  OLIVES: dishOlives,
  LEGUMES: dishLegumes,
  STEW: dishStew,
  DESSERT: dishDessert,
};

/** Glasses, decanter, uncorked bottle and cellar. */
export const SERVING_ART: Record<ServingArt, number> = {
  RED_BALLOON: servingRedBalloon,
  WHITE_TULIP: servingWhiteTulip,
  FLUTE: servingFlute,
  SPARKLING_TULIP: servingSparklingTulip,
  BORDEAUX: servingBordeaux,
  WHITE_BOWL: servingWhiteBowl,
  ROSE: servingRose,
  DESSERT: servingDessert,
  UNIVERSAL: servingUniversal,
  DECANTER: servingDecanter,
  OPEN_BOTTLE: servingOpenBottle,
  CELLAR: servingCellar,
};

-- #497: refined, global social content written in Spanish and English.
-- 1. Every content pillar brief is rewritten in the new voice (neutral Spanish with "tú", technical and precise, pairings by
--    food category) and gains an English brief. The wine-day names stay as they are.
-- 2. Copy and media become per language: social_posts.copy holds {"es": copy, "en": copy} and the media keeps one target
--    copy hash and one slide set per language. Rows stored before this migration keep their copy and their slides under
--    "es"; the English side stays missing until the post is regenerated.
-- Every statement only touches rows still in the old shape, so running it again changes nothing.

ALTER TABLE content_pillars ADD COLUMN IF NOT EXISTS brief_en TEXT;

UPDATE content_pillars SET brief = rewritten.brief, brief_en = rewritten.brief_en
FROM (VALUES
('WINE_DAY',
 'Publicación de un día del vino. Explica por qué existe el día (quién lo impulsa, desde cuándo y qué celebra) y suma al menos dos datos concretos y verificables: origen e historia de la cepa o del estilo, sus principales regiones en el mundo, cómo se muestra en la copa (cuerpo, acidez, taninos, aromas) y qué decisiones de elaboración lo definen. Si hablas de maridaje, hazlo por categorías de alimentos y explícalo por la estructura. Cierra invitando a contar qué botella abrirán ese día.',
 'A wine-day post. Explain why the day exists (who promotes it, since when and what it celebrates) and add at least two concrete, verifiable facts: the origin and history of the grape or style, its main regions around the world, how it shows in the glass (body, acidity, tannin, aromatics) and which winemaking choices define it. If you mention food, pair by category and explain it through structure. Close by inviting readers to share which bottle they will open that day.'),
('CURIOUS_FACT',
 'Formato "N datos sobre X": entre 3 y 5 curiosidades verificables sobre un tema del vino (una cepa, una región, una técnica de elaboración, un hito histórico). Cada dato lleva una cifra, una fecha, un lugar o un nombre concreto y, cuando hace falta, el término técnico explicado en pocas palabras; nada de generalidades.',
 '"N facts about X": three to five verifiable curiosities about one wine topic (a grape, a region, a winemaking technique, a historical milestone). Each fact carries a figure, a date, a place or a specific name and, where needed, the technical term explained in a few words; no generalities.'),
('EDUCATION',
 'Carrusel educativo de una sola idea: un concepto del vino explicado con precisión (fermentación maloláctica, crianza sobre lías, estructura tánica, terroir, clones, extracción). Qué es, por qué ocurre, cómo se nota en la copa y un ejemplo de vinos o regiones donde se aprecia. Cada término técnico va acompañado de su explicación breve.',
 'A single-idea educational carousel: one wine concept explained precisely (malolactic fermentation, lees ageing, tannin structure, terroir, clones, extraction). What it is, why it happens, how it shows in the glass and an example of wines or regions where it can be tasted. Every technical term comes with a short explanation.'),
('MYTH_VS_REALITY',
 'Formato mito vs realidad: una creencia extendida sobre el vino y lo que dicen la enología y la evidencia, con un dato concreto. Un mito por publicación, explicado con respeto y sin burlarse de quien lo creía.',
 'Myth vs reality: one widespread belief about wine and what oenology and the evidence say, backed by a concrete fact. One myth per post, explained with respect and without mocking anyone who believed it.'),
('QUIZ',
 'Una pregunta de trivia sobre vino con cuatro opciones A, B, C y D en los slides; la respuesta correcta y una explicación técnica breve en el último slide. La pregunta invita a responder en los comentarios antes de deslizar.',
 'A wine trivia question with four options A, B, C and D across the slides; the correct answer and a short technical explanation on the last slide. The question invites readers to answer in the comments before swiping.'),
('PAIRING',
 'Maridaje por categorías de alimentos, nunca con un plato puntual: qué estilo de vino acompaña a cada grupo y por qué, explicado por la estructura (grasa, acidez, taninos, sal). Usa ejemplos refinados como quesos de pasta dura y madurados (parmesano, pecorino), quesos semiduros de tenor graso medio (fontina, gruyère), carnes rojas, carnes blancas, pescados grasos u hongos y verduras asadas. Nunca comida rápida ni callejera. Cierra preguntando qué combinación prefieren.',
 'Pairing by food category, never a single dish: which wine style suits each food group and why, explained through structure (fat, acidity, tannin, salt). Use refined examples such as hard aged cheeses (Parmesan, Pecorino), semi-hard cheeses of medium fat (Fontina, Gruyère), red meat, white meat, oily fish, or mushrooms and roasted vegetables. Never fast food or street food. Close by asking which pairing readers prefer.'),
('GRAPE_OF_MONTH',
 'Cepa del mes: su origen e historia, sus principales regiones en el mundo, su perfil en la copa (cuerpo, acidez, taninos, aromas), cómo la transforman las decisiones de elaboración (madera, crianza, vinificación) y su potencial de guarda, con una curiosidad que lleve una cifra. Invita a contar si ya la conocían.',
 'Grape of the month: its origin and history, its main regions around the world, its profile in the glass (body, acidity, tannin, aromatics), how winemaking choices (oak, ageing, vinification) transform it and its ageing potential, with one curiosity that carries a figure. Invite readers to share whether they already know it.'),
('HUMOR',
 'Humor ingenioso y elegante sobre los rituales del vino (decantar, oler el corcho, elegir la copa, la temperatura de servicio), siempre con un dato real detrás. Cómplice con quien está aprendiendo, nunca a costa de la cultura del vino ni de quien sabe menos; un remate breve por slide.',
 'Witty, elegant humour about wine rituals (decanting, smelling the cork, choosing the glass, serving temperature), always with a real fact behind it. On the side of people who are learning, never at the expense of wine culture or of anyone who knows less; one short punchline per slide.'),
('APP_FEATURE',
 'Muestra una función de Vinnot (escanear una etiqueta, guardar un vino en tu cava, comparar dos vinos, armar una ruta del vino) como la respuesta a una necesidad real de quien disfruta del vino. Una sola función por publicación y un llamado claro a registrarse en vinnot.com/share.',
 'Show one Vinnot feature (scanning a label, saving a wine to your cellar, comparing two wines, planning a wine route) as the answer to a real need of wine lovers. One feature per post and a clear call to sign up at vinnot.com/share.')
) AS rewritten (code, brief, brief_en)
WHERE content_pillars.code = rewritten.code;

ALTER TABLE content_pillars ALTER COLUMN brief_en SET NOT NULL;

-- Old copy documents carry their fields at the top level ("hook" among them); they become the Spanish copy.
UPDATE social_posts SET copy = jsonb_build_object('es', copy)
WHERE copy IS NOT NULL AND copy -> 'hook' IS NOT NULL;

-- Old media documents target one copy hash and hold one slide set; both become the Spanish ones.
UPDATE social_posts
SET media = (media - 'copyHash' - 'slides') || jsonb_build_object(
        'copyHashes', jsonb_build_object('es', media -> 'copyHash'),
        'slides', CASE WHEN jsonb_typeof(media -> 'slides') = 'object' THEN jsonb_build_object('es', media -> 'slides')
                       ELSE '{}'::jsonb END)
WHERE media IS NOT NULL AND media -> 'copyHash' IS NOT NULL;

COMMENT ON COLUMN social_posts.language IS 'Unused since #497: every post is written in Spanish and English (see copy).';

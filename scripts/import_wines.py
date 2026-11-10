#!/usr/bin/env python3
"""
Import wineries and wines from local JSON files into the Vinnot database.

Expects two directories under docs/:
  docs/wineries/   – one JSON per country, e.g. ar_wineries.json, br_wineries.json
  docs/wines/      – one JSON per country, e.g. ar_wines.json,   br_wines.json

Phase 1: Ensure countries exist
Phase 2: Load all winery JSONs → ensure regions → upsert wineries
Phase 3: Load all wine JSONs   → ensure regions/wineries → insert wines

Optimised for large volumes (~200 000 wineries, 1 000 000+ wines):
  • psycopg2 execute_values for batched inserts
  • In-memory dedup sets
  • Streaming per-file processing

Usage:
    python3 scripts/import_wines.py [--wineries-dir DIR] [--wines-dir DIR]
"""

import argparse
import glob
import json
import os
import re
import sys
import unicodedata
import uuid
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from psycopg2.extras import execute_values

# ── Config ──────────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "port": int(os.environ.get("DB_PORT", 5432)),
    "dbname": os.environ.get("DB_NAME", "vinnot"),
    "user": os.environ.get("DB_USER", "vinnot"),
    "password": os.environ.get("DB_PASS", "vinnot_secret"),
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_WINERIES_DIR = os.path.join(SCRIPT_DIR, "..", "docs", "wineries")
DEFAULT_WINES_DIR = os.path.join(SCRIPT_DIR, "..", "docs", "wines")

BATCH_SIZE = 500

# ── Country code → full name mapping ────────────────────────────────────────
COUNTRY_NAMES = {
    "ad": "Andorra",
    "ar": "Argentina",
    "cl": "Chile",
    "es": "España",
    "fr": "Francia",
    "it": "Italia",
    "pt": "Portugal",
    "us": "Estados Unidos",
    "au": "Australia",
    "za": "Sudáfrica",
    "nz": "Nueva Zelanda",
    "de": "Alemania",
    "at": "Austria",
    "uy": "Uruguay",
    "br": "Brasil",
    "mx": "México",
    "gr": "Grecia",
    "hu": "Hungría",
    "ro": "Rumania",
    "ge": "Georgia",
    "cn": "China",
    "gb": "Reino Unido",
    "il": "Israel",
    "lb": "Líbano",
    "ma": "Marruecos",
    "hr": "Croacia",
    "si": "Eslovenia",
    "bg": "Bulgaria",
    "ch": "Suiza",
    "pe": "Perú",
    "bo": "Bolivia",
    "ca": "Canadá",
    "jp": "Japón",
    "tr": "Turquía",
    "md": "Moldavia",
    "rs": "Serbia",
    "mk": "Macedonia del Norte",
    "tn": "Túnez",
    "dz": "Argelia",
    "cy": "Chipre",
    "mt": "Malta",
    "lu": "Luxemburgo",
    "be": "Bélgica",
    "cz": "Chequia",
    "sk": "Eslovaquia",
    "ua": "Ucrania",
    "ru": "Rusia",
    "in": "India",
    "th": "Tailandia",
    "kr": "Corea del Sur",
    "tw": "Taiwán",
    "am": "Armenia",
    "az": "Azerbaiyán",
    "al": "Albania",
    "ba": "Bosnia y Herzegovina",
    "me": "Montenegro",
    "eg": "Egipto",
    "et": "Etiopía",
    "ke": "Kenia",
    "tz": "Tanzania",
    "co": "Colombia",
    "ve": "Venezuela",
    "ec": "Ecuador",
    "py": "Paraguay",
    "pa": "Panamá",
    "cr": "Costa Rica",
    "do": "República Dominicana",
    "nl": "Países Bajos",
    "dk": "Dinamarca",
    "se": "Suecia",
    "no": "Noruega",
    "pl": "Polonia",
    "ie": "Irlanda",
    "uz": "Uzbekistán",
    "kz": "Kazajistán",
    "mm": "Myanmar",
    "lk": "Sri Lanka",
    "sy": "Siria",
    "jo": "Jordania",
    "iq": "Irak",
    "ps": "Palestina",
    "aw": "Aruba",
    "af": "Afganistán",
    "bs": "Bahamas",
    "bt": "Bután",
    "by": "Bielorrusia",
    "bz": "Belice",
    "cu": "Cuba",
    "cv": "Cabo Verde",
    "ee": "Estonia",
    "fi": "Finlandia",
    "ga": "Gabón",
    "hk": "Hong Kong",
    "id": "Indonesia",
    "im": "Isla de Man",
    "ir": "Irán",
    "jm": "Jamaica",
    "kp": "Corea del Norte",
    "kg": "Kirguistán",
    "li": "Liechtenstein",
    "ls": "Lesoto",
    "lt": "Lituania",
    "lv": "Letonia",
    "mu": "Mauricio",
    "na": "Namibia",
    "nf": "Isla Norfolk",
    "np": "Nepal",
    "pf": "Polinesia Francesa",
    "pg": "Papúa Nueva Guinea",
    "ph": "Filipinas",
    "sm": "San Marino",
    "sn": "Senegal",
    "vi": "Islas Vírgenes de EE. UU.",
    "vn": "Vietnam",
    "xk": "Kosovo",
    "ae": "Emiratos Árabes Unidos",
    "an": "Antillas Neerlandesas",
    "ao": "Angola",
    "cw": "Curazao",
    "gt": "Guatemala",
    "hn": "Honduras",
}

# Wine-type string → DB enum
WINE_TYPE_MAP = {
    "Red": "RED",
    "White": "WHITE",
    "Sparkling": "SPARKLING",
    "Ros": "ROSE",
    "Rosé": "ROSE",
    "Rose": "ROSE",
    "Dessert": "DESSERT",
    "Fortified": "FORTIFIED",
    "Orange": "ORANGE",
    "": "RED",
}

# ── Known grape varieties (longest first for matching) ──────────────────────
KNOWN_GRAPES = [
    "Cabernet Sauvignon", "Sauvignon Blanc", "Pinot Noir", "Pinot Grigio",
    "Pinot Gris", "Pinot Blanco", "Pinot Meunier", "Chenin Blanc",
    "Petit Verdot", "Pedro Ximénez", "Pedro Ximenez", "Grüner Veltliner",
    "Gruner Veltliner", "Cabernet Franc", "Garnacha Blanca",
    "Touriga Nacional", "Criolla Grande", "Moscatel de Alejandría",
    "Moscatel de Alejandria", "Blanc de Blancs", "Ugni Blanc",
    "Malbec", "Merlot", "Chardonnay", "Syrah", "Shiraz", "Bonarda",
    "Torrontés", "Torrontes", "Tempranillo", "Tannat", "Viognier",
    "Riesling", "Gewürztraminer", "Gewurztraminer", "Sangiovese",
    "Nebbiolo", "Barbera", "Garnacha", "Grenache", "Mourvèdre",
    "Mourvedre", "Monastrell", "Carménère", "Carmenere", "Semillón",
    "Semillon", "Marsanne", "Roussanne", "Verdejo", "Vermentino",
    "Primitivo", "Zinfandel", "Dolcetto", "Corvina", "Cinsault",
    "Trebbiano", "Mencía", "Mencia", "Albariño", "Albarino",
    "Moscatel", "Moscato", "Ancellotta", "Aspiran", "Cereza",
    "Criolla", "Lambrusco", "Prosecco", "Sémillon",
]

GRAPE_SYNONYMS = {
    "shiraz": "Syrah",
    "grenache": "Garnacha",
    "moscato": "Moscatel",
    "pinot gris": "Pinot Grigio",
    "pinot blanco": "Pinot Grigio",
    "gruner veltliner": "Grüner Veltliner",
    "gewurztraminer": "Gewürztraminer",
    "carmenere": "Carménère",
    "semillon": "Semillón",
    "torrontes": "Torrontés",
    "mourvedre": "Mourvèdre",
    "mencia": "Mencía",
    "albarino": "Albariño",
    "pedro ximenez": "Pedro Ximénez",
    "moscatel de alejandria": "Moscatel",
    "sémillon": "Semillón",
}


# ── Helpers ─────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    """Generate a URL-friendly slug."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text.strip("-")


def normalize_name(name: str) -> str:
    """Normalize a name for case-insensitive matching (strip accents, lower, trim prefixes)."""
    if not name:
        return ""
    text = unicodedata.normalize("NFKD", name)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    for prefix in ("bodega ", "bodegas ", "viña ", "vina ", "domaine ", "chateau "):
        if text.startswith(prefix):
            text = text[len(prefix):]
    return text


def extract_grapes_from_name(wine_name: str) -> list[str]:
    """Extract grape varieties from a wine name by matching against known grapes."""
    if not wine_name:
        return []

    name_lower = wine_name.lower()

    blend_indicators = [
        "blend", "assemblage", "corte", "field blend",
        "gran corte", "tinto", "red blend", "white blend",
    ]
    is_blend = any(ind in name_lower for ind in blend_indicators)

    found_grapes: list[str] = []
    matched_positions: set[int] = set()

    for grape in KNOWN_GRAPES:
        grape_lower = grape.lower()
        start = 0
        while True:
            idx = name_lower.find(grape_lower, start)
            if idx == -1:
                break
            end_idx = idx + len(grape_lower)
            before_ok = idx == 0 or not name_lower[idx - 1].isalpha()
            after_ok = end_idx >= len(name_lower) or not name_lower[end_idx].isalpha()
            if before_ok and after_ok:
                pos_range = set(range(idx, end_idx))
                if not pos_range & matched_positions:
                    matched_positions |= pos_range
                    canonical = GRAPE_SYNONYMS.get(grape_lower, grape)
                    if canonical not in found_grapes:
                        found_grapes.append(canonical)
            start = end_idx

    if not found_grapes and is_blend:
        return ["Blend"]
    return found_grapes


def infer_wine_type(grapes: list, wine_name: str) -> str:
    """Fallback type inference from grapes/name when no explicit type is available."""
    name_lower = (wine_name or "").lower()
    grape_names = [g.lower() for g in grapes] if grapes else []

    sparkling = ["champagne", "cava", "prosecco", "brut", "espumante", "sparkling", "cremant", "sekt", "bubbles"]
    if any(w in name_lower for w in sparkling):
        return "SPARKLING"

    rose = ["rosé", "rose", "rosado", "rosato", "blush"]
    if any(w in name_lower for w in rose):
        return "ROSE"

    white_grapes = {
        "chardonnay", "sauvignon blanc", "riesling", "pinot grigio", "pinot gris",
        "gewürztraminer", "gewurztraminer", "viognier", "chenin blanc", "albariño",
        "albarino", "verdejo", "moscatel", "muscat", "torrontés", "torrontes",
        "semillon", "sémillon", "marsanne", "roussanne", "grüner veltliner",
        "vermentino", "trebbiano", "garganega", "fiano", "arneis", "godello",
        "macabeo", "parellada", "pedro ximenez", "palomino", "verdelho",
        "colombard", "müller-thurgau", "silvaner", "cortese", "verdicchio",
        "falanghina", "pecorino",
    }
    white_words = ["blanco", "white", "blanc", "bianco", "weiss"]
    if any(w in name_lower for w in white_words):
        return "WHITE"
    if grape_names and all(g in white_grapes for g in grape_names):
        return "WHITE"

    dessert = [
        "dulce", "sweet", "late harvest", "cosecha tardía", "botrytis",
        "icewine", "eiswein", "passito", "vin santo", "pedro ximenez", "px",
        "sauternes", "tokaji",
    ]
    if any(w in name_lower for w in dessert):
        return "DESSERT"

    fortified = [
        "jerez", "sherry", "port", "porto", "madeira", "marsala", "vermouth",
        "fortificado", "fortified",
    ]
    if any(w in name_lower for w in fortified):
        return "FORTIFIED"

    return "RED"


def load_json_files(directory: str, pattern: str = "*.json") -> list[tuple[str, list]]:
    """
    Load all matching JSON files from *directory*.
    Returns list of (filepath, data_list) tuples, sorted by filename.
    """
    if not os.path.isdir(directory):
        return []
    files = sorted(glob.glob(os.path.join(directory, pattern)))
    result = []
    for fp in files:
        try:
            with open(fp, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                result.append((fp, data))
                print(f"       • {os.path.basename(fp):30s}  {len(data):>8,} records")
            else:
                print(f"       ⚠ {os.path.basename(fp)} is not a JSON array – skipped")
        except Exception as e:
            print(f"       ✗ Error loading {os.path.basename(fp)}: {e}")
    return result


# ── DB batch helpers ────────────────────────────────────────────────────────

def _insert_wineries_batch(cur, batch: list):
    """Batch-insert winery rows using execute_values."""
    sql = """
        INSERT INTO wineries (
            id, name, slug, seo_name, business_name,
            region_id, country_id, background_image_url,
            website, phone, email,
            is_active, created_at, updated_at
        ) VALUES %s
        ON CONFLICT (slug) DO NOTHING
    """
    template = "(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"
    execute_values(cur, sql, batch, template=template, page_size=BATCH_SIZE)


def _insert_wines_batch(cur, batch: list):
    """Batch-insert wine rows using execute_values."""
    sql = """
        INSERT INTO wines (
            id, winery_id, name, wine_type,
            rating_average, rating_count,
            image_url, bottle_image_url,
            external_url,
            is_natural, labels_count, vintages_count,
            best_vintage_year, best_vintage_rating,
            seo_name, grapes,
            country_id, region_id,
            is_featured, is_active,
            created_at, updated_at
        ) VALUES %s
    """
    template = (
        "(%s, %s, %s, %s, "
        "%s, %s, "
        "%s, %s, "
        "%s, "
        "%s, %s, %s, "
        "%s, %s, "
        "%s, %s::jsonb, "
        "%s, %s, "
        "FALSE, TRUE, "
        "%s, %s)"
    )
    execute_values(cur, sql, batch, template=template, page_size=BATCH_SIZE)


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Import wineries & wines into Vinnot DB")
    parser.add_argument("--wineries-dir", default=DEFAULT_WINERIES_DIR,
                        help="Directory containing *_wineries.json files (default: docs/wineries/)")
    parser.add_argument("--wines-dir", default=DEFAULT_WINES_DIR,
                        help="Directory containing *_wines.json files (default: docs/wines/)")
    args = parser.parse_args()

    wineries_dir = os.path.abspath(args.wineries_dir)
    wines_dir = os.path.abspath(args.wines_dir)

    print("=" * 70)
    print("  VINNOT – Bulk Import Script")
    print("  Countries → Regions → Wineries → Wines")
    print("=" * 70)
    print(f"  Wineries dir: {wineries_dir}")
    print(f"  Wines dir:    {wines_dir}")

    # ── Connect ─────────────────────────────────────────────────────────
    print("\n  Connecting to database …")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        cur = conn.cursor()
        print("  ✓ Connected")
    except Exception as e:
        print(f"  ✗ Connection error: {e}")
        sys.exit(1)

    now = datetime.now(timezone.utc)

    # ── PHASE 1: Countries ──────────────────────────────────────────────
    print("\n[1/5] Ensuring countries exist …")
    country_map: dict[str, str] = {}  # code → id (str)

    cur.execute("SELECT id, code FROM countries")
    for row in cur.fetchall():
        country_map[row[1]] = str(row[0])

    countries_inserted = 0
    for code, name in COUNTRY_NAMES.items():
        if code not in country_map:
            cid = str(uuid.uuid4())
            cur.execute(
                "INSERT INTO countries (id, code, name, created_at) VALUES (%s, %s, %s, %s) "
                "ON CONFLICT (code) DO NOTHING",
                (cid, code, name, now),
            )
            country_map[code] = cid
            countries_inserted += 1
    conn.commit()
    print(f"       ✓ {countries_inserted} new, {len(country_map)} total")

    # ── PHASE 2: Wineries (from docs/wineries/*.json) ───────────────────
    print(f"\n[2/5] Loading winery files from {wineries_dir} …")
    winery_files = load_json_files(wineries_dir)

    if not winery_files:
        print("       ⚠ No winery JSON files found – skipping winery bulk import")

    # Load existing regions & wineries
    region_map: dict[tuple[str, str], str] = {}  # (lower_name, country_code) → id
    cur.execute("""
        SELECT r.id, r.name, c.code
        FROM regions r JOIN countries c ON r.country_id = c.id
    """)
    for row in cur.fetchall():
        region_map[(row[1].lower(), row[2])] = str(row[0])

    winery_name_map: dict[str, str] = {}   # normalized_name → id
    winery_seo_map: dict[str, str] = {}    # seo_name → id
    slug_set: set[str] = set()

    cur.execute("SELECT id, name, seo_name, slug FROM wineries")
    for row in cur.fetchall():
        winery_name_map[normalize_name(row[1])] = str(row[0])
        if row[2]:
            winery_seo_map[row[2].lower()] = str(row[0])
        if row[3]:
            slug_set.add(row[3])

    print(f"       Existing: {len(region_map)} regions, {len(winery_name_map)} wineries")

    total_regions_inserted = 0
    total_wineries_inserted = 0
    total_wineries_updated = 0

    for filepath, winery_data in winery_files:
        fname = os.path.basename(filepath)
        regions_inserted = 0
        wineries_inserted = 0
        wineries_updated = 0
        batch: list = []

        for wd in winery_data:
            winery_name = wd.get("name", "").strip()
            if not winery_name:
                continue

            # Resolve country
            country_code = (wd.get("country_code") or wd.get("country", "")).strip().lower()
            if not country_code:
                continue
            country_id = country_map.get(country_code)
            if not country_id:
                cname = COUNTRY_NAMES.get(country_code, country_code.upper())
                cid = str(uuid.uuid4())
                cur.execute(
                    "INSERT INTO countries (id, code, name, created_at) VALUES (%s,%s,%s,%s) "
                    "ON CONFLICT (code) DO NOTHING",
                    (cid, country_code, cname, now),
                )
                cur.execute("SELECT id FROM countries WHERE code = %s", (country_code,))
                country_id = str(cur.fetchone()[0])
                country_map[country_code] = country_id

            # Ensure region
            region_name = wd.get("region", "").strip()
            region_id = None
            if region_name:
                rkey = (region_name.lower(), country_code)
                if rkey not in region_map:
                    rid = str(uuid.uuid4())
                    try:
                        cur.execute(
                            "INSERT INTO regions (id, name, country_id, created_at) VALUES (%s,%s,%s,%s)",
                            (rid, region_name, country_id, now),
                        )
                        region_map[rkey] = rid
                        regions_inserted += 1
                    except psycopg2.IntegrityError:
                        conn.rollback()
                        cur.execute(
                            "SELECT r.id FROM regions r JOIN countries c ON r.country_id = c.id "
                            "WHERE LOWER(r.name) = %s AND c.code = %s",
                            (region_name.lower(), country_code),
                        )
                        row = cur.fetchone()
                        if row:
                            region_map[rkey] = str(row[0])
                region_id = region_map.get((region_name.lower(), country_code))

            seo_name = wd.get("seo_name") or slugify(winery_name)
            business_name = wd.get("business_name")
            bg_image = wd.get("background_image", "")
            if bg_image and not bg_image.startswith("http"):
                bg_image = "https:" + bg_image
            website = (wd.get("website") or "").strip() or None
            phone = (wd.get("phone") or "").strip() or None
            email = (wd.get("email") or "").strip() or None

            norm_key = normalize_name(winery_name)

            # Already exists? → light update
            if norm_key in winery_name_map:
                existing_id = winery_name_map[norm_key]
                try:
                    cur.execute("""
                        UPDATE wineries SET
                            seo_name     = COALESCE(seo_name, %s),
                            business_name = COALESCE(business_name, %s),
                            region_id    = COALESCE(region_id, %s),
                            country_id   = COALESCE(country_id, %s),
                            background_image_url = COALESCE(background_image_url, %s),
                            updated_at   = %s
                        WHERE id = %s
                    """, (
                        seo_name, business_name,
                        region_id, country_id,
                        bg_image or None, now, existing_id,
                    ))
                    wineries_updated += 1
                except Exception:
                    conn.rollback()
                continue

            # New winery
            winery_id = str(uuid.uuid4())
            slug = seo_name or slugify(winery_name)
            if slug in slug_set:
                slug = f"{slug}-{winery_id[:8]}"
            slug_set.add(slug)

            batch.append((
                winery_id, winery_name, slug, seo_name, business_name,
                region_id, country_id,
                bg_image or None,
                website, phone, email,
                True, now, now,
            ))
            winery_name_map[norm_key] = winery_id
            if seo_name:
                winery_seo_map[seo_name.lower()] = winery_id
            wineries_inserted += 1

            if len(batch) >= BATCH_SIZE:
                _insert_wineries_batch(cur, batch)
                conn.commit()
                batch = []

        if batch:
            _insert_wineries_batch(cur, batch)
            conn.commit()

        total_regions_inserted += regions_inserted
        total_wineries_inserted += wineries_inserted
        total_wineries_updated += wineries_updated
        print(f"       {fname}: +{wineries_inserted} wineries, ~{wineries_updated} updated, +{regions_inserted} regions")

    print(f"       ✓ Totals: {total_wineries_inserted} new wineries, "
          f"{total_wineries_updated} updated, {total_regions_inserted} new regions")

    # ── PHASE 3: Wines (from docs/wines/*.json) ─────────────────────────
    print(f"\n[3/5] Loading wine files from {wines_dir} …")
    wine_files = load_json_files(wines_dir)

    if not wine_files:
        print("       ⚠ No wine JSON files found – skipping wine import")

    # Refresh region map (may have grown)
    region_map.clear()
    cur.execute("""
        SELECT r.id, r.name, c.code
        FROM regions r JOIN countries c ON r.country_id = c.id
    """)
    for row in cur.fetchall():
        region_map[(row[1].lower(), row[2])] = str(row[0])

    # Build dedup set for existing wines: (lower_name, winery_id_str)
    print("\n[4/5] Building wine dedup index …")
    cur.execute("SELECT LOWER(name), winery_id FROM wines")
    existing_wines: set[tuple] = set()
    for row in cur.fetchall():
        existing_wines.add((row[0], str(row[1]) if row[1] else None))
    print(f"       {len(existing_wines):,} existing wines loaded for dedup")

    # ── PHASE 5: Insert wines file by file ──────────────────────────────
    print("\n[5/5] Importing wines …")
    grand_inserted = 0
    grand_skipped_dup = 0
    grand_skipped_winery = 0
    grand_skipped_type = 0
    grand_regions = 0
    grand_wineries_from_wines = 0

    for filepath, wines_data in wine_files:
        fname = os.path.basename(filepath)
        inserted = 0
        skipped_dup = 0
        skipped_winery = 0
        skipped_type = 0
        file_regions = 0
        file_wineries = 0
        batch: list = []

        for w in wines_data:
            wine_name = w.get("name", "").strip()
            winery_name = w.get("winery", "").strip()
            if not wine_name:
                continue

            country_code = (w.get("country_code") or "").strip().lower()
            region_name = w.get("region", "").strip()
            wine_type_raw = w.get("wine_type", "").strip()

            # Resolve wine type
            wine_type = WINE_TYPE_MAP.get(wine_type_raw)
            if not wine_type:
                # Fallback: try to infer from grapes/name
                grapes_hint = extract_grapes_from_name(wine_name)
                wine_type = infer_wine_type(grapes_hint, wine_name)
            if not wine_type:
                skipped_type += 1
                continue

            # Resolve country
            country_id = country_map.get(country_code)
            if not country_id and country_code:
                # Try matching by country name field
                api_country = w.get("country", "").strip()
                for code, name in COUNTRY_NAMES.items():
                    if name.lower() == api_country.lower() or code == country_code:
                        country_code = code
                        country_id = country_map.get(code)
                        break

            # Ensure region
            region_id = None
            if region_name and country_code and country_id:
                rkey = (region_name.lower(), country_code)
                if rkey not in region_map:
                    rid = str(uuid.uuid4())
                    try:
                        cur.execute(
                            "INSERT INTO regions (id, name, country_id, created_at) VALUES (%s,%s,%s,%s)",
                            (rid, region_name, country_id, now),
                        )
                        region_map[rkey] = rid
                        file_regions += 1
                    except psycopg2.IntegrityError:
                        conn.rollback()
                        cur.execute(
                            "SELECT r.id FROM regions r JOIN countries c ON r.country_id = c.id "
                            "WHERE LOWER(r.name) = %s AND c.code = %s",
                            (region_name.lower(), country_code),
                        )
                        row = cur.fetchone()
                        if row:
                            region_map[rkey] = str(row[0])
                region_id = region_map.get((region_name.lower(), country_code))

            # Resolve winery
            norm_winery = normalize_name(winery_name)
            seo_winery = (w.get("winery_seo_name") or "").lower()
            winery_id = winery_name_map.get(norm_winery)
            if not winery_id and seo_winery:
                winery_id = winery_seo_map.get(seo_winery)

            if not winery_id and winery_name:
                # Auto-create the winery
                new_wid = str(uuid.uuid4())
                slug = slugify(winery_name)
                if slug in slug_set:
                    slug = f"{slug}-{new_wid[:8]}"
                slug_set.add(slug)
                try:
                    cur.execute("""
                        INSERT INTO wineries
                        (id, name, slug, seo_name, is_active, country_id, region_id, created_at, updated_at)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        new_wid, winery_name, slug,
                        seo_winery or slug, True,
                        country_id, region_id, now, now,
                    ))
                    winery_name_map[norm_winery] = new_wid
                    if seo_winery:
                        winery_seo_map[seo_winery] = new_wid
                    winery_id = new_wid
                    file_wineries += 1
                except psycopg2.IntegrityError:
                    conn.rollback()
                    cur.execute("SELECT id FROM wineries WHERE LOWER(name) = %s", (winery_name.lower(),))
                    row = cur.fetchone()
                    if row:
                        winery_id = str(row[0])
                        winery_name_map[norm_winery] = winery_id

            if not winery_id:
                skipped_winery += 1
                continue

            # Dedup
            dedup_key = (wine_name.lower().strip(), winery_id)
            if dedup_key in existing_wines:
                skipped_dup += 1
                continue

            # Build wine row
            wine_id = str(uuid.uuid4())
            image_url = w.get("image_url", "") or ""
            if image_url and image_url.startswith("//"):
                image_url = "https:" + image_url
            bottle_url = w.get("bottle_image_url", "") or ""
            if bottle_url and bottle_url.startswith("//"):
                bottle_url = "https:" + bottle_url
            external_url = f"/wines/{wine_id}"
            is_natural = w.get("is_natural", False) or False
            labels_count = None
            vintages_count = None
            best_vintage_year = w.get("best_vintage_year") or None
            if best_vintage_year is not None:
                try:
                    best_vintage_year = int(best_vintage_year)
                except (ValueError, TypeError):
                    best_vintage_year = None
            # Rating se calcula desde reviews de usuarios, no se importa
            best_vintage_rating = None
            seo_name_wine = slugify(f"{winery_name} {wine_name}")

            # Grapes
            grapes = extract_grapes_from_name(wine_name)
            grapes_json = json.dumps(grapes)

            batch.append((
                wine_id, winery_id, wine_name, wine_type,
                0, 0,  # rating_average, rating_count – real ratings from users
                image_url or None, bottle_url or None,
                external_url or None,
                is_natural, labels_count, vintages_count,
                best_vintage_year, best_vintage_rating,
                seo_name_wine, grapes_json,
                country_id, region_id,
                now, now,
            ))
            existing_wines.add(dedup_key)
            inserted += 1

            if len(batch) >= BATCH_SIZE:
                _insert_wines_batch(cur, batch)
                conn.commit()
                batch = []
                if inserted % 10_000 == 0:
                    print(f"       {fname}: {inserted:,} inserted so far …")

        if batch:
            _insert_wines_batch(cur, batch)
            conn.commit()

        grand_inserted += inserted
        grand_skipped_dup += skipped_dup
        grand_skipped_winery += skipped_winery
        grand_skipped_type += skipped_type
        grand_regions += file_regions
        grand_wineries_from_wines += file_wineries

        print(f"       {fname}: +{inserted:,} wines, "
              f"~{skipped_dup:,} dup, !{skipped_winery} no-winery, "
              f"+{file_wineries} auto-wineries, +{file_regions} regions")

    # ── Summary ─────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  IMPORT COMPLETE")
    print("=" * 70)
    print(f"  Wines inserted:         {grand_inserted:>10,}")
    print(f"  Wines skipped (dup):    {grand_skipped_dup:>10,}")
    print(f"  Wines skipped (winery): {grand_skipped_winery:>10,}")
    print(f"  Wines skipped (type):   {grand_skipped_type:>10,}")
    print(f"  Wineries auto-created:  {grand_wineries_from_wines:>10,}")
    print(f"  Regions auto-created:   {grand_regions:>10,}")
    print("-" * 70)

    cur.execute("SELECT COUNT(*) FROM countries")
    print(f"  Total countries:  {cur.fetchone()[0]:>10,}")
    cur.execute("SELECT COUNT(*) FROM regions")
    print(f"  Total regions:    {cur.fetchone()[0]:>10,}")
    cur.execute("SELECT COUNT(*) FROM wineries")
    print(f"  Total wineries:   {cur.fetchone()[0]:>10,}")
    cur.execute("SELECT COUNT(*) FROM wines")
    print(f"  Total wines:      {cur.fetchone()[0]:>10,}")
    print("=" * 70)

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()

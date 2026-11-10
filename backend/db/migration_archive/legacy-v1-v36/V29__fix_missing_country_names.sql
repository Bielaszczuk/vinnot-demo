-- V29__fix_missing_country_names.sql
-- Fix countries that were inserted with their code as name instead of the proper name

UPDATE countries SET name = 'Aruba'                     WHERE code = 'aw' AND name = 'AW';
UPDATE countries SET name = 'Afganistán'                WHERE code = 'af' AND name = 'AF';
UPDATE countries SET name = 'Bahamas'                   WHERE code = 'bs' AND name = 'BS';
UPDATE countries SET name = 'Bután'                     WHERE code = 'bt' AND name = 'BT';
UPDATE countries SET name = 'Bielorrusia'               WHERE code = 'by' AND name = 'BY';
UPDATE countries SET name = 'Belice'                    WHERE code = 'bz' AND name = 'BZ';
UPDATE countries SET name = 'Cuba'                      WHERE code = 'cu' AND name = 'CU';
UPDATE countries SET name = 'Cabo Verde'                WHERE code = 'cv' AND name = 'CV';
UPDATE countries SET name = 'Estonia'                   WHERE code = 'ee' AND name = 'EE';
UPDATE countries SET name = 'Finlandia'                 WHERE code = 'fi' AND name = 'FI';
UPDATE countries SET name = 'Gabón'                     WHERE code = 'ga' AND name = 'GA';
UPDATE countries SET name = 'Hong Kong'                 WHERE code = 'hk' AND name = 'HK';
UPDATE countries SET name = 'Indonesia'                 WHERE code = 'id' AND name = 'ID';
UPDATE countries SET name = 'Isla de Man'               WHERE code = 'im' AND name = 'IM';
UPDATE countries SET name = 'Irán'                      WHERE code = 'ir' AND name = 'IR';
UPDATE countries SET name = 'Jamaica'                   WHERE code = 'jm' AND name = 'JM';
UPDATE countries SET name = 'Corea del Norte'           WHERE code = 'kp' AND name = 'KP';
UPDATE countries SET name = 'Kirguistán'                WHERE code = 'kg' AND name = 'KG';
UPDATE countries SET name = 'Liechtenstein'             WHERE code = 'li' AND name = 'LI';
UPDATE countries SET name = 'Lesoto'                    WHERE code = 'ls' AND name = 'LS';
UPDATE countries SET name = 'Lituania'                  WHERE code = 'lt' AND name = 'LT';
UPDATE countries SET name = 'Letonia'                   WHERE code = 'lv' AND name = 'LV';
UPDATE countries SET name = 'Mauricio'                  WHERE code = 'mu' AND name = 'MU';
UPDATE countries SET name = 'Namibia'                   WHERE code = 'na' AND name = 'NA';
UPDATE countries SET name = 'Isla Norfolk'              WHERE code = 'nf' AND name = 'NF';
UPDATE countries SET name = 'Nepal'                     WHERE code = 'np' AND name = 'NP';
UPDATE countries SET name = 'Polinesia Francesa'        WHERE code = 'pf' AND name = 'PF';
UPDATE countries SET name = 'Papúa Nueva Guinea'        WHERE code = 'pg' AND name = 'PG';
UPDATE countries SET name = 'Filipinas'                 WHERE code = 'ph' AND name = 'PH';
UPDATE countries SET name = 'San Marino'                WHERE code = 'sm' AND name = 'SM';
UPDATE countries SET name = 'Senegal'                   WHERE code = 'sn' AND name = 'SN';
UPDATE countries SET name = 'Islas Vírgenes de EE. UU.' WHERE code = 'vi' AND name = 'VI';
UPDATE countries SET name = 'Vietnam'                   WHERE code = 'vn' AND name = 'VN';
UPDATE countries SET name = 'Kosovo'                    WHERE code = 'xk' AND name = 'XK';


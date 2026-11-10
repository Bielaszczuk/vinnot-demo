# Memoria compartida entre modelos

Vinnot usa [Engram](https://github.com/Gentleman-Programming/engram) como memoria persistente local. El proyecto canónico es `vinnot`, configurado en `.engram/config.json`. El código actual sigue siendo la fuente de verdad.

## Configuración local

```bash
brew install gentleman-programming/tap/engram
engram setup codex
```

Reiniciar Codex después de configurar MCP y el plugin. Para otros agentes ejecutar el setup correspondiente, por ejemplo `engram setup claude-code` o `engram setup gemini-cli`. El cliente MCP genérico usa el ejecutable `engram` con argumentos `mcp`, `--project`, `vinnot`. Todos deben usar el mismo usuario/directorio de datos para compartir `~/.engram/engram.db`. En otras máquinas importar una exportación; MCP no transmite memoria automáticamente entre equipos.

## Protocolo de trabajo

Al comenzar confirmar el proyecto con `mem_current_project`, recuperar `mem_context` y buscar antecedentes con `mem_search`. Leer la observación completa antes de usarla. Guardar decisiones, correcciones, hallazgos y restricciones duraderas con referencias a archivos y `topic_key` estable. Cerrar con `mem_session_summary`, incluyendo validaciones realmente ejecutadas y pendientes. Seguir el enlace de sesión confirmado por el plugin de Codex; nunca inventar un ID de sesión.

La carga inicial contiene las instrucciones de arquitectura, el mapa del repositorio, comandos de desarrollo, el listado de cambios locales y un índice con extractos por documento de `docs/es`, `README.md` y planning Markdown. No es una copia íntegra de documentos ni del historial de conversaciones. Las referencias a documentación no certifican el comportamiento; el planning es histórico. Consultar los archivos originales y verificar el código vigente. `docs/en` conserva los documentos equivalentes en inglés.

## Consulta y portabilidad

```bash
engram context --project vinnot
engram search 'arquitectura' --project vinnot
engram stats --project vinnot
engram export /ruta/privada/vinnot-memory.json --project vinnot
# En el otro equipo, después de instalar Engram:
engram import /ruta/privada/vinnot-memory.json
```

La exportación puede contener notas internas y planning. Mantenerla en una ubicación privada. No guardar secretos, credenciales, datos personales, dumps ni transcripciones crudas. El bootstrap por CLI es una carga manual y no reemplaza la atribución de sesión del plugin. Las nuevas decisiones y resúmenes requieren que el agente use el protocolo; la memoria no se actualiza sola al cambiar el código.

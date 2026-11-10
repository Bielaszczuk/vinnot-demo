# Operación development de bajo costo

## Objetivo

Mantener development disponible en una ventana diaria con costo base acotado. Es
un objetivo operativo, no un límite duro: tráfico, proveedores externos, storage
y transferencias pueden aumentarlo.

## Runtime

- EC2 `t3a.small` con 16 GiB gp3.
- Docker Compose: PostgreSQL, Spring Boot y Caddy.
- Elastic IP para API.
- S3 para web, uploads y backups; ECR para imágenes.
- Secrets Manager y SSM.
- El runtime usa EC2/Compose, sin RDS, ECS ni ALB en su camino de servicio.
  Si quedan recursos de una topología anterior, inventariarlos y comprobar que
  no estén activos ni generen cargos innecesarios.
- Ventana automática: detener 02:00 e iniciar 09:00 en zona Argentina.

## Operación

```bash
cd /opt/vinnot
docker compose --env-file runtime.env ps
docker compose --env-file runtime.env logs --tail 100 backend
docker stats --no-stream
df -h /
free -h
```

Health público:

```bash
curl --fail https://api-dev.vinnot.com/api/actuator/health
```

## Disco e imágenes

`infra/aws-low-cost/deploy.sh` ejecuta `docker compose pull` en cada despliegue del
host de 16 GiB y acota las imágenes backend que deja:

- Antes del pull exige 2 GiB libres en el directorio raíz de Docker. Con menos,
  primero aplica la retención descrita abajo; si sigue faltando espacio, falla con
  `Insufficient free disk space on <path>: <n> MiB available, 2048 MiB required`
  sin cambiar nada más.
- Tras un despliegue verificado conserva las tres imágenes backend más recientes
  (la que corre y dos despliegues previos para rollback) y toda imagen que todavía
  use un contenedor, y elimina por ID las imágenes backend más antiguas. Un fallo
  al eliminar nunca hace fallar el despliegue.
- Nunca elimina volúmenes, imágenes de otros repositorios ni la caché de build.

Development no tiene alarma de disco; `monitoring/config.example.json` y su umbral
`disk_min_bytes` pertenecen sólo al monitor productivo. Un rollback a más de dos
despliegues atrás vuelve a descargar el tag inmutable desde ECR. Para revisar el
espacio manualmente:

```bash
df -h /
docker system df
docker ps --format '{{.Names}} {{.Image}}'
docker image ls --format '{{.ID}} {{.Repository}}:{{.Tag}} {{.CreatedSince}}'
```

Procedimiento de retención manual, cuando falta espacio por otra causa:

1. Conservar las imágenes de los contenedores en ejecución y las más recientes del
   backend, necesarias para volver a una revisión anterior.
2. Eliminar sólo imágenes antiguas identificadas por ID con `docker image rm <id>`;
   `docker image prune` elimina únicamente imágenes sin tag.
3. Nunca eliminar volúmenes: no usar `docker volume prune`,
   `docker system prune --volumes` ni `docker compose down -v`, porque el volumen
   contiene la base de development.
4. Repetir `df -h /` y confirmar el health público.

## Backups

Un timer systemd ejecuta `backup-local-db.sh`, conserva una ventana local corta y
sube dumps a un prefix S3 con lifecycle acotado. Verificar periódicamente una
restauración; que un dump exista no prueba que sea recuperable.

## Guardrails

- No reducir el host por debajo del tamaño validado para JVM + PostgreSQL.
- Mantener ventana de apagado y budget alert.
- Mantener lifecycle ECR y retención de backups.
- Mantener margen de disco en el host: el deploy sólo depura imágenes backend antiguas.
- Evitar NAT Gateway, ALB o RDS activos en este perfil.
- Revisar Cost Explorer y créditos CPU mensualmente.
- Producción usa una instancia EC2/Compose aislada, activa las 24 horas; el scheduler sólo administra development. La topología administrada es una opción de evolución.

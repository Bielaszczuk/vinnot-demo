# Low-cost development operations

## Goal

Keep development available in a daily window with a bounded baseline cost. This
is an operational target, not a hard cap: traffic, external providers, storage,
and transfer may increase it.

## Runtime

- EC2 `t3a.small` with 16 GiB gp3.
- Docker Compose: PostgreSQL, Spring Boot, and Caddy.
- Elastic IP for the API.
- S3 for web, uploads, and backups; ECR for images.
- Secrets Manager and SSM.
- The runtime uses EC2/Compose, with no RDS, ECS or ALB in its service path.
  Inventory any remaining resources from an earlier topology and confirm they
  are inactive and not incurring unnecessary charges.
- Automatic window: stop at 02:00 and start at 09:00 Argentina time.

## Operations

```bash
cd /opt/vinnot
docker compose --env-file runtime.env ps
docker compose --env-file runtime.env logs --tail 100 backend
docker stats --no-stream
df -h /
free -h
```

Public health:

```bash
curl --fail https://api-dev.vinnot.com/api/actuator/health
```

## Disk and images

`infra/aws-low-cost/deploy.sh` runs `docker compose pull` on every deployment of
the 16 GiB host and bounds the backend images it leaves behind:

- Before pulling, it requires 2 GiB free on the Docker root directory. With less,
  it first applies the retention below; if space is still short, it fails with
  `Insufficient free disk space on <path>: <n> MiB available, 2048 MiB required`
  and changes nothing else.
- After a verified deployment, it keeps the three newest backend images (the
  running one and two previous deployments for rollback) plus any image a
  container still references, and removes older backend images by ID. A failed
  removal never fails the deployment.
- It never removes volumes, other repositories' images or the build cache.

Development has no disk alarm; `monitoring/config.example.json` and its
`disk_min_bytes` threshold belong to the production monitor only. Rolling back
further than two deployments pulls the immutable tag from ECR again. To inspect
space manually:

```bash
df -h /
docker system df
docker ps --format '{{.Names}} {{.Image}}'
docker image ls --format '{{.ID}} {{.Repository}}:{{.Tag}} {{.CreatedSince}}'
```

Manual retention procedure, when space is short for another reason:

1. Keep the images of running containers and the newest backend images needed to
   return to a previous revision.
2. Remove only old images identified by ID with `docker image rm <id>`;
   `docker image prune` removes untagged images only.
3. Never remove volumes: do not use `docker volume prune`,
   `docker system prune --volumes` or `docker compose down -v`, because the volume
   holds the development database.
4. Run `df -h /` again and confirm public health.

## Backups

A systemd timer runs `backup-local-db.sh`, keeps a short local window, and uploads
dumps to a bounded S3 prefix lifecycle. Periodically verify a restore; a dump's
existence does not prove recoverability.

## Guardrails

- Do not reduce the host below the size validated for JVM + PostgreSQL.
- Keep the stop window and budget alert.
- Keep ECR lifecycle and backup retention.
- Keep disk headroom on the host: deployment only prunes old backend images.
- Avoid active NAT Gateway, ALB, or RDS in this profile.
- Review Cost Explorer and CPU credits monthly.
- Production uses a separate EC2/Compose instance running continuously; the scheduler controls development only. Managed topology is an evolution option.

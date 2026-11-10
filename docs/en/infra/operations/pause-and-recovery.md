# Pause and recovery

## Pause active development

1. Run and verify a PostgreSQL backup.
2. Stop Compose cleanly.
3. Stop EC2.
4. If legacy resources exist, confirm ECS at zero, RDS stopped and no unintended
   ALB; do not assume those resources still exist.
5. Retain required EBS, Elastic IP, S3, ECR, Secrets Manager, and snapshots.

## Recover EC2 Compose

1. Start EC2 and wait for SSM status `Online`.
2. Verify volume, disk, and `runtime.env` generated from secrets.
3. Run `/opt/vinnot/deploy.sh <dev-image@digest> <SHA>` or the manual workflow.
4. Wait for PostgreSQL, backend, and proxy health.
5. Verify public health, login, catalog, and an authenticated write.

## Migrate to managed ECS/RDS

1. Create a consistent backup of the local database.
2. Disable any legacy RDS auto-stop during migration.
3. Provision or restore RDS and compare counts and invariants.
4. Create ALB, listeners, certificate, target group, and security rules from
   current configuration, not historical IDs.
5. Register a task definition with secrets and RDS.
6. Start ECS, wait for a healthy target, and test through temporary DNS.
7. Change DNS only after validation.
8. Preserve rollback until traffic and data are confirmed.

## Restrictions

- Do not restore a dump without first backing up the destination.
- Do not run destructive migrations backwards.
- Do not leave RDS auto-stop enabled during recovery.
- Do not copy ARNs, subnets, or security groups from an old document without
  checking AWS: these operational identifiers may change.

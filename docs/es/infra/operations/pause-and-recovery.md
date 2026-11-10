# Pausa y recuperación

## Pausar development activo

1. Ejecutar y verificar backup de PostgreSQL.
2. Detener Compose de forma ordenada.
3. Detener EC2.
4. Si hay recursos heredados, confirmar ECS en cero, RDS detenido y ausencia
   de ALB no deseado; no asumir que siguen existiendo.
5. Conservar EBS, Elastic IP, S3, ECR, Secrets Manager y snapshots necesarios.

## Recuperar EC2 Compose

1. Iniciar EC2 y esperar estado SSM `Online`.
2. Verificar volumen, disco y `runtime.env` generado desde secrets.
3. Ejecutar `/opt/vinnot/deploy.sh <imagen-dev@digest> <SHA>` o el workflow manual.
4. Esperar health de PostgreSQL, backend y proxy.
5. Verificar health público, login, catálogo y escritura autenticada.

## Migrar a ECS/RDS administrado

1. Crear backup consistente de la DB local.
2. Deshabilitar cualquier auto-stop heredado de RDS durante la migración.
3. Provisionar o restaurar RDS y comparar conteos e invariantes.
4. Crear ALB, listeners, certificado, target group y reglas de seguridad desde
   configuración vigente, no desde IDs históricos.
5. Registrar task definition con secrets y RDS.
6. Levantar ECS, esperar target healthy y probar por DNS temporal.
7. Cambiar DNS sólo después de validación.
8. Mantener rollback hasta confirmar tráfico y datos.

## Restricciones

- No restaurar un dump sin backup previo del destino.
- No ejecutar migraciones destructivas hacia atrás.
- No dejar RDS auto-stop activo durante una ventana de recuperación.
- No copiar ARNs, subnets o security groups de un documento antiguo sin consultar
  AWS: esos identificadores son estado operativo y pueden cambiar.

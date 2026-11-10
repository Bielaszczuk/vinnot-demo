"""Pure operational policy. Inputs are bounded aggregates, never application payloads."""
import math

GROUPS = ("ServiceHealthy", "ResourcesHealthy", "BackupHealthy", "EffectsHealthy", "AiHealthy")


def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def evaluate(sample, previous, now, thresholds):
    """Missing/stale observations fail closed. Process changes reset counter baselines."""
    reasons = {group: [] for group in GROUPS}

    def reject(group, condition, reason):
        if condition:
            reasons[group].append(reason)

    def below(key, limit):
        return not number(sample.get(key)) or sample[key] < limit

    def above(key, limit):
        return not number(sample.get(key)) or sample[key] > limit

    telemetry = sample.get("telemetry", {})
    fresh = (telemetry.get("schema") == 1 and number(telemetry.get("timestamp"))
             and 0 <= now - telemetry["timestamp"] <= thresholds["snapshot_max_age_seconds"])
    reject("ServiceHealthy", not fresh, "telemetry_missing_or_stale")
    reject("ServiceHealthy", sample.get("api_up") is not True, "api_unhealthy")
    reject("ServiceHealthy", sample.get("containers_healthy") is not True, "container_unhealthy")
    reject("ResourcesHealthy", below("memory_available_bytes", thresholds["memory_min_bytes"]), "host_memory_low")
    reject("ResourcesHealthy", below("disk_free_bytes", thresholds["disk_min_bytes"]), "disk_space_low")
    reject("ResourcesHealthy", above("container_memory_percent", thresholds["container_memory_percent"]), "container_memory_high")
    reject("ResourcesHealthy", above("db_connections_percent", thresholds["db_connections_percent"]), "db_connections_high")
    reject("ResourcesHealthy", sample.get("db_observed") is not True, "database_observation_failed")
    valid_pool = (all(number(telemetry.get(key)) and telemetry[key] >= 0
                      for key in ("pool_max", "pool_active", "pool_pending"))
                  and telemetry.get("pool_max", 0) > 0)
    reject("ResourcesHealthy", not fresh or not valid_pool, "pool_metrics_unavailable")
    reject("ResourcesHealthy", number(telemetry.get("pool_pending")) and telemetry["pool_pending"] > 0,
           "pool_waiters_present")
    reject("BackupHealthy", sample.get("backup_verified") is not True, "remote_backup_unverified")
    reject("BackupHealthy", above("backup_age_seconds", thresholds["backup_max_age_seconds"]), "backup_overdue")
    reject("BackupHealthy", sample.get("backup_service_ok") is not True, "backup_service_failed")
    reject("BackupHealthy", sample.get("backup_timer_active") is not True, "backup_timer_inactive")
    reject("EffectsHealthy", sample.get("db_observed") is not True, "effects_observation_failed")
    reject("EffectsHealthy", above("effects_exhausted", 0), "effect_retries_exhausted")
    reject("EffectsHealthy", above("effects_overdue_seconds", thresholds["effects_max_overdue_seconds"]), "effects_overdue")
    reject("AiHealthy", sample.get("db_observed") is not True, "spending_observation_failed")
    reject("AiHealthy", above("ai_committed_usd", thresholds["ai_monthly_limit_usd"] * .8), "ai_budget_near_limit")
    reject("AiHealthy", above("ai_unresolved_age_seconds", thresholds["ai_unresolved_max_age_seconds"]), "ai_accounting_unresolved")
    reject("AiHealthy", not fresh, "provider_telemetry_unavailable")

    old = previous.get("telemetry", {})
    comparable = fresh and old.get("process") == telemetry.get("process") and bool(old.get("process"))
    comparable = comparable and number(old.get("timestamp")) and 0 < telemetry["timestamp"] - old["timestamp"] <= 900
    deltas = {}
    if comparable:
        for key in ("http_requests", "http_errors", "http_seconds", "http_slow", "pool_timeouts", "email_failures",
                    "ai_success", "ai_timeout", "ai_rate_limited", "ai_quota_exhausted", "ai_provider_failure",
                    "ai_invalid_response", "ai_budget_exhausted", "ai_admission_failure"):
            current, prior = telemetry.get(key), old.get(key)
            if number(current) and number(prior) and current >= prior >= 0:
                deltas[key] = current - prior
            else:
                reject("ServiceHealthy", True, "counter_reset_or_invalid")
        count = deltas.get("http_requests", 0)
        reject("ServiceHealthy", deltas.get("http_errors", 0) >= 3
               and deltas["http_errors"] / max(1, count) >= thresholds["http_error_ratio"], "http_5xx_rate")
        reject("ServiceHealthy", count >= 10 and deltas.get("http_slow", 0) / count >= thresholds["http_slow_ratio"],
               "http_slow_rate")
        reject("ResourcesHealthy", deltas.get("pool_timeouts", 0) > 0, "pool_connection_timeout")
        reject("EffectsHealthy", deltas.get("email_failures", 0) > 0, "transactional_email_failed")
        for key in ("ai_timeout", "ai_rate_limited", "ai_quota_exhausted", "ai_budget_exhausted", "ai_admission_failure"):
            reject("AiHealthy", deltas.get(key, 0) > 0, key)
        reject("AiHealthy", deltas.get("ai_provider_failure", 0) + deltas.get("ai_invalid_response", 0) > 0,
               "ai_provider_failed")
    return {"metrics": {key: int(not reasons[key]) for key in GROUPS}, "reasons": reasons,
            "counter_window_observed": comparable, "deltas": deltas}

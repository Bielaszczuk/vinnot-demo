"""CLI safety boundaries, offline export and finite SDK configuration."""

import csv
import importlib
from typing import Any

import boto3
import pytest

from wine_script import cli, config, state

SCOPE = "offline-test-scope"


@pytest.mark.parametrize("command", [[], ["run"], ["export"]])
def test_help_and_imports_do_not_load_environment(monkeypatch, capsys, command):
    def denied(*args, **kwargs):
        raise AssertionError("Environment must not be loaded")
    monkeypatch.setattr("dotenv.load_dotenv", denied)
    importlib.reload(cli)
    with pytest.raises(SystemExit) as exit:
        cli.main([*command, "--help"])
    assert exit.value.code == 0
    assert "usage:" in capsys.readouterr().out


def test_export_without_credentials_or_dotenv(tmp_path, monkeypatch):
    monkeypatch.setattr("dotenv.load_dotenv", lambda *a, **k: pytest.fail("dotenv loaded"))
    for name in ("DATABASE_URL", "R2_ENDPOINT_URL", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"):
        monkeypatch.delenv(name, raising=False)
    path = tmp_path / "state.sqlite"
    with state.State(path, SCOPE):
        pass
    output = tmp_path / "mapping.csv"
    assert cli.main(["export", "--state", str(path), "--csv", str(output)]) == 0
    with output.open() as file:
        assert list(csv.reader(file)) == [["id", "original_url", "new_url", "object_key"]]


def test_missing_config_is_sanitized(monkeypatch, capsys):
    monkeypatch.setattr("dotenv.load_dotenv", lambda *a, **k: None)
    for name in ("DATABASE_URL", "R2_ENDPOINT_URL", "R2_BUCKET", "R2_PUBLIC_BASE_URL",
                 "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"):
        monkeypatch.delenv(name, raising=False)
    assert cli.main(["run"]) == 1
    assert "Missing required environment configuration" in capsys.readouterr().err


def test_cli_defaults_full_optin_and_invalid_limits():
    parser = cli.parser()
    args = parser.parse_args(["run"])
    assert (args.limit, args.batch_size, args.threads) == (100, 500, 3)
    assert (args.attempts, args.all) == (3, False)
    assert parser.parse_args(["run", "--all"]).all
    with pytest.raises(SystemExit):
        parser.parse_args(["run", "--all", "--limit", "1"])
    with pytest.raises(SystemExit):
        parser.parse_args(["run", "--threads", "0"])


@pytest.mark.parametrize("interrupted", [False, True])
def test_run_failure_exports_progress_without_logging_secrets(tmp_path, monkeypatch, capsys, interrupted):
    monkeypatch.setattr("dotenv.load_dotenv", lambda *a, **k: None)
    values = {"DATABASE_URL": "fake-local-dsn", "R2_ENDPOINT_URL": "https://r2.example.invalid",
              "R2_BUCKET": "test-wines", "R2_PUBLIC_BASE_URL": "https://cdn.example.invalid",
              "R2_ACCESS_KEY_ID": "fake-id", "R2_SECRET_ACCESS_KEY": "fake-secret", "WEBP_QUALITY": "85"}
    for name, value in values.items():
        monkeypatch.setenv(name, value)
    monkeypatch.setattr(cli, "r2_client", lambda cfg: object())
    def fail(*args, **kwargs):
        if interrupted:
            raise KeyboardInterrupt()
        raise RuntimeError("fake-secret")
    monkeypatch.setattr("wine_script.migrate.migrate", fail)
    output = tmp_path / "mapping.csv"
    code = cli.main(["run", "--state", str(tmp_path / "state.sqlite"), "--csv", str(output)])
    assert code == (130 if interrupted else 1)
    assert output.read_text().strip() == "id,original_url,new_url,object_key"
    assert "fake-secret" not in capsys.readouterr().err


def test_sdk_config_uses_explicit_credentials_and_finite_timeouts(monkeypatch):
    recorded: dict[str, Any] = {}
    credential = "offline-placeholder"
    def fake_client(service, **kwargs):
        recorded.update(kwargs)
        assert service == "s3"
    monkeypatch.setattr(boto3, "client", fake_client)
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "fake-id")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", credential)
    cli.r2_client(config.Config("https://r2.example.invalid", "test-wines", "https://cdn.example.invalid"))
    assert recorded["aws_secret_access_key"] == credential
    sdk = recorded["config"]
    assert (sdk.connect_timeout, sdk.read_timeout) == (5, 20)
    assert sdk.retries["total_max_attempts"] == 1
    assert sdk.proxies == {}


def test_export_cannot_replace_state(tmp_path, capsys):
    path = tmp_path / "state.sqlite"
    with state.State(path, SCOPE):
        pass
    assert cli.main(["export", "--state", str(path), "--csv", str(path)]) == 1
    with state.State(path):
        pass
    assert "must differ" in capsys.readouterr().err

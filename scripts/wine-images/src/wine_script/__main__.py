"""Module entry point; service access requires the explicit run command."""

from wine_script.cli import main

if __name__ == "__main__":
    raise SystemExit(main())

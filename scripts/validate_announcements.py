#!/usr/bin/env python3
"""Validate an HPCMosaic announcement JSON file without publishing it."""

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from views.api.announcement import (
    AnnouncementValidationError,
    load_active_announcements,
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", help="Path to the announcement JSON file")
    args = parser.parse_args()

    try:
        load_active_announcements(args.file)
    except (OSError, ValueError, AnnouncementValidationError) as exc:
        print(f"Invalid announcement file: {exc}", file=sys.stderr)
        return 1

    print("Valid announcement file")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

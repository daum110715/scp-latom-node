#!/usr/bin/env python3
"""
Batch crawl script for SCP Wiki index initialization.
Supports checkpoint-resume: records the maximum crawled number in D1
and reads it each time the script starts.

Usage:
  python3 batch-crawl.py                  # Normal run (resumes from checkpoint)
  python3 batch-crawl.py --api URL        # Use a custom API base URL
  python3 batch-crawl.py --reset          # Clear checkpoint and start fresh
  python3 batch-crawl.py --lang en        # Crawl only one language
"""

import argparse
import json
import subprocess
import sys
import time

DEFAULT_API_BASE = "https://api.scp.lat/api/crawler"
LIMIT = 30
BATCH_DELAY = 30  # seconds between batches
STATUS_DELAY = 10  # seconds between status checks
MAX_BATCHES = 500


def curl_get(api_base, path):
    """GET request via curl."""
    result = subprocess.run(
        ["curl", "-s", f"{api_base}{path}"],
        capture_output=True, text=True, timeout=20
    )
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return None


def curl_post(api_base, path):
    """POST request via curl."""
    result = subprocess.run(
        ["curl", "-s", "-X", "POST", f"{api_base}{path}"],
        capture_output=True, text=True, timeout=20
    )
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return None


def curl_delete(api_base, path):
    """DELETE request via curl."""
    result = subprocess.run(
        ["curl", "-s", "-X", "DELETE", f"{api_base}{path}"],
        capture_output=True, text=True, timeout=20
    )
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return None


def get_status(api_base, lang):
    return curl_get(api_base, f"/{lang}/status")


def trigger_crawl(api_base, lang, limit):
    return curl_post(api_base, f"/{lang}/crawl?limit={limit}")


def reset_checkpoint(api_base, lang):
    return curl_delete(api_base, f"/{lang}/checkpoint")


def get_checkpoint(api_base, lang):
    """Read the seed checkpoint from the status endpoint."""
    status = get_status(api_base, lang)
    if not status:
        return None
    checkpoint = status.get("seedCheckpoint")
    if checkpoint:
        return checkpoint.get("maxScpNumber", 0)
    return 0


def wait_for_idle(api_base, lang, max_wait=120):
    waited = 0
    while waited < max_wait:
        status = get_status(api_base, lang)
        if status and status.get("state", {}).get("status") != "crawling":
            return status
        time.sleep(STATUS_DELAY)
        waited += STATUS_DELAY
    return get_status(api_base, lang)


def full_crawl(api_base, lang):
    print(f"\n{'='*50}")
    print(f"Starting full crawl for {lang.upper()}")
    print(f"{'='*50}")

    # Read checkpoint to show resume point
    checkpoint = get_checkpoint(api_base, lang)
    if checkpoint and checkpoint > 0:
        print(f"  Resuming from checkpoint: max SCP number = {checkpoint}")
    else:
        print(f"  No checkpoint found, starting from the beginning")

    batch = 1
    prev_total = 0

    while batch <= MAX_BATCHES:
        status = get_status(api_base, lang)
        if not status:
            print("  API error, stopping.")
            break

        current_total = status.get("state", {}).get("totalEntries", 0)
        seed = status.get("seedCheckpoint")
        max_num = seed.get("maxScpNumber", 0) if seed else 0
        print(f"  Batch {batch}: total = {current_total}, max SCP number = {max_num}")

        result = trigger_crawl(api_base, lang, LIMIT)
        if not result:
            print("  Trigger failed, stopping.")
            break

        if not result.get("success", False):
            err = result.get("error", "unknown")
            if err == "Crawl already in progress":
                print("  Crawl in progress, waiting...")
                time.sleep(BATCH_DELAY)
                wait_for_idle(api_base, lang)
                continue
            print(f"  Crawl error: {err}, stopping.")
            break

        time.sleep(BATCH_DELAY)

        final = wait_for_idle(api_base, lang)
        if not final:
            print("  Status check failed.")
            break

        new_total = final.get("state", {}).get("totalEntries", 0)

        if new_total == prev_total:
            print(f"\n  Crawl complete! Total entries: {new_total}")
            return new_total

        print(f"  Progress: {prev_total} -> {new_total} entries")
        prev_total = new_total
        batch += 1

        time.sleep(5)

    return prev_total


def main():
    parser = argparse.ArgumentParser(description="SCP Wiki batch crawl with checkpoint-resume")
    parser.add_argument("--api", default=DEFAULT_API_BASE, help="API base URL")
    parser.add_argument("--reset", action="store_true", help="Clear checkpoint and start fresh")
    parser.add_argument("--lang", choices=["en", "cn"], help="Crawl only one language")
    args = parser.parse_args()

    api_base = args.api
    langs = [args.lang] if args.lang else ["en", "cn"]

    print("SCP Wiki Full Batched Crawl")
    print("===========================")
    print(f"API: {api_base}")

    if args.reset:
        print("\nResetting checkpoints...")
        for lang in langs:
            result = reset_checkpoint(api_base, lang)
            print(f"  {lang.upper()}: {result}")

    results = {}
    for lang in langs:
        total = full_crawl(api_base, lang)
        results[lang] = total
        print(f"\n{lang.upper()} final count: {total} entries")

    print("\n\nFinal verification:")
    for lang in langs:
        status = get_status(api_base, lang)
        if status:
            state = status.get("state", {})
            seed = status.get("seedCheckpoint")
            max_num = seed.get("maxScpNumber", 0) if seed else 0
            print(f"  {lang.upper()}: {state.get('totalEntries', 0)} entries, "
                  f"max SCP number: {max_num}, status: {state.get('status')}")


if __name__ == "__main__":
    main()

"""Bounded, dependency-free quota usage scan executed on a login node.

The API sends this file to ``python3 -`` over SSH. Keeping the traversal here
avoids shell pipelines and, more importantly, visits the selected tree only
once. The deadline and entry limit are deliberate safeguards for shared login
nodes; a partial report is more useful than an unbounded filesystem scan.
"""

import argparse
import heapq
import json
import os
import stat
import time


def _keep_largest(heap, item, limit):
    if len(heap) < limit:
        heapq.heappush(heap, item)
    elif item > heap[0]:
        heapq.heapreplace(heap, item)


def scan(root, limit, max_entries, max_seconds):
    started_at = time.monotonic()
    deadline = started_at + max_seconds
    root = os.path.realpath(root)
    root_stat = os.stat(root)

    if not stat.S_ISDIR(root_stat.st_mode):
        raise ValueError("The selected quota path is not a directory")

    root_device = root_stat.st_dev
    directory_heap = []
    file_heap = []
    pending = [root]
    visited_entries = 0
    skipped_directories = 0
    stopped_reason = None

    while pending:
        if time.monotonic() >= deadline:
            stopped_reason = "time_limit"
            break
        if visited_entries >= max_entries:
            stopped_reason = "entry_limit"
            break

        directory = pending.pop()
        file_count = 0
        subdirectory_count = 0

        try:
            iterator = os.scandir(directory)
        except (OSError, PermissionError):
            skipped_directories += 1
            continue

        try:
            for entry in iterator:
                visited_entries += 1
                if visited_entries >= max_entries:
                    stopped_reason = "entry_limit"
                    break
                if visited_entries % 256 == 0 and time.monotonic() >= deadline:
                    stopped_reason = "time_limit"
                    break

                try:
                    entry_stat = entry.stat(follow_symlinks=False)
                except (OSError, PermissionError):
                    continue

                if stat.S_ISREG(entry_stat.st_mode):
                    file_count += 1
                    _keep_largest(
                        file_heap,
                        (entry_stat.st_size, entry.path),
                        limit,
                    )
                elif stat.S_ISDIR(entry_stat.st_mode):
                    subdirectory_count += 1
                    # Do not follow mounts into another filesystem.
                    if entry_stat.st_dev == root_device:
                        pending.append(entry.path)
        finally:
            iterator.close()

        item_count = file_count + subdirectory_count
        _keep_largest(
            directory_heap,
            (item_count, directory, file_count, subdirectory_count),
            limit,
        )

        if stopped_reason:
            break

    directories = [
        {
            "path": path,
            "item_count": item_count,
            "file_count": file_count,
            "subdirectory_count": subdirectory_count,
        }
        for item_count, path, file_count, subdirectory_count
        in sorted(directory_heap, reverse=True)
    ]
    files = [
        {"path": path, "size_bytes": size_bytes}
        for size_bytes, path in sorted(file_heap, reverse=True)
    ]

    return {
        "root": root,
        "directories": directories,
        "files": files,
        "partial": stopped_reason is not None,
        "stopped_reason": stopped_reason,
        "visited_entries": visited_entries,
        "skipped_directories": skipped_directories,
        "elapsed_seconds": round(time.monotonic() - started_at, 2),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("root")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--max-entries", type=int, default=250000)
    parser.add_argument("--max-seconds", type=float, default=25)
    args = parser.parse_args()

    try:
        report = scan(
            args.root,
            max(1, min(args.limit, 25)),
            max(1000, args.max_entries),
            max(1, args.max_seconds),
        )
        print(json.dumps(report, separators=(",", ":")))
    except Exception as error:
        print(json.dumps({"error": str(error)}, separators=(",", ":")))
        raise SystemExit(1)


if __name__ == "__main__":
    main()

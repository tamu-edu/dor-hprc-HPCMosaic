"""Bounded, dependency-free quota usage scan executed on a login node.

The API sends this file to ``python3 -`` over SSH. Keeping the traversal here
avoids shell pipelines and, more importantly, visits the selected tree only
once. The deadline and entry limit are deliberate safeguards for shared login
nodes; a partial report is more useful than an unbounded filesystem scan.
"""

import argparse
from collections import deque
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


def _allocated_size(entry_stat):
    """Prefer allocated blocks so directory totals better match quota usage."""
    blocks = getattr(entry_stat, "st_blocks", None)
    return blocks * 512 if blocks is not None else entry_stat.st_size


def scan(root, limit, max_entries, max_seconds):
    started_at = time.monotonic()
    deadline = started_at + max_seconds
    root = os.path.realpath(root)
    root_stat = os.stat(root)

    if not stat.S_ISDIR(root_stat.st_mode):
        raise ValueError("The selected quota path is not a directory")

    root_device = root_stat.st_dev
    directory_stats = {}
    file_heap = []
    # Each queued directory carries the direct child of root that owns its
    # totals. Breadth-first traversal avoids diving through one branch before
    # the other direct children have been visited.
    pending = deque([(root, None)])
    visited_entries = 0
    skipped_directories = 0
    total_file_count = 0
    total_size_bytes = 0
    stopped_reason = None

    while pending:
        if time.monotonic() >= deadline:
            stopped_reason = "time_limit"
            break
        if visited_entries >= max_entries:
            stopped_reason = "entry_limit"
            break

        directory, direct_child = pending.popleft()

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
                    allocated_size = _allocated_size(entry_stat)
                    total_file_count += 1
                    total_size_bytes += allocated_size
                    if direct_child is not None:
                        child_stats = directory_stats[direct_child]
                        child_stats["file_count"] += 1
                        child_stats["size_bytes"] += allocated_size
                    _keep_largest(
                        file_heap,
                        (entry_stat.st_size, entry.path),
                        limit,
                    )
                elif stat.S_ISDIR(entry_stat.st_mode):
                    # Do not follow mounts into another filesystem.
                    if entry_stat.st_dev == root_device:
                        if direct_child is None:
                            child_path = entry.path
                            directory_stats[child_path] = {
                                "path": child_path,
                                "file_count": 0,
                                "subdirectory_count": 0,
                                "size_bytes": 0,
                            }
                            pending.append((child_path, child_path))
                        else:
                            directory_stats[direct_child]["subdirectory_count"] += 1
                            pending.append((entry.path, direct_child))
        finally:
            iterator.close()

        if stopped_reason:
            break

    directories = []
    for child_stats in directory_stats.values():
        child_stats["item_count"] = (
            child_stats["file_count"] + child_stats["subdirectory_count"]
        )
        child_stats["size_percent"] = round(
            child_stats["size_bytes"] / total_size_bytes * 100, 2
        ) if total_size_bytes else 0
        directories.append(child_stats)

    directories.sort(
        key=lambda item: (item["size_bytes"], item["file_count"], item["path"]),
        reverse=True,
    )
    directories = directories[:limit]
    files = [
        {"path": path, "size_bytes": size_bytes}
        for size_bytes, path in sorted(file_heap, reverse=True)
    ]

    return {
        "root": root,
        "directories": directories,
        "files": files,
        "total_file_count": total_file_count,
        "total_size_bytes": total_size_bytes,
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
    parser.add_argument("--max-seconds", type=float, default=30)
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

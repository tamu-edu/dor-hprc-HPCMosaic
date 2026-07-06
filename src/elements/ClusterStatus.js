import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  cardClasses,
  cx,
  getNodeStatusStyle,
  NODE_STATUS_LABELS,
  NODE_STATUS_ORDER,
  NODE_STATUS_PRIORITY,
  normalizeNodeState,
  refreshEventName,
} from "./dashboardUtils";

const summaryStatuses = NODE_STATUS_ORDER;
const hiddenPartitionFilters = new Set(["STAFF"]);
const nodeCardClass = cx(cardClasses.shell, "flex min-h-0 flex-col gap-2.5");
const nodeHeaderClass = "flex items-start justify-between gap-3 border-b border-mosaic-border pb-2.5 pr-10";
const nodeSubtitleClass = "mt-1 block text-card-11-5 text-mosaic-muted";
const nodeInputClass = "non-draggable min-h-[29px] w-full rounded-[5px] border border-mosaic-border-strong bg-mosaic-app py-[5px] pl-8 pr-2.5 text-card-12 text-mosaic-secondary outline-none hover:border-mosaic-accent-hover hover:bg-mosaic-surface-hover focus:border-mosaic-accent focus:shadow-[0_0_0_3px_var(--mosaic-color-focus-ring)]";
const nodeRefreshClass = "non-draggable min-h-[29px] cursor-pointer rounded-[5px] border border-mosaic-border-strong bg-mosaic-app px-[9px] py-[5px] text-card-12 font-semibold text-mosaic-secondary hover:border-mosaic-accent-hover hover:bg-mosaic-surface-hover";
const nodeTabClass = (active) => cx(
  "non-draggable min-h-[29px] rounded-[5px] border px-3 py-[5px] text-card-11-5 font-bold transition-colors",
  active
    ? "border-mosaic-accent bg-mosaic-accent text-mosaic-accent-text"
    : "border-mosaic-border bg-mosaic-surface text-mosaic-secondary hover:border-mosaic-accent-hover hover:bg-mosaic-surface-hover"
);
const nodeTileClass = (selected) => cx(
  "non-draggable flex h-[34px] min-w-[48px] cursor-pointer items-center justify-center rounded-[5px] border border-[var(--node-status-color)] bg-[var(--node-status-color)] px-2 text-card-10 font-extrabold leading-none text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] transition-transform hover:-translate-y-px",
  selected && "ring-2 ring-mosaic-accent ring-offset-1 ring-offset-mosaic-surface"
);
const nodeStatusDotClass = "h-2.5 w-2.5 rounded-full bg-[var(--node-status-color)]";

const cleanPartition = (partition) => {
  if (!partition) return "";
  return partition.replace("*", "").trim().toUpperCase();
};

const getNodeName = (node) => node.name || node.node || node.NodeName || "";

const getNodeStatus = (node) => node.status || node.state || node.State || "";

const getFirstValue = (node, fields) => {
  for (const field of fields) {
    if (node[field] !== undefined && node[field] !== null && node[field] !== "") {
      return node[field];
    }
  }

  return null;
};

const getNodeCpuCount = (node) =>
  getFirstValue(node, ["cpus", "cpu_count", "cpuCount", "CPUS", "CoresPerSocket"]);

const getNodeMemory = (node) =>
  getFirstValue(node, ["memory", "mem", "real_memory", "realMemory", "RealMemory"]);

const getNodeUtilization = (node) =>
  Number(getFirstValue(node, ["utilization", "cpu_utilization", "cpuUtilization"]) || 0);

const compareNodeNames = (a, b) =>
  a.name.localeCompare(b.name, undefined, { numeric: true });

const shouldShowNodeReason = (status) => ["down", "drained"].includes(status);

const getNodeReason = (nodeDetail, selectedNode) =>
  nodeDetail?.reason || selectedNode?.reason || selectedNode?.rawReason || "Not reported";

const formatUsage = (used, total, unit = "") => {
  const usedValue = Number(used);
  const totalValue = Number(total);

  if (!Number.isFinite(usedValue) || !Number.isFinite(totalValue) || totalValue <= 0) {
    return "Not reported";
  }

  const percent = Math.round((usedValue / totalValue) * 100);
  const suffix = unit ? ` ${unit}` : "";
  return `${usedValue} / ${totalValue}${suffix} (${percent}%)`;
};

const getNodePartitions = (node) => {
  const rawPartition = node.partition || node.partitions || node.Partition || "";

  return String(rawPartition)
    .split(",")
    .map(cleanPartition)
    .filter(Boolean);
};

const dedupeNodes = (rawNodes) => {
  const nodeMap = new Map();

  rawNodes.forEach((node) => {
    const name = getNodeName(node);
    const rawStatus = getNodeStatus(node);
    const status = normalizeNodeState(rawStatus);
    const partitions = getNodePartitions(node);
    const cpuCount = getNodeCpuCount(node);
    const memory = getNodeMemory(node);
    const utilization = getNodeUtilization(node);

    if (!name) return;

    if (!nodeMap.has(name)) {
      nodeMap.set(name, {
        name,
        status,
        rawStatus,
        partitions,
        cpuCount,
        memory,
        utilization,
      });
      return;
    }

    const existing = nodeMap.get(name);

    partitions.forEach((partition) => {
      if (partition && !existing.partitions.includes(partition)) {
        existing.partitions.push(partition);
      }
    });

    if (NODE_STATUS_PRIORITY[status] > NODE_STATUS_PRIORITY[existing.status]) {
      existing.status = status;
      existing.rawStatus = rawStatus;
    }

    if (!existing.cpuCount && cpuCount) existing.cpuCount = cpuCount;
    if (!existing.memory && memory) existing.memory = memory;
    existing.utilization = Math.max(existing.utilization || 0, utilization);
  });

  return Array.from(nodeMap.values())
    .map((node) => ({
      ...node,
      partitions: node.partitions.sort(),
    }))
    .sort(compareNodeNames);
};

const ClusterStatus = () => {
  const [rawNodes, setRawNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartition, setSelectedPartition] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(null);
  const [selectedNodeName, setSelectedNodeName] = useState(null);
  const [nodeDetail, setNodeDetail] = useState(null);
  const [nodeJobs, setNodeJobs] = useState([]);
  const [nodeDetailLoading, setNodeDetailLoading] = useState(false);
  const [nodeDetailError, setNodeDetailError] = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  const nodes = useMemo(() => dedupeNodes(rawNodes), [rawNodes]);

  const partitions = useMemo(() => {
    const partitionSet = new Set();

    nodes.forEach((node) => {
      node.partitions.forEach((partition) => {
        if (partition) partitionSet.add(partition);
      });
    });

    return [
      "ALL",
      ...Array.from(partitionSet)
        .filter((partition) => !hiddenPartitionFilters.has(partition))
        .sort(),
    ];
  }, [nodes]);

  const partitionSearchFilteredNodes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return nodes.filter((node) => {
      const matchesPartition =
        selectedPartition === "ALL" || node.partitions.includes(selectedPartition);

      if (!matchesPartition) return false;
      if (!normalizedSearch) return true;

      return [
        node.name,
        node.status,
        node.rawStatus,
        ...node.partitions,
      ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
    });
  }, [nodes, searchTerm, selectedPartition]);

  const filteredNodes = useMemo(() => {
    if (!selectedStatusFilter) return partitionSearchFilteredNodes;
    return partitionSearchFilteredNodes.filter((node) => node.status === selectedStatusFilter);
  }, [partitionSearchFilteredNodes, selectedStatusFilter]);

  const visibleNodes = useMemo(() => {
    return [...filteredNodes].sort(compareNodeNames);
  }, [filteredNodes]);

  const statusSummary = useMemo(() => {
    return partitionSearchFilteredNodes.reduce((summary, node) => {
      summary[node.status] = (summary[node.status] || 0) + 1;
      return summary;
    }, {});
  }, [partitionSearchFilteredNodes]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeName) return null;
    return nodes.find((node) => node.name === selectedNodeName) || null;
  }, [nodes, selectedNodeName]);

  useEffect(() => {
    if (!partitions.includes(selectedPartition)) {
      setSelectedPartition("ALL");
    }
  }, [partitions, selectedPartition]);

  useEffect(() => {
    if (selectedNodeName && !nodes.some((node) => node.name === selectedNodeName)) {
      setSelectedNodeName(null);
    }
  }, [nodes, selectedNodeName]);

  useEffect(() => {
    if (!selectedNodeName) {
      setNodeDetail(null);
      setNodeJobs([]);
      setNodeDetailError("");
      setNodeDetailLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const basePath = window.location.pathname.replace(/\/$/, "");
    const encodedNodeName = encodeURIComponent(selectedNodeName);

    setNodeDetailLoading(true);
    setNodeDetailError("");
    setNodeDetail(null);
    setNodeJobs([]);

    Promise.all([
      fetch(`${basePath}/api/node/${encodedNodeName}`, { signal: controller.signal }),
      fetch(`${basePath}/api/node/${encodedNodeName}/jobs`, { signal: controller.signal }),
    ])
      .then(async ([detailResponse, jobsResponse]) => {
        const detailData = await detailResponse.json();
        const jobsData = await jobsResponse.json();

        if (!detailResponse.ok) {
          throw new Error(detailData?.error || "Unable to fetch node detail");
        }

        if (!jobsResponse.ok) {
          throw new Error(jobsData?.error || "Unable to fetch node jobs");
        }

        setNodeDetail(detailData);
        setNodeJobs(Array.isArray(jobsData) ? jobsData : []);
        setNodeDetailLoading(false);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;

        console.error("Failed to fetch selected node data:", error);
        setNodeDetailError(error.message || "Unable to fetch selected node data");
        setNodeDetailLoading(false);
      });

    return () => controller.abort();
  }, [selectedNodeName]);

  const fetchNodes = useCallback(() => {
    setLoading(true);

    const basePath = window.location.pathname.replace(/\/$/, "");
    const apiUrl = `${basePath}/api/nodes`;

    fetch(apiUrl)
      .then((response) => response.json())
      .then((data) => {
        setRawNodes(Array.isArray(data) ? data : []);
        setLastFetchedAt(new Date());
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch nodes:", error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchNodes();
    window.addEventListener(refreshEventName, fetchNodes);

    return () => {
      window.removeEventListener(refreshEventName, fetchNodes);
    };
  }, [fetchNodes]);

  const handleNodeClick = (node) => {
    setSelectedNodeName((currentName) => currentName === node.name ? null : node.name);
  };

  const handleStatusSortClick = (status) => {
    setSelectedStatusFilter((currentStatus) => currentStatus === status ? null : status);
  };

  const getNodeTooltip = (node) => [
    `Node: ${node.name}`,
    `Partitions: ${node.partitions.length ? node.partitions.join(", ") : "Unknown"}`,
    `Status: ${node.rawStatus || NODE_STATUS_LABELS[node.status] || "Unknown"}`,
    `CPU Count: ${node.cpuCount || "Not reported"}`,
    `Memory: ${node.memory || "Not reported"}`,
  ].join("\n");

  if (loading) {
    return (
      <div className={nodeCardClass}>
        <div className={nodeHeaderClass}>
          <div>
            <h3 className={cardClasses.titleText}>Cluster Nodes</h3>
            <span className={nodeSubtitleClass}>Loading node inventory</span>
          </div>
        </div>
        <div className={cardClasses.loading}>Loading nodes...</div>
      </div>
    );
  }

  return (
    <div className={nodeCardClass}>
      <div className={nodeHeaderClass}>
        <div>
          <h3 className={cardClasses.titleText}>Cluster Explorer</h3>
          <span className={nodeSubtitleClass}>
            Showing {visibleNodes.length} of {nodes.length} nodes
          </span>
        </div>

        <div className="mr-1 flex flex-wrap items-center justify-end gap-2">
          {lastFetchedAt && (
            <span className="text-card-11-5 text-mosaic-muted">
              {lastFetchedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button className={nodeRefreshClass} onClick={fetchNodes}>
            ⟳ Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2.5">
        <div className="relative w-full max-w-80">
          <span className="absolute left-[9px] top-1/2 -translate-y-1/2 text-mosaic-muted" aria-hidden="true">⌕</span>
          <input
            className={nodeInputClass}
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search nodes or partitions"
            aria-label="Search nodes or partitions"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-[7px]" aria-label="Partition filters">
        {partitions.map((partition) => (
          <button
            key={partition}
            className={nodeTabClass(selectedPartition === partition)}
            type="button"
            onClick={() => setSelectedPartition(partition)}
          >
            {partition === "ALL" ? "All" : partition}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(86px,1fr))] gap-[7px]" aria-label="Status summary">
        {summaryStatuses.map((status) => (
          <button
            key={status}
            className={cx(
              "non-draggable grid gap-0.5 rounded-[5px] border border-[var(--node-status-color)] bg-mosaic-table px-2 py-[7px] text-left transition-colors hover:bg-mosaic-surface-hover",
              selectedStatusFilter === status && "ring-2 ring-mosaic-accent ring-offset-1 ring-offset-mosaic-surface"
            )}
            style={getNodeStatusStyle(status)}
            type="button"
            onClick={() => handleStatusSortClick(status)}
            aria-pressed={selectedStatusFilter === status}
            title={`Show only ${NODE_STATUS_LABELS[status]} nodes`}
          >
            <span className="text-card-11 text-mosaic-muted">{NODE_STATUS_LABELS[status]}</span>
            <strong className="text-card-14 font-extrabold text-mosaic-primary">{statusSummary[status] || 0}</strong>
          </button>
        ))}
      </div>

      <div className={cx("grid min-h-0 flex-1 gap-3 overflow-hidden", selectedNode ? "grid-cols-[minmax(0,1fr)_minmax(220px,280px)]" : "grid-cols-1")}>
        <div className="flex min-h-[130px] flex-wrap content-start gap-[6px] overflow-y-auto rounded-[5px] border border-mosaic-border bg-mosaic-app p-2">
          {visibleNodes.map((node) => (
            <button
              key={node.name}
              className={nodeTileClass(selectedNodeName === node.name)}
              style={getNodeStatusStyle(node.status)}
              type="button"
              onClick={() => handleNodeClick(node)}
              title={getNodeTooltip(node)}
            >
              {node.name}
            </button>
          ))}
          {visibleNodes.length === 0 && (
            <div className={cardClasses.empty}>No nodes match the current filters.</div>
          )}
        </div>

        {selectedNode && (
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-[5px] border border-mosaic-border bg-mosaic-table p-2.5">
            <div className="mb-2 flex shrink-0 items-center gap-2 border-b border-mosaic-border pb-2">
              <span className={nodeStatusDotClass} style={getNodeStatusStyle(selectedNode.status)} />
              <div>
                <h4 className="m-0 text-card-14 font-extrabold text-mosaic-primary">{selectedNode.name}</h4>
                <p className="m-0 text-card-11 text-mosaic-muted">{NODE_STATUS_LABELS[selectedNode.status] || "Unknown"}</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-gutter:stable] [overscroll-behavior:contain]">
              {nodeDetailLoading ? (
                <div className={cardClasses.loading}>Loading node details...</div>
              ) : nodeDetailError ? (
                <div className="text-card-12 font-semibold text-mosaic-danger">{nodeDetailError}</div>
              ) : (
                <dl className="grid gap-[7px] [&_dd]:m-0 [&_dd]:text-card-11-5 [&_dd]:font-semibold [&_dd]:text-mosaic-primary [&_dt]:text-card-10-5 [&_dt]:font-bold [&_dt]:uppercase [&_dt]:text-mosaic-muted">
                  <div>
                    <dt>Status</dt>
                    <dd>{nodeDetail?.status || selectedNode.rawStatus || NODE_STATUS_LABELS[selectedNode.status]}</dd>
                  </div>
                  {shouldShowNodeReason(selectedNode.status) && (
                    <div>
                      <dt>Reason</dt>
                      <dd>{getNodeReason(nodeDetail, selectedNode)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Partitions</dt>
                    <dd>{(nodeDetail?.partitions || selectedNode.partitions).join(", ") || "Unknown"}</dd>
                  </div>
                  <div>
                    <dt>CPU Usage</dt>
                    <dd>{formatUsage(nodeDetail?.cpu_alloc, nodeDetail?.cpu_total)}</dd>
                  </div>
                  <div>
                    <dt>Memory Usage</dt>
                    <dd>{formatUsage(nodeDetail?.alloc_memory, nodeDetail?.real_memory, "MB")}</dd>
                  </div>
                  <div>
                    <dt>Running Jobs</dt>
                    <dd>
                      <strong>{nodeJobs.length}</strong>
                      {nodeJobs.length > 0 && (
                        <span className="mt-1 grid gap-1 text-card-11 text-mosaic-secondary">
                          {nodeJobs.slice(0, 3).map((job) => (
                            <span key={job.job_id}>
                              {job.job_id}{job.name ? ` ${job.name}` : ""}
                            </span>
                          ))}
                          {nodeJobs.length > 3 && <span>+{nodeJobs.length - 3} more</span>}
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </aside>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-card-11-5 text-mosaic-secondary">
        {summaryStatuses.map((status) => (
          <span key={status} className="inline-flex items-center gap-[7px]">
            <span className={nodeStatusDotClass} style={getNodeStatusStyle(status)} />
            {NODE_STATUS_LABELS[status]}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ClusterStatus;

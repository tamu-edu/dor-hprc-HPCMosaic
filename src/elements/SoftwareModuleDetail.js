import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiCheck,
  FiChevronDown,
  FiCopy,
  FiTerminal,
} from "react-icons/fi";

const COPY_FEEDBACK_DURATION = 1800;

const CopyCommandButton = ({ command, label }) => {
  const [copied, setCopied] = useState(false);
  const feedbackTimer = useRef(null);

  useEffect(
    () => () => {
      if (feedbackTimer.current) {
        window.clearTimeout(feedbackTimer.current);
      }
    },
    []
  );

  const copyCommand = async () => {
    if (!navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.clearTimeout(feedbackTimer.current);
      feedbackTimer.current = window.setTimeout(
        () => setCopied(false),
        COPY_FEEDBACK_DURATION
      );
    } catch (error) {
      console.error("Unable to copy module load command:", error);
    }
  };

  return (
    <button
      type="button"
      className="non-draggable flex min-h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-card-12 font-medium theme-text-secondary theme-hover-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mosaic-color-primary)]"
      onClick={copyCommand}
      aria-label={copied ? "Module load command copied" : label}
      title={copied ? "Copied" : "Copy load command"}
    >
      {copied ? (
        <FiCheck aria-hidden="true" className="h-4 w-4" />
      ) : (
        <FiCopy aria-hidden="true" className="h-4 w-4" />
      )}
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
};

const compareVersionsNewestFirst = (left, right) =>
  right.version.localeCompare(left.version, undefined, {
    numeric: true,
    sensitivity: "base",
  });

const SoftwareModuleDetail = ({ module, details, loadState, onBack }) => {
  const records = useMemo(
    () => [...(details?.versions || [])].sort(compareVersionsNewestFirst),
    [details]
  );
  const extensions = details?.extensions || [];
  const [expandedVersions, setExpandedVersions] = useState(() => new Set());

  useEffect(() => {
    if (records.length > 0) {
      setExpandedVersions(new Set([records[0].full_name]));
    }
  }, [records]);

  const toggleVersion = (fullName) => {
    setExpandedVersions((current) => {
      const next = new Set(current);
      if (next.has(fullName)) {
        next.delete(fullName);
      } else {
        next.add(fullName);
      }
      return next;
    });
  };

  const detailHeader = (
      <div className="flex flex-wrap items-center gap-3 border-t theme-border pt-3">
        <button
          type="button"
          className="non-draggable flex min-h-8 items-center gap-1.5 rounded-md px-2 text-card-12 font-medium theme-text-secondary theme-hover-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mosaic-color-primary)]"
          onClick={onBack}
        >
          <FiArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to modules
        </button>
        <h2 className="min-w-0 break-words text-card-18 font-bold theme-text-primary">
          {module.name}
        </h2>
      </div>
  );

  if (loadState === "loading" || !details) {
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
        {detailHeader}
        <p className="py-8 text-center text-card-14 theme-text-secondary">
          {loadState === "error"
            ? "Module details could not be loaded."
            : "Loading module details..."}
        </p>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      {detailHeader}

      <section className="rounded-lg border theme-border theme-surface p-4 shadow-sm">
        <h3 className="text-card-14 font-semibold theme-text-primary">
          Description
        </h3>
        <p className="mt-2 break-words text-card-14 theme-text-secondary">
          {module.description || "No description available."}
        </p>
      </section>

      <section className="rounded-lg border theme-border theme-surface p-4 shadow-sm">
        <h3 className="mb-3 text-card-14 font-semibold theme-text-primary">
          Versions
        </h3>
        <div className="flex flex-col gap-2">
          {records.map((record) => {
            const isExpanded = expandedVersions.has(record.full_name);
            const dependencySets = Array.isArray(record.dependencies)
              ? record.dependencies.filter(Array.isArray)
              : [];
            const panelId = `module-version-${record.full_name.replace(
              /[^a-zA-Z0-9_-]/g,
              "-"
            )}`;

            return (
              <article
                key={record.full_name}
                className="overflow-hidden rounded-md border theme-border theme-surface-alt"
              >
                <button
                  type="button"
                  className="non-draggable flex w-full items-center gap-3 px-3 py-2 text-left theme-hover-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--mosaic-color-primary)]"
                  onClick={() => toggleVersion(record.full_name)}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                >
                  <span className="min-w-0 flex-1 break-words text-card-14 font-medium theme-text-primary">
                    {record.version}
                  </span>
                  {record.is_default && (
                    <span className="theme-status-success rounded border theme-border px-2 py-0.5 text-card-12 font-medium">
                      Default
                    </span>
                  )}
                  <FiChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div
                    id={panelId}
                    className="border-t theme-border p-3"
                  >
                    <div>
                      <h4 className="text-card-12 font-semibold uppercase tracking-wide theme-text-secondary">
                        How to Load
                      </h4>
                      {dependencySets.length === 0 ? (
                        <div className="mt-2">
                          <p className="mb-2 text-card-12 theme-text-muted">
                            {record.is_extension
                              ? "This extension has no listed dependencies and does not require a module-load command."
                              : "No dependencies listed."}
                          </p>
                          {!record.is_extension && (
                            <div className="flex min-w-0 items-center gap-2 rounded-md theme-surface-alt px-3 py-2">
                              <FiTerminal
                                aria-hidden="true"
                                className="h-4 w-4 shrink-0 theme-text-muted"
                              />
                              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-card-12 theme-text-primary">
                                {`module load ${record.full_name}`}
                              </code>
                              <CopyCommandButton
                                command={`module load ${record.full_name}`}
                                label={`Copy load command for ${record.full_name}`}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-col gap-2">
                          {dependencySets.map((dependencySet, index) => {
                            const loadCommand = `module load ${[
                              ...dependencySet,
                              ...(record.is_extension
                                ? []
                                : [record.full_name]),
                            ].join(" ")}`;

                            return (
                              <div
                                key={`${record.full_name}-dependencies-${index}`}
                                className="grid gap-2 rounded-md theme-surface px-3 py-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:items-center"
                              >
                                <div>
                                  {dependencySets.length > 1 && (
                                    <p className="mb-1 text-card-12 font-medium theme-text-secondary">
                                      Dependency set {index + 1}
                                    </p>
                                  )}
                                  <ul className="flex flex-wrap gap-1.5">
                                    {dependencySet.map((dependency) => (
                                      <li
                                        key={dependency}
                                        className="rounded theme-surface-alt px-2 py-0.5 text-card-12 theme-text-primary"
                                      >
                                        {dependency}
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="flex min-w-0 items-center gap-2 rounded-md theme-surface-alt px-3 py-2">
                                  <FiTerminal
                                    aria-hidden="true"
                                    className="h-4 w-4 shrink-0 theme-text-muted"
                                  />
                                  <code
                                    className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-card-12 theme-text-primary"
                                    title={loadCommand}
                                  >
                                    {loadCommand}
                                  </code>
                                  <CopyCommandButton
                                    command={loadCommand}
                                    label={`Copy full load command for ${record.full_name}, dependency set ${
                                      index + 1
                                    }`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {!module.isExtension && (
        <section className="rounded-lg border theme-border theme-surface p-4 shadow-sm">
          <h3 className="text-card-14 font-semibold theme-text-primary">
            Extensions
          </h3>
          {extensions.length === 0 ? (
            <p className="mt-2 text-card-14 theme-text-secondary">
              No extensions are listed for this module.
            </p>
          ) : (
            <ul className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {extensions.map((extension) => (
                <li
                  key={extension.full_name}
                  className="flex min-w-0 items-center justify-between gap-2 rounded-md theme-surface-alt px-3 py-2"
                >
                  <span
                    className="min-w-0 truncate text-card-14 font-medium theme-text-primary"
                    title={extension.name}
                  >
                    {extension.name}
                  </span>
                  <span className="shrink-0 text-card-12 theme-text-secondary">
                    {extension.version}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </section>
  );
};

export default SoftwareModuleDetail;

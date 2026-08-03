import React, { useEffect, useRef, useState } from "react";
import { FiCheck, FiCopy, FiTerminal } from "react-icons/fi";

const COPY_FEEDBACK_DURATION = 1800;

const ModuleCard = ({
  name,
  version,
  description,
  compiler,
  loadCommand,
  versionCount,
  isDefault,
  isExtension,
  isCompactMode = false,
  onSelect,
}) => {
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

  const copyLoadCommand = async () => {
    if (!loadCommand || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(loadCommand);
      setCopied(true);

      if (feedbackTimer.current) {
        window.clearTimeout(feedbackTimer.current);
      }

      feedbackTimer.current = window.setTimeout(() => {
        setCopied(false);
      }, COPY_FEEDBACK_DURATION);
    } catch (error) {
      console.error("Unable to copy module load command:", error);
    }
  };

  const normalizedVersionCount = Number.isFinite(Number(versionCount))
    ? Number(versionCount)
    : 0;
  const statusLabel = isExtension
    ? "Extension"
    : isDefault
      ? "Default"
      : null;

  return (
    <article
      className={
        isCompactMode
          ? "relative flex min-w-0 items-center gap-3 border-t theme-border theme-surface px-3 py-2.5 first:border-t-0"
          : "relative flex min-h-0 min-w-0 flex-col gap-3 rounded-lg border theme-border theme-surface p-4 shadow-sm"
      }
    >
      <button
        type="button"
        className="non-draggable absolute inset-0 rounded-[inherit] theme-hover-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--mosaic-color-primary)]"
        onClick={onSelect}
        aria-label={`View details for ${name}`}
      />

      <header
        className={
          isCompactMode
            ? "pointer-events-none relative flex min-w-0 flex-1 items-center gap-3"
            : "pointer-events-none relative flex min-w-0 flex-wrap items-start gap-2"
        }
      >
        <h3
          className={
            isCompactMode
              ? "mr-auto min-w-0 truncate text-card-14 font-semibold theme-text-primary"
              : "mr-auto min-w-0 break-words text-card-14 font-semibold theme-text-primary"
          }
          title={name}
        >
          {name}
        </h3>

        {version && (
          <span
            className="theme-selected max-w-full shrink-0 truncate rounded border theme-border px-1.5 py-0.5 text-card-12 font-medium"
            title={`Version ${version}`}
          >
            {version}
          </span>
        )}

        {!isCompactMode && compiler && (
          <span
            className="max-w-full shrink-0 truncate rounded border theme-border px-1.5 py-0.5 text-card-12 font-medium theme-text-secondary"
            title={`Compiler ${compiler}`}
          >
            {compiler}
          </span>
        )}
      </header>

      {!isCompactMode && (
        <p
          className="pointer-events-none relative line-clamp-2 min-h-10 break-words text-card-14 theme-text-secondary"
          title={description}
        >
          {description || "No description available."}
        </p>
      )}

      {!isCompactMode && (
        <div className="pointer-events-none relative flex min-w-0 items-center gap-2 rounded-md border theme-border theme-surface-alt px-3 py-2">
          <FiTerminal
            aria-hidden="true"
            className="h-4 w-4 shrink-0 theme-text-muted"
          />
          <code
            className="min-w-0 flex-1 truncate text-card-12 theme-text-primary"
            title={loadCommand}
          >
            {loadCommand ||
              (isExtension
                ? "Available after loading its dependencies"
                : "No load command available")}
          </code>
          {loadCommand && (
            <button
              type="button"
              className="non-draggable pointer-events-auto relative z-10 flex min-h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-card-12 font-medium theme-text-secondary theme-hover-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mosaic-color-primary)]"
              onClick={copyLoadCommand}
              aria-label={
                copied
                  ? "Module load command copied"
                  : `Copy load command for ${name}`
              }
              title={copied ? "Copied" : "Copy load command"}
            >
              {copied ? (
                <FiCheck aria-hidden="true" className="h-4 w-4" />
              ) : (
                <FiCopy aria-hidden="true" className="h-4 w-4" />
              )}
              <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
            </button>
          )}
        </div>
      )}

      {!isCompactMode && (
        <footer className="pointer-events-none relative mt-auto flex min-w-0 items-center justify-between gap-3 text-card-12 theme-text-secondary">
          <span>
            {normalizedVersionCount.toLocaleString()}{" "}
            {normalizedVersionCount === 1 ? "version" : "versions"}
          </span>

          {statusLabel && (
            <span
              className={
                isExtension
                  ? "theme-selected truncate rounded border theme-border px-2 py-0.5 font-medium"
                  : "theme-status-success theme-surface-hover truncate rounded border theme-border px-2 py-0.5 font-medium"
              }
            >
              {statusLabel}
            </span>
          )}
        </footer>
      )}
    </article>
  );
};

export default ModuleCard;

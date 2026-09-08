import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdErrorOutline, MdSearch } from "react-icons/md";
import { get_base_url } from "../utils/api_config.js";
import { generate_file_explorer_path_for_disk } from "../utils/generate_filepath";
import "../composer/PopupForm.css";


const QUOTA_FAQ_URL = "https://hprc.tamu.edu/kb/FAQ/Other/#q-what-is-disk-quota-exceeded";

const formatBytes = (bytes) => {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return "Unknown";
  if (value === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const unitIndex = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const scaled = value / (1024 ** unitIndex);
  return `${scaled >= 10 || unitIndex === 0 ? scaled.toFixed(0) : scaled.toFixed(1)} ${units[unitIndex]}`;
};

const QuotaInspectionButton = ({ disk }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState("idle");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const abortControllerRef = useRef(null);
  const isHomeDirectory = String(disk).startsWith("/home/");

  const inspectUsage = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStatus("loading");
    setError("");
    setReport(null);

    try {
      const response = await fetch(`${get_base_url()}/api/quota/inspection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disk }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Unable to inspect storage usage");
      }

      setReport(payload);
      setStatus("success");
    } catch (requestError) {
      if (requestError.name === "AbortError") return;
      setError(requestError.message || "Unable to inspect storage usage");
      setStatus("error");
    }
  }, [disk]);

  const openModal = () => {
    setIsOpen(true);
    inspectUsage();
  };

  const closeModal = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsOpen(false);
  }, []);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeModal, isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="non-draggable inline-flex min-h-[22px] shrink-0 items-center gap-1 rounded border border-mosaic-border bg-mosaic-app px-2 py-[3px] text-card-10 font-bold text-mosaic-secondary transition-colors hover:border-mosaic-accent hover:text-mosaic-primary focus:outline-none focus:ring-2 focus:ring-mosaic-focus"
        title={`Inspect storage usage for ${disk}`}
      >
        <MdSearch aria-hidden="true" />
        <span>Inspect usage</span>
      </button>

      {isOpen && createPortal(
        <div
          className="composer-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="composer-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quota-inspection-title"
          >
            <button type="button" onClick={closeModal} className="composer-modal-close" aria-label="Close storage usage details">×</button>
            <div className="composer-modal-body">
              <header className="mb-4 border-b border-mosaic-border pb-3 pr-10">
                <h2 id="quota-inspection-title" className="m-0 text-lg font-bold text-mosaic-primary">Storage usage details</h2>
                <div className="mt-1 break-all text-sm text-mosaic-secondary">
                  {generate_file_explorer_path_for_disk(disk)}
                </div>
                {isHomeDirectory && (
                  <aside className="mt-3 rounded border border-mosaic-caution bg-mosaic-caution-bg px-3 py-2 text-sm leading-relaxed text-mosaic-secondary">
                    <strong className="text-mosaic-primary">Home directory tip:</strong>{" "}
                    Hidden folders such as <code>.local</code>, <code>.cache</code>, and <code>.vscode-server</code> can consume much of your quota. Instead of deleting files you need, move large hidden folders to scratch and link them back to home.{" "}
                    <a href={QUOTA_FAQ_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-mosaic-link underline">
                      View HPRC symlink instructions
                    </a>.
                  </aside>
                )}
              </header>

              {status === "loading" && (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center text-mosaic-secondary" role="status">
                  <span className="h-8 w-8 animate-spin rounded-full border-4 border-mosaic-border border-t-mosaic-accent" aria-hidden="true" />
                  <strong className="text-mosaic-primary">Inspecting storage usage…</strong>
                  <span className="max-w-md text-sm">Large directories can take several seconds. The scan stops automatically if it reaches its safety limit.</span>
                </div>
              )}

              {status === "error" && (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center" role="alert">
                  <MdErrorOutline className="text-4xl text-mosaic-danger" aria-hidden="true" />
                  <strong className="text-mosaic-primary">Could not inspect this path</strong>
                  <span className="max-w-lg text-sm text-mosaic-secondary">{error}</span>
                  <button type="button" onClick={inspectUsage} className="rounded bg-mosaic-accent px-3 py-2 text-sm font-bold text-mosaic-accent-text">Try again</button>
                </div>
              )}

              {status === "success" && report && (
                <div className="grid gap-5">
                  {report.partial && (
                    <div className="rounded border border-mosaic-caution bg-mosaic-app px-3 py-2 text-sm text-mosaic-secondary">
                      This is a partial report because the scan reached its safety limit.
                    </div>
                  )}

                  <section>
                    <h3 className="mb-2 text-base font-bold text-mosaic-primary">Directories with the most items</h3>
                    <div className="overflow-x-auto rounded border border-mosaic-border">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-mosaic-app text-mosaic-secondary">
                          <tr><th className="px-3 py-2">Directory</th><th className="px-3 py-2 text-right">Files</th><th className="px-3 py-2 text-right">Folders</th><th className="px-3 py-2 text-right">Total</th></tr>
                        </thead>
                        <tbody>
                          {report.directories.map((directory) => (
                            <tr key={directory.path} className="border-t border-mosaic-border">
                              <td className="max-w-[520px] break-all px-3 py-2 text-mosaic-primary">{generate_file_explorer_path_for_disk(directory.path)}</td>
                              <td className="px-3 py-2 text-right text-mosaic-secondary">{directory.file_count.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right text-mosaic-secondary">{directory.subdirectory_count.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right font-bold text-mosaic-primary">{directory.item_count.toLocaleString()}</td>
                            </tr>
                          ))}
                          {report.directories.length === 0 && <tr><td colSpan="4" className="px-3 py-6 text-center text-mosaic-secondary">No readable directories found.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-2 text-base font-bold text-mosaic-primary">Largest files</h3>
                    <div className="overflow-x-auto rounded border border-mosaic-border">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-mosaic-app text-mosaic-secondary"><tr><th className="px-3 py-2">File</th><th className="px-3 py-2 text-right">Size</th></tr></thead>
                        <tbody>
                          {report.files.map((file) => (
                            <tr key={file.path} className="border-t border-mosaic-border">
                              <td className="max-w-[620px] break-all px-3 py-2 text-mosaic-primary">{generate_file_explorer_path_for_disk(file.path)}</td>
                              <td className="whitespace-nowrap px-3 py-2 text-right font-bold text-mosaic-primary">{formatBytes(file.size_bytes)}</td>
                            </tr>
                          ))}
                          {report.files.length === 0 && <tr><td colSpan="2" className="px-3 py-6 text-center text-mosaic-secondary">No readable files found.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-mosaic-border pt-3 text-xs text-mosaic-secondary">
                    <span>Checked {Number(report.visited_entries || 0).toLocaleString()} items in {report.elapsed_seconds}s{report.skipped_directories ? ` · Skipped ${report.skipped_directories} unreadable directories` : ""}{report.cached ? " · Cached report" : ""}</span>
                    <button type="button" onClick={closeModal} className="rounded border border-mosaic-border px-3 py-1.5 font-bold text-mosaic-primary hover:bg-mosaic-app">Done</button>
                  </footer>
                </div>
              )}
            </div>
          </section>
        </div>,
        document.body
      )}
    </>
  );
};

export default QuotaInspectionButton;

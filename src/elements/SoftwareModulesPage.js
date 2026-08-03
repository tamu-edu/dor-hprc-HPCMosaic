import React, { useEffect, useMemo, useRef, useState } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { FiFilter, FiSearch } from "react-icons/fi";
import ModuleCardGrid from "./ModuleCardGrid";
import SoftwareModuleDetail from "./SoftwareModuleDetail";
import { get_base_url } from "../utils/api_config";

const INITIAL_GRID_CAPACITY = 20;
const MEANINGFUL_RESIZE_THRESHOLD = 8;
const LIST_VIEW_MAX_HEIGHT = 520;
const LIST_VIEW_MAX_WIDTH = 760;
const COMPILER_PATTERN = /^(?:AOCC|Clang|GCC(?:core)?|intel|NVHPC)\//i;

const compareVersions = (left, right) =>
  left.version.localeCompare(right.version, undefined, {
    numeric: true,
    sensitivity: "base",
  });

const getCompiler = (record) => {
  const dependencies = Array.isArray(record.dependencies)
    ? record.dependencies.flat()
    : [];
  return dependencies.find((dependency) => COMPILER_PATTERN.test(dependency)) || "";
};

export const groupModuleRecords = (records) => {
  const groups = new Map();

  records.forEach((record) => {
    if (!record?.name || !record?.version || !record?.full_name) {
      return;
    }

    if (!groups.has(record.name)) {
      groups.set(record.name, new Map());
    }
    groups.get(record.name).set(record.full_name, record);
  });

  return Array.from(groups, ([name, recordsByFullName]) => {
    const versions = Array.from(recordsByFullName.values()).sort(compareVersions);
    const current = versions[versions.length - 1];
    const compiler = getCompiler(current);
    const currentDependencySet = Array.isArray(current.dependencies)
      ? current.dependencies.find(
          (dependencySet) =>
            Array.isArray(dependencySet) && dependencySet.length > 0
        ) || []
      : [];
    const loadCommand = current.is_extension
      ? currentDependencySet.length > 0
        ? `module load ${currentDependencySet.join(" ")}`
        : ""
      : `module load ${current.full_name}`;

    return {
      name,
      version: current.version,
      description: current.description || "",
      compiler,
      loadCommand,
      versionCount: versions.length,
      isDefault: Boolean(current.is_default),
      isExtension: Boolean(current.is_extension),
      fullName: current.full_name,
      records: versions,
    };
  }).sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
  );
};

const SoftwareModulesPage = () => {
  const [modules, setModules] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleType, setModuleType] = useState("all");
  const [compiler, setCompiler] = useState("all");
  const [sortOrder, setSortOrder] = useState("name-asc");
  const [selectedModuleName, setSelectedModuleName] = useState(null);
  const [moduleDetails, setModuleDetails] = useState({});
  const [detailLoadState, setDetailLoadState] = useState("idle");
  const [gridCapacity, setGridCapacity] = useState(INITIAL_GRID_CAPACITY);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const pageRef = useRef(null);
  const resultsRef = useRef(null);
  const gridRef = useRef(null);
  const paginationRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadModules = async () => {
      try {
        const response = await fetch(
          `${get_base_url()}/api/available_modules/summary`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Unable to load modules (${response.status})`);
        }

        const summaries = await response.json();
        if (!Array.isArray(summaries)) {
          throw new Error("The modules response is not a list");
        }

        setModules(
          summaries.map((summary) => ({
            name: summary.name,
            version: summary.latest_version,
            description: summary.description || "",
            compiler: summary.compiler || "",
            loadCommand: summary.load_command || "",
            versionCount: summary.version_count,
            isDefault: Boolean(summary.is_default),
            isExtension: Boolean(summary.is_extension),
            fullName: summary.full_name,
          }))
        );
        setLoadState("ready");
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error loading available modules:", error);
          setLoadState("error");
        }
      }
    };

    loadModules();

    return () => controller.abort();
  }, []);

  const compilerOptions = useMemo(
    () =>
      Array.from(
        new Set(modules.map((module) => module.compiler).filter(Boolean))
      ).sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true })
      ),
    [modules]
  );

  const filteredModules = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();

    const matches = modules.filter((module) => {
      const matchesSearch =
        !query ||
        [module.name, module.version, module.compiler, module.fullName].some(
          (value) => value.toLocaleLowerCase().includes(query)
        );
      const matchesType =
        moduleType === "all" ||
        (moduleType === "extension" && module.isExtension) ||
        (moduleType === "module" && !module.isExtension);
      const matchesCompiler =
        compiler === "all" || module.compiler === compiler;

      return matchesSearch && matchesType && matchesCompiler;
    });

    return matches.sort((left, right) => {
      switch (sortOrder) {
        case "name-desc":
          return right.name.localeCompare(left.name, undefined, {
            sensitivity: "base",
          });
        case "count-desc":
          return right.versionCount - left.versionCount;
        case "count-asc":
          return left.versionCount - right.versionCount;
        case "name-asc":
        default:
          return left.name.localeCompare(right.name, undefined, {
            sensitivity: "base",
          });
      }
    });
  }, [compiler, moduleType, modules, searchQuery, sortOrder]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredModules.length / gridCapacity)
  );
  const firstVisibleIndex = (currentPage - 1) * gridCapacity;
  const visibleModules = filteredModules.slice(
    firstVisibleIndex,
    firstVisibleIndex + gridCapacity
  );
  const selectedModule = modules.find(
    (module) => module.name === selectedModuleName
  );
  const selectedModuleDetails = selectedModuleName
    ? moduleDetails[selectedModuleName]
    : null;

  useEffect(() => {
    if (!selectedModuleName || selectedModuleDetails) {
      if (selectedModuleDetails) {
        setDetailLoadState("ready");
      }
      return undefined;
    }

    const controller = new AbortController();
    setDetailLoadState("loading");

    fetch(
      `${get_base_url()}/api/available_modules/details?${new URLSearchParams({
        name: selectedModuleName,
      })}`,
      { signal: controller.signal }
    )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load module details");
        }
        return data;
      })
      .then((details) => {
        setModuleDetails((current) => ({
          ...current,
          [selectedModuleName]: details,
        }));
        setDetailLoadState("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Error loading module details:", error);
          setDetailLoadState("error");
        }
      });

    return () => controller.abort();
  }, [selectedModuleDetails, selectedModuleName]);

  const updateFilters = (setter) => (event) => {
    setter(event.target.value);
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) {
      return undefined;
    }

    const updateViewMode = () => {
      const { height, width } = page.getBoundingClientRect();
      setIsCompactMode(
        width < LIST_VIEW_MAX_WIDTH || height < LIST_VIEW_MAX_HEIGHT
      );
    };

    updateViewMode();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateViewMode);
      return () => window.removeEventListener("resize", updateViewMode);
    }

    const viewObserver = new ResizeObserver(updateViewMode);
    viewObserver.observe(page);
    return () => viewObserver.disconnect();
  }, []);

  useEffect(() => {
    if (loadState !== "ready" || filteredModules.length === 0) {
      return undefined;
    }

    let animationFrame;
    let previousBounds = null;

    const calculateGridCapacity = ({ force = false } = {}) => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const page = pageRef.current;
        const results = resultsRef.current;
        const grid = gridRef.current;
        const pagination = paginationRef.current;
        const cards = grid?.querySelectorAll("article");

        if (!page || !results || !grid || !cards?.length) {
          return;
        }

        const pageRect = page.getBoundingClientRect();
        const resultsRect = results.getBoundingClientRect();
        const nextBounds = {
          height: pageRect.height,
          resultsTop: resultsRect.top,
          width: pageRect.width,
        };
        const changedMeaningfully =
          !previousBounds ||
          Object.keys(nextBounds).some(
            (key) =>
              Math.abs(nextBounds[key] - previousBounds[key]) >=
              MEANINGFUL_RESIZE_THRESHOLD
          );

        if (!force && !changedMeaningfully) {
          return;
        }

        previousBounds = nextBounds;
        const cardHeight = Math.max(
          ...Array.from(cards, (card) => card.getBoundingClientRect().height)
        );
        const gridStyle = window.getComputedStyle(grid);
        const columns = gridStyle.gridTemplateColumns
          .split(" ")
          .filter(Boolean).length;
        const rowGap = Number.parseFloat(gridStyle.rowGap) || 0;
        const availableHeight = Math.max(
          0,
          pageRect.bottom -
            resultsRect.top -
            (pagination?.getBoundingClientRect().height || 0)
        );
        const rows = Math.max(
          1,
          Math.floor((availableHeight + rowGap) / (cardHeight + rowGap))
        );
        const nextCapacity = Math.max(1, columns * rows);

        setGridCapacity((currentCapacity) =>
          currentCapacity === nextCapacity ? currentCapacity : nextCapacity
        );
      });
    };

    calculateGridCapacity({ force: true });

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => calculateGridCapacity());

    [pageRef.current, resultsRef.current].forEach((element) => {
      if (element) {
        resizeObserver?.observe(element);
      }
    });

    const fontSizeObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(() =>
            calculateGridCapacity({ force: true })
          );

    fontSizeObserver?.observe(document.documentElement, {
      attributeFilter: ["data-card-font-size"],
      attributes: true,
    });

    const handleWindowResize = () => calculateGridCapacity();
    window.addEventListener("resize", handleWindowResize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      fontSizeObserver?.disconnect();
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [filteredModules.length, isCompactMode, loadState, totalPages > 1]);

  const paginationPages = useMemo(() => {
    const firstPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const lastPage = Math.min(totalPages, firstPage + 4);

    return Array.from(
      { length: lastPage - firstPage + 1 },
      (_, index) => firstPage + index
    );
  }, [currentPage, totalPages]);

  const countLabel =
    loadState === "loading"
      ? "Loading module count..."
      : `${filteredModules.length.toLocaleString()} of ${modules.length.toLocaleString()} modules`;
  const activeControlCount = [
    moduleType !== "all",
    compiler !== "all",
    sortOrder !== "name-asc",
  ].filter(Boolean).length;

  const resetCompactControls = () => {
    setModuleType("all");
    setCompiler("all");
    setSortOrder("name-asc");
    setCurrentPage(1);
  };

  const filterControls = (
    <>
      <label className={isCompactMode ? "relative block" : "relative"}>
        <span className={isCompactMode ? "mb-1 block text-card-12 font-medium theme-text-secondary" : "sr-only"}>
          Module type
        </span>
        <FiFilter
          aria-hidden="true"
          className={`pointer-events-none absolute left-3 h-4 w-4 theme-text-muted ${
            isCompactMode ? "bottom-2" : "top-1/2 -translate-y-1/2"
          }`}
        />
        <select
          value={moduleType}
          onChange={updateFilters(setModuleType)}
          className={`non-draggable theme-input h-8 w-full rounded-md border py-1 pl-9 pr-7 text-card-12 outline-none ${
            isCompactMode ? "" : "xl:w-auto xl:min-w-32"
          }`}
        >
          <option value="all">All Types</option>
          <option value="module">Modules</option>
          <option value="extension">Extensions</option>
        </select>
      </label>

      <label>
        <span className={isCompactMode ? "mb-1 block text-card-12 font-medium theme-text-secondary" : "sr-only"}>
          Compiler
        </span>
        <select
          value={compiler}
          onChange={updateFilters(setCompiler)}
          className={`non-draggable theme-input h-8 w-full rounded-md border px-2 py-1 text-card-12 outline-none ${
            isCompactMode ? "" : "xl:w-auto xl:min-w-36"
          }`}
        >
          <option value="all">All Compilers</option>
          {compilerOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className={isCompactMode ? "mb-1 block text-card-12 font-medium theme-text-secondary" : "sr-only"}>
          Sort by
        </span>
        <select
          value={sortOrder}
          onChange={updateFilters(setSortOrder)}
          className={`non-draggable theme-input h-8 w-full rounded-md border px-2 py-1 text-card-12 outline-none ${
            isCompactMode ? "" : "xl:w-auto xl:min-w-32"
          }`}
        >
          <option value="name-asc">Name: A–Z</option>
          <option value="name-desc">Name: Z–A</option>
          <option value="count-desc">Most Versions</option>
          <option value="count-asc">Fewest Versions</option>
        </select>
      </label>
    </>
  );

  return (
    <div
      ref={pageRef}
      className={`flex h-full min-h-0 w-full flex-col overflow-auto theme-surface theme-text-primary ${
        isCompactMode ? "gap-1.5 p-2" : "gap-2 p-3 sm:p-4"
      }`}
    >
        <header className={`flex shrink-0 ${isCompactMode ? "items-baseline gap-2" : "flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3"}`}>
          <h1 className="text-card-15 font-bold theme-text-primary">
            Software Modules
          </h1>
          {!isCompactMode && <span
            aria-hidden="true"
            className="hidden h-4 w-px theme-surface-hover sm:block"
          />}
          {!isCompactMode && <p className="text-card-12 theme-text-secondary">
            Browse available software modules on the cluster.
          </p>}
          {isCompactMode && <p aria-live="polite" className="truncate text-card-12 theme-text-secondary">
            {countLabel}
          </p>}
        </header>

        {selectedModule ? (
          <SoftwareModuleDetail
            module={selectedModule}
            details={selectedModuleDetails}
            loadState={detailLoadState}
            isCompactMode={isCompactMode}
            onBack={() => setSelectedModuleName(null)}
          />
        ) : (
          <section
            aria-labelledby="available-modules-heading"
            className="flex min-h-0 flex-1 flex-col gap-2"
          >
          {isCompactMode && <h2 id="available-modules-heading" className="sr-only">Available Modules</h2>}
          {!isCompactMode && <div className="flex items-center border-t theme-border pt-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <h2
                id="available-modules-heading"
                className="text-card-14 font-semibold theme-text-primary"
              >
                Available Modules
              </h2>
              <p
                aria-live="polite"
                className="text-card-12 theme-text-secondary"
              >
                {countLabel}
              </p>
            </div>
          </div>}

          <div
            aria-label="Module search and filters"
            className={
              isCompactMode
                ? "grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
                : "grid shrink-0 items-center gap-2 rounded-lg theme-surface p-3 shadow-sm md:grid-cols-2 xl:grid-cols-[minmax(24rem,1fr)_auto_auto_auto]"
            }
          >
            <label className="relative block">
              <span className="sr-only">Search software modules</span>
              <FiSearch
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 theme-text-muted"
              />
              <input
                type="search"
                placeholder="Search modules by name or description..."
                value={searchQuery}
                onChange={updateFilters(setSearchQuery)}
                className={`non-draggable theme-input w-full rounded-md border pl-10 pr-3 text-card-14 outline-none ${
                  isCompactMode ? "h-9 py-1.5" : "h-10 py-2"
                }`}
              />
            </label>

            {isCompactMode ? (
              <Popover>
                <PopoverButton className="non-draggable flex h-9 items-center gap-1.5 rounded-md border theme-border theme-surface-hover px-3 text-card-12 font-medium theme-text-primary outline-none focus-visible:ring-2 focus-visible:ring-[var(--mosaic-color-primary)]">
                  <FiFilter aria-hidden="true" className="h-4 w-4" />
                  <span>Filters &amp; sort</span>
                  {activeControlCount > 0 && (
                    <span className="theme-selected min-w-5 rounded-full px-1.5 py-0.5 text-center text-card-12 font-semibold">
                      {activeControlCount}
                    </span>
                  )}
                </PopoverButton>
                <PopoverPanel
                  anchor={{ to: "bottom end", gap: 8, padding: 8 }}
                  portal
                  className="z-50 grid w-72 gap-3 rounded-lg border theme-border theme-surface p-3 shadow-lg focus:outline-none"
                >
                  {filterControls}
                  <button
                    type="button"
                    className="non-draggable justify-self-end rounded-md px-2 py-1.5 text-card-12 font-medium theme-text-secondary theme-hover-surface disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={resetCompactControls}
                    disabled={activeControlCount === 0}
                  >
                    Reset filters &amp; sort
                  </button>
                </PopoverPanel>
              </Popover>
            ) : filterControls}
          </div>

          <div
            ref={resultsRef}
            aria-label="Software module results"
            className="relative min-h-0 flex-1"
          >
            {loadState === "loading" && (
              <p className="py-8 text-center text-card-14 theme-text-secondary">
                Loading available modules...
              </p>
            )}

            {loadState === "error" && (
              <p
                role="alert"
                className="rounded-lg border theme-border p-4 text-card-14 theme-status-danger"
              >
                Available modules could not be loaded.
              </p>
            )}

            {loadState === "ready" && filteredModules.length === 0 && (
              <p className="py-8 text-center text-card-14 theme-text-secondary">
                No modules match the current filters.
              </p>
            )}

            {loadState === "ready" && visibleModules.length > 0 && (
              <>
                <ModuleCardGrid
                  modules={visibleModules}
                  gridRef={gridRef}
                  isCompactMode={isCompactMode}
                  onSelectModule={setSelectedModuleName}
                />
                {totalPages > 1 && (
                  <nav
                    ref={paginationRef}
                    aria-label="Software module pages"
                    className={`absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 theme-surface ${
                      isCompactMode ? "py-2" : "flex-wrap py-4"
                    }`}
                  >
                    <button
                      type="button"
                      className={`non-draggable rounded-md border theme-border theme-surface-hover font-medium theme-text-primary disabled:cursor-not-allowed disabled:opacity-50 ${
                        isCompactMode ? "px-3 py-1.5 text-card-12" : "px-4 py-2 text-card-14"
                      }`}
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>

                    {isCompactMode ? (
                      <span
                        className="min-w-20 text-center text-card-12 theme-text-secondary"
                        aria-live="polite"
                      >
                        Page {currentPage} of {totalPages}
                      </span>
                    ) : paginationPages.map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={
                          page === currentPage
                            ? "non-draggable min-w-10 rounded-md border theme-border theme-selected px-3 py-2 text-card-14 font-semibold"
                            : "non-draggable min-w-10 rounded-md border theme-border theme-surface-hover px-3 py-2 text-card-14 font-medium theme-text-primary"
                        }
                        onClick={() => setCurrentPage(page)}
                        aria-current={page === currentPage ? "page" : undefined}
                        aria-label={`Page ${page}`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      className={`non-draggable rounded-md border theme-border theme-surface-hover font-medium theme-text-primary disabled:cursor-not-allowed disabled:opacity-50 ${
                        isCompactMode ? "px-3 py-1.5 text-card-12" : "px-4 py-2 text-card-14"
                      }`}
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(totalPages, page + 1)
                        )
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>
          </section>
        )}
    </div>
  );
};

export default SoftwareModulesPage;

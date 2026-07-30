import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiFilter, FiSearch } from "react-icons/fi";
import ModuleCardGrid from "./ModuleCardGrid";
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

    return {
      name,
      version: current.version,
      description: current.description || "",
      compiler,
      loadCommand: `module load ${current.full_name}`,
      versionCount: versions.length,
      isDefault: Boolean(current.is_default),
      isExtension: Boolean(current.is_extension),
      fullName: current.full_name,
    };
  }).sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
  );
};

const SoftwareModulesPage = () => {
  const [moduleRecords, setModuleRecords] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleType, setModuleType] = useState("all");
  const [compiler, setCompiler] = useState("all");
  const [gridCapacity, setGridCapacity] = useState(INITIAL_GRID_CAPACITY);
  const [currentPage, setCurrentPage] = useState(1);
  const [isListView, setIsListView] = useState(false);
  const pageRef = useRef(null);
  const resultsRef = useRef(null);
  const gridRef = useRef(null);
  const paginationRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadModules = async () => {
      try {
        const response = await fetch(
          `${get_base_url()}/api/available_modules`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Unable to load modules (${response.status})`);
        }

        const modules = await response.json();
        if (!Array.isArray(modules)) {
          throw new Error("The modules response is not a list");
        }

        setModuleRecords(modules);
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

  const modules = useMemo(
    () => groupModuleRecords(moduleRecords),
    [moduleRecords]
  );

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

    return modules.filter((module) => {
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
  }, [compiler, moduleType, modules, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredModules.length / gridCapacity)
  );
  const firstVisibleIndex = (currentPage - 1) * gridCapacity;
  const visibleModules = filteredModules.slice(
    firstVisibleIndex,
    firstVisibleIndex + gridCapacity
  );

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
      setIsListView(
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
  }, [filteredModules.length, isListView, loadState, totalPages > 1]);

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

  return (
    <div
      ref={pageRef}
      className="flex h-full min-h-0 w-full flex-col gap-2 overflow-auto p-3 theme-surface theme-text-primary sm:p-4"
    >
        <header className="flex shrink-0 flex-col gap-0.5 rounded-lg border theme-border theme-surface px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:gap-3">
          <h1 className="text-card-15 font-bold theme-text-primary">
            Software Modules
          </h1>
          <span
            aria-hidden="true"
            className="hidden h-4 w-px theme-surface-hover sm:block"
          />
          <p className="text-card-12 theme-text-secondary">
            Browse available software modules on the cluster.
          </p>
        </header>

        <section
          aria-labelledby="available-modules-heading"
          className="flex min-h-0 flex-1 flex-col gap-2"
        >
          <div className="flex items-center border-t theme-border pt-2">
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
          </div>

          <div
            aria-label="Module search and filters"
            className="grid shrink-0 gap-3 rounded-lg border theme-border theme-surface p-3 shadow-sm md:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_auto_auto]"
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
                className="non-draggable theme-input h-10 w-full rounded-md border py-2 pl-10 pr-3 text-card-14 outline-none"
              />
            </label>

            <label className="relative">
              <span className="sr-only">Filter by module type</span>
              <FiFilter
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 theme-text-muted"
              />
              <select
                value={moduleType}
                onChange={updateFilters(setModuleType)}
                className="non-draggable theme-input h-10 w-full rounded-md border py-2 pl-10 pr-8 text-card-14 outline-none xl:min-w-40"
              >
                <option value="all">All Types</option>
                <option value="module">Modules</option>
                <option value="extension">Extensions</option>
              </select>
            </label>

            <label>
              <span className="sr-only">Filter by compiler</span>
              <select
                value={compiler}
                onChange={updateFilters(setCompiler)}
                className="non-draggable theme-input h-10 w-full rounded-md border px-3 py-2 text-card-14 outline-none xl:min-w-44"
              >
                <option value="all">All Compilers</option>
                {compilerOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

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
                  isListView={isListView}
                />
                {totalPages > 1 && (
                  <nav
                    ref={paginationRef}
                    aria-label="Software module pages"
                    className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-2 py-4 theme-surface"
                  >
                    <button
                      type="button"
                      className="non-draggable rounded-md border theme-border theme-surface-hover px-4 py-2 text-card-14 font-medium theme-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>

                    {paginationPages.map((page) => (
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
                      className="non-draggable rounded-md border theme-border theme-surface-hover px-4 py-2 text-card-14 font-medium theme-text-primary disabled:cursor-not-allowed disabled:opacity-50"
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
    </div>
  );
};

export default SoftwareModulesPage;

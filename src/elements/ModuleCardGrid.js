import React from "react";
import ModuleCard from "./ModuleCard";

const ModuleCardGrid = ({
  modules,
  gridRef,
  isCompactMode = false,
  onSelectModule,
}) => (
  <div
    ref={gridRef}
    className={
      isCompactMode
        ? "grid min-w-0 grid-cols-1 overflow-hidden rounded-md border theme-border theme-surface shadow-sm"
        : "grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    }
  >
    {modules.map((module) => (
      <ModuleCard
        key={module.fullName}
        {...module}
        isCompactMode={isCompactMode}
        onSelect={() => onSelectModule?.(module.name)}
      />
    ))}
  </div>
);

export default ModuleCardGrid;

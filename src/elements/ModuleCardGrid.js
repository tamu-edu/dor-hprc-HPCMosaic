import React from "react";
import ModuleCard from "./ModuleCard";

const ModuleCardGrid = ({
  modules,
  gridRef,
  isListView = false,
  onSelectModule,
}) => (
  <div
    ref={gridRef}
    className={
      isListView
        ? "grid min-w-0 grid-cols-1 gap-2"
        : "grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    }
  >
    {modules.map((module) => (
      <ModuleCard
        key={module.fullName}
        {...module}
        isListView={isListView}
        onSelect={() => onSelectModule?.(module.name)}
      />
    ))}
  </div>
);

export default ModuleCardGrid;

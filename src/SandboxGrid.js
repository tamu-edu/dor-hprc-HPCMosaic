import React from "react";
import PlaceHolder from "./Components/PlaceHolder";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

function SandboxGrid({ setRunTour }) {
  return (
    <div className="dashboard-grid">
      <DndProvider backend={HTML5Backend}>
        <PlaceHolder setRunTour={setRunTour} />
      </DndProvider>
    </div>
  );
}

export default SandboxGrid;

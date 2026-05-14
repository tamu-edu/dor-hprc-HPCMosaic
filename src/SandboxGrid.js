import React from "react";
import Banner from "./framework/Banner";
//import { DndProvider } from "react-dnd";
//import { HTML5Backend } from "react-dnd-html5-backend";

function SandboxGrid({ setRunTour }) {
  return (
    <div className="dashboard-grid">
      <Banner setRunTour={setRunTour} />
    </div>
  );
}

export default SandboxGrid;

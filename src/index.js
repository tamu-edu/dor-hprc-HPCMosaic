import React from "react";
import ReactDOM from "react-dom";
import AddRemoveLayout from "./dashboard_elements/AddRemoveLayout"; // Adjust the path as needed
import './style.css';

function App() {
  const handleLayoutChange = (layout) => {
    console.log("Layout changed:", layout);
  };

  return (
    <div>
      <h1 className="font-bold">Welcome to the Grid Layout Example</h1>
      <AddRemoveLayout onLayoutChange={handleLayoutChange} />
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));

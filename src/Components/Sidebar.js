import React from "react";
import CardConfig from "./CardConfig";

const Sidebar = () => {
  const list = Object.keys(CardConfig);
  
  return (
    <div className="relative w-full max-h-[40vh] overflow-y-auto pt-2 pb-4">
      <div className="w-full max-w-6xl rounded-md flex flex-col space-y-4 mx-auto px-4">
        <div className="grid grid-cols-3 gap-6 w-full justify-items-center pt-6">
          {list.map((name, id) => {
            const { cardComponent: CardComponent } = CardConfig[name];
            return <CardComponent key={id} />;
          })}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
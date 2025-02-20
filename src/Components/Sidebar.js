import React from "react";
import CardConfig from "./CardConfig";

const Sidebar = () => {
    const list = Object.keys(CardConfig);

    return (
        <div className="flex justify-center items-center w-full">
            <div className="w-full max-w-6xl rounded-md flex flex-col space-y-4 mx-auto">
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4 w-full justify-items-center">
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

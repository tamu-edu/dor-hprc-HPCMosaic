import React from 'react';

import BarCard from '../Cards/BarCard';
import LineCard from '../Cards/LineCard';
import PieCard from '../Cards/PieCard';
import NodeUtilizationCard from '../Cards/NodeUtilizationCard';
import PyVenvManagerCard from '../Cards/PyVenvManagerCard';

const Sidebar = () => {
    const list = [
        { name: "Line", id: 1 },
        { name: "Bar", id: 2 },
        { name: "Pie", id: 3 },
        { name: "Node Utilization", id: 4 },
        { name: "PyVenvManager", id: 5 }
    ];

    return (
        <div className="w-full p-4 rounded-t-md flex flex-col items-start space-y-4">
            <div className="flex flex-row space-y-3 w-full">
                {list.map((ele) => {
                    switch (ele.name) {
                        case "Line":
                            return <LineCard key={ele.id} name={ele.name} _id={ele.id} />;
                        case "Bar":
                            return <BarCard key={ele.id} name={ele.name} _id={ele.id} />;
                        case "Pie":
                            return <PieCard key={ele.id} name={ele.name} _id={ele.id} />;
                        case "Node Utilization":
                            return <NodeUtilizationCard key={ele.id} name={ele.name} _id={ele.id} />;
                        case "PyVenvManager":
                            return <PyVenvManagerCard key={ele.id} name={ele.name} _id={ele.id} />;
                        default:
                            return null;
                    }
                })}
            </div>
        </div>
    );
};

export default Sidebar;

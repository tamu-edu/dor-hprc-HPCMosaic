import React, { useState, useEffect, useCallback } from 'react';
import RGL, { WidthProvider } from "react-grid-layout";
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { debounce } from 'lodash';

// Elements
import PyVenvManager from '../Charts/PyVenvManager';
import ClusterInfo from '../Charts/ClusterInfo';
import Chatbot from '../Charts/Chatbot';

const ReactGridLayout = WidthProvider(RGL);

const Content = ({ change, loadDefaultView, layoutData }) => {
    const [row, setRow] = useState([]);
    const [layout, setLayout] = useState([]);

    // Effect to update the layout when `layoutData` changes
    useEffect(() => {
        if(layoutData){
            if (Array.isArray(layoutData[0]) && layoutData[0].length > 0) {
                setRow(layoutData[0]);
                setLayout(
                    layoutData[0].map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))
                );
                console.log("Updated layoutData in Content:", layoutData);
            } else {
                alert("Failed to load layout.");
                console.log("layoutData is not valid or empty:", layoutData);
            }
        }
    }, [layoutData]);

    // Effect to load the default view on initial render
    useEffect(() => {
        if (loadDefaultView) {
            const defaultView = loadDefaultView();
            setRow(defaultView);
            setLayout(defaultView.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })));
            change(defaultView); // Notify the parent about the loaded default view
        }

    }, []);

    const onLayoutChange = (newLayout) => {
        setLayout(newLayout);
    };

    const debouncedChange = useCallback(
        debounce((newRow) => {
            change(newRow);
        }, 100),
        [change]
    );

    useEffect(() => {
        debouncedChange(row);
    }, [row, debouncedChange]);

    const renderChart = (ele, index) => {
        switch (ele.name) {
            case "Node Utilization":
                return <ClusterInfo />;
            case "PyVenvManager":
                return <PyVenvManager />;
            case "Chatbot":
                return <Chatbot />;
            default:
                return <div className="text-center text-red-500">Unknown Chart</div>;
        }
    };

    return (
        <div className="max-w-full h-auto p-4">
            <ReactGridLayout
                layout={layout}
                onLayoutChange={onLayoutChange}
                cols={4}
                isBounded={false}
                isDroppable={true}
                isResizable={true}
                isDraggable={true}
                preventCollision={true}
                compactType={null}
                autoSize={true}
                className="bg-white rounded-lg"
            >
                {row.map((ele, index) => (
                    <div
                        key={index}
                        data-grid={ele}
                        className="bg-white shadow-lg rounded-md p-4 border border-gray-300 relative h-full w-full"
                    >
                        <div className="h-full w-full">{renderChart(ele, index)}</div>
                    </div>
                ))}
            </ReactGridLayout>
        </div>
    );
};

export default Content;

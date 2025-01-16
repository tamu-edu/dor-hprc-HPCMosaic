import React, { useState, useEffect, useCallback } from 'react';
import { ItemTypes } from './ItemTypes';
import { useDrop } from 'react-dnd';
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
        if (layoutData) {
            setRow(layoutData);
            setLayout(layoutData.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })));
            console.log("Layout data updated in Content:", layoutData);
        }
    }, [layoutData]);

    const onLayoutChange = (newLayout) => {
        setLayout(newLayout);
    };

    const onResize = (layouts) => {
        setLayout(layouts);
    };

    const [{ isOver }, drop] = useDrop({
        accept: ItemTypes.CARD,
        drop: (item) => {
            const width = item.name === "Node Utilization" ? 2 : 1;
            const height = item.name === "Node Utilization" ? 3 : 1;

            const newItem = {
                name: item.name,
                id: item.id,
                i: `${row.length}`,
                x: row.length % 4,
                y: Math.floor(row.length / 4),
                w: width,
                h: height,
            };

            setRow([...row, newItem]);
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    });

    // Debounce the props.change function to avoid updating state during render
    const debouncedChange = useCallback(
        debounce((newRow) => {
            change(newRow);
        }, 100),
        [change]
    );

    // Call debouncedChange only after row has been updated
    useEffect(() => {
        debouncedChange(row);
    }, [row, debouncedChange]);

    // Effect to load the default view on initial render
    useEffect(() => {
        if (loadDefaultView) {
            const defaultView = loadDefaultView();
            setRow(defaultView);
            setLayout(defaultView.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })));
            change(defaultView); // Notify the parent about the loaded default view
        }

    }, []);

    // Function to remove an element by index
    const removeElement = (index) => {
        const newRow = row.filter((_, i) => i !== index);
        setRow(newRow);
    };

    // Helper function to render the correct chart component based on `ele.name`
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
        <div
            ref={drop}
            className={`max-w-full h-auto p-4 ${isOver ? 'bg-gray-100' : ''}`}
        >
            <ReactGridLayout
                layout={layout}
                onLayoutChange={onLayoutChange}
                onResize={onResize}
                width={"100%"}
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
                        <button
                            onClick={() => removeElement(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full text-xs"
                        >
                            Remove
                        </button>
                        <div className="h-full w-full">{renderChart(ele, index)}</div>
                    </div>
                ))}
            </ReactGridLayout>
        </div>
    );
};

export default Content;

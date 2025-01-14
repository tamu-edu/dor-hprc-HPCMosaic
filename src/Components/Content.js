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

const Content = (props) => {
    const [row, setRow] = useState([]);
    const [layout, setLayout] = useState([]);

    const onLayoutChange = (newLayout) => {
        setLayout(newLayout);
    };

    const onResize = (layouts) => {
        setLayout(layouts);
    };

    const [{ isOver }, drop] = useDrop({
        accept: ItemTypes.CARD,
        drop: (item) => {
            // Dynamically set width and height based on item properties
            const width = item.name === "Node Utilization" ? 2 : 1;  // Example: wider width for Node Utilization
            const height = item.name === "Node Utilization" ? 3 : 1; // Example: taller height for Node Utilization
            
            const newItem = { 
                name: item.name, 
                id: item.id, 
                i: `${row.length}`, 
                x: row.length % 4, 
                y: Math.floor(row.length / 4), 
                w: width, 
                h: height 
            };
            
            setRow([...row, newItem]);
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    });    

    // Debounce the props.change function to avoid updating state during render
    const debouncedChange = useCallback(debounce((newRow) => {
        props.change(newRow);
    }, 100), [props]);

    // Call debouncedChange only after row has been updated
    useEffect(() => {
        debouncedChange(row);
    }, [row, debouncedChange]);

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
                return <PyVenvManager/>;
            case "Chatbot":
                return <Chatbot/>;
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
                width={"100%"}  // Ensures grid layout takes full container width
                cols={4}        // Adjust columns to fit your layout needs
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
                        <div className="h-full w-full">  {/* Ensures the child component expands to full height/width */}
                            {renderChart(ele, index)}
                        </div>
                    </div>
                ))}
            </ReactGridLayout>
        </div>
    );
};

export default Content;

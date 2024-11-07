import React, { useState, useEffect, useCallback } from 'react';
import { ItemTypes } from './ItemTypes';
import { useDrop } from 'react-dnd';
import LineChart from '../Charts/LineChart';
import BarChart from '../Charts/BarChart';
import PieChart from '../Charts/PieChart';
import NodeUtilization from '../Charts/NodeUtilization';
import RGL, { WidthProvider } from "react-grid-layout";
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { debounce } from 'lodash';

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
            const newItem = { 
                name: item.name, 
                id: item.id, 
                i: `${row.length}`, 
                x: row.length % 4, 
                y: Math.floor(row.length / 4), 
                w: 1, 
                h: 1 
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
            case "Line":
                return <LineChart factor={index + 1} />;
            case "Bar":
                return <BarChart />;
            case "Pie":
                return <PieChart />;
            case "NodeUtilization":
                return <NodeUtilization />;
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
                width={1000}
                isBounded={false}
                isDroppable={true}
                isResizable={true}
                isDraggable={true}
                preventCollision={true}
                compactType={null}
                className="bg-white rounded-lg"
            >
                {row.map((ele, index) => (
                    <div 
                        key={index} 
                        data-grid={ele} 
                        className="bg-white shadow-lg rounded-md p-4 border border-gray-300 relative"
                    >
                        <button 
                            onClick={() => removeElement(index)} 
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full text-xs"
                        >
                            Remove
                        </button>
                        {renderChart(ele, index)}
                    </div>
                ))}
            </ReactGridLayout>
        </div>
    );
};

export default Content;

import React, { useState, useEffect } from 'react';
import { MdViewQuilt, MdArrowDropDown } from "react-icons/md";
import { saveLayout, fetchLayouts, loadLayout } from './layoutUtils';

const LayoutUtility = ({ userData, saveLayoutData }) => {
    const [layouts, setLayouts] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    // Hardcoded default view
    const defaultView = [
        { name: "Node Utilization", id: "0", i: "0", x: 0, y: 0, w: 2, h: 3 },
        { name: "Chatbot", id: "1", i: "1", x: 1, y: 0, w: 1, h: 1 },
        { name: "PyVenvManager", id: "2", i: "2", x: 2, y: 0, w: 1, h: 1 },
    ];

    const openDropdown = () => {
        setIsOpen(!isOpen);
    };

    const saveCurrentLayout = async () => {
        if (!userData || Object.keys(userData).length === 0) {
            alert("No layout data to save!");
            return;
        }

        const layoutName = prompt("Enter a name for the layout:");
        if (layoutName) {
            try {
                await saveLayout(layoutName, userData); // Pass userData as the layout data
                alert(`Layout "${layoutName}" saved successfully!`);
                loadAvailableLayouts(); // Refresh the list of layouts
            } catch (error) {
                console.error("Error saving layout:", error);
                alert("Failed to save layout.");
            }
        }
    };

    const loadAvailableLayouts = async () => {
        try {
            const fetchedLayouts = await fetchLayouts();
            setLayouts(fetchedLayouts);
        } catch (error) {
            console.error("Error fetching layouts:", error);
        }
    };

    const loadSelectedLayout = async (layoutName) => {
        try {
            const layoutData = await loadLayout(layoutName);
            if (layoutData) {
                alert(`Loaded layout "${layoutName}"`);
                console.log("Loaded layout data:", layoutData);
            }
        } catch (error) {
            console.error("Error loading layout:", error);
            alert("Failed to load layout.");
        }
    };

    const loadDefaultView = () => {
        console.log("Default view loaded:", defaultView);
        alert("Default view loaded!");
    };

    useEffect(() => {
        loadAvailableLayouts(); // Load layouts on component mount
    }, []);

    return (
        <div className="relative inline-block">
            <button
                onClick={openDropdown}
                className="flex items-center px-5 py-2 bg-white border border-gray-300 rounded-lg shadow hover:bg-gray-100"
            >
                <MdViewQuilt className="text-3xl mr-2 text-gray-500" />
                <span className="font-semibold text-gray-700">Layout</span>
                <MdArrowDropDown className="text-2xl text-gray-500" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    <ul className="py-1">
                        {layouts.map((layoutName) => (
                            <li
                                key={layoutName}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => loadSelectedLayout(layoutName)}
                            >
                                {layoutName}
                            </li>
                        ))}
                        <li
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={saveCurrentLayout}
                        >
                            Save Current Layout
                        </li>
                        <li
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={loadDefaultView}
                        >
                            Load Default View
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default LayoutUtility;

import React, { useState } from "react";
import { MdViewQuilt, MdArrowDropDown, MdDelete, MdEdit } from "react-icons/md";
import config from "../../config.yml";

const LayoutUtility = ({ layouts, loadingLayouts, applyDefaultView, applySavedLayout, saveCurrentLayout, fetchLayouts }) => {
    const [isOpen, setIsOpen] = useState(false);
    const baseUrl = config.production.dashboard_url;

    const handleDelete = async (layoutName) => {
        const confirmDelete = window.confirm(`Are you sure you want to delete "${layoutName}"?`);
        if (!confirmDelete) return;

        try {
            const response = await fetch(`${baseUrl}/api/delete_layout`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ layout_name: layoutName }),
            });

            const data = await response.json();
            if (response.ok) {
                alert(`Layout "${layoutName}" deleted successfully!`);
                fetchLayouts(); // Refresh layout list
            } else {
                alert(`Failed to delete layout: ${data.error}`);
            }
        } catch (error) {
            console.error("Error deleting layout:", error);
            alert("An unexpected error occurred.");
        }
    };

    const handleRename = async (oldName) => {
        const newName = prompt(`Rename "${oldName}" to:`);
        if (!newName || newName === oldName) return;

        try {
            const response = await fetch(`${baseUrl}/api/rename_layout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ old_name: oldName, new_name: newName }),
            });

            const data = await response.json();
            if (response.ok) {
                alert(`Layout renamed to "${newName}" successfully!`);
                fetchLayouts(); // Refresh layout list
            } else {
                alert(`Failed to rename layout: ${data.error}`);
            }
        } catch (error) {
            console.error("Error renaming layout:", error);
            alert("An unexpected error occurred.");
        }
    };

    return (
        <div className="relative inline-block">
            <button
                onClick={() => !loadingLayouts && setIsOpen(!isOpen)}
                className={`flex items-center px-5 py-2 border rounded-lg shadow transition-all
                    ${loadingLayouts ? "bg-gray-200 cursor-not-allowed" : "bg-white hover:bg-gray-100"}
                `}
                disabled={loadingLayouts} // ✅ Disable button while loading
            >
                <MdViewQuilt className="text-3xl mr-2 text-gray-500" />
                <span className="font-semibold text-gray-700">
                    {loadingLayouts ? "Loading layouts..." : "Layout"}
                </span>
                <MdArrowDropDown className="text-2xl text-gray-500" />
            </button>

            {isOpen && !loadingLayouts && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    <ul className="py-1">
                        {layouts.length === 0 ? (
                            <li className="px-4 py-2 text-gray-500 text-center">No layouts available</li>
                        ) : (
                            layouts.map((layoutName) => (
                                <li key={layoutName} className="px-4 py-2 flex justify-between items-center hover:bg-gray-100 cursor-pointer transition-all">
                                    <span onClick={() => applySavedLayout(layoutName)}>{layoutName}</span>
                                    <div className="flex space-x-2">
                                        <button onClick={() => handleRename(layoutName)} className="text-blue-500 hover:text-blue-700">
                                            <MdEdit />
                                        </button>
                                        <button onClick={() => handleDelete(layoutName)} className="text-red-500 hover:text-red-700">
                                            <MdDelete />
                                        </button>
                                    </div>
                                </li>
                            ))
                        )}
                        <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-all" onClick={saveCurrentLayout}>
                            Save Current Layout
                        </li>
                        <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-all" onClick={applyDefaultView}>
                            Load Default View
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default LayoutUtility;

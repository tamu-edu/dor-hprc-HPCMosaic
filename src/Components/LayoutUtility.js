import React, { useState } from 'react';
import { MdViewQuilt, MdArrowDropDown } from "react-icons/md";

const LayoutUtility = ({ layouts, applyDefaultView, applySavedLayout, saveCurrentLayout }) => {
    const [isOpen, setIsOpen] = useState(false);

    const openDropdown = () => {
        setIsOpen(!isOpen);
    };

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
                                onClick={() => applySavedLayout(layoutName)} // Call parent handler
                            >
                                {layoutName}
                            </li>
                        ))}
                        <li
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={saveCurrentLayout} // Call save layout handler
                        >
                            Save Current Layout
                        </li>
                        <li
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={applyDefaultView} // Call default view handler
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

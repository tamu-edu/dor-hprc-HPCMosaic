import React, { useState } from 'react';
import Content from './Content';
import Sidebar from './Sidebar';
import { MdAddchart, MdViewQuilt, MdArrowDropDown } from "react-icons/md";
import HPRCLogo from './HPRCLogo';

const PlaceHolder = () => {
    const [userData, setUserData] = useState({});
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    const [isOpen, setIsOpen] = useState(false);

    const openDropdown = () => {
        setIsOpen(!isOpen);
    };

    const changeHandler = (index, data) => {
        setUserData({ ...userData, [index]: [...data] });
    };

    const save = () => {
        console.log(userData);
        alert("Find the JSON for the current dashboard design in the console log.");
    };

    const openPopup = () => {
        setIsPopupOpen(true);
    };

    const closePopup = () => {
        setIsPopupOpen(false);
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <div className="p-2 bg-white border-b border-gray-300 shadow-sm">
                <div className="flex justify-between w-full items-center space-x-3 pr-3">
                    <HPRCLogo/>
                    <h1 className="text-2xl font-semibold text-gray-800">Grace Dashboard</h1>
                    <div className="flex items-center space-x-3">
                        <button onClick={openPopup} className="flex items-center px-5 py-2 bg-white border border-gray-300 rounded-lg shadow hover:bg-gray-100">
                            <MdAddchart className="text-3xl mr-2 text-gray-500" />
                            <span className="font-semibold text-gray-700">Add Element</span>
                        </button>

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
                                        <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Option 1</li>
                                        <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Option 2</li>
                                        <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Option 3</li>
                                    </ul>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col p-6 transition-all ${isPopupOpen ? 'pb-64' : 'pb-4'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-700">My Dashboard</h2>
                    <div className="flex space-x-4">
                        
                    </div>
                </div>

                {/* Dashboard Content */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <Content change={(data) => { changeHandler(0, data); }} />
                </div>
            </div>

            {/* Sidebar Popup */}
            {isPopupOpen && (
                <div>
                    <div className="fixed bottom-0 left-0 w-full bg-white shadow-lg p-6 rounded-t-md z-50 border-t border-gray-300">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-semibold text-gray-700">Add Elements</h3>
                            <button onClick={closePopup} className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600">
                                Close
                            </button>
                        </div>
                        <Sidebar /> {/* Sidebar items for dragging */}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlaceHolder;

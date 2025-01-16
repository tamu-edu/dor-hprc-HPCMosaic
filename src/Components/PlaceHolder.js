import React, { useState } from 'react';
import Content from './Content';
import Sidebar from './Sidebar';
import { MdAddchart, MdOutlineQuestionAnswer } from "react-icons/md";
import HPRCLogo from './HPRCLogo';
import LayoutUtility from './LayoutUtility';

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
            <div className="p-2 rounded-md bg-white border-b border-gray-300 shadow-sm">
                <div className="flex justify-between w-full items-center space-x-3 pr-3">
                    <HPRCLogo />
                    <h1 className="text-2xl font-semibold text-gray-800">Grace Dashboard</h1>
                    <div className="flex items-center space-x-3">

                        {/* Add Element Utility */}
                        <button onClick={openPopup} className="flex items-center px-5 py-2 bg-white border border-gray-300 rounded-lg shadow hover:bg-gray-100">
                            <MdAddchart className="text-3xl mr-2 text-gray-500" />
                            <span className="font-semibold text-gray-700">Add Element</span>
                        </button>

                        {/* Pass userData and save logic as props */}
                        <LayoutUtility userData={userData} saveLayoutData={save} />

                        {/* Help Form Utility */}
                        <button className="flex items-center px-5 py-2 bg-white border border-gray-300 rounded-lg shadow hover:bg-gray-100">
                            <MdOutlineQuestionAnswer className="text-3xl mr-2 text-gray-500" />
                            <span className="font-semibold text-gray-700">Request Help</span>
                        </button>

                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col p-6 transition-all ${isPopupOpen ? 'pb-64' : 'pb-4'}`}>
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <Content 
                    change={(data) => { changeHandler(0, data); }} 
                    loadDefaultView={() => [
                        { name: "Node Utilization", id: "0", i: "0", x: 0, y: 0, w: 2, h: 3 },
                        { name: "Chatbot", id: "1", i: "1", x: 1, y: 0, w: 1, h: 1 },
                        { name: "PyVenvManager", id: "2", i: "2", x: 2, y: 0, w: 1, h: 1 },
                    ]}
                />
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

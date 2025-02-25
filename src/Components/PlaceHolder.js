import React, { useState, useEffect } from "react";
import Content from "./Content";
import Sidebar from "./Sidebar";
import { MdAddchart, MdOutlineQuestionAnswer, MdPlayCircleOutline, MdFeedback } from "react-icons/md";
import { Toaster, toast } from "react-hot-toast"; // ✅ Import react-hot-toast
import HPRCLogo from "./HPRCLogo";
import config from "../../config.yml";
import LayoutUtility from "./LayoutUtility";
import { saveLayout, fetchLayouts, loadLayout } from './layoutUtils';

const PlaceHolder = ({ setRunTour }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [layoutData, setLayoutData] = useState(null);
  const [layouts, setLayouts] = useState([]);
  const clusterName = config.development.cluster_name;
  const [userData, setUserData] = useState({});

  useEffect(() => {
    console.log("Current layout data in PlaceHolder:", layoutData);
  }, [layoutData]);

  useEffect(() => {
    const loadAvailableLayouts = async () => {
      try {
        const fetchedLayouts = await fetchLayouts();
        setLayouts(fetchedLayouts);
      } catch (error) {
        console.error("Error fetching layouts:", error);
      }
    };
    loadAvailableLayouts();
  }, []);

  useEffect(() => {
    const hasSeenTourPrompt = localStorage.getItem("hasSeenTourPrompt");
    if (!hasSeenTourPrompt) {
      // ✅ Show toast notification
      toast(
        (t) => (
          <div className="flex items-center space-x-3">
            <MdPlayCircleOutline className="text-xl text-blue-600" />
            <span className="text-gray-800">New here? Take a quick tour!</span>
            <button
              onClick={() => {
                setRunTour(true);
                localStorage.setItem("hasSeenTourPrompt", "true");
                toast.dismiss(t.id);
              }}
              className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600"
            >
              Start
            </button>
          </div>
        ),
        {
          duration: 8000, // ✅ Toast disappears after 8 seconds
          position: "top-right",
          className: "bg-white border border-gray-300 shadow-lg p-4 rounded-lg",
          closeOnClick: true,
        }
      );
    }
  }, [setRunTour]);

  const changeHandler = (index, data) => {
    setUserData({ ...userData, [index]: [...data] });
  };

  const saveCurrentLayout = async () => {
    if (!userData || Object.keys(userData).length === 0) {
      alert("No layout data to save!");
      return;
    }

    const layoutName = prompt("Enter a name for the layout:");
    if (layoutName) {
      try {
        await saveLayout(layoutName, userData);
        alert(`Layout "${layoutName}" saved successfully!`);
        setLayouts((prev) => [...prev, layoutName]);
      } catch (error) {
        console.error("Error saving layout:", error);
        alert("Failed to save layout.");
      }
    }
  };

  const applyDefaultView = () => {
    const defaultView = [
        { name: "Node Utilization", id: "0", i: "0", x: 0, y: 0, w: 2, h: 3 },
        { name: "Chatbot", id: "1", i: "1", x: 1, y: 0, w: 1, h: 1 },
        { name: "PyVenvManager", id: "2", i: "2", x: 2, y: 0, w: 1, h: 1 },
    ];
    setLayoutData(defaultView);
  };

  const applySavedLayout = async (layoutName) => {
    try {
        const layoutData = await loadLayout(layoutName);
        setLayoutData(layoutData); // Set the saved layout data
        alert(`Loaded layout "${layoutName}"`);
        console.log(layoutData);
    } catch (error) {
        console.error("Error loading layout:", error);
        alert("Failed to load layout.");
    }
  };

  const openPopup = () => {
    setIsPopupOpen(true);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 🔥 Toast Notifications */}
      <Toaster position="top-right" />

      {/* Header */}
      <div className="p-2 rounded-md bg-white border-b border-gray-300 shadow-sm">
        <div className="flex justify-between w-full items-center space-x-3 pr-3">
          <HPRCLogo />
          <h1 className="text-2xl font-semibold text-gray-800">
            {`${clusterName.charAt(0).toUpperCase()}${clusterName.slice(1).toLowerCase()} Dashboard`}
          </h1>
          <div className="flex items-center space-x-3">

            {/* Add Element Button */}
            <button
              onClick={openPopup}
              className="add-element-btn flex items-center px-5 py-2 bg-white border border-gray-300 rounded-lg shadow hover:bg-gray-100"
            >
              <MdAddchart className="text-3xl mr-2 text-gray-500" />
              <span className="font-semibold text-gray-700">Add Element</span>
            </button>

            {/* Layout Utility - COMMENTED OUT FOR NOW */}
            <LayoutUtility
                layouts={layouts} // Pass available layouts
                applyDefaultView={applyDefaultView} // Pass default view handler
                applySavedLayout={applySavedLayout} // Pass saved layout handler
                saveCurrentLayout={saveCurrentLayout} // Pass save layout handler
            />

            {/* Help Button */}
            <button
              className="request-help-btn flex items-center px-5 py-2 bg-white border border-gray-300 rounded-lg shadow hover:bg-gray-100"
            >
              <MdOutlineQuestionAnswer className="text-3xl mr-2 text-gray-500" />
              <span className="font-semibold text-gray-700">Request Help</span>
            </button>

            {/* Start Tour Button */}
            <button
              onClick={() => setRunTour(true)}
              className="start-tour-btn flex items-center px-5 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
            >
              <MdPlayCircleOutline className="text-3xl mr-2" />
              <span className="font-semibold">Start Tour</span>
            </button>

            {/* Feedback Button */}
            <a href={null} target="_blank" rel="noopener noreferrer" className="feedback-btn">
              <button className="flex items-center px-5 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600">
                <MdFeedback className="text-3xl mr-2" />
                <span className="font-semibold">Give Feedback</span>
              </button>
            </a>

          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col mt-6 transition-all ${isPopupOpen ? 'pb-64' : 'pb-4'}`}>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <Content 
            change={(data) => changeHandler(0, data)}
          />
        </div>
      </div>

      {/* Sidebar Popup */}
      {isPopupOpen && (
        <div>
          <div className="fixed bottom-0 left-0 w-full bg-white shadow-lg p-6 rounded-t-md z-50 border-t border-gray-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold">Add Elements</h3>
              <button
                onClick={closePopup}
                className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600"
              >
                Close
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaceHolder;

import React, { useState, useEffect, useRef } from "react";
import Content from "./Content";
import Sidebar from "./Sidebar";
import { MdAddchart, MdOutlineQuestionAnswer, MdPlayCircleOutline, MdFeedback, MdClose, MdMaximize, MdMinimize } from "react-icons/md";
import { Toaster, toast } from "react-hot-toast";
import HPRCLogo from "./HPRCLogo";
import config from "../../config.yml";
import LayoutUtility from "./LayoutUtility";
import { saveLayout, fetchLayouts, loadLayout } from './layoutUtils';
import { v4 as uuidv4 } from "uuid";
import PopupForm from '../composer/PopupForm'; // Import PopupForm directly
import helpRequestSchema from '../composer/schemas/helpRequest.json'; // Import the schema directly
import { useChatbotVisibility } from "../Components/ChatbotVisibilityContext";

const PlaceHolder = ({ setRunTour }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [sidebarMaximized, setSidebarMaximized] = useState(false);
  const [layoutData, setLayoutData] = useState(null);
  const [layouts, setLayouts] = useState([]);
  const clusterName = config.development.cluster_name;
  const [userData, setUserData] = useState({});
  const [loadingLayouts, setLoadingLayouts] = useState(true);

  const { hideChatbot, showChatbot } = useChatbotVisibility();
  
  // Update openPopup to hide chatbot when sidebar opens
  const openPopup = () => {
    setIsPopupOpen(true);
    hideChatbot(); // Hide chatbot when sidebar opens
  };
  
  // Update closePopup to show chatbot when sidebar closes
  const closePopup = () => {
    setIsPopupOpen(false);
    setSidebarMaximized(false);
    showChatbot(); // Show chatbot when sidebar closes
  };

  // Create a ref for the sidebar to help with animations
  const sidebarRef = useRef(null);

  // Handle help request form submission
  const handleHelpSubmit = async (formData) => {
    console.log('Help request submitted:', formData);
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }
    
    // Show success message
    toast.success("Help request submitted successfully!");
  };

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
      } finally {
        setLoadingLayouts(false);
      }
    };
    loadAvailableLayouts();
  }, []);

  useEffect(() => {
    const hasSeenTourPrompt = localStorage.getItem("hasSeenTourPrompt");
    if (!hasSeenTourPrompt) {
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
          duration: 8000,
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

  let getLatestLayoutRef = useRef(() => []);

  const saveCurrentLayout = async () => {
    const latestLayout = getLatestLayoutRef.current();

    if (!latestLayout || latestLayout.length === 0) {
      toast.error("No layout data to save!");
      return null;
    }

    const currentLayoutData = layoutData || [];

    if (!Array.isArray(currentLayoutData)) {
      console.error("❌ layoutData is not an array or is null", layoutData);
      toast.error("Error: No valid layout data available to save.");
      return null;
    }

    const enrichedLayout = latestLayout.map((item) => {
      const originalItem = currentLayoutData.find((orig) => orig.i === item.i);

      return {
        ...item,
        name: originalItem ? originalItem.name : "Unnamed",
      };
    });

    const layoutName = prompt("Enter a name for the layout:");
    if (layoutName) {
      try {
        await saveLayout(layoutName, enrichedLayout);
        toast.success(`Layout "${layoutName}" saved successfully!`);

        setLayouts((prev) => [...prev, layoutName]);

        return { success: true, layoutName };
      } catch (error) {
        console.error("Error saving layout:", error);
        toast.error("Failed to save layout.");
        return null;
      }
    }
    return null;
  };

  const applyDefaultView = () => {
    const userConfirmed = window.confirm("Are you sure you want to apply the default layout? This will remove all changes.");
    if (!userConfirmed) return;

    const defaultView = [
      { name: "Accounts", i: uuidv4(), x: 0, y: 0, w: 10, h: 10 },
      { name: "Node Utilization", i: uuidv4(), x: 0, y: 6, w: 5, h: 18 },
      { name: "PyVenvManager", i: uuidv4(), x: 5, y: 5, w: 5, h: 20 },
      { name: "Quota Info", i: uuidv4(), x: 0, y: 18, w: 5, h: 18 },
      { name: "User Groups", i: uuidv4(), x: 5, y: 16, w: 5, h: 18 },
      { name: "User Jobs", i: uuidv4(), x: 5, y: 20, w: 5, h: 10 },
    ];

    console.log("Applying Default View:", defaultView);
    setLayoutData([...defaultView]);

    toast.success("Applied default layout!");
  };


  const applySavedLayout = async (layoutName) => {
    try {
      const fetchedLayout = await loadLayout(layoutName);
      if (fetchedLayout && Array.isArray(fetchedLayout[0])) {
        setLayoutData(fetchedLayout[0]);
        toast.success(`Loaded layout "${layoutName}"`);
      } else {
        console.warn("Invalid layout format received:", fetchedLayout);
        toast.error("Failed to load layout.");
      }
    } catch (error) {
      console.error("Error loading layout:", error);
      toast.error("Failed to load layout.");
    }
  };
  
  // Toggle sidebar between default and maximized height
  const toggleSidebarSize = () => {
    setSidebarMaximized(!sidebarMaximized);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toast Notifications */}
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
              className="add-element-btn flex items-center px-5 py-2 bg-white border border-gray-300 rounded-lg shadow hover:bg-gray-100 transition-colors"
            >
              <MdAddchart className="text-3xl mr-2 text-gray-500" />
              <span className="font-semibold text-gray-700">Add Element</span>
            </button>

            {/* Layout Utility */}
            <LayoutUtility
              layouts={layouts}
              setLayouts={setLayouts}
              applyDefaultView={applyDefaultView}
              applySavedLayout={applySavedLayout}
              saveCurrentLayout={saveCurrentLayout}
              loadingLayouts={loadingLayouts}
              fetchLayouts={fetchLayouts}
            />

            {/* Help Button - Using PopupForm directly */}
            <div className="request-help-container">
              <PopupForm
                buttonText={
                  <div className="flex items-center">
                    <MdOutlineQuestionAnswer className="text-3xl mr-2 text-gray-500" />
                    <span className="font-semibold text-gray-700">Request Help</span>
                  </div>
                }
                schema={helpRequestSchema}
                onSubmit={handleHelpSubmit}
                title="Help Request"
                disclaimerText={[]}
                buttonStyle={{
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  padding: '8px 20px',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  width: 'auto',
                }}
                errorMessage="Please fill out all required fields."
              />
            </div>

            {/* Start Tour Button */}
            <button
              onClick={() => setRunTour(true)}
              className="start-tour-btn flex items-center px-5 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition-colors"
            >
              <MdPlayCircleOutline className="text-3xl mr-2" />
              <span className="font-semibold">Start Tour</span>
            </button>

            {/* Feedback Button */}
            <a href={null} target="_blank" rel="noopener noreferrer" className="feedback-btn">
              <button className="flex items-center px-5 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition-colors">
                <MdFeedback className="text-3xl mr-2" />
                <span className="font-semibold">Give Feedback</span>
              </button>
            </a>

          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col mt-6 transition-all ${isPopupOpen ? 'pb-64' : 'pb-4'}`}>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mx-4">
          <Content
            change={(data) => changeHandler(0, data)}
            layoutData={layoutData} setLayoutData={setLayoutData}
            getLatestLayout={(fn) => (getLatestLayoutRef.current = fn)}
          />
        </div>
      </div>

      {/* Enhanced Sidebar Popup with fixed button alignment */}
      {isPopupOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-end justify-center pointer-events-none">
          <div
            ref={sidebarRef}
            className={`w-full pointer-events-auto bg-white shadow-2xl rounded-t-xl border-t border-gray-300 transition-all duration-300 ease-in-out transform ${sidebarMaximized ? 'h-[80vh]' : 'max-h-[40vh]'
              }`}
          >
            {/* Fixed: Sidebar Header with properly aligned controls */}
            <div className="sticky top-0 z-10 flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white rounded-t-xl">
              <h3 className="text-2xl font-semibold text-gray-800 flex items-center">
                <MdAddchart className="text-blue-500 mr-2" />
                Add Dashboard Elements
              </h3>
              <div className="flex items-center space-x-3"> {/* Fixed: Increased space between buttons */}
                <button
                  onClick={toggleSidebarSize}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  title={sidebarMaximized ? "Minimize panel" : "Maximize panel"}
                >
                  {sidebarMaximized ? <MdMinimize className="text-xl" /> : <MdMaximize className="text-xl" />}
                </button>
                <button
                  onClick={closePopup}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Close panel"
                >
                  <MdClose className="text-xl" />
                </button>
              </div>
            </div>

            {/* Sidebar Content */}
            <div className={`${sidebarMaximized ? 'h-[calc(80vh-64px)]' : 'h-[calc(40vh-64px)]'} transition-all duration-300`}>
              <Sidebar />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaceHolder;
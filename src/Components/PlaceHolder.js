import React, { useState, useEffect, useRef } from "react";
import Content from "./Content";
import Sidebar from "./Sidebar";
import { MdAddchart, MdOutlineQuestionAnswer, MdPlayCircleOutline, MdFeedback } from "react-icons/md";
import { Toaster, toast } from "react-hot-toast"; // ✅ Import react-hot-toast
import HPRCLogo from "./HPRCLogo";
import config from "../../config.yml";
import LayoutUtility from "./LayoutUtility";
import { saveLayout, fetchLayouts, loadLayout } from './layoutUtils';
import { v4 as uuidv4 } from "uuid"; // For unique IDs

const PlaceHolder = ({ setRunTour }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [layoutData, setLayoutData] = useState(null);
  const [layouts, setLayouts] = useState([]);
  const clusterName = config.development.cluster_name;
  const [userData, setUserData] = useState({});
  const [loadingLayouts, setLoadingLayouts] = useState(true); // ✅ Track loading state

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
        setLoadingLayouts(false); // ✅ Stop loading when fetching is complete
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

  let getLatestLayoutRef = useRef(() => []);

  const saveCurrentLayout = async () => {
    // Get the latest layout from ReactGridLayout
    const latestLayout = getLatestLayoutRef.current(); 

    console.log("🔹 Latest layout from getLatestLayoutRef:", latestLayout);

    if (!latestLayout || latestLayout.length === 0) {
        toast.error("No layout data to save!");
        return null;
    }

    // Ensure `layoutData` is available and an array
    const currentLayoutData = layoutData || []; // Fallback to empty array if null

    if (!Array.isArray(currentLayoutData)) {
        console.error("❌ layoutData is not an array or is null", layoutData);
        toast.error("Error: No valid layout data available to save.");
        return null;
    }

    // Create a proper mapping between layout items and original items with names
    const enrichedLayout = latestLayout.map((item) => {
        // Find the matching item in currentLayoutData that has the same "i" value
        const originalItem = currentLayoutData.find((orig) => orig.i === item.i);
        
        // If found, use its name, otherwise use "Unnamed"
        return {
            ...item,
            name: originalItem ? originalItem.name : "Unnamed",
        };
    });

    console.log("✅ Saving Enriched Layout:", enrichedLayout);

    const layoutName = prompt("Enter a name for the layout:");
    if (layoutName) {
        try {
            await saveLayout(layoutName, enrichedLayout);
            toast.success(`Layout "${layoutName}" saved successfully!`);
            
            // Update layouts list without a full refresh
            setLayouts((prev) => [...prev, layoutName]);
            
            // Return the layout name to allow LayoutUtility to update activeLayout
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
  
    // Ask user to confirm before applying default layout
    const userConfirmed = window.confirm("Are you sure you want to apply the default layout? This will remove all changes.");
    if (!userConfirmed) return;
  
    // Ask user if they want to save their current layout first
    // const saveFirst = window.confirm("Would you like to save your current layout before applying the default?");
    // if (saveFirst) {
    //   const layoutName = prompt("Enter a name for the layout:");
    //   if (layoutName) {
    //     saveLayout(layoutName, layoutData);
    //     toast.success(`Layout "${layoutName}" saved successfully!`);
    //     setLayouts((prev) => [...prev, layoutName]);
    //   } else {
    //     toast.warn("Layout save canceled.");
    //   }
    // }
  
    // Apply the default layout
    const defaultView = [
      { name: "Accounts", i: uuidv4(), x: 0, y: 0, w: 10, h: 10 },
      { name: "Node Utilization", i: uuidv4(), x: 0, y: 6, w: 5, h: 18 },
      { name: "PyVenvManager", i: uuidv4(), x: 5, y: 5, w: 5, h: 20 },
      { name: "Quota Info", i: uuidv4(), x: 0, y: 18, w: 5, h: 18 },
      { name: "User Groups", i: uuidv4(), x: 5, y: 16, w: 5, h: 18 },
      { name: "User Jobs", i: uuidv4(), x: 5, y: 20, w: 5, h: 10 },
    ];
  
    console.log("Applying Default View:", defaultView);
    setLayoutData([...defaultView]); // ✅ Ensures a new reference
  
    // ✅ Show success popup
    toast.success("Applied default layout!");
  };
  

  const applySavedLayout = async (layoutName) => {
    try {
      const fetchedLayout = await loadLayout(layoutName);
      if (fetchedLayout && Array.isArray(fetchedLayout[0])) {
        setLayoutData(fetchedLayout[0]); // ✅ Ensure correct data structure
        alert(`Loaded layout "${layoutName}"`);
      } else {
        console.warn("Invalid layout format received:", fetchedLayout);
        alert("Failed to load layout.");
      }
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

            {/* Layout Utility */}
            <LayoutUtility
                layouts={layouts} // Pass available layouts
                setLayouts={setLayouts} // Allow direct updates
                applyDefaultView={applyDefaultView} // Pass default view handler
                applySavedLayout={applySavedLayout} // Pass saved layout handler
                saveCurrentLayout={saveCurrentLayout} // Pass save layout handler
                loadingLayouts={loadingLayouts} // Pass loading state
                fetchLayouts={fetchLayouts}
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
            layoutData={layoutData} setLayoutData={setLayoutData}
            getLatestLayout={(fn) => (getLatestLayoutRef.current = fn)}
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
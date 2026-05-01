//Imports
import React, { useState, useEffect, useRef } from "react";
import { Menu, Transition } from '@headlessui/react';
import Joyride, { STATUS, ACTIONS } from 'react-joyride';
import { MdAddchart, MdOutlineQuestionAnswer, MdPlayCircleOutline, MdFeedback, MdClose, MdMaximize, MdMinimize, MdLock, MdLockOpen, MdPalette, MdCheck } from "react-icons/md";
import { Toaster, toast } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import { MdKeyboardArrowUp, MdKeyboardArrowDown, MdOutlineOpenInFull, MdOutlineCloseFullscreen, MdSettings, MdAddChart } from "react-icons/md";

//Context Imports
import { LayoutLockProvider } from '../context/LayoutLockContext';
import { useTheme } from '../context/ThemeContext';

//Component Imports
import ClusterLogo from "./ClusterLogo";
import Content from "./Content";
import Sidebar from "./Sidebar";
import LayoutUtility from "./LayoutUtility";
import HelpButton from "../elements/HelpButton";
import BannerBackground from "./BannerBackground";

import { saveLayout, fetchLayouts, loadLayout } from './layoutUtils';
import { useChatbotVisibility } from "./ChatbotVisibilityContext";
import config from "../../config.yml";


const Banner = ({ setRunTour }) => {
  // Tour state
  const [runTour, setRunTourState] = useState(false);
  
  // Other state variables
  const [layoutUtilityOpen, setLayoutUtilityOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [sidebarMaximized, setSidebarMaximized] = useState(false);
  const [layoutData, setLayoutData] = useState(null);
  const [layouts, setLayouts] = useState([]);
  const clusterName = config.development.cluster_name;
  const [userData, setUserData] = useState({});
  const [loadingLayouts, setLoadingLayouts] = useState(true);
  const [layoutLocked, setLayoutLocked] = useState(false);

  const { hideChatbot, showChatbot } = useChatbotVisibility();
  const { theme, themeName, setTheme, themes } = useTheme();
  const themeOptions = Object.entries(themes);
  const activeThemeLabel = theme.label || themeName;

  // Tour steps configuration
  const tourSteps = [
    {
      target: '.start-tour-btn',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Dashboard Tour</h3>
          <p>Welcome to the cluster dashboard! This quick tour will guide you through the main interactive elements.</p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: 'h1',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Cluster Dashboard</h3>
          <p>This is your central hub for monitoring and managing your cluster resources.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.add-element-btn',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Add Elements</h3>
          <p>Click here to add new widgets and charts to your dashboard.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.LayoutUtility',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Layout Settings</h3>
          <p>Save, load, and reset your dashboard layout from this menu.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.request-help-container',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Request Help</h3>
          <p>Need assistance? Click here to contact our support team.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.feedback-btn',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Feedback</h3>
          <p>Help us improve by providing your feedback through the Google form.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: 'body',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Tour Complete!</h3>
          <p>You're now ready to use the dashboard. You can restart this tour anytime by clicking the "Start Tour" button.</p>
        </div>
      ),
      placement: 'center',
    }
  ];

  // Handle tour callbacks
  const handleJoyrideCallback = (data) => {
    const { status, action } = data;
    
    // End the tour if it's completed, skipped, or closed
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status) || action === ACTIONS.CLOSE) {
      setRunTourState(false);
      localStorage.setItem("hasCompletedTour", "true");
    }
  };
  
  // Respond to external setRunTour prop changes (if needed)
  useEffect(() => {
    if (setRunTour === true) {
      setRunTourState(true);
    }
  }, [setRunTour]);
  
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
    //console.log("Current layout data in Banner:", layoutData);
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
    <div className="min-h-screen w-full flex flex-col theme-surface-alt overflow-x-hidden">
      {/* Tour Component */}
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous={true}
        scrollToFirstStep={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#3B82F6', // Blue to match your UI
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: '8px',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
          },
          buttonNext: {
            backgroundColor: '#3B82F6',
            fontSize: '14px',
          },
          buttonBack: {
            color: '#3B82F6',
            fontSize: '14px',
          },
          buttonSkip: {
            color: '#6B7280',
          }
        }}
        locale={{
          back: 'Previous',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip Tour'
        }}
      />
      
      {/* Toast Notifications */}
      <Toaster position="top-right" />

      {/* Header */}
      <BannerBackground>
	<div className="flex justify-between w-full h-full items-center space-x-3 pr-4">
	  
          {/*Logo*/}
    <div className="hidden md:flex bg-white rounded-l-md h-full w-[130px] items-center justify-center overflow-hidden">
      <ClusterLogo className="block w-[108px] h-[108px] object-contain" />
          </div>

	  {/*Dashboard Name*/}
          <div className="text-center flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              {clusterName.toUpperCase()} DASHBOARD
            </h1>
            <p className="text-sm md:text-base text-white/80 font-medium tracking-wider uppercase">
              Texas A&M University
            </p>
          </div>

          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Theme Selector */}
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button
                className="flex items-center justify-center px-3 py-2 theme-surface border theme-border rounded-lg shadow theme-hover-surface transition-all duration-200 min-w-[48px]"
                title={`Current theme: ${activeThemeLabel}`}
                aria-label="Select dashboard theme"
              >
                <MdPalette className="text-xl" style={{ color: theme.colors.iconActive }} />
                <span className="hidden lg:inline ml-2 font-semibold theme-text-secondary text-base whitespace-nowrap">
                  {activeThemeLabel}
                </span>
              </Menu.Button>

              <Transition
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-in"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                <Menu.Items className="absolute right-0 mt-2 w-44 origin-top-right theme-surface border theme-border rounded-md shadow-lg focus:outline-none z-50 py-1">
                  {themeOptions.map(([name, optionTheme]) => (
                    <Menu.Item key={name}>
                      {({ active }) => (
                        <button
                          type="button"
                          onClick={() => setTheme(name)}
                          className={`${themeName === name ? 'theme-selected' : active ? 'theme-surface-hover' : ''} flex w-full items-center justify-between px-4 py-2 text-sm text-left theme-text-secondary`}
                        >
                          <span>{optionTheme.label || name}</span>
                          {themeName === name && <MdCheck className="text-lg ml-3 flex-shrink-0" />}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </Menu.Items>
              </Transition>
            </Menu>
            
            {/* Settings Dropdown - Contains Add Element, Layout, Feedback */}
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className="flex items-center justify-center md:justify-start px-3 py-2 md:px-4 md:py-2 theme-surface border theme-border rounded-lg shadow theme-hover-surface transition-all duration-200 min-w-[48px] md:min-w-auto">
                <MdSettings className="text-xl theme-text-secondary md:mr-2 flex-shrink-0" />
                <span className="hidden md:inline font-semibold theme-text-secondary text-base whitespace-nowrap">Settings</span>
              </Menu.Button>  

	      <Transition
	        enter="transition duration-100 ease-out"
	        enterFrom="transform scale-95 opacity-0"
	        enterTo="transform scale-100 opacity-100"
	        leave="transition duration-75 ease-in"
	        leaveFrom="transform scale-100 opacity-100"
	        leaveTo="transform scale-95 opacity-0"
	      >

                <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right theme-surface border theme-border divide-y divide-gray-200 rounded-md shadow-lg focus:outline-none z-50">
	          <div className="py-1">

	            {/*Add Element Menu Option*/}
	            <Menu.Item>
	              {({ active }) => (
      <button onClick={openPopup}
        className={`${active ? 'theme-surface-hover' : ''} flex w-full px-4 py-2 text-sm text-left theme-text-secondary`}
			>
			  <MdAddchart className="text-lg mr-2" />
			  Add Dashboard Element
		        </button> )}
	            </Menu.Item>


 	            {/*Layout Utility*/}
	            <Menu.Item>
	              {({ active }) => (
      <button onClick={() => setLayoutUtilityOpen(!layoutUtilityOpen)} className={`${active ? 'theme-surface-hover' : ''} flex w-full px-4 py-2 text-sm text-left theme-text-secondary`}>

			  <MdAddchart className="text-lg mr-2" />
                          Layouts
			</button>	        
                      )}
	            </Menu.Item>

	          </div>
	        </Menu.Items>
	      </Transition>
            </Menu>
            

            {/* Help Button - Using HelpButton component directly */}
            <div className="request-help-container">
	      <HelpButton
                buttonStyle={{
                  backgroundColor: theme.colors.surfaceBg,
                  color: theme.colors.textSecondary,
                  border: `1px solid ${theme.colors.borderStrong}`,
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  padding: '0.5rem 0.75rem',
                  transition: 'all 0.2s ease-in-out',
                  minWidth: '48px',
                  '@media (min-width: 768px)': {
                    padding: '0.5rem 1rem',
                    minWidth: 'auto'
                  }
                }}
                buttonText={
                  <div className="flex items-center justify-center md:justify-start">
	            <MdOutlineQuestionAnswer className="text-xl md:mr-2 flex-shrink-0" style={{ color: theme.colors.icon }} />
                    <span className="hidden md:inline font-semibold text-base whitespace-nowrap" style={{ color: theme.colors.textSecondary }}>Get Help</span>
	          </div>
		}
	      />
            </div>  

            {/* Start Tour Button */}
	    {/*<button
              onClick={() => setRunTourState(true)}
              className="start-tour-btn flex items-center px-5 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition-colors"
            >
              <MdPlayCircleOutline className="text-3xl mr-2" />
              <span className="font-semibold">Start Tour</span>
            </button>
	    */}
         </div>
	</div>
      </BannerBackground>

      <LayoutUtility
        layouts={layouts}
        setLayouts={setLayouts}
        applyDefaultView={applyDefaultView}
        applySavedLayout={applySavedLayout}
        saveCurrentLayout={saveCurrentLayout}
        loadingLayouts={loadingLayouts}
        fetchLayouts={fetchLayouts}
        isOpen={layoutUtilityOpen}
        setIsOpen={setLayoutUtilityOpen}
      />

      <LayoutLockProvider layoutLocked={layoutLocked} setLayoutLocked={setLayoutLocked}>
        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col mt-5 transition-all ${isPopupOpen ? 'pb-64' : 'pb-4'}`}>
      <div className="theme-surface rounded-lg border theme-border shadow-sm mx-1">
              <Content
                change={(data) => changeHandler(0, data)}
                layoutData={layoutData} setLayoutData={setLayoutData}
                getLatestLayout={(fn) => (getLatestLayoutRef.current = fn)}
	        layoutLocked={layoutLocked}
              />
            </div>
        </div>
      </LayoutLockProvider>

      {/* Footer */}
      <footer className="mt-4 py-4 px-6 border-t theme-border text-sm theme-text-muted flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <span className="font-semibold theme-text-secondary">HPCMosaic Dashboard &mdash; Texas A&amp;M University</span>
          <span className="hidden sm:inline theme-text-muted">|</span>
          <span>Developed by the Fishbowl Student Helpdesk, HPRC</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="mailto:help@hprc.tamu.edu" className="theme-link hover:underline">help@hprc.tamu.edu</a>
          <a href="https://github.com/tamu-edu/dor-hprc-HPCMosaic" target="_blank" rel="noopener noreferrer" className="theme-link hover:underline">GitHub</a>
          <a href="https://github.com/tamu-edu/dor-hprc-HPCMosaic/graphs/contributors" target="_blank" rel="noopener noreferrer" className="theme-link hover:underline">Contributors</a>
          <a href="https://forms.gle/7RwxdFgXVamGVVss8" target="_blank" rel="noopener noreferrer" className="theme-link hover:underline flex items-center gap-1">
            <MdFeedback className="text-base mr-1" />
            Give Feedback
          </a>
        </div>
      </footer>

      {/* Development Disclaimer */}
      {/*
      <div className="mx-4 mt-3 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400 rounded-md shadow-sm">
        <div className="flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          
	  <div>
            <h3 className="font-semibold text-yellow-800 text-base mb-1">Development Notice</h3>
            <p className="text-yellow-700 text-sm leading-relaxed">
              This dashboard is currently in <span className="font-medium">active development</span>. Features may change or behave unexpectedly.
            </p>
            <p className="text-yellow-700 text-sm mt-2 font-medium">
              Your feedback will be used to guide the ongoing development of the dashboard.
            </p>
          </div>
        </div>
      </div>
      */}

      {isPopupOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-end justify-center pointer-events-none">
          <div
               ref={sidebarRef}
	       className={`w-full pointer-events-auto theme-surface shadow-2xl rounded-t-xl border-t theme-border transition-all duration-300 ease-in-out transform ${sidebarMaximized ? 'h-[80vh]' : 'max-h-[40vh]'
              }`}
              >
            {/* Improved Sidebar Header with better maximize/minimize button */}
	    <div className="sticky top-0 z-10 flex justify-between items-center px-6 py-4 border-b theme-border theme-surface rounded-t-xl">
	
              <h3 className="text-2xl font-semibold theme-text-primary flex items-center">
                <MdAddchart className="text-blue-500 mr-2" />
                Add Dashboard Elements
              </h3>
	      
	        
              <div className="flex items-center space-x-3"> 
                {/* Enhanced maximize/minimize button */}
                <button
                  onClick={toggleSidebarSize}
	                  className={`p-2 flex items-center theme-text-secondary theme-hover-surface rounded-md transition-colors ${sidebarMaximized ? 'theme-selected' : ''}`}
                  title={sidebarMaximized ? "Minimize panel" : "Maximize panel"}
                >
                  {sidebarMaximized ? (
                    <>
                      {/* Option 1: Arrow icons */}
                      <MdKeyboardArrowDown className="text-xl" />
                      <span className="ml-1 text-sm">Minimize</span>
                      
                      {/* Option 2: Full screen / close full screen icons 
                      <MdOutlineCloseFullscreen className="text-xl" />
                      <span className="ml-1 text-sm">Minimize</span>
                      */}
                    </>
                  ) : (
                    <>
                      {/* Option 1: Arrow icons */}
                      <MdKeyboardArrowUp className="text-xl" />
                      <span className="ml-1 text-sm">Maximize</span>
                      
                      {/* Option 2: Full screen / close full screen icons 
                      <MdOutlineOpenInFull className="text-xl" />
                      <span className="ml-1 text-sm">Maximize</span>
                      */}
                    </>
                  )}
                </button>
                <button
                  onClick={closePopup}
	                  className="p-2 theme-text-secondary theme-hover-danger rounded-md transition-colors"
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
      
      <button
        onClick={() => {
	  setLayoutLocked(!layoutLocked);
	}}
	className={`fixed bottom-4 left-4 w-12 h-12 rounded-full shadow-lg flex items-center items-center justify-center transition-all duration-200 z-500 ${
	  layoutLocked
		    ? 'theme-button-caution'
		    : 'theme-surface theme-text-secondary theme-border'
		}`}
	title={layoutLocked ? 'Unlock Layout' : 'Lock Layout'}
      >
        {layoutLocked ? (
	  <MdLock className="text-xl" />
	) : (
	  <MdLockOpen className="text-xl" />
	)}
      </button>
    </div>
  );
};

export default Banner;

import React, { useState, useEffect } from "react";
import { MdViewQuilt, MdArrowDropDown, MdDelete, MdEdit, MdRefresh, MdCheck } from "react-icons/md";
import config from "../../config.yml";
import { toast } from "react-hot-toast";
import { fetchLayouts as fetchLayoutsUtil, deleteLayout as deleteLayoutUtil } from './layoutUtils';

const LayoutUtility = ({
  layouts, 
  loadingLayouts, 
  applyDefaultView, 
  applySavedLayout, 
  saveCurrentLayout, 
  fetchLayouts: parentFetchLayouts, // renamed to avoid confusion
  setLayouts, // add this prop to directly update layouts in parent
  isOpen,
  setIsOpen
}) => {
    const [activeLayout, setActiveLayout] = useState(null);
    const [actionInProgress, setActionInProgress] = useState(null);
    const [localLayouts, setLocalLayouts] = useState(layouts);
    const baseUrl = config.production.dashboard_url;

    // Update local layouts when parent layouts change
    useEffect(() => {
        setLocalLayouts(layouts);
    }, [layouts]);

    // Track which layout is currently active
    const markLayoutActive = (layoutName) => {
        setActiveLayout(layoutName);
        // Store in localStorage to persist across refreshes
        localStorage.setItem('activeLayout', layoutName);
    };

    // Restore active layout on component mount
    useEffect(() => {
        const savedLayout = localStorage.getItem('activeLayout');
        if (savedLayout) {
            setActiveLayout(savedLayout);
        }
    }, []);

    // Improved function to refresh layouts
    const refreshLayouts = async () => {
        try {
            setActionInProgress('refresh');
            const toastId = toast.loading('Refreshing layouts...');
            
            const updatedLayouts = await fetchLayoutsUtil();
            
            // Update both local state and parent state
            setLocalLayouts(updatedLayouts);
            setLayouts(updatedLayouts);
            
            toast.success('Layouts refreshed successfully', { id: toastId });
            return updatedLayouts;
        } catch (error) {
            console.error("Error refreshing layouts:", error);
            toast.error('Failed to refresh layouts');
            return null;
        } finally {
            setActionInProgress(null);
        }
    };

    const handleDelete = async (layoutName, e) => {
        e.stopPropagation(); // Prevent triggering the parent click event
        
        const confirmDelete = window.confirm(`Are you sure you want to delete "${layoutName}"?`);
        if (!confirmDelete) return;

        try {
            setActionInProgress(`delete-${layoutName}`);
            
            // Display a loading toast
            const toastId = toast.loading(`Deleting layout "${layoutName}"...`);
            
            // Use the utility function for deletion
            await deleteLayoutUtil(layoutName);
            
            // Remove from local state immediately without waiting for refresh
            const updatedLayouts = localLayouts.filter(name => name !== layoutName);
            setLocalLayouts(updatedLayouts);
            setLayouts(updatedLayouts); // Update parent state
            
            // Clear active layout if it was deleted
            if (activeLayout === layoutName) {
                setActiveLayout(null);
                localStorage.removeItem('activeLayout');
            }
            
            toast.success(`Layout "${layoutName}" deleted`, { id: toastId });
            
            // Fetch the latest layouts from server to ensure consistency
            await refreshLayouts();
            
        } catch (error) {
            console.error("Error deleting layout:", error);
            toast.error(`Failed to delete layout: ${error.message || "Unknown error"}`);
            
            // Refresh to restore consistent state
            await refreshLayouts();
        } finally {
            setActionInProgress(null);
        }
    };

    const handleRename = async (oldName, e) => {
        e.stopPropagation(); // Prevent triggering the parent click event
        
        const newName = prompt(`Rename "${oldName}" to:`);
        if (!newName || newName === oldName) return;

        try {
            setActionInProgress(`rename-${oldName}`);
            
            // Display a loading toast
            const toastId = toast.loading(`Renaming layout...`);
            
            const response = await fetch(`${baseUrl}/api/rename_layout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ old_name: oldName, new_name: newName }),
            });

            const data = await response.json();
            
            if (response.ok) {
                // Update toast to success
                toast.success(`Layout renamed to "${newName}"`, { id: toastId });
                
                // Update active layout name if it was renamed
                if (activeLayout === oldName) {
                    setActiveLayout(newName);
                    localStorage.setItem('activeLayout', newName);
                }
                
                // Update local state immediately
                const updatedLayouts = localLayouts.map(name => 
                    name === oldName ? newName : name
                );
                setLocalLayouts(updatedLayouts);
                setLayouts(updatedLayouts); // Update parent state
                
                // Refresh layouts to ensure consistency
                await refreshLayouts();
            } else {
                // Update toast to error
                toast.error(`Failed to rename: ${data.error}`, { id: toastId });
            }
        } catch (error) {
            console.error("Error renaming layout:", error);
            toast.error(`An unexpected error occurred`);
            await refreshLayouts(); // Refresh to restore consistent state
        } finally {
            setActionInProgress(null);
        }
    };

    const handleLoadLayout = async (layoutName) => {
        try {
            setActionInProgress(`load-${layoutName}`);
            
            // Display a loading toast
            const toastId = toast.loading(`Loading layout "${layoutName}"...`);
            
            await applySavedLayout(layoutName);
            
            // Update toast to success
            toast.success(`Layout "${layoutName}" loaded`, { id: toastId });
            
            // Mark this layout as active
            markLayoutActive(layoutName);
        } catch (error) {
            console.error("Error loading layout:", error);
            toast.error(`Failed to load layout "${layoutName}"`);
        } finally {
            setActionInProgress(null);
            setIsOpen(false); // Close the dropdown after action
        }
    };

    const handleSaveLayout = async () => {
        try {
            setActionInProgress('save');
            const result = await saveCurrentLayout();
            
            // If saveCurrentLayout was successful and returned the new layout name
            if (result && result.layoutName) {
                markLayoutActive(result.layoutName);
                
                // Update local layouts if not already included
                if (!localLayouts.includes(result.layoutName)) {
                    const updatedLayouts = [...localLayouts, result.layoutName];
                    setLocalLayouts(updatedLayouts);
                    setLayouts(updatedLayouts); // Update parent state
                }
            }
        } catch (error) {
            console.error("Error saving layout:", error);
            toast.error(`Failed to save layout`);
        } finally {
            setActionInProgress(null);
            setIsOpen(false); // Close the dropdown after action
        }
    };

    const handleLoadDefault = async () => {
        try {
            setActionInProgress('default');
            
            // Display a loading toast
            const toastId = toast.loading(`Loading default layout...`);
            
            await applyDefaultView();
            
            // Update toast to success
            toast.success(`Default layout loaded`, { id: toastId });
            
            // Clear active layout when loading default
            setActiveLayout(null);
            localStorage.removeItem('activeLayout');
        } catch (error) {
            console.error("Error loading default layout:", error);
            toast.error(`Failed to load default layout`);
        } finally {
            setActionInProgress(null);
            setIsOpen(false); // Close the dropdown after action
        }
    };

    const handleRefreshLayouts = async () => {
        await refreshLayouts();
    };

    // Determine the text to display on the main button
    const getButtonText = () => {
        if (loadingLayouts) return "Loading layouts...";
        if (activeLayout) return `Layout: ${activeLayout}`;
        return "Layout";
    };

    return (
        <div className="relative inline-block">
            {isOpen && !loadingLayouts && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200">
                        <h3 className="font-medium text-gray-700">Layouts</h3>
                        <button 
                            onClick={handleRefreshLayouts}
                            disabled={!!actionInProgress}
                            className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50"
                            title="Refresh layouts"
                        >
                            <MdRefresh className={actionInProgress === 'refresh' ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    
                    <ul className="py-1 max-h-64 overflow-auto">
                        {localLayouts.length === 0 ? (
                            <li className="px-4 py-2 text-gray-500 text-center">No layouts available</li>
                        ) : (
                            localLayouts.map((layoutName) => (
                                <li 
                                    key={layoutName} 
                                    className={`px-4 py-2 flex justify-between items-center hover:bg-gray-100 cursor-pointer transition-all
                                        ${activeLayout === layoutName ? 'bg-blue-50' : ''}
                                    `}
                                    onClick={() => handleLoadLayout(layoutName)}
                                >
                                    <div className="flex items-center">
                                        {activeLayout === layoutName && (
                                            <MdCheck className="text-blue-500 mr-1" />
                                        )}
                                        <span className={activeLayout === layoutName ? 'font-medium text-blue-700' : ''}>
                                            {layoutName}
                                        </span>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button 
                                            onClick={(e) => handleRename(layoutName, e)} 
                                            className="text-blue-500 hover:text-blue-700 p-1"
                                            disabled={actionInProgress === `rename-${layoutName}`}
                                        >
                                            <MdEdit />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDelete(layoutName, e)} 
                                            className="text-red-500 hover:text-red-700 p-1"
                                            disabled={actionInProgress === `delete-${layoutName}`}
                                        >
                                            <MdDelete />
                                        </button>
                                    </div>
                                </li>
                            ))
                        )}
                        
                        <li className="border-t border-gray-200 mt-1"></li>
                        
                        <li 
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-all text-blue-600 hover:text-blue-800 font-medium" 
                            onClick={handleSaveLayout}
                            disabled={actionInProgress === 'save'}
                        >
                            Save Current Layout
                        </li>
                        <li 
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-all" 
                            onClick={handleLoadDefault}
                            disabled={actionInProgress === 'default'}
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

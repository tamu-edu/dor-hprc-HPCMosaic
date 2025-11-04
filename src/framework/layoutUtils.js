import axios from 'axios';
import config from "../../config.yml";
import { get_base_url } from "../utils/api_config.js"

const baseUrl = get_base_url() + '/api';

export const saveLayout = async (layoutName, layoutData) => {
    try {
        console.log("🔹 Raw Layout Data Before Saving:", layoutData);

        // Ensure name is properly included in the formatted layout
        const formattedLayout = {
            "0": layoutData.map(item => ({
                h: item.h,
                i: item.i,
                name: item.name || "Unnamed",  // Ensure "name" exists and is preserved
                w: item.w,
                x: item.x,
                y: item.y
            }))
        };

        console.log("✅ Formatted Layout Data:", formattedLayout);

        const response = await axios.post(`${baseUrl}/save_layout`, {
            layout_name: layoutName,
            layout_data: formattedLayout,
        });

        console.log(response.data.message);
        return { success: true, message: response.data.message };
    } catch (error) {
        console.error("❌ Error saving layout:", error.response?.data || "Unknown error");
        throw error; // Re-throw to handle in the component
    }
};

export const fetchLayouts = async () => {
    try {
        const response = await axios.get(`${baseUrl}/get_layouts`);
        return response.data.layouts;
    } catch (error) {
        console.error(error.response?.data || "Failed to fetch layouts");
        throw error; // Re-throw to handle in the component
    }
};

export const loadLayout = async (layoutName) => {
    try {
        const response = await axios.get(`${baseUrl}/load_layout`, {
            params: { layout_name: layoutName },
        });
        return response.data.layout_data;
    } catch (error) {
        console.error(error.response?.data || "Failed to load layout");
        throw error; // Re-throw to handle in the component
    }
};

export const deleteLayout = async (layoutName) => {
    try {
        const response = await axios.delete(`${baseUrl}/delete_layout`, {
            data: { layout_name: layoutName }
        });
        return { success: true, message: response.data.message };
    } catch (error) {
        console.error(error.response?.data || "Failed to delete layout");
        throw error; // Re-throw to handle in the component
    }
};

export const renameLayout = async (oldName, newName) => {
    try {
        const response = await axios.post(`${baseUrl}/rename_layout`, {
            old_name: oldName,
            new_name: newName
        });
        return { success: true, message: response.data.message };
    } catch (error) {
        console.error(error.response?.data || "Failed to rename layout");
        throw error; // Re-throw to handle in the component
    }
};

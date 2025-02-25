import axios from 'axios';
import config from "../../config.yml";

const baseUrl = config.production.dashboard_url + '/api';

export const saveLayout = async (layoutName, layoutData) => {
    try {
        console.log("Saving layout:", layoutName, layoutData); // Fix console.log
        const response = await axios.post(`${baseUrl}/save_layout`, {
            layout_name: layoutName,
            layout_data: layoutData,
        });
        console.log(response.data.message);
    } catch (error) {
        console.error("Error saving layout:", error.response?.data || "Unknown error");
    }
};

export const fetchLayouts = async () => {
    try {
        const response = await axios.get(`${baseUrl}/get_layouts`);
        return response.data.layouts;
    } catch (error) {
        console.error(error.response?.data || "Failed to fetch layouts");
        return [];
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
        return null;
    }
};

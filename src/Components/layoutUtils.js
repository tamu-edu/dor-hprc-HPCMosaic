import axios from 'axios';

const API_BASE_URL = '/pun/sys/dor-hprc-web-tamudashboard-reu-branch/api';

export const saveLayout = async (layoutName, layoutData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/save_layout`, {
            layout_name: layoutName,
            layout_data: layoutData,
        });
        console.log(response.data.message);
    } catch (error) {
        console.error(error.response?.data || "Failed to save layout");
    }
};

export const fetchLayouts = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/get_layouts`);
        return response.data.layouts;
    } catch (error) {
        console.error(error.response?.data || "Failed to fetch layouts");
        return [];
    }
};

export const loadLayout = async (layoutName) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/load_layout`, {
            params: { layout_name: layoutName },
        });
        return response.data.layout_data;
    } catch (error) {
        console.error(error.response?.data || "Failed to load layout");
        return null;
    }
};

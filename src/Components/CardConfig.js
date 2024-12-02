import React from 'react';
import Card from './Card';
import LineChart from '../Charts/LineChart';
import BarChart from '../Charts/BarChart';
import PieChart from '../Charts/PieChart';
import ClusterInfo from '../Charts/ClusterInfo';
import PyVenvManager from '../Charts/PyVenvManager';
import Chatbot from '../Charts/Chatbot';

const CardConfig = {
    Line: {
        cardComponent: (props) => <Card {...props} title="Line Chart" />,
        chartComponent: LineChart,
        defaultProps: { w: 1, h: 1 },
    },
    Bar: {
        cardComponent: (props) => <Card {...props} title="Bar Chart" />,
        chartComponent: BarChart,
        defaultProps: { w: 1, h: 1 },
    },
    Pie: {
        cardComponent: (props) => <Card {...props} title="Pie Chart" />,
        chartComponent: PieChart,
        defaultProps: { w: 1, h: 1 },
    },
    "Node Utilization": {
        cardComponent: (props) => <Card {...props} title="Node Utilization" />,
        chartComponent: ClusterInfo,
        defaultProps: { w: 2, h: 3 },
    },
    PyVenvManager: {
        cardComponent: (props) => <Card {...props} title="Python Venv Manager" />,
        chartComponent: PyVenvManager,
        defaultProps: { w: 2, h: 2 },
    },
    Chatbot: {
        cardComponent: (props) => <Card {...props} title="Chatbot" />,
        chartComponent: Chatbot,
        defaultProps: { w: 1, h: 2 },
    },
};

export default CardConfig;

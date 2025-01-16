import React from 'react';
import Card from './Card';
import ClusterInfo from '../Charts/ClusterInfo';
import PyVenvManager from '../Charts/PyVenvManager';
import Chatbot from '../Charts/Chatbot';

const CardConfig = {
    "Node Utilization": {
        cardComponent: React.memo((props) => <Card {...props} title="Node Utilization" image="/pun/sys/dor-hprc-web-tamudashboard-reu-branch/images/cluster-util.png" />),
        chartComponent: ClusterInfo,
        defaultProps: { w: 2, h: 4 },
    },
    PyVenvManager: {
        cardComponent: React.memo((props) => <Card {...props} title="Python Venv Manager" image="/images/python-venv.png" />),
        chartComponent: PyVenvManager,
        defaultProps: { w: 2, h: 2 },
    },
    Chatbot: {
        cardComponent: React.memo((props) => <Card {...props} title="Chatbot" image="/images/chatbot.png" />),
        chartComponent: Chatbot,
        defaultProps: { w: 1, h: 2 },
    },
};

export default CardConfig;

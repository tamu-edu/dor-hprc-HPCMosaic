import React from 'react';
import Card from './Card';
import ClusterInfo from '../Charts/ClusterInfo';
import PyVenvManager from '../Charts/PyVenvManager';
import Chatbot from '../Charts/Chatbot';
import Composer from '../Charts/Composer';
import QuotaInfo from '../Charts/QuotaInfo';
import UserGroups from '../Charts/UserGroups';
import Accounts from '../Charts/Accounts';

const CardConfig = {
    "Node Utilization": {
        cardComponent: React.memo((props) => <Card {...props} title="Node Utilization" image="/pun/sys/dor-hprc-web-tamudashboard-reu-branch/images/cluster-util.png" />),
        chartComponent: ClusterInfo,
    },
    PyVenvManager: {
        cardComponent: React.memo((props) => <Card {...props} title="Python Venv Manager" image="/images/python-venv.png" />),
        chartComponent: PyVenvManager,
    },
    Composer: {
        cardComponent: React.memo((props) => <Card {...props} title="Composer" image="/images/chatbot.png" />),
        chartComponent: Composer,
    },
    "Quota Info": {
        cardComponent: React.memo((props) => <Card {...props} title="Quota Information" image="/pun/sys/dor-hprc-web-tamudashboard-reu-branch/images/cluster-util.png" />),
        chartComponent: QuotaInfo,
    },
    "User Groups": {
        cardComponent: React.memo((props) => <Card {...props} title="User Groups" image="/pun/sys/dor-hprc-web-tamudashboard-reu-branch/images/cluster-util.png" />),
        chartComponent: UserGroups,
    },
    Accounts: {
        cardComponent: React.memo((props) => <Card {...props} title="Accounts" image="/pun/sys/dor-hprc-web-tamudashboard-reu-branch/images/cluster-util.png" />),
        chartComponent: Accounts,
    },
};

export default CardConfig;

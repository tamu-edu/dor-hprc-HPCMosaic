import React from "react";
import { AiOutlineCluster, AiOutlineDatabase, AiOutlineUser, AiOutlineCode, AiOutlinePieChart, AiOutlineProject } from "react-icons/ai";
import Card from "./Card";
import ClusterInfo from "../Charts/ClusterInfo";
import PyVenvManager from "../Charts/PyVenvManager";
import QuotaInfo from "../Charts/QuotaInfo";
import UserGroups from "../Charts/UserGroups";
import Accounts from "../Charts/Accounts";
import UserJobs from "../Charts/UserJobs";
import QuotaButton from '../Charts/QuotaButton';
import Composer from '../Charts/Composer';
import ElementDescriptions from "./ElementDescriptions"; // Import descriptions
import AcknowledgementForm from '../Charts/AcknowledgementForm';
// ... other imports

const CardConfig = {
    "Node Utilization": {
        cardComponent: React.memo((props) => (
            <Card {...props} name="Node Utilization" title="Node Utilization"
                description={ElementDescriptions["Node Utilization"]}
                icon={<AiOutlineCluster size={30} />} />
        )),
        chartComponent: ClusterInfo,
    },
    PyVenvManager: {
        cardComponent: React.memo((props) => (
            <Card {...props} name="PyVenvManager" title="Python Venv Manager"
                description={ElementDescriptions.PyVenvManager}
                icon={<AiOutlineCode size={30} />} />
        )),
        chartComponent: PyVenvManager,
        // defaultProps: { w: 2, h: 2 },
    },
    // Chatbot: {
    //     cardComponent: React.memo((props) => <Card {...props} title="Chatbot" image="/images/chatbot.png" />),
    //     chartComponent: Chatbot,
    //     // defaultProps: { w: 1, h: 2 },
    // },
    // Composer: {
    //     cardComponent: React.memo((props) => <Card {...props} title="Composer" image="/images/chatbot.png" />),
    //     chartComponent: Composer,
    //     // defaultProps: { w: 1, h: 2 },
    // },
    // "Quota Button": {
    //     cardComponent: React.memo((props) => <Card {...props} title="Quota Button" image="/images/chatbot.png" />),
    //     chartComponent: QuotaButton,
    //     // defaultProps: { w: 1, h: 2 },
    // },
    "Quota Info": {
        cardComponent: React.memo((props) => (
            <Card {...props} name="Quota Info" title="Quota Information"
                description={ElementDescriptions["Quota Info"]}
                icon={<AiOutlinePieChart size={30} />} />
        )),
        chartComponent: QuotaInfo,
    },
    "User Groups": {
        cardComponent: React.memo((props) => (
            <Card {...props} name="User Groups" title="User Groups"
                description={ElementDescriptions["User Groups"]}
                icon={<AiOutlineUser size={30} />} />
        )),
        chartComponent: UserGroups,
    },
    Accounts: {
        cardComponent: React.memo((props) => (
            <Card {...props} name="Accounts" title="Accounts"
                description={ElementDescriptions.Accounts}
                icon={<AiOutlineDatabase size={30} />} />
        )),
        chartComponent: Accounts,
    },
    "User Jobs": {
        cardComponent: React.memo((props) => (
            <Card {...props} name="User Jobs" title="User Jobs"
                description={ElementDescriptions["User Jobs"]}
                icon={<AiOutlineProject size={30} />} />
        )),
        chartComponent: UserJobs,
    },
    AcknowledgementForm: {
        cardComponent: React.memo((props) => (
            <Card {...props} name="AcknowledgementForm" title="Acknowledgement Form"
                description={ElementDescriptions["Acknowledgement Form"]}
                icon={<AiOutlineCode size={30} />} />
        )),
        chartComponent: AcknowledgementForm,
    },
};

export default CardConfig;

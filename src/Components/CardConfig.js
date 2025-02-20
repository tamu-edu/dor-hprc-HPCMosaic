import React from "react";
import { AiOutlineCluster, AiOutlineDatabase, AiOutlineUser, AiOutlineCode, AiOutlinePieChart, AiOutlineProject } from "react-icons/ai";
import Card from "./Card";
import ClusterInfo from "../Charts/ClusterInfo";
import PyVenvManager from "../Charts/PyVenvManager";
import QuotaInfo from "../Charts/QuotaInfo";
import UserGroups from "../Charts/UserGroups";
import Accounts from "../Charts/Accounts";
import UserJobs from "../Charts/UserJobs";
import ElementDescriptions from "./ElementDescriptions"; // Import descriptions

const CardConfig = {
    "Node Utilization": {
        cardComponent: React.memo((props) => (
            <Card {...props} title="Node Utilization" description={ElementDescriptions["Node Utilization"]} icon={<AiOutlineCluster size={30} />} />
        )),
        chartComponent: ClusterInfo,
    },
    PyVenvManager: {
        cardComponent: React.memo((props) => (
            <Card {...props} title="Python Venv Manager" description={ElementDescriptions.PyVenvManager} icon={<AiOutlineCode size={30} />} />
        )),
        chartComponent: PyVenvManager,
    },
    "Quota Info": {
        cardComponent: React.memo((props) => (
            <Card {...props} title="Quota Information" description={ElementDescriptions["Quota Info"]} icon={<AiOutlinePieChart size={30} />} />
        )),
        chartComponent: QuotaInfo,
    },
    "User Groups": {
        cardComponent: React.memo((props) => (
            <Card {...props} title="User Groups" description={ElementDescriptions["User Groups"]} icon={<AiOutlineUser size={30} />} />
        )),
        chartComponent: UserGroups,
    },
    Accounts: {
        cardComponent: React.memo((props) => (
            <Card {...props} title="Accounts" description={ElementDescriptions.Accounts} icon={<AiOutlineDatabase size={30} />} />
        )),
        chartComponent: Accounts,
    },
    "User Jobs": {
        cardComponent: React.memo((props) => (
            <Card {...props} title="User Jobs" description={ElementDescriptions["User Jobs"]} icon={<AiOutlineProject size={30} />} />
        )),
        chartComponent: UserJobs,
    },
};

export default CardConfig;

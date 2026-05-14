import React from "react";
import { AiOutlineCluster, AiOutlineDatabase, AiOutlineUser, AiOutlineCode, AiOutlinePieChart, AiOutlineProject } from "react-icons/ai";
import Card from "./Card";
import ClusterInfo from "../elements/ClusterInfo";
import PyVenvManager from "../elements/PyVenvManager";
import QuotaInfo from "../elements/QuotaInfo";
import UserGroups from "../elements/UserGroups";
import Accounts from "../elements/Accounts";
import UserJobs from "../elements/UserJobs";
import QuotaButton from '../elements/QuotaButton';
import Composer from '../elements/Composer';
import Chatbot from '../elements/Chatbot';
import AcknowledgementForm from '../elements/AcknowledgementForm';
import Announcement from '../elements/Announcement';

const makeCard = (name, icon) =>
	React.memo(({ description, category, ...props }) => 
		<Card {...props} name={name} title={name} description={description} icon={icon} />
	);

const CardConfig = {
    "Node Utilization": {
	description: "Displays the current and available computing resources across nodes.",
	icon: <AiOutlineCluster size={30}/>,
	chartComponent: ClusterInfo,
	category: "system",
	minW: 3, minH: 6
    },

    "Python Venv Manager": {
        description: "Manage Python virtual environments directly from the dashboard.",
        icon: <AiOutlineCluster size={30}/>,
	chartComponent: PyVenvManager,
	category: "system",
        minW: 4, minH: 10
    },

    "Quota Information": {
        description: "Shows disk quota usage and links for users and groups.",
        icon: <AiOutlineCluster size={30}/>,
        chartComponent: QuotaInfo,
	category: "system",
        minW: 3, minH: 8
    },

    "User Groups": {
        description: "Lists user groups and their associated storage paths.",
        icon: <AiOutlineCluster size={30}/>,
        chartComponent: UserGroups,
	category: "user",
        minW: 3, minH: 6
    },

    "Accounts": {
        description: "Provides information on user accounts and their roles.",
        icon: <AiOutlineCluster size={30}/>,
	chartComponent: Accounts,
	category: "user",
        minW: 5, minH: 8
    },

    "User Jobs": {
        description: "Displays currently running and queued jobs for the user.",
        icon: <AiOutlineCluster size={30}/>,
	chartComponent: UserJobs,
	category: "user",
        minW: 3, minH: 6
    },

    "Acknowledgement Form": {
        description: "Submit acknowledgements for papers that used HPRC resources.",
        icon: <AiOutlineCluster size={30}/>,
	chartComponent: AcknowledgementForm,
	category: "user",
        minW: 3, minH: 6
    },

    "Announcement": {
        description: "The message of the day and other relevant notification popups.",
        icon: <AiOutlineCluster size={30}/>,
	chartComponent: Announcement,
	category: "analytics",
        minW: 5, minH: 4
    },
};

// Attach cardComponent to each entry using the key as both name and title.
Object.entries(CardConfig).forEach(([name, entry]) => {
    entry.cardComponent = makeCard(name, entry.icon);
});

export default CardConfig;

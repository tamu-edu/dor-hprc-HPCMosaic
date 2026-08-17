import React from "react";
import { AiOutlineCluster, AiOutlineDatabase, AiOutlineUser, AiOutlineCode, AiOutlineLineChart, AiOutlinePieChart, AiOutlineProject } from "react-icons/ai";
import Card from "./Card";
import ClusterInfo from "../elements/ClusterInfo";
import PyVenvManager from "../elements/PyVenvManager";
import QuotaInfo from "../elements/QuotaInfo";
import UserGroups from "../elements/UserGroups";
import Accounts from "../elements/Accounts";
import UserJobs from "../elements/UserJobs";
import JobHistory from "../elements/JobHistory";
// import JobExplorer from "../elements/JobExplorer"; TODO make Job Explorer more efficient
import QuotaButton from '../elements/QuotaButton';
import Composer from '../elements/Composer';
// import Chatbot from '../elements/Chatbot';
import AcknowledgementForm from '../elements/AcknowledgementForm';
import ClusterStatus from '../elements/ClusterStatus';
import SoftwareModulesPage from '../elements/SoftwareModulesPage';
import AnnouncementManager from '../elements/AnnouncementManager';
import {
    AccountsUsageSummaryCard,
    AnnouncementsSummaryCard,
    GettingStartedCard,
    MyJobsSummaryCard,
    MyQuotasSummaryCard,
} from '../elements/SummaryCards';
import {
	CpuUtilizationCard,
	GpuResourcesCard, 
	JobsOverviewCard, 
	NodesAvailableCard,
	SystemLoadCard,
} from "../elements/KpiCards";

const makeCard = (name, icon) =>
	React.memo(({ description, category, ...props }) => 
		<Card {...props} name={name} title={name} description={description} icon={icon} />
	);

const CardConfig = {
    "CPU Utilization": {
        description: "Compact CPU usage summary with a recent utilization trend.",
        icon: <AiOutlinePieChart size={30}/>,
        chartComponent: CpuUtilizationCard,
        category: "analytics",
        defaultW: 3,
        defaultH: 7,
        minW: 1,
        minH: 1
    },

    "GPU Resources": {
        description: "GPU node and allocation counts for the gpu partition.",
        icon: <AiOutlinePieChart size={30}/>,
        chartComponent: GpuResourcesCard,
        category: "analytics",
        defaultW: 3,
        defaultH: 7,
        minW: 1,
        minH: 1
    },

    "Nodes Available": {
        description: "Cluster node availability with up, down, and drain counts.",
        icon: <AiOutlineCluster size={30}/>,
        chartComponent: NodesAvailableCard,
        category: "system",
        defaultW: 3,
        defaultH: 7,
        minW: 1,
        minH: 1
    },

    "Jobs Overview": {
        description: "Total scheduler jobs with running and pending counts.",
        icon: <AiOutlineProject size={30}/>,
        chartComponent: JobsOverviewCard,
        category: "analytics",
        defaultW: 3,
        defaultH: 7,
        minW: 1,
        minH: 1
    },

    "System Load": {
        description: "Normalized five-minute system load with a recent trend.",
        icon: <AiOutlinePieChart size={30}/>,
        chartComponent: SystemLoadCard,
        category: "analytics",
        defaultW: 3,
        defaultH: 7,
        minW: 1,
        minH: 1
    },

    "My Jobs Summary": {
        description: "Dashboard-style summary of current user jobs.",
        icon: <AiOutlineProject size={30}/>,
        chartComponent: MyJobsSummaryCard,
        category: "user",
        defaultW: 3,
        defaultH: 12,
        minW: 1,
        minH: 1
    },

    "Job History": {
        description: "Browse jobs submitted by the current user during the past 24 hours.",
        icon: <AiOutlineProject size={30}/>,
        chartComponent: JobHistory,
        category: "user",
        defaultW: 6,
        defaultH: 12,
        minW: 3,
        minH: 8
    },

    "My Quotas Summary": {
        description: "Dashboard-style summary of storage quota usage.",
        icon: <AiOutlineDatabase size={30}/>,
        chartComponent: MyQuotasSummaryCard,
        category: "user",
        defaultW: 3,
        defaultH: 12,
        minW: 1,
        minH: 1
    },

    "Accounts": {
        description: "Dashboard-style table of account usage against limits.",
        icon: <AiOutlineUser size={30}/>,
        chartComponent: AccountsUsageSummaryCard,
        category: "user",
        defaultW: 3,
        defaultH: 12,
        minW: 1,
        minH: 1
    },

    "Announcements Summary": {
        description: "Dashboard-style list of cluster announcements.",
        icon: <AiOutlineCode size={30}/>,
        chartComponent: AnnouncementsSummaryCard,
        category: "analytics",
        defaultW: 3,
        defaultH: 12,
        minW: 1,
        minH: 1
    },

    "Getting Started": {
        description: "Useful Texas A&M HPRC guides and resources for new users.",
        icon: <AiOutlineCode size={30}/>,
        chartComponent: GettingStartedCard,
        category: "user",
        defaultW: 3,
        defaultH: 12,
        minW: 1,
        minH: 1
    },
    "Announcement Manager": {
        description: "Create, edit, schedule, remove, and prioritize dashboard announcements.",
        icon: <AiOutlineCode size={30}/>,
        chartComponent: AnnouncementManager,
        category: "system",
        adminOnly: true,
        defaultW: 8,
        defaultH: 22,
        minW: 6,
        minH: 16
    },

    "Cluster Nodes Overview": {
        description: "Dashboard-style node inventory overview with status legend.",
        icon: <AiOutlineCluster size={30}/>,
        chartComponent: ClusterStatus,
        category: "system",
        defaultW: 9,
        defaultH: 19,
        minW: 1,
        minH: 1
    },
    "Node Utilization": {
	description: "Displays the current and available computing resources across nodes.",
	icon: <AiOutlineCluster size={30}/>,
	chartComponent: ClusterInfo,
	category: "system",
	defaultW: 6,
	defaultH: 12,
	minW: 1, minH: 1
    },

    "Python Venv Manager": {
        description: "Manage Python virtual environments directly from the dashboard.",
        icon: <AiOutlineCluster size={30}/>,
	chartComponent: PyVenvManager,
	category: "system",
        defaultW: 6,
        defaultH: 10,
        minW: 1, minH: 1
    },

    "Software Modules": {
        description: "Browse available software modules on the cluster.",
        icon: <AiOutlineCode size={30}/>,
        chartComponent: SoftwareModulesPage,
        category: "system",
        defaultW: 12,
        defaultH: 20,
        minW: 2,
        minH: 6
    },

    "Quota Information": {
        description: "Shows disk quota usage and links for users and groups.",
        icon: <AiOutlineCluster size={30}/>,
        chartComponent: QuotaInfo,
	category: "system",
        defaultW: 6,
        defaultH: 12,
        minW: 1, minH: 1
    },

    "User Groups": {
        description: "Lists user groups and their associated storage paths.",
        icon: <AiOutlineCluster size={30}/>,
        chartComponent: UserGroups,
	category: "user",
        defaultW: 6,
        defaultH: 10,
        minW: 1, minH: 1
    },

    "Project Information": {
        description: "Provides information on user accounts and their roles.",
        icon: <AiOutlineCluster size={30}/>,
	chartComponent: Accounts,
	category: "user",
        defaultW: 6,
        defaultH: 12,
        minW: 1, minH: 1
    },

    "User Jobs": {
        description: "Displays currently running and queued jobs for the user.",
        icon: <AiOutlineCluster size={30}/>,
	chartComponent: UserJobs,
	category: "user",
        defaultW: 6,
        defaultH: 12,
        minW: 1, minH: 1
    },

 // "Job Explorer": {
   //     description: "Advanced job monitoring, filtering, and management for Slurm jobs.",
     //   icon: <AiOutlineProject size={30}/>,
//	chartComponent: JobExplorer,
//	category: "user",
  //      minW: 8, minH: 24
   // },

    "Acknowledgement Form": {
        description: "Submit acknowledgements for papers that used HPRC resources.",
        icon: <AiOutlineCluster size={30}/>,
	chartComponent: AcknowledgementForm,
	category: "user",
        defaultW: 6,
        defaultH: 12,
        minW: 1, minH: 1
    },
};

// Attach cardComponent to each entry using the key as both name and title.
Object.entries(CardConfig).forEach(([name, entry]) => {
    entry.cardComponent = makeCard(name, entry.icon);
});

export default CardConfig;

import { v4 as uuidv4 } from "uuid";

export const createDefaultLayout = () => [
  { name: "Announcements Summary", i: uuidv4(), x: 0, y: 0, w: 3, h: 12 },
  { name: "My Jobs Summary", i: uuidv4(), x: 3, y: 0, w: 3, h: 12 },
  { name: "My Quotas Summary", i: uuidv4(), x: 6, y: 0, w: 3, h: 12 },
  { name: "Accounts", i: uuidv4(), x: 9, y: 0, w: 3, h: 12 },
  { name: "CPU Utilization", i: uuidv4(), x: 0, y: 12, w: 3, h: 7 },
  { name: "GPU Resources", i: uuidv4(), x: 3, y: 12, w: 3, h: 7 },
  { name: "Nodes Available", i: uuidv4(), x: 6, y: 12, w: 3, h: 7 },
  { name: "Jobs Overview", i: uuidv4(), x: 9, y: 12, w: 3, h: 7 },
  { name: "User Groups", i: uuidv4(), x: 0, y: 19, w: 6, h: 10 },
  { name: "Python Venv Manager", i: uuidv4(), x: 6, y: 19, w: 6, h: 10 },
  { name: "Cluster Nodes Overview", i: uuidv4(), x: 0, y: 29, w: 9, h: 19 },
];

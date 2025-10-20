# Dashboard Element Architecture

## Overview
This document explains how dashboard elements are currently structured, registered, and rendered in the HPC Dashboard (Mosaic) application. The system uses a drag-and-drop interface where users can add elements from a sidebar to a customizable grid layout.

As of 10/6/2025 the dashboard elements are hardcoded in the core of the application. The ultimate goal is to make these elements seperate and independent of the core dashboard for portability purposes.

One possibility for this could be an external repo where users can download (and upload) new elements.

## Current Architecture

### Component Flow
```
index.js → SandboxGrid.js → Banner.js → {Content.js, Sidebar.js}
                                              ↓         ↓
                                        CardConfig.js ← ElementDescriptions.js
                                              ↓
                                           Card.js
```

## Key Files and Their Roles

### 1. **CardConfig.js** (src/Components/CardConfig.js)
**Purpose:** Central registry for all available dashboard elements.

**Structure:**
```javascript
const CardConfig = {
  "Element Name": {
    cardComponent: React.memo((props) => <Card {...props} ... />),
    chartComponent: ComponentName,
  },
  ...
}
```

**Responsibilities:**
- Maps element names to their sidebar card representations
- Maps element names to their actual chart/widget components
- Imports both Card.js and all chart components from src/Charts/
- Pulls descriptions from ElementDescriptions.js

**Current Issue:** All chart components must be explicitly imported at the top of the file.

### 2. **Content.js** (src/Components/Content.js)
**Purpose:** Main dashboard grid area where elements are rendered and arranged.

**Key Features:**
- Uses `react-grid-layout` for drag-and-drop grid functionality
- Manages layout state (positions, sizes of elements)
- Handles element addition/removal
- Provides placeholder preview when dragging from sidebar

**Element Rendering:**
```javascript
const renderChart = (ele) => {
  switch (ele.name) {
    case "Node Utilization": return <ClusterInfo />;
    case "User Jobs": return <UserJobs />;
    // ... more cases
    default: return <div>Unknown Chart</div>;
  }
};
```

**Current Issue:**
- All chart components must be imported at the top
- Switch statement must be manually updated for each new element
- Component names are hardcoded in two places (import + switch)

### 3. **Card.js** (src/Components/Card.js)
**Purpose:** Draggable card component displayed in the sidebar.

**Props:**
- `name`: Internal identifier
- `title`: Display name
- `description`: Element description text
- `icon`: React icon component

**Features:**
- Uses `react-dnd` for drag functionality
- Creates custom drag preview
- Shows element metadata (title, description, category badge)

### 4. **Sidebar.js** (src/Components/Sidebar.js)
**Purpose:** Panel that displays all available elements that can be added to the dashboard.

**Features:**
- Reads from CardConfig to get list of available elements
- Search functionality across names, titles, and descriptions
- Category filtering (System, User, Analytics)
- Grid/List view toggle
- Renders the `cardComponent` from CardConfig for each element

**Data Flow:**
```javascript
const list = Object.keys(CardConfig);
const { cardComponent: CardComponent } = CardConfig[name];
<CardComponent />
```

### 5. **ElementDescriptions.js** (src/Components/ElementDescriptions.js)
**Purpose:** Centralized store for element description text.

**Structure:**
```javascript
const ElementDescriptions = {
  "Node Utilization": "Displays the current and available computing resources...",
  "PyVenvManager": "Manage Python virtual environments...",
  ...
};
```

**Benefits:**
- Single source of truth for descriptions
- Used in both Card.js (sidebar) and chart components (tooltips)

### 6. **Banner.js** (src/Components/Banner.js)
**Purpose:** Main container component that orchestrates the dashboard.

**Responsibilities:**
- Manages layout state and persistence
- Handles sidebar open/close
- Provides layout save/load/reset functionality
- Contains header with controls and settings

## Chart Components (src/Charts/)

Individual dashboard elements are React components in the `src/Charts/` directory:
- ClusterInfo.js (Node Utilization)
- UserJobs.js
- PyVenvManager.js
- QuotaInfo.js
- UserGroups.js
- Accounts.js

**Typical Structure:**
```javascript
const ComponentName = () => {
  // Data fetching
  // State management
  // Rendering logic
  return (
    <div className="p-4 bg-white rounded-lg overflow-auto">
      {/* Component content */}
    </div>
  );
};
```

## Supporting Files

### ItemTypes.js
Defines drag-and-drop item types for react-dnd:
```javascript
export const ItemTypes = {
  CARD: 'card',
  WIDGET: 'widget'
};
```

## Data Flow for Adding an Element

1. User opens sidebar (managed by Banner.js)
2. Sidebar.js reads available elements from CardConfig.js
3. User sees Card.js components for each element
4. User drags a Card component
5. Content.js useDrop hook detects drop
6. Content.js creates new grid item with unique ID
7. Content.js's renderChart() uses switch statement to instantiate actual component
8. react-grid-layout renders the component in the grid

## Current Portability Issues

**Problem:** Elements are tightly coupled to the core dashboard code.

**Hardcoding occurs in:**
1. **CardConfig.js**: Import statements for all chart components
2. **Content.js**: Import statements + switch statement in renderChart()
3. Both files must be modified to add/remove elements

**Impact:**
- Cannot add elements without modifying core files
- Difficult to create element plugins or extensions
- Reduces modularity and maintainability

## Paths Forward

**Ideal Architecture:**
1. Element components self-register or use a plugin system
2. Dynamic imports instead of static imports
3. Configuration-based element registry (JSON/YAML)
4. CardConfig and Content.js read from registry instead of hardcoding
5. Element metadata (name, description, icon, component path) in one place

**Benefits:**
- Elements can be added/removed without touching core files
- Easier to maintain and test
- Enables element marketplace or user-contributed elements
- Cleaner separation of concerns
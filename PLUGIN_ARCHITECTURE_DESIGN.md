# Mosaic Plugin Architecture Design Document

**Date:** 2025-11-25

---

## Executive Summary

This document outlines the design for transforming Mosaic's hardcoded element system into a flexible, portable plugin architecture. Elements will be self-contained packages with their own frontend components, backend routes, and metadata, installable by system administrators without modifying core code.

### Design Decisions
- **Build-time plugin loading** (webpack-based)
- **Configurable elements directory** (set in config.yml)
- **Infrastructure-first approach** (migrate elements later)

---

## 1. Element Structure

### Directory Layout

```
<ELEMENTS_DIR>/                    # Configurable in config.yml
├── node-utilization/
│   ├── manifest.json             # Required: Element metadata
│   ├── frontend/
│   │   ├── component.jsx         # Required: React component
│   │   ├── icon.svg             # Required: Element icon
│   │   └── styles.css           # Optional: Custom styles
│   ├── backend/
│   │   └── routes.py            # Required: Flask routes
│   ├── README.md                # Optional: Documentation
│   └── screenshot.png           # Optional: Preview image
│
├── pyvenv-manager/
│   └── ... (same structure)
│
└── quota-info/
    └── ... (same structure)
```

### Required Files

| File | Required | Purpose |
|------|----------|---------|
| `manifest.json` | Yes | Element metadata, configuration |
| `frontend/component.jsx` | Yes | React component entry point |
| `frontend/icon.svg` | Yes | Sidebar icon (SVG or React icon) |
| `backend/routes.py` | Yes | Flask API routes |
| `styles.css` | Optional | Element-specific CSS |
| `README.md` | Optional | Documentation |

---

## 2. Manifest File Specification

### Schema: `manifest.json`

```json
{
  "$schema": "https://mosaic.hprc.tamu.edu/schemas/element-manifest-v1.json",

  "id": "node-utilization",
  "version": "1.0.0",
  "name": "Node Utilization",
  "displayName": "Cluster Node Utilization",
  "description": "Real-time visualization of cluster node and queue utilization",
  "author": "HPRC",
  "license": "MIT",
  "category": "monitoring",
  "tags": ["cluster", "monitoring", "slurm"],

  "frontend": {
    "component": "./frontend/component.jsx",
    "icon": "./frontend/icon.svg",
    "defaultSize": {
      "w": 5,
      "h": 18,
      "minW": 3,
      "minH": 6
    }
  },

  "backend": {
    "routes": "./backend/routes.py",
    "routePrefix": "/api"
  },

  "permissions": [
    "read:cluster-info"
  ],

  "settings": {
    "refreshInterval": 30000,
    "maxNodes": 100
  },

  "dependencies": {
    "react": ">=18.0.0",
    "tippy.js": "^6.0.0"
  }
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Y | Unique identifier (kebab-case) |
| `version` | string | Y | Semantic version (e.g., "1.0.0") |
| `name` | string | Y | Internal name |
| `displayName` | string | Y | User-facing name |
| `description` | string | Y | Brief description |
| `author` | string | O | Author/maintainer |
| `license` | string | O | License identifier |
| `category` | string | Y | Category for grouping |
| `tags` | string[] | O | Search tags |
| `frontend.component` | string | Y | Path to React component |
| `frontend.icon` | string | Y | Path to icon file |
| `frontend.defaultSize` | object | Y | Grid size configuration |
| `backend.routes` | string | Y | Path to Flask routes |
| `backend.routePrefix` | string | O | API route prefix (default: "/api") |
| `permissions` | string[] | O | Required permissions |
| `settings` | object | O | Default settings |
| `dependencies` | object | O | npm package dependencies |

---

## 3. Frontend Component Specification

### Component Interface

```jsx
// elements/node-utilization/frontend/component.jsx

import React, { useState, useEffect } from 'react';
import { get_base_url } from '@mosaic/utils/api_config';

/**
 * Element Component Interface
 *
 * Props automatically provided by Mosaic:
 * @param {string} elementId - Unique instance ID
 * @param {object} settings - Element settings from manifest
 * @param {object} gridSize - Current grid dimensions {w, h}
 */
const NodeUtilization = ({ elementId, settings, gridSize }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const baseUrl = get_base_url();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/node-utilization/sinfo`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, settings.refreshInterval || 30000);
    return () => clearInterval(interval);
  }, [baseUrl, settings]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="element-container">
      {/* Component UI */}
    </div>
  );
};

export default NodeUtilization;
```

### Component Requirements

- Must be a React functional component
- Must export default
- Must handle loading, error, and data states
- Must be self-contained (no global state dependencies)
- Should use provided `elementId` for unique keys
- Should respect `gridSize` for responsive layout
- Should use `settings` from manifest

### Styling Guidelines

```css
/* elements/node-utilization/frontend/styles.css */

.element-container {
  padding: 1rem;
  background: white;
  border-radius: 0.5rem;
  overflow: auto;
  width: 100%;
  height: 100%;
}

/* Scoped to avoid conflicts */
.node-utilization-table {
  width: 100%;
  border-collapse: collapse;
}
```

---

## 4. Backend Routes Specification

### Routes Interface

```python
# elements/node-utilization/backend/routes.py

from flask import Blueprint, jsonify, request
from functools import wraps

def create_blueprint(app_context):
    """
    Factory function to create element blueprint

    Args:
        app_context: Dictionary with app utilities
            - 'get_user': Function to get current user
            - 'requires_auth': Auth decorator
            - 'config': App configuration

    Returns:
        Blueprint: Flask blueprint with element routes
    """
    bp = Blueprint('node_utilization', __name__)

    @bp.route('/sinfo', methods=['GET'])
    @app_context['requires_auth']
    def get_sinfo():
        """Get cluster node information"""
        try:
            # Implementation
            data = fetch_cluster_info()
            return jsonify(data), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @bp.route('/queue-stats', methods=['GET'])
    @app_context['requires_auth']
    def get_queue_stats():
        """Get queue statistics"""
        # Implementation
        return jsonify(stats), 200

    return bp
```

### Route Registration Flow

```python
# Core: app.py (modified)

from plugin_loader import load_element_routes

# Provide app context to elements
app_context = {
    'get_user': get_current_user,
    'requires_auth': requires_authentication,
    'config': app.config
}

# Auto-discover and register element routes
for element_id, create_blueprint in load_element_routes():
    blueprint = create_blueprint(app_context)
    app.register_blueprint(blueprint, url_prefix=f'/api/{element_id}')
```

### Route Requirements

- Must export `create_blueprint(app_context)` function
- Must use provided `app_context` utilities
- Must handle authentication using decorators
- Must return JSON responses
- Must include error handling
- (Heavily Preferred) Should follow RESTful conventions

---

## 5. Plugin Loading System (Build-time)

### Build Process Flow

```
1. Webpack Build Starts
   ↓
2. Plugin Scanner Script (build-plugins.js)
   - Scans ELEMENTS_DIR from config.yml
   - Reads all manifest.json files
   - Validates element structure
   - Generates registry.json
   ↓
3. Registry Generation
   - Creates src/framework/PluginRegistry.generated.js
   - Includes static imports for all components
   - Maps element IDs to components
   ↓
4. Webpack Bundle
   - Bundles all elements with core app
   - Tree-shakes unused code
   - Outputs production build
```

### Generated Registry Example

```javascript
// src/framework/PluginRegistry.generated.js
// AUTO-GENERATED - DO NOT EDIT MANUALLY

import NodeUtilization from '../../elements/node-utilization/frontend/component.jsx';
import PyVenvManager from '../../elements/pyvenv-manager/frontend/component.jsx';
import QuotaInfo from '../../elements/quota-info/frontend/component.jsx';

export const ElementRegistry = {
  'node-utilization': {
    component: NodeUtilization,
    manifest: {
      id: 'node-utilization',
      version: '1.0.0',
      name: 'Node Utilization',
      displayName: 'Cluster Node Utilization',
      // ... full manifest
    }
  },
  'pyvenv-manager': {
    component: PyVenvManager,
    manifest: { /* ... */ }
  },
  'quota-info': {
    component: QuotaInfo,
    manifest: { /* ... */ }
  }
};

export const getElement = (id) => ElementRegistry[id];
export const getAllElements = () => Object.values(ElementRegistry);
export const getElementsByCategory = (category) =>
  getAllElements().filter(e => e.manifest.category === category);
```

---

## 6. Configuration System

### config.yml (Enhanced)

```yaml
# Mosaic Configuration
app:
  name: "Mosaic Dashboard"
  version: "2.0.0"

# Plugin System Configuration
plugins:
  # Directory containing elements (absolute or relative to app root)
  elements_dir: "./mosaic-system/elements"

  # Elements enabled system-wide
  enabled:
    - node-utilization
    - pyvenv-manager
    - quota-info
    - user-jobs
    - accounts

  # Elements disabled (but available)
  disabled:
    - experimental-chatbot

  # Per-element configuration overrides
  settings:
    node-utilization:
      refreshInterval: 60000  # Override default 30s
    pyvenv-manager:
      maxEnvsPerUser: 10

# User preferences stored separately in database
user_preferences:
  # User can customize their own layout
  # System admin controls available elements
```

### Loading Configuration

```python
# utils/config_loader.py

import yaml
import os

def load_config():
    """Load and validate configuration"""
    with open('config.yml', 'r') as f:
        config = yaml.safe_load(f)

    # Resolve elements_dir path
    elements_dir = config['plugins']['elements_dir']
    if not os.path.isabs(elements_dir):
        elements_dir = os.path.abspath(elements_dir)

    config['plugins']['elements_dir'] = elements_dir

    return config
```

---

## 7. Core Framework Changes

### Files to Create

| File | Purpose |
|------|---------|
| `scripts/build-plugins.js` | Build-time element scanner |
| `src/framework/PluginRegistry.generated.js` | Auto-generated registry (gitignored) |
| `src/framework/PluginLoader.js` | Runtime registry access |
| `src/framework/ElementCard.jsx` | Dynamic card component |
| `utils/plugin_loader.py` | Python element loader |
| `utils/manifest_validator.py` | Manifest validation |
| `schemas/element-manifest-v1.json` | JSON schema for validation |

### Files to Modify

| File | Changes |
|------|---------|
| `src/framework/CardConfig.js` | Load from PluginRegistry instead of hardcoded |
| `src/framework/Content.js` | Remove switch statement, use registry lookup |
| `src/framework/Sidebar.js` | Load elements dynamically from registry |
| `app.py` | Add plugin route registration |
| `config.yml` | Add plugins configuration section |
| `webpack.config.js` | Add build-plugins.js pre-build step |
| `package.json` | Add prebuild script |

### CardConfig.js (Refactored)

```javascript
// src/framework/CardConfig.js

import React from 'react';
import Card from './Card';
import { getAllElements } from './PluginLoader';

/**
 * Dynamic CardConfig generation from plugin registry
 */
const generateCardConfig = () => {
  const elements = getAllElements();
  const config = {};

  elements.forEach(element => {
    const { id, manifest } = element;

    config[id] = {
      cardComponent: React.memo((props) => (
        <Card
          {...props}
          name={id}
          title={manifest.displayName}
          description={manifest.description}
          icon={manifest.frontend.icon}
        />
      )),
      chartComponent: element.component,
      manifest: manifest
    };
  });

  return config;
};

export const CardConfig = generateCardConfig();
export default CardConfig;
```

### Content.js (Refactored)

```javascript
// src/framework/Content.js (renderChart function)

import { getElement } from './PluginLoader';

const renderChart = (ele) => {
  const element = getElement(ele.name);

  if (!element) {
    return (
      <div className="text-center text-red-500">
        Unknown element: {ele.name}
      </div>
    );
  }

  const Component = element.component;
  const settings = element.manifest.settings || {};

  return (
    <Component
      elementId={ele.i}
      settings={settings}
      gridSize={{ w: ele.w, h: ele.h }}
    />
  );
};
```

---

## 8. Element Installation Process

### For System Administrators

```bash
# 1. Download element package
wget https://elements.mosaic.hprc.tamu.edu/packages/new-element-v1.0.0.tar.gz

# 2. Extract to elements directory
tar -xzf new-element-v1.0.0.tar.gz -C /opt/mosaic/elements/

# 3. Verify structure
ls /opt/mosaic/elements/new-element/
# manifest.json  frontend/  backend/  README.md

# 4. Enable element in config
vim /opt/mosaic/config.yml
# Add 'new-element' to plugins.enabled list

# 5. Rebuild Mosaic
cd /opt/mosaic
npm run build
systemctl restart mosaic

# 6. Verify installation
curl http://localhost:5000/api/new-element/health
```

### Validation Script

```bash
#!/bin/bash
# scripts/validate-element.sh

ELEMENT_DIR=$1

echo "Validating element: $ELEMENT_DIR"

# Check required files
required_files=(
  "manifest.json"
  "frontend/component.jsx"
  "frontend/icon.svg"
  "backend/routes.py"
)

for file in "${required_files[@]}"; do
  if [ ! -f "$ELEMENT_DIR/$file" ]; then
    echo "❌ Missing required file: $file"
    exit 1
  fi
done

# Validate manifest.json
python3 scripts/validate-manifest.py "$ELEMENT_DIR/manifest.json"

echo "✅ Element validation passed"
```

---

## 9. Migration Strategy

### Phase 1: Infrastructure (Current)
- Create plugin loading system
- Build registry generator
- Refactor CardConfig and Content
- Convert 1-2 elements as examples
- Test end-to-end flow

### Phase 2: Element Migration (Future)
- Convert remaining 12 elements
- Create migration guide
- Test all elements individually
- Remove old hardcoded system

### Phase 3: External Elements (Future)
- Create element marketplace/repository
- Add element submission process
- Implement element versioning
- Add auto-update system

### Example Elements for Phase 1

**Element 1: Node Utilization** (Complex, has backend)
- Good test of full plugin system
- Multiple API routes
- Real-time data fetching

**Element 2: Help Button** (Simple, minimal backend)
- Tests simple element structure
- Validates form handling
- Good baseline example

---

## 10. Security Considerations

### Element Validation
- Validate manifest.json schema
- Check for required files
- Verify Python code syntax
- Scan for suspicious imports
- Elements run with Mosaic's permissions

### Sandboxing
- Elements share backend context
- No process isolation (build-time)
- Trust model: Admin-approved only
- Future: Consider runtime isolation

### Permissions System
```json
// manifest.json
"permissions": [
  "read:cluster-info",    // Read cluster data
  "write:user-data",      // Modify user data
  "exec:shell-commands"   // Execute shell commands
]
```

---

## 11. Testing Strategy

### Unit Tests
```javascript
// tests/PluginLoader.test.js
import { getElement, getAllElements } from '../src/framework/PluginLoader';

describe('PluginLoader', () => {
  test('loads all enabled elements', () => {
    const elements = getAllElements();
    expect(elements.length).toBeGreaterThan(0);
  });

  test('returns element by ID', () => {
    const element = getElement('node-utilization');
    expect(element).toBeDefined();
    expect(element.manifest.id).toBe('node-utilization');
  });
});
```

### Integration Tests
```python
# tests/test_plugin_routes.py
import unittest
from app import create_app

class TestPluginRoutes(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_element_route_loads(self):
        response = self.client.get('/api/node-utilization/sinfo')
        self.assertEqual(response.status_code, 200)
```

---

## 12. Documentation Requirements

### For Element Developers
- Element structure guide
- Manifest specification
- API reference
- Example element template
- Testing guide

### For System Administrators
- Installation guide
- Configuration reference
- Troubleshooting guide
- Security best practices

### For Users
- Available elements catalog
- Element usage guides
- FAQ

---

## 13. Future Enhancements

### Post-MVP Features
1. **Runtime Plugin Loading**
   - Hot-reload elements without restart
   - React.lazy() for code splitting
   - Admin UI for element management

2. **Element Marketplace**
   - Central repository
   - Version management
   - Dependency resolution
   - One-click installation

3. **Enhanced Security**
   - Element code signing
   - Permission system enforcement
   - Audit logging

4. **User Customization**
   - Per-user element enable/disable
   - Custom element settings
   - Element themes

---

## Appendix A: File Reference

### Complete File Tree (After Implementation)

```
Mosaic/
├── mosaic-system/              # NEW: System directory
│   └── elements/               # NEW: Elements directory
│       ├── node-utilization/
│       ├── help-button/
│       └── ...
│
├── src/
│   ├── framework/
│   │   ├── PluginRegistry.generated.js   # NEW: Auto-generated
│   │   ├── PluginLoader.js               # NEW: Registry access
│   │   ├── ElementCard.jsx               # NEW: Dynamic card
│   │   ├── CardConfig.js                 # MODIFIED
│   │   ├── Content.js                    # MODIFIED
│   │   └── Sidebar.js                    # MODIFIED
│   │
│   └── elements/               # OLD: Will be deprecated
│       └── ...                 # Keep for legacy elements
│
├── views/
│   └── api.py                  # MODIFIED: Dynamic routes
│
├── utils/
│   ├── plugin_loader.py        # NEW: Python loader
│   ├── manifest_validator.py   # NEW: Validation
│   └── config_loader.py        # NEW: Config loading
│
├── scripts/
│   ├── build-plugins.js        # NEW: Build-time scanner
│   └── validate-element.sh     # NEW: Validation script
│
├── schemas/
│   └── element-manifest-v1.json # NEW: JSON schema
│
├── config.yml                  # MODIFIED: Add plugins section
├── webpack.config.js           # MODIFIED: Add prebuild step
├── package.json                # MODIFIED: Add scripts
└── .gitignore                  # MODIFIED: Ignore generated files
```

---

## Appendix B: Example Element Template

See: `mosaic-system/elements/_template/` (to be created)

---

## Appendix C: Migration Checklist

### Converting an Existing Element

- [ ] Create element directory structure
- [ ] Write manifest.json
- [ ] Move React component to frontend/component.jsx
- [ ] Extract backend routes to backend/routes.py
- [ ] Add icon.svg or icon component
- [ ] Update API endpoint paths
- [ ] Test element in isolation
- [ ] Update documentation
- [ ] Add to enabled elements in config.yml
- [ ] Rebuild and verify

---

**Document Version:** 1.0
**Last Updated:** 2025-11-25
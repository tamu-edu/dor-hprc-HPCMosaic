// GridComponent.js
import React from 'react';
import NodeUtilization from '../metrics/NodeUtilization';
// import CoreUtilization from '../metrics/CoreUtilization';
import { METRIC_TYPES } from '../utils/metricTypes.js';

const GridComponent = ({ type }) => {
  switch (type) {
    case METRIC_TYPES.NODE_UTILIZATION:
      return <NodeUtilization />;
    // case METRIC_TYPES.CORE_UTILIZATION:
    //   return <CoreUtilization />;
    // Add more cases as needed
    default:
      return <div>Unknown component type</div>;
  }
};

export default GridComponent;

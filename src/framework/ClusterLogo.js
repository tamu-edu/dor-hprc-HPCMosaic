import React from 'react'
import logo from '../images/Cluster_Logo.png'

const ClusterLogo = ({ className = '' }) => {
  return  (
    <div>
      <a
        href="https://hprc.tamu.edu"
        style={{ display: "block", height: "100%" }}
      >
        <img
          src={logo}
          alt="ACES Logo"
          width="250"
          height="250"
          className={className || 'block w-full h-full object-contain'}
        />
      </a>
    </div>
  );     
};

export default ClusterLogo

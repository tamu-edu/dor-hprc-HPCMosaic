import React from 'react'
import logo from '../images/Cluster_Logo.png'

const ClusterLogo = () => {
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
          className="hidden md:block max-w-[6rem] w-full h-auto p-2"
        />
      </a>
    </div>
  );     
};

export default ClusterLogo

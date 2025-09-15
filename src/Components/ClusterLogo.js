import React from 'react'
import logo from '../images/Cluster_Logo.png'

const ClusterLogo = () => {
  return  (
    <div>
      <img
	src={logo}
	alt="ACES Logo"
	className="hidden md:block max-w-[6rem] w-full h-auto p-2"
      />
    </div>
  );     
};

export default ClusterLogo

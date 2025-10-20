import React from "react";

export default function BannerBackground( { children } ) {

  const svgPattern = `
    <svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' viewBox='0 0 200 50' shape-rendering="crispEdges">
      <defs>
        <pattern id='dots' x='0' y='0' width='24' height='24' patternUnits='userSpaceOnUse' patternTransform='rotate(30)'>
          <circle cx='3' cy='3' r='0.8' fill='white' opacity='0.7'/>
          <circle cx='12' cy='6' r='0.6' fill='white' opacity='0.5'/>
          <circle cx='18' cy='2' r='0.9' fill='white' opacity='0.6'/>
          <circle cx='6' cy='12' r='0.7' fill='white' opacity='0.4'/>
          <circle cx='21' cy='15' r='0.8' fill='white' opacity='0.6'/>
          <circle cx='15' cy='18' r='0.6' fill='white' opacity='0.5'/>
          <circle cx='9' cy='21' r='0.7' fill='white' opacity='0.4'/>
          <circle cx='24' cy='9' r='0.8' fill='white' opacity='0.5'/>
          <circle cx='0' cy='18' r='0.6' fill='white' opacity='0.6'/>
          <circle cx='3' cy='24' r='0.7' fill='white' opacity='0.4'/>
          <circle cx='15' cy='0' r='0.8' fill='white' opacity='0.6'/>
          <circle cx='24' cy='21' r='0.6' fill='white' opacity='0.5'/>
        </pattern>
        <linearGradient id='fadeGradient' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' style='stop-color:white;stop-opacity:1' />
          <stop offset='70%' style='stop-color:white;stop-opacity:0.3' />
          <stop offset='100%' style='stop-color:white;stop-opacity:0' />
        </linearGradient>
      </defs>
      <rect width='200' height='50' fill='#500000'/>
      <rect width='200' height='50' fill='url(#dots)' mask='url(#fadeMask)'/>
      <mask id='fadeMask'>
        <rect width='200' height='50' fill='url(#fadeGradient)'/>
      </mask>
    </svg>
  `;

  return (
      <div
        className="w-full h-32 rounded-md border-b border-gray-300 shadow-sm" 
	style={{
          backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svgPattern)}")`,
	  backgroundPosition: "center"
        }}
      >
        {children}
      </div>
  );
}

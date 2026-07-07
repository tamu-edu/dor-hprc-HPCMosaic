import React from "react";

export default function BannerBackground( { children } ) {
  return (
      <div
        className="mosaic-topbar w-full border-b theme-border flex items-center"
      >
        {children}
      </div>
  );
}

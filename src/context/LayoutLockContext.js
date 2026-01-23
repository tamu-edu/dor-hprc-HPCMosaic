import React, { createContext, useContext } from 'react';

//Create global context for interacting with layout lock state across components
const LayoutLockContext = createContext({
  layoutLocked: false,
  setLayoutLocked: () => {},
});

// Custom hook to access layout lock context
export const useLayoutLock = () => {
  const context = useContext(LayoutLockContext);

  if (!context) {
    throw new Error('useLayoutLock must be used within a LyoutLockProvider.');
  }

  return context;
};

// Provider component to wrap app/components that need layout lock access
export const LayoutLockProvider = ({ children, layoutLocked, setLayoutLocked }) => {
  return (
    <LayoutLockContext.Provider value = {{ layoutLocked, setLayoutLocked }}>
      {children}
    </LayoutLockContext.Provider>
  );
};

export default LayoutLockContext;

import React, { useState, useEffect } from 'react';
import Joyride, { STATUS, ACTIONS } from 'react-joyride';

const DashboardTour = ({ run, setRun }) => {
  // Tour configuration focused just on interactive elements
  const steps = [
    {
      target: '.start-tour-btn',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Dashboard Tour</h3>
          <p>Howdy! Welcome to the cluster dashboard! This quick tour will guide you through the main interactive elements.</p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: 'h1',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Cluster Dashboard</h3>
          <p>This is your central hub for monitoring and managing your cluster resources.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.add-element-btn',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Add Elements</h3>
          <p>Click here to add new widgets and charts to your dashboard.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.LayoutUtility', // Add this class to your LayoutUtility component
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Layout Settings</h3>
          <p>Save, load, and reset your dashboard layout from this menu.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.request-help-container',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Request Help</h3>
          <p>Need assistance? Click here to contact our support team.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.feedback-btn',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Feedback</h3>
          <p>Help us improve by providing your feedback through the Google form.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: 'body',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Tour Complete!</h3>
          <p>You're now ready to use the dashboard. You can restart this tour anytime by clicking the "Start Tour" button.</p>
        </div>
      ),
      placement: 'center',
    }
  ];

  // Handle tour callbacks
  const handleJoyrideCallback = (data) => {
    const { status, action } = data;
    
    // End the tour if it's completed, skipped, or closed
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status) || action === ACTIONS.CLOSE) {
      setRun(false);
      
      // Save completion to localStorage
      localStorage.setItem("hasCompletedTour", "true");
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      scrollToFirstStep={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#3B82F6', // Blue to match your UI
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '8px',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
        },
        buttonNext: {
          backgroundColor: '#3B82F6',
          fontSize: '14px',
        },
        buttonBack: {
          color: '#3B82F6',
          fontSize: '14px',
        },
        buttonSkip: {
          color: '#6B7280',
        }
      }}
      locale={{
        back: 'Previous',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour'
      }}
    />
  );
};

export default DashboardTour;

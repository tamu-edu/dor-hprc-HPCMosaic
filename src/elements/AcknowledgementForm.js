import React, { useState, useEffect } from 'react';
import PopupForm from '../composer/PopupForm';
import acknowledgementRequestSchema from '../composer/schemas/acknowledgementRequest.json';
import config from "../../config.yml";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import ElementDescriptions from "../framework/ElementDescriptions";
import { get_base_url } from "../utils/api_config.js"

const AcknowledgementForm = () => {
  const baseUrl = config.production.dashboard_url;
  const clusterName = (config.production.cluster_name || '').toLowerCase();
  const usesAccessAcknowledgement = ["aces", "launch"].includes(clusterName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [userData, setUserData] = useState({ user: 'unknown', email: '' });

  useEffect(() => {
    fetch(`${baseUrl}/api/user-data`)
      .then(response => response.json())
      .then(data => {
        if (data.user) {
          setUserData(data);
        }
      })
      .catch(error => console.error('Error fetching user data:', error));
  }, [baseUrl]);

  const handleSubmit = async (formData) => {
    // Validate that at least one field is filled
    const doi = formData.get ? formData.get('doi') : formData.doi;
    const additionalInfo = formData.get ? formData.get('additionalInfo') : formData.additionalInfo;

    if ((!doi || doi.trim() === '') && (!additionalInfo || additionalInfo.trim() === '')) {
      const errorMsg = "Please fill in at least one field (DOI or Additional Information).";
      setErrorMessage(errorMsg);
      // Show alert to ensure user sees the error
      alert(errorMsg);
      return false;
    }

    setErrorMessage("");

    if (isSubmitting) {
      console.log('Submission processing, ignoring duplicate click');
      return false;
    }

    setIsSubmitting(true);

    try {
      const helpRequestData = new FormData();
      helpRequestData.append('user', userData.user);
      helpRequestData.append('email', userData.email);
      helpRequestData.append('request_time', new Date().toISOString());
      helpRequestData.append('cluster_name', config.production.cluster_name || 'default');
      helpRequestData.append('help_topic', 'Other');

      let issueDescription = '';
      if (doi && additionalInfo) {
        // Both fields filled - format with DOI first, then additional info on next line
        issueDescription = `DOI: ${doi}\n${additionalInfo}`;
      } else if (additionalInfo) {
        // Only additional info filled
        issueDescription = additionalInfo;
      } else if (doi) {
        // Only DOI filled
        issueDescription = `DOI: ${doi}`;
      }

      helpRequestData.append('issue_description', issueDescription);
      helpRequestData.append('request_type', 'Help');

      const response = await fetch(`${baseUrl}/api/help`, {
        method: 'POST',
        body: helpRequestData,
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ error: 'Submission failed with no specific error message.' }));
        throw new Error(errorResult.error || 'Failed to submit help request');
      }

      const result = await response.json();
      console.log('Help request submitted successfully:', result);

      alert('Help request submitted successfully!');
      return true;

    } catch (error) {
      console.error('Error submitting help request:', error);
      setErrorMessage('Failed to submit help request. Please try again.');
      // We re-throw the error to make sure the PopupForm knows about the failure.
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-2 bg-white rounded-lg overflow-auto w-full h-full">
      <h2 className="text-lg font-semibold mb-2">
        <Tippy content={ElementDescriptions["Acknowledgement Form for Papers using HPRC Resources"]}>
          <span className="cursor-help">Acknowledging HPRC ⓘ</span>
        </Tippy>
      </h2>

      <div className="mb-2">
        <p className="text-gray-600 text-sm mb-2">
          Please acknowledge HPRC when you showcase research or publish a paper that has benefited from Texas A&M HPRC resources.
        </p>
        <p className="text-gray-600 text-sm mb-2">
          {usesAccessAcknowledgement ? (
            <>
              For standard acknowledgement examples acknowledging ACCESS, click{' '}
              <a style={{ color: '#500000' }} href="https://access-ci.org/about/acknowledging-access/" target="_blank" rel="noopener noreferrer">
                https://access-ci.org/about/acknowledging-access/
              </a>
              .
            </>
          ) : (
            <>
              For standard acknowledgment examples and a listing of publications acknowledging HPRC, click{' '}
              <a style={{ color: '#500000' }} href="https://hprc.tamu.edu/research/citations.html" target="_blank" rel="noopener noreferrer">
                here
              </a>
              . Once you acknowledge us, we will add your paper to the publications list on the HPRC website.
            </>
          )}
        </p>
        <div className="flex justify-center">
          <PopupForm
            buttonText="Submit Acknowledgement"
            buttonStyle={{
              backgroundColor: '#500000',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            schema={acknowledgementRequestSchema}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            title="Acknowledgement Form"
            errorMessage={errorMessage || "Please complete the required fields."}
          />
        </div>
      </div>
    </div>
  );
};

export default AcknowledgementForm;

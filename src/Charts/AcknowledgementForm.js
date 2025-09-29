import React, { useState, useEffect } from 'react';
import PopupForm from '../composer/PopupForm';
import acknowledgementRequestSchema from '../composer/schemas/acknowledgementRequest.json';
import config from "../../config.yml";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import ElementDescriptions from "../Components/ElementDescriptions";

const AcknowledgementForm = () => {
  const baseUrl = config.production.dashboard_url;
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
      setErrorMessage("Please fill in at least one field (DOI or Additional Information).");
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
      if (additionalInfo) {
        issueDescription = additionalInfo;
      } else if (doi) {
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
    <div className="p-4 bg-white rounded-lg overflow-auto w-full h-full">
      <h2 className="text-2xl font-semibold mb-4">
        <Tippy content={ElementDescriptions["Acknowledgement Form"]}>
          <span className="cursor-help">Acknowledgement Form ⓘ</span>
        </Tippy>
      </h2>

      <div className="mb-4">
        <p className="text-gray-600 mb-4">
          Submit acknowledgements for papers that used HPRC resources. You must provide either a DOI or additional information. This will create a help ticket.
        </p>

        <PopupForm
          buttonText="Submit Acknowledgement"
          buttonStyle={{
            backgroundColor: '#500000',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
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
  );
};

export default AcknowledgementForm;

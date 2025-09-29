import React, { useState } from 'react';
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
      console.log('Acknowledgement submission processing, ignoring duplicate click');
      return false;
    }

    setIsSubmitting(true);
    console.log('Acknowledgement submitted:', formData);

    try {
      let dataToSubmit;

      // If formData is already a FormData object
      if (formData instanceof FormData) {
        dataToSubmit = formData;
      } else {
        // Convert to FormData
        dataToSubmit = new FormData();
        Object.keys(formData).forEach(key => {
          dataToSubmit.append(key, formData[key]);
        });
      }

      // Add timestamp
      dataToSubmit.append('timestamp', new Date().toISOString());

      const response = await fetch(`${baseUrl}/api/submit_acknowledgement`, {
        method: 'POST',
        body: dataToSubmit
      });

      if (!response.ok) {
        throw new Error('Failed to submit acknowledgement');
      }

      const result = await response.json();
      console.log('Acknowledgement submitted successfully:', result);

      // Show success message or handle response
      alert('Acknowledgement submitted successfully!');

    } catch (error) {
      console.error('Error submitting acknowledgement:', error);
      setErrorMessage('Failed to submit acknowledgement. Please try again.');
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
          Submit acknowledgements for papers that used HPRC resources. You must provide either a DOI or additional information.
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
          title="Submit Acknowledgement"
          errorMessage={errorMessage}
        />
      </div>
    </div>
  );
};

export default AcknowledgementForm;

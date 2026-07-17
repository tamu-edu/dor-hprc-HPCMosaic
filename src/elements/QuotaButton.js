import React, { useRef, useState } from 'react';
import PopupForm from '../composer/PopupForm';
import quotaRequestSchema from '../composer/schemas/quotaRequest.json';
import config from "../../config.yml";
import { get_base_url } from "../utils/api_config.js"

const QuotaButton = ({ disk = null, currentQuota = null, currentFileLimit = null, buttonText = null, buttonClassName = "" }) => {
  const baseUrl = get_base_url();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const isBlockedNonPiLongRequest = (isLongRequest, isPIRequest) => {
    return isLongRequest === 'Yes' && isPIRequest === 'No';
  };

  const validateQuotaReady = (formData) => {
    const isLongRequest = formData.get('isLongRequest');
    const isPIRequest = formData.get('isPIRequest');

    return !isBlockedNonPiLongRequest(isLongRequest, isPIRequest);
  };

  const handleSubmit = async (formData) => {

    if (isSubmitting || submittingRef.current) {
      console.log('Quota submission processing, ignoring duplicate click');
      return false;
    }

    const isLongRequest = formData.get('isLongRequest');
    const isPIRequest = formData.get('isPIRequest');

    if (isBlockedNonPiLongRequest(isLongRequest, isPIRequest)) {
      alert('Only PIs can request quota increases of more than 10 TB, requests longer than 6 months, or quota buy-ins. Please ask your PI to submit the request.');
      return false;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    console.log('Form submitted:', formData);
    
    try {
      let dataToSubmit;
      
      // If formData is already a FormData object
      if (formData instanceof FormData) {
        // Use the existing FormData
        dataToSubmit = formData;
        
        // Debug: log all form fields
        for (let pair of dataToSubmit.entries()) {
          console.log(pair[0], pair[1]);
        }
        
        // Add request_type field - this is crucial for the backend
        dataToSubmit.append('request_type', 'Quota');
        
        // Add confirmBuyin field based on isBuyRequest value
        const isBuyRequest = dataToSubmit.get('isBuyRequest') || 'No';
        dataToSubmit.append('confirmBuyin', isBuyRequest === 'Yes' ? 'yes' : 'no');
        
        // Map field names that don't match what the backend expects
        if (dataToSubmit.has('Optional comments') && !dataToSubmit.has('comment')) {
          dataToSubmit.append('comment', dataToSubmit.get('Optional comments'));
        }
      } else {
        // Convert a regular object to FormData
        dataToSubmit = new FormData();
        
        // Add essential fields
        dataToSubmit.append('request_type', 'Quota');
        dataToSubmit.append('confirmBuyin', formData.isBuyRequest === 'Yes' ? 'yes' : 'no');
        
        // Add the rest of the fields
        for (const [key, value] of Object.entries(formData)) {
          // Handle special cases for field name mapping
          if (key === 'Optional comments') {
            dataToSubmit.append('comment', value);
          } else {
            dataToSubmit.append(key, value);
          }
        }
      }
      
      // Add directory from disk prop if available and not already set
      if (disk && !dataToSubmit.get('directory')) {
        dataToSubmit.append('directory', disk);
      }
      
      // Add cluster_name to the form data
      dataToSubmit.append('cluster_name', config.production.cluster_name || 'default');
      
      // Submit the form data to your Flask API endpoint
      const response = await fetch(`${baseUrl}/api/quota`, {
        method: 'POST',
        body: dataToSubmit,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit quota request');
      }
      
      // Handle either JSON or text response
      const contentType = response.headers.get('content-type');
      let result;
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
        alert(result.message || 'Quota request submitted successfully');
      } else {
        result = await response.text();
        alert(result || 'Quota request submitted successfully');
      }
      
      // Return true to indicate success
      return true;
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`Error: ${error.message}`);
      
      // Return false to indicate failure
      return false;
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Create default values object if disk info was provided
  const defaultValues = {};
  
  if (disk) {
    defaultValues.directory = disk;
    
    if (currentQuota) {
      // Extract just the number part if it includes units
      const quotaMatch = currentQuota.match(/(\d+(\.\d+)?)/);
      defaultValues.currentQuota = quotaMatch ? quotaMatch[1] : "1";
    }
    
    if (currentFileLimit) {
      defaultValues.currentFileLimit = currentFileLimit;
    }
    
    // Set request type default to "New Request"
    defaultValues.requestType = "New Request";
  }

  const disclaimerText = [
    "Only owners of the storage space can request a quota increase.",
    "Quota requests are subject to review and approval by HPRC administrators. Please provide a strong and detailed justification for your request.",
    "Only a PI can request quota increases exceeding 10 TB or lasting more than six months. These requests require approval from the HPRC Director."
  ];

  return (
    <PopupForm
      buttonText={buttonText || (disk ? "Request" : "Request Quota Increase")}
      schema={quotaRequestSchema}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      title={disk ? `Quota Increase for ${disk}` : "Quota Increase Request"}
      disclaimerText={disclaimerText}
      defaultValues={defaultValues}
      validateFormReady={validateQuotaReady}
      buttonStyle={{
        backgroundColor: 'var(--mosaic-color-primary)',
        color: 'var(--mosaic-color-primary-text)',
        border: 'none',
        padding: disk ? '6px 12px' : '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: disk ? '12px' : '14px',
        fontWeight: '500'
      }}
      buttonClassName={buttonClassName || (disk ? "inline-button" : "")}
      errorMessage="Enter either a disk quota or a file limit."
    />
  );
};

export default QuotaButton;

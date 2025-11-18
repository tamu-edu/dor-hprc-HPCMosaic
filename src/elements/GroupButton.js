import React, { useState } from 'react';
import PopupForm from '../composer/PopupForm';
import groupRequestSchema from '../composer/schemas/groupRequest.json';
import config from "../../config.yml";
import { get_base_url } from "../utils/api_config.js"

const GroupButton = () => {
  const baseUrl = get_base_url();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData) => {
    if (isSubmitting) return false;

    setIsSubmitting(true);
    console.log('Group form submitted:', formData);
  
    try {
      let dataToSubmit;
  
      // If formData is already a FormData object
      if (formData instanceof FormData) {
        // Use the existing FormData
        dataToSubmit = formData;
  
        // Add request_type field
        dataToSubmit.append('request_type', 'Group');
        
        // Debug: log all form fields
        console.log("Form data being submitted (as FormData):");
        for (let pair of dataToSubmit.entries()) {
          console.log(pair[0], pair[1]);
        }
      } else {
        // Convert a regular object to FormData
        dataToSubmit = new FormData();
  
        // Add request_type field
        dataToSubmit.append('request_type', 'Group');
  
        // Add the rest of the fields
        for (const [key, value] of Object.entries(formData)) {
          console.log("Adding field:", key, value); // Log each field being added
          dataToSubmit.append(key, value);
        }
      }
  
      // Add cluster_name to the form data
      dataToSubmit.append('cluster_name', config.production.cluster_name || 'default');
  
      // Submit the form data to your Flask API endpoint
      const response = await fetch(`${baseUrl}/api/group`, {
        method: 'POST',
        body: dataToSubmit,
      });
  
      // Log the response status
      console.log(`Response status: ${response.status}`);
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit group request');
      }
  
      // Handle both JSON and text responses
      const contentType = response.headers.get('content-type');
      let result;
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
        alert(result.message || 'Group request submitted successfully');
      } else {
        result = await response.text();
        alert(result || 'Group request submitted successfully');
      }
  
      // Return true to indicate success
      return true;
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`Error: ${error.message}`);
  
      // Return false to indicate failure
      return false;
    } finally {
       setIsSubmitting(false);
    }
  };
  

  const disclaimerText = [
    "Group operations require appropriate permissions",
    "Only group owners and delegates can add or remove members",
    "New group names must follow naming guidelines (no spaces, only underscores and hyphens allowed)",
    "Requesting access to restricted groups may require approval from the group owner"
  ];

  return (
    <PopupForm
      buttonText="Group Management"
      schema={groupRequestSchema}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      title="Group Request"
      disclaimerText={disclaimerText}
      buttonStyle={{
        backgroundColor: 'maroon',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
      }}
      errorMessage="Please fill in all required fields."
    />
  );
};

export default GroupButton;

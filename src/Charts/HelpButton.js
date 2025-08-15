import React, { useState }  from 'react';
import PopupForm from '../composer/PopupForm';
import helpRequestSchema from '../composer/schemas/helpRequest.json';
import config from "../../config.yml";

const HelpButton = ({ buttonText = "Help Request", buttonStyle = {} }) => {
  const baseUrl = config.production.dashboard_url;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData) => {
    if (isSubmitting) return false;
    setIsSubmitting(true);

    console.log('Help form submitted:', formData);
  
    
    try {
      let dataToSubmit;
  
      if (formData instanceof FormData) {
        dataToSubmit = formData;
      } else {
        dataToSubmit = new FormData();
        for (const [key, value] of Object.entries(formData)) {
          console.log("Adding field:", key, value);
          dataToSubmit.append(key, value);
        }
      }
  
      // 🧠 Move these *after* the FormData is guaranteed to be ready
      const helpType = dataToSubmit.get('helpRequest');
      const accountType = dataToSubmit.get('accountType');
      const isSoftware = helpType === 'software';
      const isPurchase = helpType === 'accounts' && accountType === 'purchase';
  
      const endpoint = isSoftware
        ? '/api/software'
        : isPurchase
          ? '/api/account'
          : '/api/help';
  
      // Ensure expected software fields exist (avoid backend crash from missing fields)
      if (isSoftware) {
        const requiredSoftwareFields = [
          'softwareName',
          'softwareVersion',
          'softwareLink',
          'softwareToolChain',
          'softwareInfo',
          'softwareCategory'
        ];
        for (const field of requiredSoftwareFields) {
          if (!dataToSubmit.has(field)) {
            dataToSubmit.set(field, '');
          }
        }
      }
  
      dataToSubmit.set('request_type', isSoftware ? 'Software' : isPurchase ? 'Account' : 'Help');
      dataToSubmit.set('cluster_name', config.production.cluster_name || 'default');
  
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        body: dataToSubmit,
      });
  
      console.log(`Response status: ${response.status}`);
  
      const contentType = response.headers.get('content-type');
      let result;
  
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
        console.log("Response body:", result);
        if (!response.ok) {
          throw new Error(result.error || 'Submission failed');
        }
        alert(result.message || "Help request submitted successfully.");
      } else {
        result = await response.text();
        if (!response.ok) {
          throw new Error(result || 'Submission failed');
        }
        alert(result || "Help request submitted successfully.");
      }
  
      return true;
    } catch (err) {
      console.error("Error submitting help request:", err.message);
      alert("There was an error submitting your help request. Please try again later.");
      return false;
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  

  const disclaimerText = [];

  return (
    <PopupForm
      buttonText={buttonText}
      schema={helpRequestSchema}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      title="Help Request"
      disclaimerText={disclaimerText}
      buttonStyle={buttonStyle}
      errorMessage="Please complete the required fields."
    />
  );
};

export default HelpButton;

import React from 'react';
import PopupForm from '../composer/PopupForm';
import quotaRequestSchema from '../composer/schemas/quotaRequest.json';

const QuotaButton = () => {
  const handleSubmit = async (formData) => {
    console.log('Form submitted:', formData);
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }
  };

  const disclaimerText = [
    "Only Owners of the individual disk space can request the quota increase",
    "Quota requests are subject to review and approval by HPRC admins. Please provide a strong and detailed justification for this request.",
    "Only a PI can request quota increases that exceed 10 TB or last more than six months. These requests need approval from the HPRC Director."
  ];

  return (
    <PopupForm
      buttonText="Request Quota Increase"
      schema={quotaRequestSchema}
      onSubmit={handleSubmit}
      title="Quota Increase Request"
      disclaimerText={disclaimerText}
      buttonStyle={{
        backgroundColor: 'maroon',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
      errorMessage="Either Disk Quota or File Limit must be filled."
    />
  );
};

export default QuotaButton;

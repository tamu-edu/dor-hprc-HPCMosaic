import React from 'react';
import PopupForm from '../composer/PopupForm';
import helpRequestSchema from '../composer/schemas/helpRequest.json';

const HelpButton = () => {
  const handleSubmit = async (formData) => {
    console.log('Form submitted:', formData);
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }
  };

  const disclaimerText = [];

  return (
    <PopupForm
      buttonText="Help Request"
      schema={helpRequestSchema}
      onSubmit={handleSubmit}
      title="Help Request"
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

export default HelpButton;

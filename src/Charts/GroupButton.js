import React from 'react';
import PopupForm from '../composer/PopupForm';
import groupRequestSchema from '../composer/schemas/groupRequest.json';

const GroupButton = () => {
  const handleSubmit = async (formData) => {
    console.log('Form submitted:', formData);
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }
  };

  const disclaimerText = [];

  return (
    <PopupForm
      buttonText="Group Request"
      schema={groupRequestSchema}
      onSubmit={handleSubmit}
      title="Group Request"
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

export default GroupButton;

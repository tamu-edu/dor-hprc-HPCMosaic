import React from 'react';
import PopupForm from '../composer/PopupForm';

const QuotaButton = () => {
  const schema = {
    initialCheck: {
      type: "rowContainer",
      label: "Request Type",
      elements: {
        isLongRequest: {
          type: "radioGroup",
          label: "Is this request more than 10TB or for longer than 6 months?",
          name: "isLongRequest",
          options: [
            { value: "No", label: "No" },
            { value: "Yes", label: "Yes" }
          ]
        }
      }
    },
    requestDetails: {
      type: "rowContainer",
      label: "Request Details",
      condition: "isLongRequest.No",
      elements: {
        requestType: {
          type: "radioGroup",
          label: "Request Type",
          name: "requestType",
          options: [
            { value: "New Request", label: "New Request" },
            { value: "Extension", label: "Extension" }
          ]
        },
        emailId: {
          type: "text",
          label: "Email ID",
          name: "emailId"
        }
      }
    },
    quotaDetails: {
      type: "rowContainer",
      label: "Quota Information",
      condition: "isLongRequest.No",
      elements: {
        quotaContainer: {
          type: "rowContainer",
          elements: {
            currentQuota: {
              type: "unit",
              label: "Current Quota",
              name: "currentQuota",
              value: "1",
              units: [{ label: "TB", value: "TB" }]
            },
            newQuota: {
              type: "unit",
              label: "New Quota",
              name: "newQuota",
              units: [{ label: "TB", value: "TB" }]
            }
          }
        },
        fileContainer: {
          type: "rowContainer",
          elements: {
            currentFileLimit: {
              type: "text",
              label: "Current File Limit",
              name: "currentFileLimit",
              value: "250000"
            },
            newFileLimit: {
              type: "text",
              label: "New File Limit",
              name: "newFileLimit"
            }
          }
        }
      }
    },
    justification: {
      type: "rowContainer",
      label: "Request Justification",
      condition: "isLongRequest.No",
      elements: {
        piAwareness: {
          type: "textarea",
          label: "Is the PI aware of this request?",
          name: "piAwareness",
          help: "Please provide details of PI's awareness and approval"
        },
        storedData: {
          type: "textarea",
          label: "What data is stored with the requested quota?",
          name: "storedData",
          help: "Describe the type and nature of data to be stored"
        },
        researchDescription: {
          type: "textarea",
          label: "Research Project Description",
          name: "researchDescription",
          help: "Briefly describe the research project that will be supported by the requested storage"
        }
      }
    },
    technicalDetails: {
      type: "rowContainer",
      label: "Technical Details",
      condition: "isLongRequest.No",
      elements: {
        jobSize: {
          type: "textarea",
          label: "Input/Output Size",
          name: "jobSize",
          help: "What is the input/output size of the job?"
        },
        storagePlan: {
          type: "textarea",
          label: "Long-term Storage Plan",
          name: "storagePlan",
          help: "What is your long-term storage plan for your data after the quota increase expires?"
        },
        comment: {
          type: "textarea",
          label: "Additional Comments",
          name: "comment",
          help: "Any additional information you would like to provide (Optional)"
        }
      }
    },
    verification: {
      type: "rowContainer",
      label: "Verification",
      condition: "isLongRequest.No",
      elements: {
        verifyCompress: {
          type: "checkbox",
          label: "I verify that I will remove any unnecessary data and compress files/folders to save shared resources.",
          name: "verifyCompress",
          value: "Yes"
        }
      }
    }
  };

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
      schema={schema}
      onSubmit={handleSubmit}
      title="Quota Increase Request"
      disclaimerText={disclaimerText}
      buttonStyle={{
        backgroundColor: '#500000',
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

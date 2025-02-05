import React, { useState } from 'react';
import ComposerWrapper from '../composer/ComposerWrapper';

const Composer = () => {
  const schema = {
    fileUploader: {
      type: "uploader",
      label: "Upload files",
      help: "Upload your files here"
    },
    ContainerTasks: {
      type: "rowContainer",
      label: "Tasks",
      elements: {
        tasks: {
          type: "number",
          label: "Number of tasks",
          help: "Number of tasks to run",
          name: "tasks",
          value: "1"
        },
        cpus: {
          type: "number",
          label: "CPUs per task",
          help: "Number of CPUs per task",
          name: "cpus",
          value: "1",
          max: "48"
        }
      }
    },
    ContainerGPU: {
      type: "rowContainer",
      label: "GPU",
      elements: {
        gpuDropdown: {
          type: "select",
          label: "Use Accelerator",
          name: "gpu",
          options: [
            { value: "", label: "NONE" },
            { value: "a100", label: "A100" },
            { value: "rtx6000", label: "RTX 6000" }
          ]
        }
      }
    }
  };

  const handleSubmit = async (formData) => {
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Submission failed');
      }
      
      const data = await response.json();
      console.log('Success:', data);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  };

  const handlePreview = async (formData) => {
    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Preview failed');
      }
      
      const preview = await response.json();
      console.log('Preview:', preview);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  };

  const handleFileChange = (files) => {
    console.log('Files updated:', files);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <ComposerWrapper
        schema={schema}
        onSubmit={handleSubmit}
        onPreview={handlePreview}
        onFileChange={handleFileChange}
        apiEndpoint="/api/submit"
        title="Job Configuration"
        className="job-composer"
      />
    </div>
  );
};

export default Composer;

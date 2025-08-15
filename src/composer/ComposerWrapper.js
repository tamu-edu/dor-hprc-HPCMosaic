import React, { useState, useRef, useContext, createContext, useMemo, useEffect } from "react";
import Composer from "./schemaRendering/Composer";
import "./ComposerStyles.css";

export const GlobalFilesContext = createContext();

const ComposerWrapper = ({
  schema,
  onSubmit,
  onClose,
  title = "Form Builder",
  apiEndpoint,
  onFileChange,
  className = "",
  defaultValues = {},
  isSubmitting = false
}) => {
  const [error, setError] = useState(null);
  const [globalFiles, setGlobalFiles] = useState([]);
  const formRef = useRef(null);
  const composerRef = useRef(null);
  const memoizedSchema = useMemo(() => schema, []);
  const defaultsAppliedRef = useRef(false);

  useEffect(() => {
    if (composerRef.current && Object.keys(defaultValues).length > 0 && !defaultsAppliedRef.current) {
      composerRef.current.setValues(defaultValues);
      defaultsAppliedRef.current = true;
    }
  }, []);

  const handleUploadedFiles = (files) => {
    let combinedFiles = Array.from(new Set([...globalFiles, ...files]));
    setGlobalFiles(combinedFiles);
    onFileChange?.(combinedFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) {
      console.log('Form submission already in progess');
      return;
    }

    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    globalFiles.forEach((file) => {
      formData.append("files[]", file);
    });
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClose = async (e) => {
    e.preventDefault();
    if (!formRef.current || !onClose) return;
    const formData = new FormData(formRef.current);
    globalFiles.forEach((file) => {
      formData.append("files[]", file);
    });
    try {
      await onClose(formData);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <GlobalFilesContext.Provider value={{ globalFiles, setGlobalFiles }}>
      <div className={`composer-wrapper ${className}`}>
        <div className="form-card">
          <div className="form-header">
            <h2>{title}</h2>
            {error && (
              <div className="error-message">
                <span>{typeof error === 'string' ? error : error.message || 'An error occurred'}</span>
                <button onClick={() => setError(null)}>✕</button>
              </div>
            )}
          </div>
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="form-content"
          >
            <Composer
              ref={composerRef}
              fields={memoizedSchema}
              setError={setError}
              onFileChange={handleUploadedFiles}
            />
          </form>
          <div className="form-footer">
            <div className="button-group">
              <button
	        type="submit"
	        onClick={handleSubmit}
	        className="btn btn-primary"
	        disabled={isSubmitting}
	        style={{
		  opacity: isSubmitting ? 0.6 : 1,
		  cursor: isSubmitting ? 'not-allowed' : 'pointer'
		}}
	      >
	        {isSubmitting ? 'Submitting...' : 'Submit'}
	      </button>
              
	      {onClose && (
                <button type="button" onClick={handleClose} className="btn btn-secondary">
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </GlobalFilesContext.Provider>
  );
};

export const useGlobalFiles = () => {
  const context = useContext(GlobalFilesContext);
  if (!context) {
    throw new Error('useGlobalFiles must be used within a ComposerWrapper');
  }
  return context;
};

export default ComposerWrapper;

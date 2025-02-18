import React, { useState, useRef, useContext, createContext, useMemo } from "react";
import Composer from "./schemaRendering/Composer";
import "./ComposerStyles.css";

export const GlobalFilesContext = createContext();

const ComposerWrapper = ({
  schema,
  onSubmit,
  onPreview,
  title = "Form Builder",
  apiEndpoint,
  onFileChange,
  className = ""
}) => {
  const [error, setError] = useState(null);
  const [globalFiles, setGlobalFiles] = useState([]);
  const formRef = useRef(null);
  const composerRef = useRef(null);

  const memoizedSchema = useMemo(() => schema, []);

  const handleUploadedFiles = (files) => {
    let combinedFiles = Array.from(new Set([...globalFiles, ...files]));
    setGlobalFiles(combinedFiles);
    onFileChange?.(combinedFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  const handlePreview = async (e) => {
    e.preventDefault();
    if (!formRef.current || !onPreview) return;
    const formData = new FormData(formRef.current);
    globalFiles.forEach((file) => {
      formData.append("files[]", file);
    });
    try {
      await onPreview(formData);
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
                <span>{error}</span>
                <button onClick={() => setError(null)}>✕</button>
              </div>
            )}
          </div>
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            action={apiEndpoint}
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
              <button type="submit" className="btn btn-primary">
                Submit
              </button>
              {onPreview && (
                <button 
                  type="button" 
                  onClick={handlePreview} 
                  className="btn btn-secondary"
                >
                  Preview
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

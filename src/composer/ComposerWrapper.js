import React, { useState, useRef, useContext, createContext, useMemo } from "react";
import Composer from "./schemaRendering/Composer";

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
      <div className={className}>
        <h2>{title}</h2>
        {error && (
          <div style={{ color: 'red', marginBottom: '1rem' }}>
            {error}
            <button onClick={() => setError(null)} style={{ float: 'right' }}>✕</button>
          </div>
        )}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          encType="multipart/form-data"
          action={apiEndpoint}
        >
          <Composer
            ref={composerRef}
            fields={memoizedSchema}
            setError={setError}
            onFileChange={handleUploadedFiles}
          />
          <div style={{ marginTop: '1rem' }}>
            <button type="submit">Submit</button>
            {onPreview && (
              <button type="button" onClick={handlePreview} style={{ marginLeft: '0.5rem' }}>
                Preview
              </button>
            )}
          </div>
        </form>
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

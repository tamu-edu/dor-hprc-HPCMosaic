import React, { useState, useRef, useContext, createContext, useMemo, useEffect } from "react";
import Composer from "./schemaRendering/Composer";
import RequiredFieldsModal from "./RequiredFieldsModal";
import { validateRequiredFields } from "./schemaRendering/utils/fieldUtils";
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
  isSubmitting = false,
  validateFormReady
}) => {
  const [error, setError] = useState(null);
  const [globalFiles, setGlobalFiles] = useState([]);
  const [showRequiredFieldsModal, setShowRequiredFieldsModal] = useState(false);
  const [missingRequiredFields, setMissingRequiredFields] = useState([]);
  const [isFormReady, setIsFormReady] = useState(false);
  
  const formRef = useRef(null);
  const composerRef = useRef(null);
  const memoizedSchema = useMemo(() => schema, []);
  const defaultsAppliedRef = useRef(false);
  const readinessTimerRef = useRef(null);

  const updateFormReadiness = () => {
    if (!composerRef.current) {
      setIsFormReady(false);
      return;
    }

    const currentFields = composerRef.current.getFields();
    const validation = validateRequiredFields(currentFields);
    const customValidation = validateFormReady?.(currentFields);

    setIsFormReady(validation.isValid && customValidation !== false);
  };

  const scheduleReadinessUpdate = () => {
    if (readinessTimerRef.current) {
      clearTimeout(readinessTimerRef.current);
    }

    readinessTimerRef.current = setTimeout(() => {
      updateFormReadiness();
      readinessTimerRef.current = null;
    }, 0);
  };

  useEffect(() => {
    if (composerRef.current && Object.keys(defaultValues).length > 0 && !defaultsAppliedRef.current) {
      composerRef.current.setValues(defaultValues);
      defaultsAppliedRef.current = true;
    }
    scheduleReadinessUpdate();
    return () => {
      if (readinessTimerRef.current) {
        clearTimeout(readinessTimerRef.current);
      }
    };
  }, []);

  const handleUploadedFiles = (files) => {
    let combinedFiles = Array.from(new Set([...globalFiles, ...files]));
    setGlobalFiles(combinedFiles);
    onFileChange?.(combinedFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) {
      console.log('Form submission already in progress');
      return;
    }

    // Validate required fields before submission
    if (composerRef.current) {
      const currentFields = composerRef.current.getFields();
      const validation = validateRequiredFields(currentFields);
      const customValidation = validateFormReady?.(currentFields);
      if (!validation.isValid || customValidation === false) {
        setMissingRequiredFields(validation.missingFields);
        if (!validation.isValid) {
          setShowRequiredFieldsModal(true);
        }
        setIsFormReady(false);
        return;
      }
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
                <button className="non-draggable" onClick={() => setError(null)}>✕</button>
              </div>
            )}
          </div>
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            onChange={scheduleReadinessUpdate}
            onInput={scheduleReadinessUpdate}
            encType="multipart/form-data"
            className="non-draggable form-content"
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
                className="non-draggable btn btn-primary"
                disabled={isSubmitting || !isFormReady}
                style={{
                  opacity: (isSubmitting || !isFormReady) ? 0.6 : 1,
                  cursor: (isSubmitting || !isFormReady) ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
              {onClose && (
                <button type="button" onClick={handleClose} className="non-draggable btn btn-secondary">
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <RequiredFieldsModal
        isOpen={showRequiredFieldsModal}
        onClose={() => setShowRequiredFieldsModal(false)}
        missingFields={missingRequiredFields}
      />
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

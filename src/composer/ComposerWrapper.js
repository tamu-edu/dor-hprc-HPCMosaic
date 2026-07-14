import React, { useState, useRef, useContext, createContext, useMemo, useEffect, useCallback } from "react";
import Composer from "./schemaRendering/Composer";
import RequiredFieldsModal from "./RequiredFieldsModal";
import "./ComposerStyles.css";
import "./RequiredFieldsModal.css";

export const GlobalFilesContext = createContext();

const collectRequiredFields = (fields, requiredFields = new Map()) => {
  Object.values(fields || {}).forEach((field) => {
    if (!field || typeof field !== "object") return;

    if (field.required && field.name && !requiredFields.has(field.name)) {
      requiredFields.set(field.name, {
        name: field.name,
        label: field.label || field.name,
        type: field.type
      });
    }

    if (field.elements) {
      collectRequiredFields(field.elements, requiredFields);
    }
  });

  return Array.from(requiredFields.values());
};

const hasFormValue = (values) => values.some((value) => {
  if (value instanceof File) return value.size > 0;
  return String(value).trim() !== "";
});

const getRenderedFieldLabel = (form, field) => {
  const label = Array.from(form.querySelectorAll("label"))
    .find((candidate) => candidate.htmlFor === field.name);

  return label?.textContent?.trim() || field.label;
};

const validateRenderedRequiredFields = (form, requiredFields) => {
  const formData = new FormData(form);
  const missingFields = requiredFields
    .filter((field) => {
      // Inactive conditional branches are not rendered by Composer.
      if (!form.elements.namedItem(field.name)) return false;
      return !hasFormValue(formData.getAll(field.name));
    })
    .map((field) => ({
      ...field,
      label: getRenderedFieldLabel(form, field)
    }));

  return {
    formData,
    isValid: missingFields.length === 0,
    missingFields
  };
};

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
  const requiredFields = useMemo(() => collectRequiredFields(schema), [schema]);
  const defaultsAppliedRef = useRef(false);
  const readinessFrameRef = useRef(null);

  const updateFormReadiness = useCallback(() => {
    if (!formRef.current) {
      setIsFormReady(false);
      return;
    }

    const validation = validateRenderedRequiredFields(formRef.current, requiredFields);
    const customValidation = validateFormReady?.(validation.formData);

    setIsFormReady(validation.isValid && customValidation !== false);
  }, [requiredFields, validateFormReady]);

  const scheduleReadinessUpdate = useCallback(() => {
    if (readinessFrameRef.current !== null) {
      cancelAnimationFrame(readinessFrameRef.current);
    }

    readinessFrameRef.current = requestAnimationFrame(() => {
      readinessFrameRef.current = null;
      updateFormReadiness();
    });
  }, [updateFormReadiness]);

  useEffect(() => {
    if (composerRef.current && Object.keys(defaultValues).length > 0 && !defaultsAppliedRef.current) {
      composerRef.current.setValues(defaultValues);
      defaultsAppliedRef.current = true;
    }
    scheduleReadinessUpdate();
  }, [defaultValues, scheduleReadinessUpdate]);

  useEffect(() => {
    if (!formRef.current) return undefined;

    const observer = new MutationObserver(scheduleReadinessUpdate);
    observer.observe(formRef.current, { childList: true, subtree: true });
    scheduleReadinessUpdate();

    return () => {
      observer.disconnect();
      if (readinessFrameRef.current !== null) {
        cancelAnimationFrame(readinessFrameRef.current);
        readinessFrameRef.current = null;
      }
    };
  }, [scheduleReadinessUpdate]);

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

    if (!formRef.current) return;

    // Validate the controls that are currently rendered before submission.
    const validation = validateRenderedRequiredFields(formRef.current, requiredFields);
    const customValidation = validateFormReady?.(validation.formData);
    if (!validation.isValid || customValidation === false) {
      setMissingRequiredFields(validation.missingFields);
      if (!validation.isValid) {
        setShowRequiredFieldsModal(true);
      }
      setIsFormReady(false);
      return;
    }

    const formData = validation.formData;
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

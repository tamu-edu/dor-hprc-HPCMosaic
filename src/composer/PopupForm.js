//Imports
import React, { useState, memo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ComposerWrapper from './ComposerWrapper';

//Context Import
import { useLayoutLock } from '../context/LayoutLockContext';

const Modal = memo(({ schema, defaultValues, onSubmit, onClose, title, disclaimerText, errorMessage, isSubmitting, validateFormReady }) => {
  const modalRef = useRef(null);

  const handleClickOutside = useCallback((event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      onClose();
    }
  }, [onClose]);

  //Mousehandler for clicking outside popup form
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  //Mousehandler for clicking escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  //LayoutLocked
  const { layoutLocked, setLayoutLocked } = useLayoutLock();
  const originalLockState = useRef(layoutLocked);

  useEffect(() => {
    originalLockState.current = layoutLocked;
    setLayoutLocked(true);
    
    return () => {
      setLayoutLocked(originalLockState.current);
    };
  }, []);


  useEffect(() => {
    const preventDrag = (e) => {
      console.log('preventDrag called on:', e.type);
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('dragstart', preventDrag);

    document.addEventListener('drop', preventDrag);

    return () => {
      document.removeEventListener('dragstart', preventDrag);
      document.removeEventListener('drop', preventDrag);
    };
  }, []);

  return createPortal(
    <div className="composer-modal-overlay" role="presentation">
      <div
        ref={modalRef}
        className="composer-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="non-draggable composer-modal-close"
          aria-label="Close form"
        >
          ×
        </button>

        <div className="composer-modal-body">
          {disclaimerText?.length > 0 && (
            <aside className="composer-notice" aria-label="Important information">
              <div className="composer-notice-title">
                Important Information
              </div>
              <ul className="composer-notice-list">
                {disclaimerText.map((text) => (
                  <li key={text} className="composer-notice-item">
                    {text}
                  </li>
                ))}
              </ul>
            </aside>
          )}
          
          <ComposerWrapper
            schema={schema}
            defaultValues={defaultValues}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            validateFormReady={validateFormReady}
            onClose={onClose}
            title={title}
            className="popup-form"
            errorMessage={errorMessage}
          />
        </div>
      </div>
    </div>,
    document.body
  );
});

const PopupForm = ({
  buttonText = "Open Form",
  buttonStyle = {},
  buttonClassName = "",
  schema,
  defaultValues = {},
  onSubmit,
  isSubmitting = false,
  title = "Form",
  disclaimerText,
  errorMessage,
  validateFormReady
}) => {
  const [showModal, setShowModal] = useState(false);

  const defaultButtonStyle = {
    backgroundColor: 'var(--mosaic-color-primary)',
    color: 'var(--mosaic-color-primary-text)',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    ...buttonStyle
  };

  const handleSubmit = async (formData) => {
    try {
      const result = await onSubmit(formData);
      if (result !== false) {
        setShowModal(false);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleClose = useCallback(() => {
    setShowModal(false);
  }, []);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={defaultButtonStyle}
        className={`non-draggable ${buttonClassName}`.trim()}
      >
        {buttonText}
      </button>

      {showModal && (
        <Modal
          schema={schema}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          validateFormReady={validateFormReady}
          onClose={handleClose}
          title={title}
          disclaimerText={disclaimerText}
          errorMessage={errorMessage}
        />
      )}
    </>
  );
};

export default PopupForm;

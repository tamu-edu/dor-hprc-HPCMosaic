import React, { useState, memo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ComposerWrapper from './ComposerWrapper';

const Modal = memo(({ schema, defaultValues, onSubmit, onClose, title, disclaimerText, errorMessage }) => {
  const modalRef = useRef(null);

  const handleClickOutside = useCallback((event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div ref={modalRef} style={{
        backgroundColor: 'white',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative',
        borderRadius: '4px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666',
            padding: '4px 12px',
            zIndex: 1
          }}
        >
          ×
        </button>

        <div style={{ padding: '20px' }}>
          {disclaimerText && (
            <div style={{
              borderBottom: '1px solid #e5e7eb',
              marginBottom: '24px',
              paddingBottom: '16px'
            }}>
              <div style={{
                fontSize: '15px',
                fontWeight: '500',
                color: '#500000',
                marginBottom: '12px'
              }}>
                Important Information
              </div>
              {disclaimerText.map((text, index) => (
                <div key={index} style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '8px',
                  color: '#500000',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  <span style={{ minWidth: '15px' }}>{index + 1}.</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          )}
          
          <ComposerWrapper
            schema={schema}
            defaultValues={defaultValues}
            onSubmit={onSubmit}
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
  title = "Form",
  disclaimerText,
  errorMessage
}) => {
  const [showModal, setShowModal] = useState(false);

  const defaultButtonStyle = {
    backgroundColor: '#500000',
    color: 'white',
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
      await onSubmit(formData);
      setShowModal(false);
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
        className={buttonClassName}
      >
        {buttonText}
      </button>

      {showModal && (
        <Modal
          schema={schema}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
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

/**
 * @name StaticText
 * @description Displays static text content. Can show plain text or HTML content.
 *
 * @example
 * // Basic static text
 * {
 *   "type": "staticText",
 *   "name": "infoText",
 *   "label": "Information",
 *   "value": "This is some static text",
 *   "help": "Simple static text display"
 * }
 *
 * @property {string} name - Input field name
 * @property {string} [label] - Display label for the field
 * @property {boolean} [labelOnTop=false] - Whether to display label above the content
 * @property {string} [help] - Help text displayed below the content
 * @property {string} [value] - Static text content
 * @property {boolean} [allowHtml=false] - Whether to render content as HTML using dangerouslySetInnerHTML
 * @property {boolean} [isHeading=false] - Whether to style the text as a heading with larger, bold font
 */

import React, { useState, useEffect, useContext } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import { FormValuesContext } from "../FormValuesContext";
import { getFieldValue } from "../utils/fieldUtils";

function StaticText(props) {
  const [content, setContent] = useState(props.value || "");

  const { values: formValues, updateValue } = useContext(FormValuesContext);

  // Update form context whenever content changes (for conditional logic)
  useEffect(() => {
    const currentContextValue = getFieldValue(formValues, props.name);

    if (updateValue && props.name && currentContextValue != content) {
      updateValue(props.name, content);
    }
  }, [content, updateValue, props.name, formValues]);

  const createMarkup = (html) => {
    return { __html: html };
  };

  useEffect(() => {
    setContent(props.value || "");
  }, [props.value]);

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
      useLabel={props.useLabel}
    >
      <div className="py-2 position-relative">
        {props.allowHtml ? (
          <div
            className={`${props.isHeading ? 'text-xl font-bold' : ''}`}
            dangerouslySetInnerHTML={createMarkup(content)}
          />
        ) : (
          <span className={`${props.isHeading ? 'text-xl font-bold' : ''}`} style={{ whiteSpace: 'pre-line' }}>
            {content}
          </span>
        )}
      </div>
    </FormElementWrapper>
  );
}

export default StaticText;

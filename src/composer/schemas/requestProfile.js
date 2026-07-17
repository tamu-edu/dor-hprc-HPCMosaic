import config from '../../../config.yml';

// Webpack includes every request schema in this context at build time. This
// keeps profile lookup data-driven without hardcoding cluster names.
const requestSchemas = require.context('./requests', true, /\.json$/);
const availableSchemas = new Set(requestSchemas.keys());

const schemaPath = (profile, fileName) => `./${profile}/${fileName}`;

// yaml-loader preserves values inherited through a YAML anchor under "<<".
// Resolve those values before applying explicit production overrides.
const productionConfig = {
  ...(config.production?.['<<'] || {}),
  ...(config.production || {})
};

export const getRequestProfile = () =>
  String(productionConfig.cluster_name || '').trim().toLowerCase();

export const loadRequestSchema = (fileName) => {
  const profilePath = schemaPath(getRequestProfile(), fileName);
  const defaultPath = schemaPath('default', fileName);
  const resolvedPath = availableSchemas.has(profilePath) ? profilePath : defaultPath;

  if (!availableSchemas.has(resolvedPath)) {
    throw new Error(`Request schema not found: ${fileName}`);
  }

  const schemaModule = requestSchemas(resolvedPath);
  return schemaModule.default || schemaModule;
};

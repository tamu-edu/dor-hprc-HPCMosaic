const sharedGets = new Map();
const DEFAULT_MAX_AGE_MS = 15000;

export const sharedGet = (url, { refresh = false, maxAgeMs = DEFAULT_MAX_AGE_MS } = {}) => {
  const now = Date.now();
  const existing = sharedGets.get(url);

  // A forced refresh still joins an identical request that is already running.
  if (existing?.promise) {
    return existing.promise.then((response) => response.clone());
  }

  if (!refresh && existing?.response && now - existing.receivedAt < maxAgeMs) {
    return Promise.resolve(existing.response.clone());
  }

  const request = fetch(url, { cache: refresh ? "no-store" : "default" })
    .then((response) => {
      if (response.ok) {
        sharedGets.set(url, {
          promise: null,
          response: response.clone(),
          receivedAt: Date.now(),
        });
      } else {
        sharedGets.delete(url);
      }
      return response;
    })
    .catch((error) => {
      if (sharedGets.get(url)?.promise === request) sharedGets.delete(url);
      throw error;
    });

  sharedGets.set(url, { promise: request, response: null, receivedAt: 0 });
  return request.then((response) => response.clone());
};

export const invalidateSharedGet = (url) => sharedGets.delete(url);

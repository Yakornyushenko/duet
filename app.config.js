const STORE_CONFIG = {
  'google-play': {
    name: 'Duet',
  },
  rustore: {
    name: 'Дуэт',
  },
};

module.exports = ({ config }) => {
  const store = process.env.EXPO_PUBLIC_STORE ?? 'google-play';
  const storeConfig = STORE_CONFIG[store];

  if (!storeConfig) {
    throw new Error(`Unknown EXPO_PUBLIC_STORE: ${store}`);
  }

  return {
    ...config,
    name: storeConfig.name,
    android: {
      ...config.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
    extra: {
      ...config.extra,
      store,
    },
  };
};

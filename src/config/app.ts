export type DistributionStore = 'google-play' | 'rustore';

const STORE_CONFIG = {
  'google-play': {
    appName: 'Duet',
  },
  rustore: {
    appName: 'Дуэт',
  },
} as const satisfies Record<DistributionStore, { appName: string }>;

const selectedStore = process.env.EXPO_PUBLIC_STORE ?? 'google-play';

if (selectedStore !== 'google-play' && selectedStore !== 'rustore') {
  throw new Error(`Unknown EXPO_PUBLIC_STORE: ${selectedStore}`);
}

export const distributionStore: DistributionStore = selectedStore;
export const appName = STORE_CONFIG[distributionStore].appName;
export const quotedAppName = `«${appName}»`;

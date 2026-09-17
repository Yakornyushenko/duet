import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { LoadingSplash } from '@/components/LoadingSplash';
import { useApp } from '@/context/AppContext';

let launchSplashWasShown = false;

export default function EntryScreen() {
  const { initializing, user, couple } = useApp();
  const [minimumSplashElapsed, setMinimumSplashElapsed] = useState(launchSplashWasShown);

  useEffect(() => {
    if (launchSplashWasShown) {
      return;
    }

    const timer = setTimeout(() => {
      launchSplashWasShown = true;
      setMinimumSplashElapsed(true);
    }, 1400);

    return () => clearTimeout(timer);
  }, []);

  if (initializing || !minimumSplashElapsed) {
    return <LoadingSplash />;
  }

  if (!user) {
    return <Redirect href="/auth" />;
  }

  if (!couple || !couple.partnerName) {
    return <Redirect href="/pair" />;
  }

  return <Redirect href="/(tabs)" />;
}

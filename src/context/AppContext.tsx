import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { unregisterWishPushDevice } from '@/services/wishes';
import {
  addEventRemote,
  createSessionFromAuthUrl,
  createCoupleRemote,
  deleteEventRemote,
  joinCoupleRemote,
  loadRemoteWorkspace,
  resendSignUpConfirmationRemote,
  signInRemote,
  signUpRemote,
  updateDisplayNameRemote,
  updateEventRemote,
  updateRelationshipDateRemote,
} from '@/services/backend';
import { AppUser, Couple, DateEvent, DateEventInput, DateCategoryOption } from '@/types/domain';

type AppState = {
  user: AppUser | null;
  couple: Couple | null;
  events: DateEvent[];
  categories: DateCategoryOption[];
};

type AppContextValue = AppState & {
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  resendSignUpConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  createCouple: (relationshipStartedAt: string) => Promise<void>;
  updateRelationshipDate: (relationshipStartedAt: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  joinCouple: (code: string) => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  addEvent: (input: DateEventInput) => Promise<DateEvent>;
  updateEvent: (id: string, input: DateEventInput) => Promise<DateEvent>;
  deleteEvent: (id: string) => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [events, setEvents] = useState<DateEvent[]>([]);
  const [categories, setCategories] = useState<DateCategoryOption[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const workspaceRequest = useRef(0);

  const clearWorkspace = useCallback(() => {
    workspaceRequest.current += 1;
    setSession(null);
    setUser(null);
    setCouple(null);
    setEvents([]);
    setCategories([]);
  }, []);

  const applyRemoteWorkspace = useCallback(async (activeSession: Session) => {
    const request = ++workspaceRequest.current;
    const workspace = await loadRemoteWorkspace(activeSession);
    if (request !== workspaceRequest.current) return;
    // Preserve references when server data did not change. In particular, avoid
    // re-scheduling every local reminder on a profile/couple refresh.
    setUser((current) => JSON.stringify(current) === JSON.stringify(workspace.user) ? current : workspace.user);
    setCouple((current) => JSON.stringify(current) === JSON.stringify(workspace.couple) ? current : workspace.couple);
    setEvents((current) => JSON.stringify(current) === JSON.stringify(workspace.events) ? current : workspace.events);
    setCategories((current) => JSON.stringify(current) === JSON.stringify(workspace.categories) ? current : workspace.categories);
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setInitializing(false);
      return;
    }

    const initializeSession = async () => {
      try {
        const { data, error } = await client.auth.getSession();
        if (error) {
          throw error;
        }
        if (!data.session) {
          clearWorkspace();
          return;
        }

        const { data: userData, error: userError } = await client.auth.getUser();
        if (userError || !userData.user) {
          await client.auth.signOut({ scope: 'local' });
          clearWorkspace();
          return;
        }

        setSession(data.session);
        await applyRemoteWorkspace(data.session);
      } catch (error) {
        console.error('Не удалось восстановить сессию', error);
        await client.auth.signOut({ scope: 'local' });
        clearWorkspace();
      } finally {
        setInitializing(false);
      }
    };

    void initializeSession();

    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION') {
        return;
      }
      setSession(nextSession);
      if (!nextSession) {
        clearWorkspace();
        setInitializing(false);
        return;
      }
      if (event !== 'TOKEN_REFRESHED') {
        void applyRemoteWorkspace(nextSession).catch((error) => {
          console.error('Не удалось обновить данные аккаунта', error);
        });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [applyRemoteWorkspace, clearWorkspace]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const handleAuthUrl = (url: string) => {
      void createSessionFromAuthUrl(url).catch((error) => {
        console.error('Не удалось завершить подтверждение почты', error);
      });
    };

    void Linking.getInitialURL().then((url) => {
      if (url) {
        handleAuthUrl(url);
      }
    });

    const subscription = Linking.addEventListener('url', ({ url }) => handleAuthUrl(url));
    return () => subscription.remove();
  }, []);

  const refreshWorkspace = useCallback(async () => {
    if (session) {
      await applyRemoteWorkspace(session);
    }
  }, [applyRemoteWorkspace, session]);

  useEffect(() => {
    const client = supabase;
    if (!client || !couple || !session) {
      return;
    }

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void refreshWorkspace().catch((error) => console.warn('Не удалось обновить данные пары', error));
      }, 150);
    };
    const channel = client
      .channel(`couple-${couple.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'date_categories', filter: `couple_id=eq.${couple.id}` },
        scheduleRefresh)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'date_events', filter: `couple_id=eq.${couple.id}` },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_members', filter: `couple_id=eq.${couple.id}` },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${couple.id}` },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void client.removeChannel(channel);
    };
  }, [couple?.id, refreshWorkspace, session]);

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      couple,
      events,
      categories,
      initializing,
      signIn: async (email, password) => {
        await signInRemote(email.trim(), password);
      },
      signUp: async (name, email, password) => {
        return signUpRemote(name.trim(), email.trim(), password);
      },
      resendSignUpConfirmation: async (email) => {
        await resendSignUpConfirmationRemote(email.trim());
      },
      signOut: async () => {
        if (!supabase) {
          throw new Error('Supabase не настроен');
        }
        await unregisterWishPushDevice();
        const { error } = await supabase.auth.signOut();
        if (error) {
          throw error;
        }
      },
      createCouple: async (relationshipStartedAt) => {
        await createCoupleRemote(relationshipStartedAt);
        await refreshWorkspace();
      },
      updateRelationshipDate: async (relationshipStartedAt) => {
        await updateRelationshipDateRemote(relationshipStartedAt);
        setCouple((current) => current ? { ...current, relationshipStartedAt } : current);
      },
      updateDisplayName: async (displayName) => {
        if (!user) {
          throw new Error('Сначала войдите в аккаунт');
        }
        const updatedDisplayName = await updateDisplayNameRemote(user.id, displayName.trim());
        setUser((current) => current ? { ...current, displayName: updatedDisplayName } : current);
      },
      joinCouple: async (code) => {
        await joinCoupleRemote(code);
        await refreshWorkspace();
      },
      refreshWorkspace,
      addEvent: async (input) => {
        if (!couple) {
          throw new Error('Сначала создайте пару');
        }
        const created = await addEventRemote(couple.id, input);
        setEvents((current) => current.some((event) => event.id === created.id) ? current : [...current, created]);
        return created;
      },
      updateEvent: async (id, input) => {
        const updated = await updateEventRemote(id, input);
        setEvents((current) => current.map((event) => (event.id === id ? updated : event)));
        return updated;
      },
      deleteEvent: async (id) => {
        await deleteEventRemote(id);
        setEvents((current) => current.filter((event) => event.id !== id));
      },
    }),
    [couple, events, categories, initializing, refreshWorkspace, user],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp должен использоваться внутри AppProvider');
  }
  return context;
}

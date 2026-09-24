import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, ButtonVariant } from '@/components/AppButton';
import { colors, radii, shadow, spacing, typography } from '@/theme/tokens';

type DialogTone = 'info' | 'warning' | 'danger' | 'success';
type IoniconName = ComponentProps<typeof Ionicons>['name'];

type DialogAction = {
  label: string;
  variant?: ButtonVariant;
  onPress?: () => void | Promise<void>;
};

type DialogOptions = {
  title: string;
  message: string;
  tone?: DialogTone;
  actions?: DialogAction[];
  dismissible?: boolean;
};

type DialogContextValue = {
  showDialog: (options: DialogOptions) => void;
  hideDialog: () => void;
};

const toneIcons: Record<DialogTone, IoniconName> = {
  info: 'heart-outline',
  warning: 'alert-circle-outline',
  danger: 'warning-outline',
  success: 'checkmark-circle-outline',
};

const toneColors: Record<DialogTone, string> = {
  info: colors.primary,
  warning: colors.secondary,
  danger: colors.danger,
  success: colors.success,
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: PropsWithChildren) {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const hideDialog = useCallback(() => setDialog(null), []);
  const showDialog = useCallback((options: DialogOptions) => setDialog(options), []);
  const value = useMemo(() => ({ showDialog, hideDialog }), [hideDialog, showDialog]);
  const tone = dialog?.tone ?? 'info';
  const actions = dialog?.actions?.length ? dialog.actions : [{ label: 'Хорошо' }];

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Modal
        transparent
        animationType="fade"
        visible={Boolean(dialog)}
        statusBarTranslucent
        onRequestClose={() => {
          if (dialog?.dismissible !== false) {
            hideDialog();
          }
        }}
      >
        <SafeAreaView style={styles.backdrop}>
          {dialog?.dismissible !== false ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Закрыть окно"
              style={StyleSheet.absoluteFill}
              onPress={hideDialog}
            />
          ) : null}
          <View style={styles.card}>
            <View style={[styles.icon, { backgroundColor: tone === 'warning' ? colors.soft : colors.softRose }]}>
              <Ionicons name={toneIcons[tone]} size={32} color={toneColors[tone]} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{dialog?.title}</Text>
              <Text style={styles.message}>{dialog?.message}</Text>
            </View>
            <View style={styles.actions}>
              {actions.map((action) => (
                <AppButton
                  key={action.label}
                  label={action.label}
                  variant={action.variant}
                  onPress={() => {
                    hideDialog();
                    void action.onPress?.();
                  }}
                />
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog должен использоваться внутри DialogProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.overlay,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: spacing.xxl,
    gap: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.background,
    ...shadow,
  },
  icon: {
    width: 64,
    height: 64,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    transform: [{ rotate: '-5deg' }],
  },
  copy: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
});

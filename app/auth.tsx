import { AppIcon } from '@/components/AppIcon';
import { Href, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { AppScreen } from '@/components/AppScreen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { colors, radii, shadow, spacing, typography } from '@/theme/tokens';
import { isEmailNotConfirmedError } from '@/utils/authErrors';

type AuthMode = 'signin' | 'signup';

const duetLogo = require('../assets/duet-birds.png') as ReturnType<typeof Image.resolveAssetSource>;

export default function AuthScreen() {
  const { modalMaxWidth } = useResponsiveLayout();
  const { user, signIn, signUp, resendSignUpConfirmation } = useApp();
  const { showDialog } = useDialog();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user]);

  const resendConfirmation = async () => {
    try {
      setLoading(true);
      setConfirmationStatus(null);

      try {
        await signIn(email, password);
        setConfirmationVisible(false);
        return;
      } catch {
        // Для неподтверждённого адреса вход ожидаемо не пройдёт — тогда запрашиваем новое письмо.
      }

      await resendSignUpConfirmation(email);
      setConfirmationStatus('Новое письмо отправлено. Проверьте входящие и папку «Спам».');
    } catch (error) {
      setConfirmationStatus(error instanceof Error ? error.message : 'Не получилось отправить письмо. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!email.includes('@') || password.length < 6 || (mode === 'signup' && name.trim().length < 2)) {
      showDialog({
        title: 'Проверьте данные',
        message: 'Укажите имя, корректную почту и пароль не короче 6 символов.',
        tone: 'warning',
      });
      return;
    }

    try {
      setLoading(true);
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        const signedIn = await signUp(name, email, password);
        if (!signedIn) {
          setConfirmationStatus(null);
          setConfirmationVisible(true);
        }
      }
    } catch (error) {
      if (isEmailNotConfirmedError(error)) {
        setConfirmationStatus('Почта пока не подтверждена. Запросите новое письмо и откройте в нём самую свежую ссылку.');
        setConfirmationVisible(true);
      } else {
        showDialog({
          title: mode === 'signin' ? 'Не получилось войти' : 'Не получилось создать аккаунт',
          message: error instanceof Error ? error.message : 'Попробуйте ещё раз.',
          tone: 'danger',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <Image source={duetLogo} resizeMode="contain" style={styles.brandLogo} accessible={false} />
      <View style={styles.heading}>
        <Text style={styles.brand}>Duet</Text>
        <Text style={styles.subtitle}>Место для ваших общих воспоминаний и важных дат</Text>
      </View>

      <View style={styles.formCard}>
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { label: 'Войти', value: 'signin' },
            { label: 'Создать аккаунт', value: 'signup' },
          ]}
        />
        {mode === 'signup' ? (
          <AppInput
            label="Как вас зовут"
            placeholder="Саша"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
            textContentType="name"
          />
        ) : null}
        <AppInput
          label="Email"
          placeholder="name@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          textContentType="emailAddress"
        />
        <AppInput
          label="Пароль"
          placeholder="Минимум 6 символов"
          secureTextEntry={!passwordVisible}
          value={password}
          onChangeText={setPassword}
          textContentType={mode === 'signup' ? 'newPassword' : 'password'}
          onSubmitEditing={() => void submit()}
          rightElement={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
              accessibilityState={{ checked: passwordVisible }}
              hitSlop={8}
              style={styles.passwordVisibilityButton}
              onPress={() => setPasswordVisible((visible) => !visible)}
            >
              <AppIcon
                name={passwordVisible ? 'eye-outline' : 'eye-off-outline'}
                size={24}
                color={colors.muted}
              />
            </Pressable>
          }
        />
        <AppButton
          label={mode === 'signin' ? 'Войти' : 'Создать аккаунт'}
          onPress={() => void submit()}
          loading={loading}
        />
      </View>

      <View style={styles.privacyNotice}>
        <Text style={styles.privacy}>Создавая аккаунт, вы принимаете</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Открыть политику конфиденциальности"
          onPress={() => router.push('/privacy' as Href)}
        >
          <Text style={styles.privacyLink}>Политику конфиденциальности</Text>
        </Pressable>
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={confirmationVisible}
        statusBarTranslucent
        onRequestClose={() => setConfirmationVisible(false)}
      >
        <SafeAreaView style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Закрыть окно подтверждения"
            style={StyleSheet.absoluteFill}
            onPress={() => setConfirmationVisible(false)}
          />
          <View style={[styles.modalCard, { maxWidth: modalMaxWidth }]}>
            <View style={styles.modalIcon}>
              <AppIcon name="mail-open-outline" size={32} color={colors.primary} />
            </View>
            <View style={styles.modalCopy}>
              <Text style={styles.modalTitle}>Подтвердите почту</Text>
              <Text style={styles.modalText}>
                Мы отправили ссылку на <Text style={styles.modalEmail}>{email.trim()}</Text>. Подтвердите почту, затем войдите с вашим email и паролем.
              </Text>
              {confirmationStatus ? <Text style={styles.modalStatus}>{confirmationStatus}</Text> : null}
            </View>
            <View style={styles.modalActions}>
              <AppButton
                label="Перейти ко входу"
                onPress={() => {
                  setConfirmationVisible(false);
                  setMode('signin');
                }}
              />
              <AppButton
                label="Отправить ещё раз"
                variant="secondary"
                loading={loading}
                onPress={() => void resendConfirmation()}
              />
              <AppButton label="Закрыть" variant="ghost" onPress={() => setConfirmationVisible(false)} />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    gap: spacing.xxl,
    maxWidth: 640,
  },
  brandLogo: {
    alignSelf: 'center',
    width: 148,
    height: 104,
  },
  heading: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  brand: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 330,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  passwordVisibilityButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  privacyNotice: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  privacy: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
  },
  privacyLink: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.overlay,
  },
  modalCard: {
    width: '100%',
    padding: spacing.xxl,
    gap: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.background,
    ...shadow,
  },
  modalIcon: {
    width: 64,
    height: 64,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.softRose,
    transform: [{ rotate: '-5deg' }],
  },
  modalCopy: {
    alignItems: 'center',
    gap: spacing.md,
  },
  modalTitle: {
    ...typography.sectionTitle,
    color: colors.text,
    textAlign: 'center',
  },
  modalText: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  modalEmail: {
    fontWeight: '600',
    color: colors.secondary,
  },
  modalStatus: {
    ...typography.label,
    color: colors.success,
    textAlign: 'center',
  },
  modalActions: {
    gap: spacing.sm,
  },
});

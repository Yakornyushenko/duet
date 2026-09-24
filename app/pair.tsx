import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppDatePicker } from '@/components/AppDatePicker';
import { AppInput } from '@/components/AppInput';
import { AppScreen } from '@/components/AppScreen';
import { PairAvatars } from '@/components/PairAvatars';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { formatRelationshipDate, toDateOnly } from '@/utils/dates';

type PairMode = 'create' | 'join';

export default function PairScreen() {
  const { user, couple, createCouple, joinCouple, refreshWorkspace, signOut } = useApp();
  const { showDialog } = useDialog();
  const [mode, setMode] = useState<PairMode>('create');
  const [relationshipDate, setRelationshipDate] = useState(toDateOnly(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (couple?.partnerName) {
      router.replace('/');
    }
  }, [couple?.partnerName]);

  const handleCreate = async () => {
    try {
      setLoading(true);
      await createCouple(relationshipDate);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      showDialog({
        title: 'Не получилось создать пару',
        message: error instanceof Error ? error.message : 'Попробуйте ещё раз.',
        tone: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (code.trim().length !== 6) {
      showDialog({ title: 'Проверьте код', message: 'Код пары состоит из 6 символов.', tone: 'warning' });
      return;
    }
    try {
      setLoading(true);
      await joinCouple(code.trim());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      showDialog({
        title: 'Не получилось присоединиться',
        message: error instanceof Error ? error.message : 'Проверьте код.',
        tone: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  if (couple?.inviteCode && !couple.partnerName) {
    return (
      <AppScreen contentContainerStyle={styles.waitingContent}>
        <View style={styles.waitingIcon}>
          <Ionicons name="hourglass-outline" size={34} color={colors.primary} />
        </View>
        <View style={styles.centeredCopy}>
          <Text style={styles.title}>Ждём партнёра</Text>
          <Text style={styles.subtitle}>Отправьте этот код человеку, с которым хотите разделить пространство.</Text>
        </View>
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Код вашей пары</Text>
          <Text selectable style={styles.code}>{couple.inviteCode}</Text>
          <Text style={styles.codeHint}>Действует 24 часа и только для одного человека</Text>
        </View>
        <View style={styles.actions}>
          <AppButton
            label="Поделиться кодом"
            onPress={() =>
              void Share.share({
                message: `Присоединяйся ко мне в приложении «Duet». Код нашей пары: ${couple.inviteCode}`,
              })
            }
          />
          <AppButton label="Проверить подключение" variant="secondary" onPress={() => void refreshWorkspace()} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <PairAvatars firstName={user?.displayName ?? 'Вы'} size={48} />
        <View style={styles.centeredCopy}>
          <Text style={styles.title}>Создадим ваш Duet</Text>
          <Text style={styles.subtitle}>Один создаёт пространство, второй присоединяется по коду.</Text>
        </View>
      </View>

      <SegmentedControl
        value={mode}
        onChange={setMode}
        options={[
          { label: 'Создать пару', value: 'create' },
          { label: 'Ввести код', value: 'join' },
        ]}
      />

      <View style={styles.card}>
        {mode === 'create' ? (
          <>
            <View style={styles.fieldCopy}>
              <Text style={styles.cardTitle}>Когда вы начали встречаться?</Text>
              <Text style={styles.subtitle}>Эта дата станет началом общего счётчика.</Text>
            </View>
            <AppButton
              label={formatRelationshipDate(relationshipDate)}
              variant="secondary"
              onPress={() => setShowDatePicker(true)}
            />
            <AppDatePicker
              visible={showDatePicker}
              value={relationshipDate}
              title="Дата начала отношений"
              maximumDate={toDateOnly(new Date())}
              onSelect={setRelationshipDate}
              onClose={() => setShowDatePicker(false)}
            />
            <AppButton label="Создать код пары" onPress={() => void handleCreate()} loading={loading} />
          </>
        ) : (
          <>
            <View style={styles.fieldCopy}>
              <Text style={styles.cardTitle}>Введите код партнёра</Text>
              <Text style={styles.subtitle}>Шесть символов из приглашения — регистр не важен.</Text>
            </View>
            <AppInput
              label="Код пары"
              placeholder="8K4M2Q"
              value={code}
              onChangeText={(value) => setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              style={styles.codeInput}
            />
            <AppButton label="Присоединиться" onPress={() => void handleJoin()} loading={loading} />
          </>
        )}
      </View>

      <AppButton
        label="Выйти из аккаунта"
        variant="ghost"
        onPress={() => {
          void signOut();
          router.replace('/');
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  waitingContent: {
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  waitingIcon: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.softRose,
  },
  centeredCopy: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  fieldCopy: {
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  codeCard: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  codeLabel: {
    ...typography.label,
    color: colors.muted,
  },
  code: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
    letterSpacing: 7,
    color: colors.primary,
  },
  codeHint: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 6,
    fontWeight: '600',
  },
  actions: {
    gap: spacing.md,
  },
});

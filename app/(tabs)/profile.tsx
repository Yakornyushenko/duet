import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { PairAvatars } from '@/components/PairAvatars';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { formatRelationshipDate } from '@/utils/dates';

export default function ProfileScreen() {
  const { user, couple, signOut } = useApp();
  const { showDialog } = useDialog();

  if (!user || !couple) {
    return null;
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Ваш Duet</Text>
      </View>

      <View style={styles.coupleCard}>
        <PairAvatars firstName={user.displayName} secondName={couple.partnerName} size={64} />
        <View style={styles.centeredCopy}>
          <Text style={styles.coupleName}>{user.displayName} + {couple.partnerName}</Text>
          <View style={styles.connectedRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.connected}>Вы связаны</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>О паре</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="heart-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailLabel}>Вместе с</Text>
              <Text style={styles.detailValue}>{formatRelationshipDate(couple.relationshipStartedAt)}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailLabel}>Ваш аккаунт</Text>
              <Text style={styles.detailValue}>{user.email}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Настройки</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailValue}>Напоминания</Text>
              <Text style={styles.detailLabel}>Добавим на следующем этапе</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.logoutButton}>
        <AppButton
          label="Выйти из аккаунта"
          variant="danger"
          onPress={() =>
            showDialog({
              title: 'Выйти из аккаунта?',
              message: 'Общие даты останутся сохранены.',
              tone: 'danger',
              actions: [
                {
                  label: 'Выйти',
                  variant: 'danger',
                  onPress: async () => {
                    try {
                      await signOut();
                      router.replace('/');
                    } catch (error) {
                      showDialog({
                        title: 'Не получилось выйти',
                        message: error instanceof Error ? error.message : 'Попробуйте ещё раз.',
                        tone: 'danger',
                      });
                    }
                  },
                },
                { label: 'Отмена', variant: 'ghost' },
              ],
            })
          }
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxxl,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  coupleCard: {
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xxl,
  },
  centeredCopy: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  coupleName: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  connected: {
    ...typography.label,
    color: colors.success,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.xxxl,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  detailIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.sm,
    backgroundColor: colors.softRose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCopy: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.muted,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 54,
  },
  logoutButton: {
    marginTop: spacing.huge,
  },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { NotesIcon } from '@/components/NotesIcon';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function MoreScreen() {
  return (
    <AppScreen contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Открыть вопрос дня" onPress={() => router.push('/daily-question')}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.icon}><Ionicons name="chatbubbles-outline" size={24} color={colors.primary} /></View>
        <View style={styles.copy}><Text style={styles.label}>Вопрос дня</Text><Text style={styles.description}>Один вопрос — два взгляда</Text></View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Открыть напоминания"
        onPress={() => router.push('/reminders')}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.icon}>
          <Ionicons name="notifications-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.label}>Напоминания</Text>
          <Text style={styles.description}>О наших предстоящих датах</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Открыть желания"
        onPress={() => router.push('/wishlists')}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.envelopeFrame}>
          <Image
            source={require('../../assets/wishes-envelope-soft.png')}
            style={styles.envelope}
            resizeMode="contain"
            accessible={false}
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.label}>Желания</Text>
          <Text style={styles.description}>Наши мечты и планы вместе</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Статистика"
        onPress={() => router.push('/statistics')}
      >
        <View style={styles.icon}>
          <Ionicons name="stats-chart-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.label}>Статистика</Text>
          <Text style={styles.description}>Наша история в цифрах</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Заметки"
        onPress={() => router.push('/notes')}
      >
        <View style={styles.icon}>
          <NotesIcon />
        </View>
        <View style={styles.copy}>
          <Text style={styles.label}>Заметки</Text>
          <Text style={styles.description}>Наши идеи и важные мелочи</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Открыть профиль"
        onPress={() => router.push('/profile')}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.icon}>
          <Ionicons name="person-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.label}>Профиль</Text>
          <Text style={styles.description}>Наша пара и настройки</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface,
  },
  icon: {
    width: 48, height: 48, borderRadius: radii.md,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softRose,
  },
  copy: { flex: 1, gap: spacing.xs },
  envelopeFrame: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  envelope: { width: 48, height: 32 },
  label: { ...typography.cardTitle, color: colors.text },
  description: { ...typography.caption, color: colors.muted },
  pressed: { transform: [{ scale: 1.02 }] },
});

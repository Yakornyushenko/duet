import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppScreen } from '@/components/AppScreen';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { JoinPreview, prepareJoinRemote } from '@/services/backend';

export default function PairScreen() {
  const { couple, createCouple, joinCouple, refreshWorkspace } = useApp();
  const { showDialog } = useDialog();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<JoinPreview | null>(null);
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const categoryCount = new Set(preview?.categories.map(item => item.label.trim().toLocaleLowerCase('ru-RU'))).size;
  const categoriesValid = !!preview && categoryCount <= 6 && preview.categories.every(item => item.label.trim().length > 0);
  useEffect(() => {
    if (couple?.partnerName) router.replace('/');
  }, [couple?.partnerName]);
  const perform = async (action: () => Promise<void>) => {
    if (loading) return;
    setLoading(true);
    try { await action(); }
    catch (error) {
      showDialog({ title: 'Не получилось подключиться', message: error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'Попробуйте ещё раз.', tone: 'warning' });
    } finally { setLoading(false); }
  };
  const inviteActive = couple?.inviteCode && couple.inviteExpiresAt && new Date(couple.inviteExpiresAt).getTime() > Date.now();
  return <AppScreen contentContainerStyle={styles.content}>
    <AppButton label="Вернуться в пространство" variant="ghost" onPress={() => couple ? router.replace('/(tabs)') : void perform(refreshWorkspace)} />
    <View style={styles.centeredCopy}>
      <Text style={styles.title}>Вместе, когда будете готовы</Text>
      <Text style={styles.subtitle}>Даты, желания и заметки доступны и без партнёра.</Text>
    </View>
    {!couple ? <AppButton label="Открыть моё пространство" loading={loading} onPress={() => void perform(refreshWorkspace)} /> : <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Пригласить партнёра</Text>
        <Text style={styles.subtitle}>После подключения все ваши даты, желания, фото и заметки, включая корзину, станут доступны вам обоим.</Text>
        {inviteActive && <Text selectable style={styles.code}>{couple.inviteCode}</Text>}
        {inviteActive && <Text style={styles.codeHint}>Код действует до {new Date(couple.inviteExpiresAt!).toLocaleString('ru-RU')}</Text>}
        {inviteActive && <AppButton label="Поделиться кодом" onPress={() => void Share.share({message: `Присоединяйся ко мне в приложении «Duet». Код нашей пары: ${couple.inviteCode}`})} />}
        <AppButton label={inviteActive ? 'Обновить код' : 'Создать код приглашения'} loading={loading} variant="secondary"
          onPress={() => showDialog({title:'Открыть общее пространство?',message:'Подключившийся по коду человек получит доступ ко всем данным вашего пространства. Передавайте код только своему партнёру. Новый код отменит предыдущий.',
            actions:[{label:'Создать код',onPress:()=>perform(createCouple)},{label:'Отмена',variant:'ghost'}]})} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>У меня есть код</Text>
        <AppInput label="Код партнёра" value={code} editable={!loading} onChangeText={value=>{setCode(value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6));setPreview(null);}} maxLength={6} autoCapitalize="characters" autoCorrect={false} />
        <AppButton label={preview ? 'Обновить список категорий' : 'Продолжить'} loading={loading} disabled={code.length!==6}
          onPress={()=>void perform(async()=>{
            setPreview(null);
            const next = await prepareJoinRemote(code);
            setCategoryNames(Object.fromEntries(next.categories.map(item=>[item.key,item.label])));
            setPreview(next);
          })} />
        {preview && <>
          <Text style={styles.cardTitle}>Категории общего пространства</Text>
          <Text style={styles.subtitle}>Одинаковые названия объединятся. Чтобы оставить не больше 6 категорий, укажите одинаковое название для тех, которые хотите объединить. Все даты сохранятся.</Text>
          {preview.categories.map((item,index)=><AppInput key={item.key}
            label={`${item.mine ? 'Моя' : 'Партнёра'}: ${categoryNames[item.key]}`}
            value={item.label} editable={!loading} maxLength={40}
            onChangeText={label=>setPreview(current=>current ? {...current,categories:current.categories.map((row,i)=>i===index ? {...row,label} : row)} : current)} />)}
          <Text style={styles.codeHint}>После объединения: {categoryCount} из 6 категорий</Text>
          <AppButton label="Объединить пространства" loading={loading} disabled={!categoriesValid}
            onPress={()=>showDialog({title:'Объединить ваши данные?',message:'Даты, желания с фото и комментариями, заметки и корзина обоих пользователей станут общими. Личные желания останутся в списках их владельцев. Для счётчика дней используем дату начала отношений партнёра, а если она не задана — вашу. Отменить объединение в приложении нельзя.',
              actions:[{label:'Объединить',onPress:()=>perform(()=>joinCouple(preview.token,preview.categories))},{label:'Отмена',variant:'ghost'}]})} />
        </>}
      </View>
    </>}
  </AppScreen>;
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

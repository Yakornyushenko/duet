import { fetchWithTimeout } from '@/lib/network';
import { supabase } from '@/lib/supabase';

const bucket = 'profile-photos';

function getClient() {
  if (!supabase) {
    throw new Error('Supabase не настроен');
  }
  return supabase;
}

export async function getProfilePhotoUrls(paths: string[]): Promise<Record<string, string>> {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (!uniquePaths.length) return {};

  const { data, error } = await getClient().storage.from(bucket).createSignedUrls(uniquePaths, 60 * 60 * 24 * 7);
  if (error) throw error;
  return Object.fromEntries((data ?? []).flatMap((item) =>
    item.path && item.signedUrl ? [[item.path, item.signedUrl]] : []));
}

export async function pickAndUploadProfilePhoto(userId: string): Promise<string | null> {
  const ImagePicker = await import('expo-image-picker');
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Разрешите доступ к фотографиям в настройках телефона.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const extension = (asset.mimeType?.split('/')[1] || 'jpeg').replace('jpeg', 'jpg');
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const response = await fetchWithTimeout(asset.uri);
  const bytes = await response.arrayBuffer();
  const { error } = await getClient().storage.from(bucket).upload(path, bytes, {
    contentType: asset.mimeType ?? 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removeProfilePhoto(path: string): Promise<void> {
  const { error } = await getClient().storage.from(bucket).remove([path]);
  if (error) throw error;
}

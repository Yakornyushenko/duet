import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { Wishlist } from '@/utils/wishlists';

export type Wish = {
  id: string;
  title: string;
  list: Wishlist;
  fulfilled: boolean;
  description: string;
  photos: string[];
  version: number;
  createdBy: string | null;
};

export type WishComment = {
  id: string;
  wishId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

type WishRow = {
  id: string;
  title: string;
  list: Wishlist;
  fulfilled: boolean;
  description: string;
  photos: string[] | null;
  version: number;
  created_by: string | null;
};

type CommentRow = {
  id: string;
  wish_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles: { display_name: string } | { display_name: string }[] | null;
};

function getClient() {
  if (!supabase) {
    throw new Error('Supabase не настроен');
  }
  return supabase;
}

function mapWish(row: WishRow): Wish {
  return {
    id: row.id,
    title: row.title,
    list: row.list,
    fulfilled: row.fulfilled,
    description: row.description ?? '',
    photos: row.photos ?? [],
    version: row.version,
    createdBy: row.created_by,
  };
}

function mapComment(row: CommentRow): WishComment {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    wishId: row.wish_id,
    authorId: row.author_id,
    authorName: profile?.display_name?.trim() || 'Партнёр',
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function listWishes(coupleId: string, signal?: AbortSignal): Promise<Wish[]> {
  const query = getClient()
    .from('wishes')
    .select('id, title, list, fulfilled, description, photos, version, created_by')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) {
    throw error;
  }
  return (data as WishRow[]).map(mapWish);
}

export async function getWish(coupleId: string, wishId: string, signal?: AbortSignal): Promise<Wish | null> {
  const query = getClient()
    .from('wishes')
    .select('id, title, list, fulfilled, description, photos, version, created_by')
    .eq('couple_id', coupleId)
    .eq('id', wishId);
  const { data, error } = await (signal ? query.abortSignal(signal) : query).maybeSingle();
  if (error) {
    throw error;
  }
  return data ? mapWish(data as WishRow) : null;
}

export async function createWish(coupleId: string, list: Wishlist, title: string): Promise<Wish> {
  const { data, error } = await getClient()
    .from('wishes')
    .insert({ couple_id: coupleId, list, title: title.trim() })
    .select('id, title, list, fulfilled, description, photos, version, created_by')
    .single();
  if (error) {
    throw error;
  }
  return mapWish(data as WishRow);
}

export async function updateWish(
  coupleId: string,
  wishId: string,
  patch: Partial<Pick<Wish, 'title' | 'description' | 'photos' | 'fulfilled' | 'list'>>,
): Promise<Wish> {
  const { data, error } = await getClient()
    .from('wishes')
    .update({
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.photos !== undefined ? { photos: patch.photos } : {}),
      ...(patch.fulfilled !== undefined ? { fulfilled: patch.fulfilled } : {}),
      ...(patch.list !== undefined ? { list: patch.list } : {}),
    })
    .eq('couple_id', coupleId)
    .eq('id', wishId)
    .select('id, title, list, fulfilled, description, photos, version, created_by')
    .single();
  if (error) {
    throw error;
  }
  return mapWish(data as WishRow);
}

export async function deleteWish(coupleId: string, wishId: string): Promise<void> {
  const { error } = await getClient()
    .from('wishes')
    .delete()
    .eq('couple_id', coupleId)
    .eq('id', wishId);
  if (error) {
    throw error;
  }
}

export async function listWishComments(wishId: string, signal?: AbortSignal): Promise<WishComment[]> {
  const query = getClient()
    .from('wish_comments')
    .select('id, wish_id, author_id, body, created_at, profiles:author_id(display_name)')
    .eq('wish_id', wishId)
    .order('created_at', { ascending: true });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) {
    throw error;
  }
  return (data as CommentRow[]).map(mapComment);
}

export async function addWishComment(coupleId: string, wishId: string, body: string): Promise<WishComment> {
  const { data, error } = await getClient()
    .from('wish_comments')
    .insert({ couple_id: coupleId, wish_id: wishId, body: body.trim() })
    .select('id, wish_id, author_id, body, created_at, profiles:author_id(display_name)')
    .single();
  if (error) {
    throw error;
  }
  return mapComment(data as CommentRow);
}

export async function deleteWishComment(commentId: string): Promise<void> {
  const { error } = await getClient()
    .from('wish_comments')
    .delete()
    .eq('id', commentId);
  if (error) {
    throw error;
  }
}

export async function getWishPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) {
    return {};
  }
  const { data, error } = await getClient().storage.from('wish-photos').createSignedUrls(paths, 60 * 60);
  if (error) throw error;
  return Object.fromEntries((data ?? []).flatMap((item) =>
    item.path && item.signedUrl ? [[item.path, item.signedUrl]] : []));
}

export async function pickAndUploadWishPhoto(coupleId: string, userId: string): Promise<string> {
  // The gallery is only needed when the user adds a photo, not during startup.
  const ImagePicker = await import('expo-image-picker');
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Нужен доступ к фотографиям');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.82,
    allowsEditing: true,
    aspect: [4, 3],
  });
  if (result.canceled || !result.assets[0]) {
    throw new Error('CANCELLED');
  }

  const asset = result.assets[0];
  const extension = (asset.mimeType?.split('/')[1] || 'jpeg').replace('jpeg', 'jpg');
  const path = `${coupleId}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const response = await fetch(asset.uri);
  const bytes = await response.arrayBuffer();
  const { error } = await getClient().storage.from('wish-photos').upload(path, bytes, {
    contentType: asset.mimeType ?? 'image/jpeg',
    upsert: false,
  });
  if (error) {
    throw error;
  }
  return path;
}

export async function removeDraftWishPhoto(path: string): Promise<void> {
  const { error } = await getClient().storage.from('wish-photos').remove([path]);
  if (error) {
    throw error;
  }
}

export async function registerWishPushDevice(token: string): Promise<void> {
  const { error } = await getClient().rpc('register_wish_device', { p_token: token });
  if (error) {
    throw error;
  }
  await AsyncStorage.setItem('duet:wish-push-token', token);
}

export async function unregisterWishPushDevice(): Promise<void> {
  const token = await AsyncStorage.getItem('duet:wish-push-token');
  if (!token) return;
  const { error } = await getClient().from('wish_devices').delete().eq('token', token);
  if (error) throw error;
  await AsyncStorage.removeItem('duet:wish-push-token');
}

const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync('supabase/migrations/20261017000000_profile_photos.sql', 'utf8');
const backend = fs.readFileSync('src/services/backend.ts', 'utf8');
const avatars = fs.readFileSync('src/components/PairAvatars.tsx', 'utf8');
const profile = fs.readFileSync('app/profile.tsx', 'utf8');
const photoModal = fs.readFileSync('src/components/ProfilePhotoModal.tsx', 'utf8');
const home = fs.readFileSync('app/(tabs)/index.tsx', 'utf8');

assert.match(migration, /avatar_path text/);
assert.match(migration, /avatar_path like id::text \|\| '\/%'/);
assert.match(migration, /public\.shares_couple_with\(profile\.id\)/);
assert.match(migration, /\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/g);
assert.match(backend, /select\('display_name, avatar_path'\)/);
assert.match(backend, /partnerAvatarUrl/);
assert.match(avatars, /photoUrl && !photoFailed/);
assert.match(profile, /<Text style=\{styles\.sectionTitle\}>Оформление<\/Text>[\s\S]*accessibilityLabel="Фото профиля"/);
assert.match(profile, /accessibilityLabel="Фон приложения"[\s\S]*name="image-outline"/);
assert.match(photoModal, /pickAndUploadProfilePhoto/);
assert.match(photoModal, /label="Удалить фото"/);
assert.match(home, /accessibilityLabel="Настроить фото профиля"/);
assert.match(home, /<ProfilePhotoModal visible=\{photoPickerVisible\}/);

console.log('PASS: private profile photos, partner display, replacement and fallback');

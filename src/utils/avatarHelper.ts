/**
 * Avatar helper - Resolves a player's avatar emoji from their avatarId.
 * Falls back to a hash-based assignment if avatarId is empty/missing.
 */

const AVATARS = ['🦁', '🐯', '🦊', '🐺', '🦅', '🦋', '🐘', '🦏', '🦓', '🐊', '🦒', '🐆'];

/**
 * Get a player's avatar emoji. Uses their avatarId directly if it's a valid emoji
 * from our set, otherwise falls back to a hash-based consistent assignment.
 */
export function getPlayerAvatar(avatarId?: string, fallbackId?: string): string {
  // Direct match — avatarId is the emoji itself
  if (avatarId && AVATARS.includes(avatarId)) {
    return avatarId;
  }

  // Fallback id (e.g. userId) to generate a consistent avatar
  const id = avatarId || fallbackId || '';
  if (!id) return '🎮';

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

export { AVATARS };

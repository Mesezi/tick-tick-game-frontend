/** Existing emoji choices remain available alongside the portrait PNGs. */
export const AVATARS = ['🦁', '🐯', '🦊', '🐺', '🦅', '🦋', '🐘', '🦏', '🦓', '🐊', '🦒', '🐆'] as const;

export const AVATAR_PORTRAITS = [
  { id: 'artist-boy', label: 'Artist boy', src: '/avatars/artist%20boy.png' },
  { id: 'bell-ringer', label: 'Bell ringer', src: '/avatars/bell%20ringer.png' },
  { id: 'bookworm-boy', label: 'Bookworm boy', src: '/avatars/bookworm%20boy.png' },
  { id: 'boy', label: 'Boy', src: '/avatars/boy.png' },
  { id: 'chef-girl', label: 'Chef girl', src: '/avatars/chef%20girl.png' },
  { id: 'energy-boy', label: 'Energy boy', src: '/avatars/energy%20boy.png' },
  { id: 'female-athlete', label: 'Female athlete', src: '/avatars/female%20athlete.png' },
  { id: 'girl-bookworm', label: 'Girl bookworm', src: '/avatars/girl%20bookworm.png' },
  { id: 'head-boy', label: 'Head boy', src: '/avatars/head%20boy.png' },
  { id: 'head-girl', label: 'Head girl', src: '/avatars/head%20girl.png' },
  { id: 'rebel', label: 'Rebel', src: '/avatars/rebel.png' },
  { id: 'scientist-girl', label: 'Scientist girl', src: '/avatars/scientist%20girl.png' },
] as const;

/** Start fetching and decoding portraits early so avatar pickers open smoothly. */
export function preloadAvatarPortraits(): void {
  for (const portrait of AVATAR_PORTRAITS) {
    const image = new Image();
    image.decoding = 'async';
    image.src = portrait.src;
    void image.decode().catch(() => {
      // The picker can still render its normal image fallback if preload fails.
    });
  }
}

type AvatarPortrait = (typeof AVATAR_PORTRAITS)[number];

const PORTRAIT_BY_ID = new Map<string, AvatarPortrait>(
  AVATAR_PORTRAITS.map((portrait): [string, AvatarPortrait] => [portrait.id, portrait]),
);

export function getAvatarPortrait(avatarId?: string): AvatarPortrait | undefined {
  return avatarId ? PORTRAIT_BY_ID.get(avatarId) : undefined;
}

/** Resolve an emoji avatar, with a stable fallback for unknown or missing IDs. */
export function getPlayerAvatar(avatarId?: string, fallbackId?: string): string {
  if (avatarId && (AVATARS as readonly string[]).includes(avatarId)) return avatarId;
  const id = avatarId || fallbackId || '';
  if (!id) return '🎮';
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

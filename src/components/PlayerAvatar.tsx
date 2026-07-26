/**
 * Fixed set of avatar options. Each has a unique key stored in the DB.
 * Images will be provided later — using placeholder colored circles for now.
 */
export const AVATAR_OPTIONS: { key: string; label: string; color: string }[] = [
  { key: 'avatar-1', label: 'Ruby', color: '#e74c3c' },
  { key: 'avatar-2', label: 'Emerald', color: '#2ecc71' },
  { key: 'avatar-3', label: 'Sapphire', color: '#3498db' },
  { key: 'avatar-4', label: 'Amber', color: '#f39c12' },
  { key: 'avatar-5', label: 'Violet', color: '#9b59b6' },
  { key: 'avatar-6', label: 'Coral', color: '#e67e22' },
  { key: 'avatar-7', label: 'Teal', color: '#1abc9c' },
  { key: 'avatar-8', label: 'Slate', color: '#34495e' },
  { key: 'avatar-9', label: 'Rose', color: '#e91e63' },
  { key: 'avatar-10', label: 'Sky', color: '#00bcd4' },
  { key: 'avatar-11', label: 'Gold', color: '#ffc107' },
  { key: 'avatar-12', label: 'Midnight', color: '#1a1a2e' },
];

/**
 * Get avatar data by key.
 */
export function getAvatarByKey(avatarKey: string) {
  return AVATAR_OPTIONS.find((a) => a.key === avatarKey);
}

interface PlayerAvatarProps {
  avatarKey: string;
  size?: number;
  className?: string;
}

/**
 * Renders a player's avatar based on their stored avatar key.
 * Currently shows a colored circle with initial — replace with actual images later.
 */
export function PlayerAvatar({ avatarKey, size = 40, className = '' }: PlayerAvatarProps) {
  const avatar = getAvatarByKey(avatarKey);
  const color = avatar?.color ?? '#737373';
  const label = avatar?.label ?? '?';

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 ${className}`}
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.4 }}
      aria-label={`Avatar: ${label}`}
    >
      {label.charAt(0)}
    </div>
  );
}

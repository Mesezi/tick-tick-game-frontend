import { getAvatarPortrait, getPlayerAvatar } from '../utils/avatarHelper';

type AvatarDisplayProps = {
  avatarId?: string;
  fallbackId?: string;
  className?: string;
  imageClassName?: string;
  title?: string;
};

/** Displays either one of the profile portraits or the legacy emoji avatar. */
export function AvatarDisplay({ avatarId, fallbackId, className = '', imageClassName = 'object-contain', title }: AvatarDisplayProps) {
  const portrait = getAvatarPortrait(avatarId);
  if (portrait) {
    return <img className={`${imageClassName} ${className}`} src={portrait.src} alt={title ?? portrait.label} />;
  }
  return <span className={className} role={title ? 'img' : undefined} aria-label={title}>{getPlayerAvatar(avatarId, fallbackId)}</span>;
}

export { getAvatarPortrait };

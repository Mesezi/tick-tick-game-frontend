import type { AvatarId } from '../../schemas';

import danfoBus from './danfo-bus.svg';
import suyaStick from './suya-stick.svg';
import eagle from './eagle.svg';
import keke from './keke.svg';
import talkingDrum from './talking-drum.svg';

/**
 * Registry mapping avatarId to its SVG asset URL.
 * Use this to render avatar images consistently across the app.
 */
export const avatarRegistry: Record<AvatarId, string> = {
  'danfo-bus': danfoBus,
  'suya-stick': suyaStick,
  eagle: eagle,
  keke: keke,
  'talking-drum': talkingDrum,
};

/**
 * Get the SVG URL for a given avatar ID.
 * Returns a fallback empty string if the ID is not found.
 */
export function getAvatarSrc(avatarId: string): string {
  return avatarRegistry[avatarId as AvatarId] ?? '';
}

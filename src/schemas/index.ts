import { z } from 'zod';

export const displayNameSchema = z.string().min(2).max(20);

export const roomCodeSchema = z.string().length(6).regex(/^[A-Z0-9]+$/);

export const categoryAnswerSchema = z.string().max(100);

export const avatarIdSchema = z.enum([
  'danfo-bus',
  'suya-stick',
  'eagle',
  'keke',
  'talking-drum',
]);

export const setupFormSchema = z.object({
  displayName: displayNameSchema,
  avatarId: avatarIdSchema,
});

export type SetupFormData = z.infer<typeof setupFormSchema>;
export type AvatarId = z.infer<typeof avatarIdSchema>;

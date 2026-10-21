import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import { ApiError, apiClient } from '../api/client';

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid' | 'error';

export const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{1,18}[A-Za-z0-9]$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export function isUsernameTakenError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) return false;
  return `${error.message} ${JSON.stringify(error.data ?? {})}`.toUpperCase().includes('USERNAME_TAKEN');
}

function statusFromResponse(data: { available?: boolean; status?: string; reason?: string }): UsernameStatus {
  const responseStatus = `${data.status ?? data.reason ?? ''}`.toLowerCase();
  if (responseStatus.includes('reserved')) return 'reserved';
  if (responseStatus.includes('invalid')) return 'invalid';
  if (responseStatus.includes('taken')) return 'taken';
  if (responseStatus.includes('available') || data.available === true) return 'available';
  if (data.available === false) return 'taken';
  return 'error';
}

const STATUS_COPY: Record<UsernameStatus, string> = {
  idle: '3–20 characters. Start with a letter; use letters, numbers, or underscores.',
  checking: 'Checking username…',
  available: 'Username is available.',
  taken: 'That username is already taken.',
  reserved: 'That username is reserved.',
  invalid: 'Use 3–20 characters, start with a letter, and end with a letter or number.',
  error: 'Could not check availability. Try again.',
};

export function UsernameField({
  value,
  onChange,
  currentUsername,
  onStatusChange,
}: {
  value: string;
  onChange: (value: string) => void;
  currentUsername?: string | null;
  onStatusChange?: (status: UsernameStatus) => void;
}) {
  const [status, setStatus] = useState<UsernameStatus>(value ? 'checking' : 'idle');

  useEffect(() => {
    let active = true;
    const username = value.trim();
    const publish = (next: UsernameStatus) => {
      if (!active) return;
      setStatus(next);
      onStatusChange?.(next);
    };

    if (!username) {
      publish('idle');
      return () => { active = false; };
    }
    if (!isValidUsername(username)) {
      publish('invalid');
      return () => { active = false; };
    }
    if (currentUsername && username.toLowerCase() === currentUsername.toLowerCase()) {
      publish('available');
      return () => { active = false; };
    }

    publish('checking');
    const timeout = window.setTimeout(() => {
      apiClient.checkUsernameAvailability(username)
        .then((response) => publish(statusFromResponse(response.data)))
        .catch(() => publish('error'));
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [value, currentUsername, onStatusChange]);

  const valid = status === 'available';
  return (
    <div>
      <label htmlFor="profile-username" className="mb-2 block label-section">Username</label>
      <input
        id="profile-username"
        type="text"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={20}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(nextValue);
          const nextStatus: UsernameStatus = !nextValue
            ? 'idle'
            : isValidUsername(nextValue)
              ? 'checking'
              : 'invalid';
          setStatus(nextStatus);
          onStatusChange?.(nextStatus);
        }}
        placeholder="e.g. ada_words"
        aria-describedby="username-feedback"
        aria-invalid={status === 'invalid' || status === 'taken' || status === 'reserved'}
        className="w-full rounded-xl border-2 bg-transparent px-4 py-3 font-hand text-[17px] text-ink-dark outline-none"
        style={{ borderColor: valid ? '#32805a' : status === 'invalid' || status === 'taken' || status === 'reserved' ? '#c0392b' : '#c8b89a', caretColor: '#6b4423' }}
      />
      <p id="username-feedback" className={`mt-1 flex min-h-5 items-center gap-1 text-xs font-hand ${valid ? 'text-emerald-700' : status === 'invalid' || status === 'taken' || status === 'reserved' ? 'text-school-red' : 'text-chalk-mark'}`} aria-live="polite">
        {status === 'checking' && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
        {valid && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
        {(status === 'invalid' || status === 'taken' || status === 'reserved' || status === 'error') && <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />}
        {STATUS_COPY[status]}
      </p>
    </div>
  );
}

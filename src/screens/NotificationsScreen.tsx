import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, Clock3, Loader2, X } from 'lucide-react';
import { apiClient, type RoomInvite } from '../api/client';
import { socketHandler } from '../socket/socketHandler';
import { useGameStore } from '../store/gameStore';
import { showToast } from '../components/toastStore';
import { AvatarDisplay } from '../components/AvatarDisplay';

type Tab = 'news' | 'invites';

export function NotificationsScreen({ onJoinedRoom }: { onJoinedRoom?: () => void }) {
  const connectionStatus = useGameStore((state) => state.connection.status);
  const [activeTab, setActiveTab] = useState<Tab>('news');
  const [invites, setInvites] = useState<RoomInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.getRoomInvites();
      setInvites(response.data.invites ?? []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not load room invites.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [connectionStatus, refresh]);
  useEffect(() => {
    const onRefresh = () => { void refresh(); };
    window.addEventListener('social-data-refresh', onRefresh);
    return () => window.removeEventListener('social-data-refresh', onRefresh);
  }, [refresh]);

  const respond = async (invite: RoomInvite, action: 'accept' | 'decline') => {
    setBusyId(invite.id);
    try {
      if (action === 'accept' && !socketHandler.isConnected()) {
        throw new Error('Reconnect to the game server before accepting this invite.');
      }
      const response = await apiClient.respondRoomInvite(invite.id, action);
      if (action === 'accept') {
        const roomCode = response.data.room?.code ?? invite.room.code;
        socketHandler.emit('join-room', { roomCode });
        showToast(`Joining room ${roomCode}…`, 'success');
        onJoinedRoom?.();
      } else {
        showToast('Invite declined.', 'success');
      }
      window.dispatchEvent(new CustomEvent('social-data-refresh'));
      await refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update this invite.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="min-h-full paper-body px-5 pt-7 pb-8 font-hand" data-testid="screen-notifications">
      <header className="mb-6">
        <p className="label-section flex items-center gap-2 text-chalk-mark"><Bell className="h-4 w-4" /> Updates and invites</p>
        <h1 className="font-display text-4xl text-chalk-board">Notifications</h1>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-[rgba(139,94,60,0.1)] p-1" role="tablist" aria-label="Notification sections">
        <button role="tab" aria-selected={activeTab === 'news'} onClick={() => setActiveTab('news')} className={`min-h-11 rounded-lg px-3 text-sm font-bold ${activeTab === 'news' ? 'bg-paper text-chalk-board shadow-sm' : 'text-chalk-mark'}`}>News</button>
        <button role="tab" aria-selected={activeTab === 'invites'} onClick={() => setActiveTab('invites')} className={`min-h-11 rounded-lg px-3 text-sm font-bold ${activeTab === 'invites' ? 'bg-paper text-chalk-board shadow-sm' : 'text-chalk-mark'}`}>
          Room invites{invites.length > 0 && <span className="ml-2 rounded-full bg-school-red px-1.5 py-0.5 text-xs text-white">{invites.length}</span>}
        </button>
      </div>

      {activeTab === 'news' ? (
        <section className="rounded-2xl border border-paper-ruled bg-white/50 p-5">
          <h2 className="mb-1 font-bold text-chalk-board">News</h2>
          <p className="text-sm text-chalk-mark">Game updates and announcements will appear here.</p>
        </section>
      ) : loading ? (
        <p className="flex items-center justify-center gap-2 py-8 text-sm text-chalk-mark" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Loading room invites…</p>
      ) : invites.length ? (
        <section className="space-y-3" aria-label="Room invites">
          {invites.map((invite) => (
            <article key={invite.id} className="rounded-2xl border border-paper-ruled bg-white/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarDisplay
                    avatarId={invite.inviter?.avatarId ?? undefined}
                    fallbackId={invite.inviter?.id ?? invite.id}
                    title={invite.inviter?.displayName ?? 'A friend'}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border pt-1 border-paper-ruled bg-paper text-xl"
                    // imageClassName="h-full w-full rounded-full object-contain p-1"
                  />
                  <div className="min-w-0">
                    <h2 className="font-bold text-chalk-board">{invite.inviter?.displayName ?? 'A friend'} invited you</h2>
                    {invite.inviter?.username && <p className="text-xs text-chalk-mark">@{invite.inviter.username}</p>}
                    <p className="mt-1 text-sm text-chalk-mark">Room {invite.room?.code}</p>
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-chalk-mark"><Clock3 className="h-3 w-3" />Expires {new Date(invite.expiresAt).toLocaleDateString()}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button disabled={busyId === invite.id} onClick={() => void respond(invite, 'accept')} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-chalk-board px-4 font-bold text-paper disabled:opacity-50"><Check className="h-4 w-4" />Join room</button>
                <button disabled={busyId === invite.id} onClick={() => void respond(invite, 'decline')} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-paper-ruled px-4 font-bold text-chalk-mark disabled:opacity-50"><X className="h-4 w-4" />Decline</button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-paper-ruled p-5 text-center text-sm text-chalk-mark">Room invites will appear here.</p>
      )}
    </main>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  Check,
  Loader2,
  Search,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  apiClient,
  type FriendEntry,
  type FriendRequest,
  type FriendUser,
} from "../api/client";
import { useGameStore } from "../store/gameStore";
import { showToast } from "../components/toastStore";
import { AvatarDisplay } from "../components/AvatarDisplay";

function requestPerson(request: FriendRequest): FriendUser {
  return (
    request.user ??
    request.requester ??
    request.recipient ?? { id: "", displayName: "Player" }
  );
}

export function FriendsScreen({
  onRequestCountChange,
}: {
  onRequestCountChange?: (count: number) => void;
}) {
  const connectionStatus = useGameStore((state) => state.connection.status);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [users, setUsers] = useState<FriendUser[]>([]);
  const [friendsCursor, setFriendsCursor] = useState<string | null>(null);
  const [incomingCursor, setIncomingCursor] = useState<string | null>(null);
  const [outgoingCursor, setOutgoingCursor] = useState<string | null>(null);
  const [usersCursor, setUsersCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [friendQuery, setFriendQuery] = useState("");
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [friendToRemove, setFriendToRemove] = useState<FriendEntry | null>(null);
  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends");
  const searchRequestId = useRef(0);
  const refreshRequestId = useRef(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchQuery(query.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [query]);
  useEffect(() => {
    const timeout = window.setTimeout(() => setFriendSearchQuery(friendQuery.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [friendQuery]);

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequestId.current;
    setLoading(true);
    try {
      const [friendResponse, incomingResponse, outgoingResponse] = await Promise.all([
        apiClient.getFriends(friendSearchQuery, 20),
        apiClient.getFriendRequests("incoming", 20),
        apiClient.getFriendRequests("outgoing", 20),
      ]);
      if (requestId === refreshRequestId.current) {
        setFriends(friendResponse.data.friends ?? []);
        setFriendsCursor(friendResponse.data.nextCursor ?? null);
        setIncoming(incomingResponse.data.requests ?? []);
        setIncomingCursor(incomingResponse.data.nextCursor ?? null);
        setOutgoing(outgoingResponse.data.requests ?? []);
        setOutgoingCursor(outgoingResponse.data.nextCursor ?? null);
      }
    } catch (error) {
      console.error("[Friends] Could not refresh social data:", error);
      showToast(
        error instanceof Error
          ? error.message
          : "Could not load friends and requests.",
        "error",
      );
    } finally {
      if (requestId === refreshRequestId.current) setLoading(false);
    }
  }, [friendSearchQuery]);

  const refreshUsers = useCallback(async () => {
    const requestId = ++searchRequestId.current;
    if (!searchQuery) {
      setUsers([]);
      setUsersCursor(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    try {
      const response = await apiClient.searchFriendUsers(searchQuery, 20);
      if (requestId === searchRequestId.current) {
        setUsers(response.data.items ?? []);
        setUsersCursor(response.data.nextCursor ?? null);
      }
    } catch (error) {
      if (requestId === searchRequestId.current) {
        showToast(error instanceof Error ? error.message : "Could not search players.", "error");
      }
    } finally {
      if (requestId === searchRequestId.current) setSearchLoading(false);
    }
  }, [searchQuery]);

  const loadMoreFriends = async () => {
    if (!friendsCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await apiClient.getFriends(friendSearchQuery, 20, friendsCursor);
      setFriends((current) => [...current, ...(response.data.friends ?? [])]);
      setFriendsCursor(response.data.nextCursor ?? null);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not load more friends.",
        "error",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMoreRequests = async (direction: "incoming" | "outgoing") => {
    const cursor = direction === "incoming" ? incomingCursor : outgoingCursor;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await apiClient.getFriendRequests(direction, 20, cursor);
      if (direction === "incoming") {
        setIncoming((current) => [...current, ...response.data.requests]);
        setIncomingCursor(response.data.nextCursor ?? null);
      } else {
        setOutgoing((current) => [...current, ...response.data.requests]);
        setOutgoingCursor(response.data.nextCursor ?? null);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not load more requests.", "error");
    } finally { setLoadingMore(false); }
  };

  const loadMoreUsers = async () => {
    if (!usersCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await apiClient.searchFriendUsers(searchQuery, 20, usersCursor);
      setUsers((current) => [...current, ...response.data.items]);
      setUsersCursor(response.data.nextCursor ?? null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not load more players.", "error");
    } finally { setLoadingMore(false); }
  };

  useEffect(() => {
    void refresh();
  }, [refresh, connectionStatus]);
  useEffect(() => {
    void refreshUsers();
  }, [refreshUsers, connectionStatus]);
  useEffect(() => {
    onRequestCountChange?.(incoming.length);
  }, [incoming.length, onRequestCountChange]);
  useEffect(() => {
    const refreshHandler = () => {
      void refresh();
      void refreshUsers();
    };
    window.addEventListener("social-data-refresh", refreshHandler);
    const onPresence = (online: boolean) => (event: Event) => {
      const userId = (event as CustomEvent<{ userId?: string }>).detail?.userId;
      if (userId)
        setFriends((current) =>
          current.map((friend) =>
            (friend.userId ?? friend.id) === userId
              ? { ...friend, isOnline: online }
              : friend,
          ),
        );
    };
    const online = onPresence(true);
    const offline = onPresence(false);
    window.addEventListener("friend-online", online);
    window.addEventListener("friend-offline", offline);
    return () => {
      window.removeEventListener("social-data-refresh", refreshHandler);
      window.removeEventListener("friend-online", online);
      window.removeEventListener("friend-offline", offline);
    };
  }, [refresh, refreshUsers]);

  const act = async (
    key: string,
    task: () => Promise<unknown>,
    success: string,
  ) => {
    setBusy(key);
    try {
      await task();
      showToast(success, "success");
      await refresh();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "That action could not be completed.",
        "error",
      );
    } finally {
      setBusy(null);
    }
  };

  const confirmRemoveFriend = async () => {
    if (!friendToRemove) return;
    const friend = friendToRemove;
    const id = friend.userId ?? friend.id;
    setBusy(id);
    try {
      await apiClient.removeFriend(id);
      showToast("Friend removed.", "success");
      setFriendToRemove(null);
      await refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not remove this friend.", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="min-h-full paper-body px-5 pt-7 pb-8 font-hand"
      data-testid="screen-friends"
    >
      <header className="mb-6">
        <p className="label-section text-chalk-mark flex items-center gap-2">
          <Users className="h-4 w-4" /> Your people
        </p>
        <h1 className="font-display text-4xl text-chalk-board">Friends</h1>
        <p className="mt-1 text-chalk-mark">
          Find your crew and get into a game together.
        </p>
      </header>

      <div
        className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-[rgba(139,94,60,0.1)] p-1"
        role="tablist"
        aria-label="Friends sections"
      >
        <button
          role="tab"
          aria-selected={activeTab === "friends"}
          onClick={() => setActiveTab("friends")}
          className={`min-h-11 rounded-lg px-3 text-sm font-bold transition-colors ${activeTab === "friends" ? "bg-paper text-chalk-board shadow-sm" : "text-chalk-mark"}`}
        >
          Friends
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "requests"}
          onClick={() => setActiveTab("requests")}
          className={`min-h-11 rounded-lg px-3 text-sm font-bold transition-colors ${activeTab === "requests" ? "bg-paper text-chalk-board shadow-sm" : "text-chalk-mark"}`}
        >
          Friend invites
          {incoming.length > 0 && (
            <span className="ml-2 rounded-full bg-school-red px-1.5 py-0.5 text-xs text-white">
              {incoming.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "friends" && (
        <>

         <section className="mb-6 rounded-2xl border border-paper-ruled bg-white/50 p-4">
            <h2 className="mb-3 flex items-center gap-2 font-bold text-chalk-board">
              <UserPlus className="h-4 w-4" /> Find Friends
            </h2>
            <label className="flex items-center gap-2 rounded-xl border border-paper-ruled bg-paper px-3 py-2">
              <Search className="h-4 w-4 text-chalk-mark" />
              <input
                aria-label="Search players"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchLoading(true);
                  searchRequestId.current += 1;
                }}
                placeholder="Search by name"
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            </label>
            <div className="mt-3 space-y-2">
              {searchLoading ? (
                <p className="flex items-center gap-2 py-3 text-sm text-chalk-mark" role="status">
                  <Loader2 className="h-4 w-4 animate-spin" /> Finding players…
                </p>
              ) : users
                .filter(
                  (user) =>
                    !friends.some(
                      (friend) =>
                        (friend.userId ?? friend.id) ===
                        (user.userId ?? user.id),
                    ) &&
                    !outgoing.some(
                      (request) => requestPerson(request).id === user.id,
                    ),
                )
                .map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 rounded-xl px-2 py-1"
                  >
                    <AvatarDisplay
                      avatarId={user.avatarId ?? undefined}
                      fallbackId={user.id}
                      title={user.displayName}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-paper-ruled bg-paper text-xl"
                      // imageClassName="h-full w-full rounded-full object-contain p-1"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-chalk-board">
                        {user.displayName}
                      </p>
                      {user.username && <p className="truncate text-xs text-chalk-mark">@{user.username}</p>}
                    </div>
                    <button
                      disabled={busy === user.id}
                      onClick={() =>
                        void act(
                          user.id,
                          () =>
                            apiClient.sendFriendRequest(user.userId ?? user.id),
                          "Friend request sent.",
                        )
                      }
                      className="min-h-10 rounded-lg bg-chalk-board px-3 text-sm font-bold text-paper active:scale-95 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                ))}
              {!searchLoading && query.trim() && !users.length && (
                <p className="py-2 text-sm text-chalk-mark">
                  No players found.
                </p>
              )}
              {!searchLoading && !query.trim() && !users.length && (
                <p className="py-2 text-sm text-chalk-mark">Search by name to find players.</p>
              )}
            </div>
            {usersCursor && (
              <button
                onClick={() => void loadMoreUsers()}
                disabled={loadingMore}
                className="mt-2 min-h-10 w-full rounded-lg border border-paper-ruled text-sm font-bold text-chalk-mark disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Show more players"}
              </button>
            )}
          </section>

          <section className="mt-6">
            <h2 className="mb-2 font-bold text-chalk-board">
              Friends
            </h2>
            <label className="mb-3 flex items-center gap-2 rounded-xl border border-paper-ruled bg-white/50 px-3 py-2">
              <Search className="h-4 w-4 text-chalk-mark" />
              <input
                aria-label="Search within friends"
                value={friendQuery}
                onChange={(event) => {
                  setFriendQuery(event.target.value);
                  setLoading(true);
                  refreshRequestId.current += 1;
                }}
                placeholder="Search your friends"
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            </label>
            {loading ? (
              <p className="py-4 text-chalk-mark">Loading…</p>
            ) : friends.length ? (
              <div className="space-y-2">
                {friends.map((friend) => {
                  const id = friend.userId ?? friend.id;
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-3 rounded-xl border border-paper-ruled bg-white/50 p-3"
                    >
                      <AvatarDisplay
                        avatarId={friend.avatarId ?? undefined}
                        fallbackId={id}
                        title={friend.displayName}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-paper-ruled bg-paper text-xl"
                        // imageClassName="h-full w-full rounded-full object-contain p-1"
                      />
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${friend.isOnline ? "bg-emerald-600" : "bg-stone-400"}`}
                      />
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <span className="block truncate font-bold text-chalk-board">
                          {friend.displayName}
                        </span>
                        <span className="text-xs text-chalk-mark">
                          {friend.username ? `@${friend.username} · ` : ""}{friend.isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                      <button
                        aria-label={`Remove ${friend.displayName}`}
                        onClick={() => setFriendToRemove(friend)}
                        className="p-2 text-chalk-mark"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-paper-ruled p-4 text-sm text-chalk-mark">
                No friends yet. Search for a player to add.
              </p>
            )}
            {friendsCursor && (
              <button
                onClick={() => void loadMoreFriends()}
                disabled={loadingMore}
                className="mt-3 min-h-10 w-full rounded-lg border border-paper-ruled text-sm font-bold text-chalk-mark disabled:opacity-50"
              >
                {loadingMore ? "Loadingâ€¦" : "Show more friends"}
              </button>
            )}
          </section>
        </>
      )}

      {activeTab === "requests" && (
        <section className="mb-6">
          <section className="mb-6">
              <h2 className="mb-2 font-bold text-chalk-board">
                Friend requests{" "}
                <span className="rounded-full bg-school-red px-2 text-white">
                  {incoming.length}
                </span>
              </h2>
              {!!incoming.length ? <div className="space-y-2">
                {incoming.map((request) => {
                  const person = requestPerson(request);
                  return (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 rounded-xl border border-paper-ruled bg-white/50 p-3"
                    >
                      <AvatarDisplay
                        avatarId={person.avatarId ?? undefined}
                        fallbackId={person.userId ?? person.id}
                        title={person.displayName}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-paper-ruled bg-paper text-xl"
                        // imageClassName="h-full w-full rounded-full object-contain p-1"
                      />
                      <span className="min-w-0 flex-1 truncate font-bold">
                        {person.displayName}
                      </span>
                      <button
                        aria-label={`Accept ${person.displayName}`}
                        onClick={() =>
                          void act(
                            request.id,
                            () =>
                              apiClient.respondFriendRequest(
                                request.id,
                                "accept",
                              ),
                            "Friend request accepted.",
                          )
                        }
                        className="rounded-lg bg-chalk-board p-2 text-paper"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`Decline ${person.displayName}`}
                        onClick={() =>
                          void act(
                            request.id,
                            () =>
                              apiClient.respondFriendRequest(
                                request.id,
                                "decline",
                              ),
                            "Request declined.",
                          )
                        }
                        className="rounded-lg border border-paper-ruled p-2 text-chalk-mark"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div> : <p className="rounded-xl border border-dashed border-paper-ruled p-4 text-sm text-chalk-mark">No friend invites right now.</p>}
              {incomingCursor && (
                <button onClick={() => void loadMoreRequests("incoming")} disabled={loadingMore} className="mt-2 min-h-10 w-full rounded-lg border border-paper-ruled text-sm font-bold text-chalk-mark disabled:opacity-50">
                  {loadingMore ? "Loadingâ€¦" : "Show more requests"}
                </button>
              )}
          </section>
          {!!outgoing.length && (
            <section className="mb-6 space-y-1">
              <h2 className="mb-2 font-bold text-chalk-board">Sent requests</h2>
              {outgoing.map((request) => (
                <div key={request.id} className="flex items-center gap-3 rounded-xl border border-paper-ruled bg-white/50 p-3 text-sm text-chalk-mark">
                  <AvatarDisplay
                    avatarId={requestPerson(request).avatarId ?? undefined}
                    fallbackId={requestPerson(request).userId ?? requestPerson(request).id}
                    title={requestPerson(request).displayName}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-paper-ruled bg-paper text-xl"
                    // imageClassName="h-full w-full rounded-full object-contain p-1"
                  />
                  <span className="min-w-0 flex-1 truncate font-bold text-chalk-board">{requestPerson(request).displayName}</span>
                  <span className="shrink-0 text-xs"><ArrowUpRight className="mr-1 inline h-4 w-4" />Pending</span>
                </div>
              ))}
              {outgoingCursor && (
                <button onClick={() => void loadMoreRequests("outgoing")} disabled={loadingMore} className="mt-2 min-h-10 w-full rounded-lg border border-paper-ruled text-sm font-bold text-chalk-mark disabled:opacity-50">
                  {loadingMore ? "Loading..." : "Show more sent requests"}
                </button>
              )}
            </section>
          )}
        </section>
      )}

      <AnimatePresence>
        {friendToRemove && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              aria-label="Cancel removing friend"
              onClick={() => setFriendToRemove(null)}
              className="absolute inset-0 h-full w-full cursor-default"
            />
            <motion.section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="remove-friend-title"
              aria-describedby="remove-friend-description"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-paper-ruled bg-paper p-5 shadow-xl"
            >
              <h2 id="remove-friend-title" className="font-display text-2xl text-chalk-board">Remove friend?</h2>
              <p id="remove-friend-description" className="mt-2 text-sm text-chalk-mark">
                Remove <span className="font-bold text-chalk-board">{friendToRemove.displayName}</span> from your friends?
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setFriendToRemove(null)}
                  disabled={busy === (friendToRemove.userId ?? friendToRemove.id)}
                  className="min-h-11 flex-1 rounded-xl border border-paper-ruled px-4 font-bold text-chalk-mark disabled:opacity-50"
                >Cancel</button>
                <button
                  onClick={() => void confirmRemoveFriend()}
                  disabled={busy === (friendToRemove.userId ?? friendToRemove.id)}
                  className="min-h-11 flex-1 rounded-xl bg-school-red px-4 font-bold text-white disabled:opacity-50"
                >{busy === (friendToRemove.userId ?? friendToRemove.id) ? "Removing…" : "Remove friend"}</button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

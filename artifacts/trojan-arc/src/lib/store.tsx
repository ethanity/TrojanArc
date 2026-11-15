"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { FitResult, Opportunity, Profile, Quest, Roadmap, Win } from "./types";

// Everything lives in the student's browser for the prototype. Production would sync to an account.
interface State {
  profile: Profile | null;
  roadmap: Roadmap | null;
  quests: Quest[];
  xp: number;
  wins: Win[];
  storiesShared: number;
  radar: { items: Opportunity[]; fits: FitResult[]; scanned: number; at: string } | null;
  saved: string[];
}

const EMPTY: State = { profile: null, roadmap: null, quests: [], xp: 0, wins: [], storiesShared: 0, radar: null, saved: [] };
const KEY = "trojan-arc:v1";

export interface Toast {
  id: number;
  title: string;
  body?: string;
}

interface Store extends State {
  ready: boolean;
  toasts: Toast[];
  setProfile: (p: Profile) => void;
  setRoadmap: (r: Roadmap) => void;
  setQuestStatus: (id: string, status: Quest["status"]) => void;
  logWin: (text: string) => void;
  shareStory: () => void;
  setRadar: (r: State["radar"]) => void;
  toggleSaved: (id: string) => void;
  toast: (title: string, body?: string) => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(EMPTY);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from browser storage once
      if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
    } catch {
      /* storage unavailable: start fresh */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, ready]);

  const toast = useCallback((title: string, body?: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, title, body }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const addXp = useCallback(
    (n: number, title: string, body?: string) => {
      setState((s) => ({ ...s, xp: s.xp + n }));
      toast(`${title} · +${n} XP`, body);
    },
    [toast],
  );

  const store = useMemo<Store>(
    () => ({
      ...state,
      ready,
      toasts,
      toast,
      setProfile: (p) => setState((s) => ({ ...s, profile: p, radar: null })),
      setRoadmap: (r) =>
        setState((s) => {
          const done = s.quests.filter((q) => q.status === "done");
          const fresh: Quest[] = r.phases.flatMap((ph, i) =>
            ph.quests.map((q, j) => ({ ...q, id: `q-${Date.now()}-${i}-${j}`, phase: ph.title, status: "open" as const })),
          );
          return { ...s, roadmap: r, quests: [...done, ...fresh] };
        }),
      setQuestStatus: (id, status) => {
        const q = state.quests.find((x) => x.id === id);
        setState((s) => ({ ...s, quests: s.quests.map((x) => (x.id === id ? { ...x, status } : x)) }));
        if (q && status === "done" && q.status !== "done") addXp(q.xp, "Quest complete", q.title);
        if (q && status === "active" && q.status === "open") addXp(5, "Quest started", q.title);
      },
      logWin: (text) => {
        setState((s) => ({ ...s, wins: [{ id: `w-${Date.now()}`, text, date: new Date().toISOString(), xp: 50 }, ...s.wins] }));
        addXp(50, "Win logged", text);
      },
      shareStory: () => {
        setState((s) => ({ ...s, storiesShared: s.storiesShared + 1 }));
        addXp(100, "Path shared", "The next Trojan on your path can learn from you.");
      },
      setRadar: (r) => setState((s) => ({ ...s, radar: r })),
      toggleSaved: (id) =>
        setState((s) => ({ ...s, saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [...s.saved, id] })),
      reset: () => setState(EMPTY),
    }),
    [state, ready, toasts, toast, addXp],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

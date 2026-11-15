"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// Google Calendar via Google Identity Services (browser OAuth token flow).
// Needs only a public OAuth client ID (NEXT_PUBLIC_GOOGLE_CLIENT_ID); no server secret.
// Without it, a sample student calendar keeps the demo working.

export interface CalEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  allDay?: boolean;
  kind: "class" | "event" | "quest" | "deadline" | "other";
}

type Status = "off" | "demo" | "connecting" | "connected";

interface Calendar {
  status: Status;
  configured: boolean;
  events: CalEvent[];
  error: string;
  connect: () => void;
  loadSample: () => void;
  disconnect: () => void;
  refresh: () => Promise<void>;
  addEvent: (e: Omit<CalEvent, "id">, description?: string) => Promise<boolean>;
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: (e: { type: string }) => void }) => {
            requestAccessToken: (o?: { prompt?: string }) => void;
          };
          revoke: (token: string, cb?: () => void) => void;
        };
      };
    };
  }
}

function loadGis(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load Google sign-in."));
    document.head.appendChild(s);
  });
}

/** A believable student week, relative to today. */
export function sampleWeek(): CalEvent[] {
  const out: CalEvent[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const at = (dayOffset: number, h: number, m = 0) => {
    const d = new Date(base);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d;
  };
  for (let i = 0; i < 7; i++) {
    const dow = at(i, 0).getDay(); // 0 Sun
    const push = (title: string, h: number, m: number, mins: number, kind: CalEvent["kind"]) => {
      const s = at(i, h, m);
      out.push({ id: `s-${i}-${title}`, title, start: s.toISOString(), end: new Date(s.getTime() + mins * 60000).toISOString(), kind });
    };
    if ([1, 3, 5].includes(dow)) push("CSCI 104 Lecture", 10, 0, 110, "class");
    if ([2, 4].includes(dow)) push("EE 250 Lecture", 12, 30, 110, "class");
    if ([2, 4].includes(dow)) push("MATH 225 Lecture", 9, 0, 80, "class");
    if (dow === 3) push("CSCI 104 Lab", 15, 0, 110, "class");
    if (dow === 1) push("Robot learning lab meeting", 16, 0, 60, "event");
    if (dow === 4) push("Model UN", 19, 0, 120, "event");
    if (dow === 5) push("Office hours (EE 250)", 14, 0, 60, "event");
    if (dow === 6) push("Gym w/ roommates", 11, 0, 90, "other");
    if ([1, 2, 3, 4, 5].includes(dow)) push("Lunch @ Village", 12, 0, 30, "other");
  }
  return out;
}

const Ctx = createContext<Calendar | null>(null);
const LS = "trojan-arc:cal";

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("off");
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [error, setError] = useState("");
  const token = useRef<{ value: string; exp: number } | null>(null);

  // Restore the sample-calendar choice (real tokens are never persisted).
  useEffect(() => {
    try {
      if (localStorage.getItem(LS) === "demo") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate once
        setStatus("demo");
        setEvents(sampleWeek());
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchEvents = useCallback(async (accessToken: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const max = new Date(now.getTime() + 8 * 86400000);
    const url = `${API}?singleEvents=true&orderBy=startTime&maxResults=250&timeMin=${now.toISOString()}&timeMax=${max.toISOString()}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`Google Calendar returned ${res.status}`);
    const data = (await res.json()) as {
      items: { id: string; summary?: string; start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string } }[];
    };
    setEvents(
      data.items.map((e) => ({
        id: e.id,
        title: e.summary ?? "(busy)",
        start: e.start.dateTime ?? `${e.start.date}T00:00:00`,
        end: e.end.dateTime ?? `${e.end.date}T00:00:00`,
        allDay: !e.start.dateTime,
        kind: /lecture|lab|discussion|\b[A-Z]{2,4} ?\d{3}/i.test(e.summary ?? "") ? "class" : "event",
      })),
    );
  }, []);

  const connect = useCallback(async () => {
    setError("");
    if (!CLIENT_ID) {
      setError("Google sign-in isn't configured yet (NEXT_PUBLIC_GOOGLE_CLIENT_ID). Using the sample calendar instead.");
      setStatus("demo");
      setEvents(sampleWeek());
      return;
    }
    try {
      setStatus("connecting");
      await loadGis();
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: async (r) => {
          if (!r.access_token) {
            setStatus("off");
            setError(r.error ? `Google sign-in failed: ${r.error}` : "Google sign-in was cancelled.");
            return;
          }
          token.current = { value: r.access_token, exp: Date.now() + (r.expires_in ?? 3600) * 1000 };
          try {
            await fetchEvents(r.access_token);
            setStatus("connected");
            try { localStorage.removeItem(LS); } catch { /* ignore */ }
          } catch (e) {
            setStatus("off");
            setError(e instanceof Error ? e.message : String(e));
          }
        },
        error_callback: (e) => {
          setStatus("off");
          setError(e.type === "popup_closed" ? "Google sign-in was closed." : `Google sign-in error: ${e.type}`);
        },
      });
      client.requestAccessToken({ prompt: "" });
    } catch (e) {
      setStatus("off");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [fetchEvents]);

  const loadSample = useCallback(() => {
    setError("");
    setStatus("demo");
    setEvents(sampleWeek());
    try { localStorage.setItem(LS, "demo"); } catch { /* ignore */ }
  }, []);

  const disconnect = useCallback(() => {
    if (token.current && window.google) window.google.accounts.oauth2.revoke(token.current.value);
    token.current = null;
    setStatus("off");
    setEvents([]);
    try { localStorage.removeItem(LS); } catch { /* ignore */ }
  }, []);

  const refresh = useCallback(async () => {
    if (status === "connected" && token.current && token.current.exp > Date.now()) await fetchEvents(token.current.value);
  }, [status, fetchEvents]);

  const addEvent = useCallback(
    async (e: Omit<CalEvent, "id">, description?: string) => {
      if (status === "connected" && token.current) {
        const body = e.allDay
          ? { summary: e.title, description, start: { date: e.start.slice(0, 10) }, end: { date: e.end.slice(0, 10) } }
          : { summary: e.title, description, start: { dateTime: e.start }, end: { dateTime: e.end } };
        const res = await fetch(API, {
          method: "POST",
          headers: { Authorization: `Bearer ${token.current.value}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          setError(`Couldn't add to Google Calendar (${res.status}).`);
          return false;
        }
        const created = (await res.json()) as { id: string };
        setEvents((ev) => [...ev, { ...e, id: created.id }]);
        return true;
      }
      setEvents((ev) => [...ev, { ...e, id: `local-${Date.now()}` }]);
      return true;
    },
    [status],
  );

  const value = useMemo<Calendar>(
    () => ({ status, configured: Boolean(CLIENT_ID), events, error, connect, loadSample, disconnect, refresh, addEvent }),
    [status, events, error, connect, loadSample, disconnect, refresh, addEvent],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCalendar() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCalendar outside CalendarProvider");
  return c;
}

/* ---------------- Scheduling helpers ---------------- */

export function effortMinutes(effort: string): number {
  const s = effort.toLowerCase();
  const n = parseFloat(s.replace(/[^0-9.]/g, "")) || 30;
  if (s.includes("hr")) return Math.min(120, Math.max(60, n * 60 > 120 ? 120 : n * 60));
  if (s.includes("min")) return Math.max(15, Math.min(120, n));
  return 45;
}

export interface Slot {
  start: Date;
  end: Date;
}

/** Free slots in the next 7 days between 9am and 9pm, around existing events. */
export function freeSlots(events: CalEvent[], minMinutes: number): Slot[] {
  const slots: Slot[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + i);
    const open = new Date(day);
    open.setHours(9, 0, 0, 0);
    const close = new Date(day);
    close.setHours(21, 0, 0, 0);
    let cursor = new Date(Math.max(open.getTime(), now.getTime() + 30 * 60000));
    cursor.setMinutes(Math.ceil(cursor.getMinutes() / 15) * 15, 0, 0);
    const busy = events
      .filter((e) => !e.allDay)
      .map((e) => ({ s: new Date(e.start), e: new Date(e.end) }))
      .filter((b) => b.e > open && b.s < close)
      .sort((a, b) => a.s.getTime() - b.s.getTime());
    for (const b of busy) {
      if (b.s.getTime() - cursor.getTime() >= minMinutes * 60000) slots.push({ start: new Date(cursor), end: new Date(b.s) });
      if (b.e > cursor) cursor = new Date(b.e.getTime() + 15 * 60000);
    }
    if (close.getTime() - cursor.getTime() >= minMinutes * 60000) slots.push({ start: new Date(cursor), end: close });
  }
  return slots;
}

/** Greedy plan: give each quest the earliest free slot that fits, max one quest per day. */
export function planQuests<T extends { id: string; effort: string }>(quests: T[], events: CalEvent[]) {
  const taken: CalEvent[] = [...events];
  const usedDays = new Set<string>(events.filter((e) => e.kind === "quest").map((e) => new Date(e.start).toDateString()));
  const plan: { quest: T; start: Date; end: Date }[] = [];
  for (const q of quests) {
    const mins = effortMinutes(q.effort);
    const slot = freeSlots(taken, mins).find((s) => !usedDays.has(s.start.toDateString()));
    if (!slot) continue;
    const end = new Date(slot.start.getTime() + mins * 60000);
    plan.push({ quest: q, start: slot.start, end });
    usedDays.add(slot.start.toDateString());
    taken.push({ id: `p-${q.id}`, title: "", start: slot.start.toISOString(), end: end.toISOString(), kind: "quest" });
  }
  return plan;
}

export function deadlineDate(s: string): Date | null {
  if (!s) return null;
  const now = new Date();
  const d = new Date(`${s} ${now.getFullYear()}`);
  if (isNaN(d.getTime())) return null;
  if (d.getTime() < now.getTime() - 86400000) d.setFullYear(d.getFullYear() + 1);
  return d;
}

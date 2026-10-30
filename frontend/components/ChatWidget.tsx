"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Send, X } from "lucide-react";
import { API, LOCATIONS } from "@/lib/config";
import Ulap, { type UlapMood } from "./Ulap";

type Msg =
  | { kind: "user" | "bot" | "error"; text: string }
  | { kind: "divider"; text: string };

type Props = {
  locationKey: string;
  onLocationChange: (key: string) => void;
  greeting: string;
};

const SUGGESTIONS = ["Do I need an umbrella?", "What should I wear tomorrow?", "Is tonight good for moongazing?"];

function replyText(data: unknown): string {
  if (typeof data === "string") return data;
  if (typeof data === "object" && data !== null) {
    const o = data as Record<string, unknown>;
    for (const k of ["reply", "response", "message", "answer", "content"]) {
      if (typeof o[k] === "string") return o[k] as string;
    }
  }
  return "I got an answer back, but couldn't read it.";
}

export default function ChatWidget({ locationKey, onLocationChange, greeting }: Props) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [happy, setHappy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevKey = useRef(locationKey);
  const loc = LOCATIONS.find((l) => l.key === locationKey) ?? LOCATIONS[0];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "end" });
  }, [msgs, busy, open, reduced]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Switching place starts a fresh thread for the backend, but keeps the old messages on screen.
  useEffect(() => {
    if (prevKey.current === locationKey) return;
    prevKey.current = locationKey;
    const name = LOCATIONS.find((l) => l.key === locationKey)?.name ?? locationKey;
    setMsgs((m) => (m.length ? [...m, { kind: "divider", text: `Now asking about ${name}` }] : m));
  }, [locationKey]);

  async function send(raw: string) {
    const message = raw.trim();
    if (!message || busy) return;
    setText("");

    // only messages after the last divider go to the backend
    let start = 0;
    msgs.forEach((m, i) => m.kind === "divider" && (start = i + 1));
    const history = msgs
      .slice(start)
      .filter((m) => m.kind === "user" || m.kind === "bot")
      .map((m) => ({ role: m.kind === "user" ? "user" : "assistant", content: m.text }));

    setMsgs((m) => [...m, { kind: "user", text: message }]);
    setBusy(true);
    try {
      const res = await fetch(`${API}/weather/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversation_history: history, location_key: locationKey }),
      });
      if (!res.ok) throw new Error(`The server answered ${res.status}.`);
      const data: unknown = await res.json();
      setMsgs((m) => [...m, { kind: "bot", text: replyText(data) }]);
      setHappy(true);
      setTimeout(() => setHappy(false), 2600);
    } catch (e) {
      const why = e instanceof Error ? e.message : "Network error.";
      setMsgs((m) => [...m, { kind: "error", text: `${why} The server may be waking up, so try again in a moment.` }]);
    } finally {
      setBusy(false);
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(text);
  };

  const mood: UlapMood = busy ? "thinking" : happy || open ? "happy" : "idle";

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Chat with Ulap"
            className="chat-panel"
            initial={reduced ? false : { opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            style={{ transformOrigin: "bottom right" }}
          >
            <header className="chat-head">
              <Ulap mood={mood} size={46} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold leading-none">Ulap</p>
                <div className="mt-1.5 flex gap-1" role="group" aria-label="Place to ask about">
                  {LOCATIONS.map((l) => (
                    <button
                      key={l.key}
                      className="pill"
                      data-on={l.key === locationKey}
                      aria-pressed={l.key === locationKey}
                      onClick={() => onLocationChange(l.key)}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>
              <button className="icon-btn" aria-label="Close chat" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </header>

            <div className="chat-scroll" aria-live="polite">
              <div className="bubble bot">
                {greeting}! Ask me anything about the weather in {loc.name}.
              </div>

              {msgs.length === 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} className="suggest" onClick={() => void send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {msgs.map((m, i) =>
                m.kind === "divider" ? (
                  <p key={i} className="py-1 text-center text-xs text-soft">
                    {m.text}
                  </p>
                ) : (
                  <motion.div
                    key={i}
                    className={`bubble ${m.kind}`}
                    initial={reduced ? false : { opacity: 0, scale: 0.94, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  >
                    {m.text}
                  </motion.div>
                ),
              )}

              {busy && (
                <div className="bubble bot drops" aria-label="Ulap is thinking">
                  {[0, 1, 2].map((i) => (
                    <svg key={i} viewBox="0 0 10 14" width="9" height="13" style={{ animationDelay: `${i * 0.15}s` }}>
                      <path d="M5 0 C5 0 0 6 0 9 a5 5 0 0 0 10 0 C10 6 5 0 5 0Z" fill="currentColor" />
                    </svg>
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>

            <form className="chat-form" onSubmit={onSubmit}>
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Ask about ${loc.name}`}
                aria-label="Your question"
                maxLength={400}
              />
              <button type="submit" className="send" disabled={busy || !text.trim()} aria-label="Send">
                <Send size={17} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        className="ulap-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat with Ulap" : "Open chat with Ulap"}
        aria-expanded={open}
      >
        <Ulap mood={mood} size={76} />
        {!open && <span className="fab-tip">Ask Ulap</span>}
      </button>
    </>
  );
}

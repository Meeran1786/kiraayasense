"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, MessageCircleQuestion, RotateCcw, Send, X } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useT } from "@/lib/i18n/client";
import { SignInModal } from "@/components/auth/SignInModal";
import { brand, brandGradient } from "@/lib/brand";

interface Turn {
  role: "user" | "assistant";
  text: string;
}

/** Bold and links only; links must be site-relative ("/property/…"). Everything else is plain text. */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\((\/[^\s)]*)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      out.push(
        <Link key={`${key}-${i++}`} href={m[2]} className="font-medium underline underline-offset-2" style={{ color: brand.coral }}>
          {m[1]}
        </Link>
      );
    } else {
      out.push(<strong key={`${key}-${i++}`}>{m[3]}</strong>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Answer({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (!bullets.length) return;
    const items = bullets;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="ms-4 list-disc space-y-1">
        {items.map((b, j) => (
          <li key={j}>{inline(b, `li-${blocks.length}-${j}`)}</li>
        ))}
      </ul>
    );
    bullets = [];
  };
  text.split("\n").forEach((line, idx) => {
    const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (bullet) return void bullets.push(bullet[1]);
    flush();
    if (line.trim()) blocks.push(<p key={`p-${idx}`}>{inline(line.replace(/^#+\s*/, ""), `p-${idx}`)}</p>);
  });
  flush();
  return <div className="space-y-2">{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}

/**
 * Ask KiraayaSense: a floating chat button on every page. Signed-in users
 * ask questions answered from the site's own listings and reviews (POST
 * /api/assistant). The chat lives in memory only; it survives page changes
 * because the root layout keeps this component mounted.
 */
export function AskAssistant() {
  const t = useT();
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const propertyId = pathname?.match(/^\/property\/([0-9a-f-]{36})/i)?.[1] ?? null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy, open]);

  // Owner and admin screens have their own tools; keep the button off them.
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/embed") || pathname?.startsWith("/badge")) return null;

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    if (!user) {
      setSignInOpen(true);
      return;
    }
    const next = [...turns, { role: "user" as const, text: q }];
    setTurns(next);
    setDraft("");
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, locale: t.locale, propertyId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? t("ask.error"));
        setTurns(turns); // take the unanswered question back out
        setDraft(q);
        return;
      }
      setTurns([...next, { role: "assistant", text: body.reply }]);
      if (typeof body.remaining === "number") setRemaining(body.remaining);
    } catch {
      setError(t("ask.error"));
      setTurns(turns);
      setDraft(q);
    } finally {
      setBusy(false);
    }
  }

  const examples = [t("ask.example1"), ...(propertyId ? [t("ask.example2")] : []), t("ask.example3")];

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 end-5 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg print:hidden"
          style={{ background: brandGradient }}
          aria-label={t("ask.title")}
        >
          <MessageCircleQuestion size={18} />
          {t("ask.button")}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={t("ask.title")}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[80vh] flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:inset-x-auto sm:bottom-5 sm:end-5 sm:h-[600px] sm:max-h-[85vh] sm:w-[400px] sm:rounded-2xl print:hidden"
          style={{ background: brand.navy, borderColor: "var(--ks-border-strong)" }}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3" style={{ borderColor: "var(--ks-border-soft)" }}>
            <div className="flex items-center gap-2 font-semibold" style={{ color: brand.white }}>
              <MessageCircleQuestion size={18} style={{ color: brand.coral }} />
              {t("ask.title")}
            </div>
            <div className="flex items-center gap-1">
              {turns.length > 0 && (
                <button type="button" onClick={() => { setTurns([]); setError(null); }} className="rounded-full p-2 text-[var(--ks-text-muted)] hover:text-[var(--ks-text)]" title={t("ask.clear")} aria-label={t("ask.clear")}>
                  <RotateCcw size={16} />
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-[var(--ks-text-muted)] hover:text-[var(--ks-text)]" title={t("ask.close")} aria-label={t("ask.close")}>
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm" style={{ color: brand.white }}>
            {turns.length === 0 && (
              <div className="space-y-3">
                <p className="text-[var(--ks-text-muted)]">{t("ask.intro")}</p>
                <div className="flex flex-wrap gap-2">
                  {examples.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => ask(ex)}
                      className="rounded-full border px-3 py-1.5 text-start text-xs hover:bg-[var(--ks-bg-elevated)]"
                      style={{ borderColor: "var(--ks-border-strong)" }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((turn, i) =>
              turn.role === "user" ? (
                <div key={i} className="ms-10 whitespace-pre-wrap rounded-2xl rounded-ee-sm px-3 py-2 text-white" style={{ background: brandGradient }}>
                  {turn.text}
                </div>
              ) : (
                <div key={i} className="me-6 rounded-2xl rounded-es-sm px-3 py-2 leading-relaxed" style={{ background: "var(--ks-bg-elevated)" }}>
                  <Answer text={turn.text} />
                </div>
              )
            )}
            {busy && (
              <div className="flex items-center gap-2 text-[var(--ks-text-muted)]">
                <Loader2 size={14} className="animate-spin" /> {t("ask.thinking")}
              </div>
            )}
            {error && <p style={{ color: brand.danger }}>{error}</p>}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
            }}
            className="shrink-0 border-t px-3 py-3"
            style={{ borderColor: "var(--ks-border-soft)" }}
          >
            {user ? (
              <>
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        ask(draft);
                      }
                    }}
                    rows={1}
                    maxLength={1000}
                    placeholder={t("ask.placeholder")}
                    className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border bg-[var(--ks-bg-input)] px-3 py-2 text-sm text-[var(--ks-text)] placeholder:text-[var(--ks-text-faint)] focus:outline-none"
                    style={{ borderColor: "var(--ks-border-strong)" }}
                  />
                  <button
                    type="submit"
                    disabled={busy || !draft.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
                    style={{ background: brandGradient }}
                    aria-label={t("ask.send")}
                  >
                    <Send size={16} className="rtl:-scale-x-100" />
                  </button>
                </div>
                {remaining !== null && <p className="mt-1.5 text-xs text-[var(--ks-text-faint)]">{t("ask.remaining", { n: remaining })}</p>}
              </>
            ) : (
              <button
                type="button"
                onClick={() => setSignInOpen(true)}
                className="w-full rounded-full py-2.5 text-sm font-semibold text-white"
                style={{ background: brandGradient }}
              >
                {t("ask.signIn")}
              </button>
            )}
          </form>
        </div>
      )}

      <SignInModal
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSignedIn={() => setSignInOpen(false)}
        reason={t("ask.signIn")}
        googleCallbackUrl={pathname ?? "/"}
      />
    </>
  );
}

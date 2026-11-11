"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { brandGradient } from "@/lib/brand";

const inputCls =
  "rounded-lg border border-[var(--ks-border-strong)] bg-transparent px-3 py-2 text-sm text-[var(--ks-text)] focus:outline-none";
const btnCls = "rounded-full border px-2.5 py-1 text-xs hover:bg-white/5 disabled:opacity-50";

async function call(url: string, method: string, body?: object) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, data, message: data?.error?.message as string | undefined };
}

export function AddMemberForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MODERATOR" | "SUPER_ADMIN">("MODERATOR");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    const r = await call("/api/admin/team", "POST", { email, role });
    setBusy(false);
    if (!r.ok) return setNote({ ok: false, text: r.message ?? "Could not add this person." });
    setNote({
      ok: true,
      text:
        (r.data.outcome === "UPDATED" ? `${email} is now a ${role === "SUPER_ADMIN" ? "super admin" : "moderator"}.` : `Invite saved for ${email}. It applies when they first sign in.`) +
        (r.data.emailed ? " We emailed them." : ""),
    });
    setEmail("");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" className={`${inputCls} flex-1`} />
      <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className={inputCls}>
        <option value="MODERATOR">Moderator</option>
        <option value="SUPER_ADMIN">Super admin</option>
      </select>
      <button
        type="submit"
        disabled={busy}
        className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
        style={{ background: brandGradient }}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Add
      </button>
      {note && <p className={`text-xs sm:basis-full ${note.ok ? "text-[var(--ks-success)]" : "text-red-400"}`}>{note.text}</p>}
    </form>
  );
}

export function MemberActions({ userId, role, name }: { userId: string; role: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (next: string) => {
    if (next === "USER" && !confirm(`Remove ${name} from the team? They keep their normal account.`)) return;
    setBusy(true);
    setError(null);
    const r = await call(`/api/admin/team/${userId}`, "PATCH", { role: next });
    setBusy(false);
    if (!r.ok) return setError(r.message ?? "Failed");
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2" style={{ color: "var(--ks-text-muted)" }}>
      <button
        type="button"
        disabled={busy}
        onClick={() => change(role === "SUPER_ADMIN" ? "MODERATOR" : "SUPER_ADMIN")}
        className={btnCls}
        style={{ borderColor: "var(--ks-border-strong)" }}
      >
        Make {role === "SUPER_ADMIN" ? "moderator" : "super admin"}
      </button>
      <button type="button" disabled={busy} onClick={() => change("USER")} className={`${btnCls} text-red-400`} style={{ borderColor: "var(--ks-border-strong)" }}>
        Remove
      </button>
      {error && <span className="basis-full text-end text-xs text-red-400">{error}</span>}
    </div>
  );
}

export function InviteActions({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex justify-end">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await call(`/api/admin/team/${inviteId}?invite=1`, "DELETE");
          setBusy(false);
          router.refresh();
        }}
        className={`${btnCls} text-red-400`}
        style={{ borderColor: "var(--ks-border-strong)" }}
      >
        Withdraw invite
      </button>
    </div>
  );
}

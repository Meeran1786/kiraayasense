"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { RELATIONSHIPS, RELATIONSHIP_LABELS, type RelationshipKey } from "@/lib/relationships";

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  relationships: RelationshipKey[];
  businessCount: number;
  children: AdminCategory[];
}

async function send(url: string, method: "POST" | "PATCH", body: unknown): Promise<string | null> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (res.ok) return null;
  const data = await res.json().catch(() => null);
  const fieldErrors = data?.error?.fieldErrors ? Object.values(data.error.fieldErrors).flat().join(" ") : "";
  return data?.error?.message ?? (fieldErrors || "Could not save");
}

export function CategoryManager({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    const problem = await action();
    setBusy(false);
    if (problem) setError(problem);
    else router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-xs text-red-400">{error}</p>}

      <NewTopCategory busy={busy} onCreate={(name, relationships) => run(() => send("/api/admin/categories", "POST", { name, relationships }))} />

      {categories.map((top) => (
        <div
          key={top.id}
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)", opacity: top.isActive ? 1 : 0.6 }}
        >
          <CategoryRow
            category={top}
            busy={busy}
            onRename={(name) => run(() => send(`/api/admin/categories/${top.id}`, "PATCH", { name }))}
            onToggle={() => run(() => send(`/api/admin/categories/${top.id}`, "PATCH", { isActive: !top.isActive }))}
          />

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {RELATIONSHIPS.map((r) => (
              <label key={r} className="flex items-center gap-1.5 text-[11px] text-[var(--ks-text-muted)]">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={top.relationships.includes(r)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...top.relationships, r]
                      : top.relationships.filter((x) => x !== r);
                    run(() => send(`/api/admin/categories/${top.id}`, "PATCH", { relationships: next }));
                  }}
                />
                {RELATIONSHIP_LABELS[r]}
              </label>
            ))}
          </div>

          <ul className="mt-3 flex flex-col gap-1 border-t pt-3" style={{ borderColor: "var(--ks-border)" }}>
            {top.children.map((c) => (
              <li key={c.id} className="pl-3" style={{ opacity: c.isActive ? 1 : 0.6 }}>
                <CategoryRow
                  category={c}
                  busy={busy}
                  small
                  onRename={(name) => run(() => send(`/api/admin/categories/${c.id}`, "PATCH", { name }))}
                  onToggle={() => run(() => send(`/api/admin/categories/${c.id}`, "PATCH", { isActive: !c.isActive }))}
                />
              </li>
            ))}
            <li className="pl-3">
              <AddInline
                placeholder="New sub-category"
                busy={busy}
                onAdd={(name) => run(() => send("/api/admin/categories", "POST", { name, parentId: top.id }))}
              />
            </li>
          </ul>
        </div>
      ))}
    </div>
  );
}

function CategoryRow({
  category,
  busy,
  small,
  onRename,
  onToggle,
}: {
  category: AdminCategory;
  busy: boolean;
  small?: boolean;
  onRename: (name: string) => void;
  onToggle: () => void;
}) {
  const [name, setName] = useState(category.name);
  const dirty = name.trim() !== category.name;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={`min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1 text-[var(--ks-text)] ${small ? "text-xs" : "text-sm font-semibold"}`}
        style={{ borderColor: dirty ? "var(--ks-coral)" : "transparent" }}
      />
      <span className="text-[11px] text-[var(--ks-text-faint)]">
        {category.slug} · {category.businessCount} businesses
      </span>
      {dirty && (
        <button type="button" disabled={busy} onClick={() => onRename(name.trim())} className={btnCls}>
          Save name
        </button>
      )}
      <button type="button" disabled={busy} onClick={onToggle} className={btnCls}>
        {category.isActive ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function AddInline({ placeholder, busy, onAdd }: { placeholder: string; busy: boolean; onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim().length < 2) return;
        onAdd(name.trim());
        setName("");
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-md border bg-transparent px-2 py-1 text-xs text-[var(--ks-text)]"
        style={{ borderColor: "var(--ks-border)" }}
      />
      <button type="submit" disabled={busy} className={btnCls}>
        <Plus size={12} /> Add
      </button>
    </form>
  );
}

function NewTopCategory({ busy, onCreate }: { busy: boolean; onCreate: (name: string, relationships: RelationshipKey[]) => void }) {
  const [name, setName] = useState("");
  const [relationships, setRelationships] = useState<RelationshipKey[]>(["CUSTOMER", "EMPLOYEE"]);
  return (
    <form
      className="flex flex-col gap-2 rounded-xl border border-dashed p-4"
      style={{ borderColor: "var(--ks-border-strong)" }}
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim().length < 2 || relationships.length === 0) return;
        onCreate(name.trim(), relationships);
        setName("");
      }}
    >
      <p className="text-xs font-semibold text-[var(--ks-text)]">New top-level category</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Logistics"
        className="rounded-md border bg-transparent px-2 py-1.5 text-sm text-[var(--ks-text)]"
        style={{ borderColor: "var(--ks-border)" }}
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {RELATIONSHIPS.map((r) => (
          <label key={r} className="flex items-center gap-1.5 text-[11px] text-[var(--ks-text-muted)]">
            <input
              type="checkbox"
              checked={relationships.includes(r)}
              onChange={(e) =>
                setRelationships((prev) => (e.target.checked ? [...prev, r] : prev.filter((x) => x !== r)))
              }
            />
            {RELATIONSHIP_LABELS[r]}
          </label>
        ))}
      </div>
      <button type="submit" disabled={busy} className={`${btnCls} self-start`}>
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add category
      </button>
    </form>
  );
}

const btnCls =
  "inline-flex items-center gap-1 rounded-full border border-[var(--ks-border-strong)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ks-text)] transition-colors hover:bg-white/5 disabled:opacity-40";

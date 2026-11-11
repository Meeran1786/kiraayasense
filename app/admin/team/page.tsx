import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailConfigured } from "@/lib/notify/email";
import { AddMemberForm, InviteActions, MemberActions } from "./TeamControls";

export const metadata = { title: "Team and roles — KiraayaSense admin" };

const ROLE_LABEL: Record<string, string> = { SUPER_ADMIN: "Super admin", MODERATOR: "Moderator" };
const fmt = (d: Date | null | undefined) =>
  d ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—";

export default async function TeamPage() {
  const session = await getServerSession(authOptions);
  const [members, invites, roleChanges] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "MODERATOR"] } },
      orderBy: [{ role: "desc" }, { displayName: "asc" }],
      select: { id: true, displayName: true, primaryEmail: true, role: true, lastSeenAt: true, createdAt: true },
    }),
    prisma.adminInvite.findMany({ where: { acceptedAt: null }, orderBy: { createdAt: "desc" }, include: { invitedBy: { select: { displayName: true } } } }),
    prisma.auditLog.findMany({
      where: { action: { in: ["ROLE_CHANGED", "ADMIN_INVITE_ACCEPTED"] }, entityType: "User" },
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { displayName: true } } },
    }),
  ]);
  const addedBy = new Map<string, { by: string; at: Date }>();
  for (const r of roleChanges) if (!addedBy.has(r.entityId)) addedBy.set(r.entityId, { by: r.actor.displayName, at: r.createdAt });

  const card = { borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--ks-text)]">Team and roles</h1>
        <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
          Super admins can do everything. Moderators handle reviews, reports, owner replies, claims and businesses, but can't
          change the team, banners, imports, categories or question sets.
        </p>
      </div>

      <section className="rounded-xl border p-5" style={card}>
        <h2 className="font-semibold text-[var(--ks-text)]">Add a team member</h2>
        <p className="mt-1 text-xs text-[var(--ks-text-muted)]">
          Use the Gmail address they sign in with. If they haven&apos;t signed in yet, the role is applied the first time they do.
          {emailConfigured() ? " They get an email to let them know." : " Email isn't set up yet, so tell them yourself."}
        </p>
        <AddMemberForm />
      </section>

      <section className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--ks-border)" }}>
        <table className="w-full text-left text-sm">
          <thead style={{ background: "var(--ks-bg-elevated)" }}>
            <tr className="text-xs uppercase tracking-wide text-[var(--ks-text-faint)]">
              <th className="px-4 py-2.5">Member</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Added</th>
              <th className="px-4 py-2.5">Last active</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const added = addedBy.get(m.id);
              return (
                <tr key={m.id} className="border-t" style={{ borderColor: "var(--ks-border)" }}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-[var(--ks-text)]">
                      {m.displayName} {m.id === session?.user?.id && <span className="text-xs text-[var(--ks-text-faint)]">(you)</span>}
                    </p>
                    <p className="text-xs text-[var(--ks-text-muted)]">{m.primaryEmail}</p>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{ROLE_LABEL[m.role]}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--ks-text-faint)]">
                    {added ? `${fmt(added.at)} by ${added.by}` : "Before the Team page"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--ks-text-faint)]">{fmt(m.lastSeenAt)}</td>
                  <td className="px-4 py-2.5">
                    {m.id !== session?.user?.id && <MemberActions userId={m.id} role={m.role} name={m.displayName} />}
                  </td>
                </tr>
              );
            })}
            {invites.map((i) => (
              <tr key={i.id} className="border-t" style={{ borderColor: "var(--ks-border)" }}>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-[var(--ks-text-muted)]">{i.email}</p>
                  <p className="text-xs text-[var(--ks-text-faint)]">Invited, hasn&apos;t signed in yet</p>
                </td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{ROLE_LABEL[i.role] ?? i.role}</td>
                <td className="px-4 py-2.5 text-xs text-[var(--ks-text-faint)]">
                  {fmt(i.createdAt)} by {i.invitedBy.displayName}
                </td>
                <td className="px-4 py-2.5 text-xs text-[var(--ks-text-faint)]">—</td>
                <td className="px-4 py-2.5">
                  <InviteActions inviteId={i.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

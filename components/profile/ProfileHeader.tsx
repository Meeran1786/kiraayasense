import Link from "next/link";
import {
  Award,
  Building2,
  CalendarDays,
  Coins,
  MapPin,
  Medal,
  ShieldCheck,
} from "lucide-react";
import type { ReviewerProfile } from "@/lib/db/users";
import { brandGradient } from "@/lib/brand";

export function ProfileHeader({
  profile,
  ownView = false,
}: {
  profile: ReviewerProfile;
  ownView?: boolean;
}) {
  const since = profile.memberSince.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const { level } = profile;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Google avatar URL, not worth an image loader config
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-20 w-20 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-slate-950"
            style={{ background: brandGradient }}
          >
            {profile.displayName.trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-[var(--ks-text)]">
            {profile.displayName}
          </h1>
          <p className="text-sm text-[var(--ks-text-faint)]">
            @{profile.handle}
          </p>
          {profile.bio && (
            <p className="mt-2 max-w-xl text-sm text-[var(--ks-text-muted)]">
              {profile.bio}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ks-text-faint)]">
            {profile.city && (
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {profile.city}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CalendarDays size={12} /> Member since {since}
            </span>
          </div>
        </div>
        <div className="flex gap-3 sm:flex-col sm:items-end">
          <Stat
            icon={<Award size={14} />}
            value={level.name}
            label={
              level.next
                ? toNext(
                    level.next.at - profile.approvedReviewCount,
                    level.next.name,
                  )
                : "Highest level"
            }
          />
          <div className="flex gap-3">
            <Stat value={String(profile.approvedReviewCount)} label="reviews" />
            <Stat
              icon={<ShieldCheck size={14} />}
              value={String(profile.verifiedReviewCount)}
              label="with proof"
            />
            <Stat
              icon={<Coins size={14} />}
              value={profile.points.toLocaleString("en-IN")}
              label="points"
            />
          </div>
        </div>
      </div>
      {(profile.badges.length > 0 || ownView) && (
        <div className="flex flex-wrap items-center gap-2">
          {profile.badges.map((b) => (
            <span
              key={b.key}
              title={b.hint}
              className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium text-[var(--ks-text)]"
              style={{
                borderColor: "var(--ks-border)",
                background: "var(--ks-bg-elevated-2)",
              }}
            >
              {b.kind === "city" ? (
                <Building2 size={12} />
              ) : (
                <Medal size={12} style={{ color: "var(--ks-warn)" }} />
              )}
              {b.label}
            </span>
          ))}
          {ownView && (
            <Link
              href="/profile/rewards"
              className="ml-auto flex items-center gap-1 text-xs font-medium text-[var(--ks-coral)] hover:underline"
            >
              <Coins size={12} /> My Rewards
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon?: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div
      className="rounded-xl border px-3 py-2"
      style={{
        borderColor: "var(--ks-border)",
        background: "var(--ks-bg-elevated)",
      }}
    >
      <p className="flex items-center gap-1 text-sm font-semibold text-[var(--ks-text)]">
        {icon}
        {value}
      </p>
      <p className="text-[11px] text-[var(--ks-text-faint)]">{label}</p>
    </div>
  );
}

const toNext = (n: number, name: string) =>
  `${n} more review${n === 1 ? "" : "s"} to ${name}`;

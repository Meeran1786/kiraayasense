"use client";

import { usePathname, useRouter } from "next/navigation";
import { Store, UserRound } from "lucide-react";
import { useMode } from "@/lib/modeContext";
import { isBusinessPath, type AppMode } from "@/lib/mode";
import { useAuth } from "@/lib/authContext";
import { useT } from "@/lib/i18n/client";

/**
 * Customer / Business switch, used like the light/dark toggle. Business takes
 * a signed-in person to their owner dashboard (which offers to claim a
 * listing when they have none) and everyone else to the "For businesses"
 * page. Customer takes them back to the home page from an owner page.
 */
export function ModeSwitch({ size = "sm" }: { size?: "sm" | "lg" }) {
  const { mode, setMode } = useMode();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const t = useT();

  const choose = (m: AppMode) => {
    if (m === mode && !(m === "business" && !isBusinessPath(pathname))) return;
    setMode(m);
    if (m === "business") router.push(user ? "/owner" : "/for-businesses");
    else if (isBusinessPath(pathname)) router.push("/");
    router.refresh();
  };

  const options: { value: AppMode; label: string; icon: typeof Store }[] = [
    { value: "customer", label: t("mode.customer"), icon: UserRound },
    { value: "business", label: t("mode.business"), icon: Store },
  ];
  const lg = size === "lg";

  return (
    <div
      role="radiogroup"
      aria-label={t("mode.label")}
      className={`flex shrink-0 items-center rounded-full border p-0.5 ${lg ? "w-full max-w-sm" : ""}`}
      style={{ borderColor: "var(--ks-border-strong)" }}
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => choose(value)}
            className={`flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors ${
              lg ? "flex-1 px-4 py-2 text-sm" : "px-2 py-1 text-xs sm:px-2.5"
            }`}
            style={
              active
                ? { background: value === "business" ? "var(--ks-coral)" : "var(--ks-text)", color: "var(--ks-bg)" }
                : { color: "var(--ks-text-muted)" }
            }
          >
            <Icon size={lg ? 16 : 13} />
            <span className={lg ? "" : "hidden md:inline"}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

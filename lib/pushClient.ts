"use client";

/**
 * Browser side of web push: asks permission, subscribes this device through
 * the service worker (public/sw.js) and saves it at /api/me/push.
 */

export type PushState = "unsupported" | "ios-install" | "off-site" | "denied" | "default" | "on" | "off";

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

let config: Promise<{ enabled: boolean; publicKey: string | null }> | null = null;
const getConfig = () =>
  (config ??= fetch("/api/me/push")
    .then((r) => r.json())
    .catch(() => ({ enabled: false, publicKey: null })));

async function registration(): Promise<ServiceWorkerRegistration | null> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js").catch(() => null);
}

/**
 * Where this device stands: "on" (subscribed), "off" (allowed but not
 * subscribed), "default" (never asked), "denied", "ios-install" (iPhone needs
 * the site on the home screen first), "off-site" (push not set up on the
 * server) or "unsupported".
 */
export async function pushState(): Promise<PushState> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return "unsupported";
  if (!("PushManager" in window) || !("Notification" in window)) return isIos() && !isStandalone() ? "ios-install" : "unsupported";
  const cfg = await getConfig();
  if (!cfg.enabled || !cfg.publicKey) return "off-site";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) return "on";
  return Notification.permission === "granted" ? "off" : "default";
}

function keyBytes(base64url: string): Uint8Array {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Must be called from a tap (browsers only show the permission prompt then). */
export async function turnOnPush(): Promise<PushState> {
  const cfg = await getConfig();
  if (!cfg.enabled || !cfg.publicKey) return "off-site";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "default";
  const reg = await registration();
  if (!reg) return "unsupported";
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(cfg.publicKey) as BufferSource }));
  const res = await fetch("/api/me/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  return res.ok ? "on" : "off";
}

export async function turnOffPush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/me/push", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => undefined);
    await sub.unsubscribe().catch(() => undefined);
  }
  return "off";
}

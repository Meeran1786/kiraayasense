/** @type {import('next').NextConfig} */
const nextConfig = {
  // deploy/deploy.sh builds into a side folder (NEXT_BUILD_DIR=.next-build)
  // and swaps it in only when the build succeeds, so the live site never
  // serves a half-written .next. `next start` always reads .next.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
};

module.exports = nextConfig;

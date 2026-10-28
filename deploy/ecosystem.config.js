// PM2 process file: `pm2 startOrReload deploy/ecosystem.config.js`.
module.exports = {
  apps: [
    {
      name: "kiraayasense",
      cwd: "/home/kiraaya/app",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      env: { NODE_ENV: "production" },
      max_memory_restart: "900M",
      time: true,
    },
  ],
};

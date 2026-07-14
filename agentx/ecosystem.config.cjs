module.exports = {
  apps: [
    {
      name: "txline-ai-trader-web",
      cwd: "/var/www/agentx-buildingculture/apps/web",
      script: "node",
      args: ".next/standalone/apps/web/server.js",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PORT: "3041",
        HOSTNAME: "0.0.0.0",
        NEXT_PUBLIC_API_URL: "https://agentx.buildingcultureid.space",
        NEXT_PUBLIC_WS_URL: "wss://agentx.buildingcultureid.space/ws",
        NEXT_PUBLIC_APP_URL: "https://agentx.buildingcultureid.space",
      },
      max_memory_restart: "800M",
      autorestart: true,
    },
    {
      name: "txline-ai-trader-engine",
      cwd: "/var/www/agentx-buildingculture/services/ai-engine",
      script: ".venv/bin/uvicorn",
      args: "app.main:app --host 0.0.0.0 --port 8041",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "600M",
      autorestart: true,
    },
  ],
};

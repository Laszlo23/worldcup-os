module.exports = {
  apps: [
    {
      name: "txline-ai-trader-web",
      cwd: "/var/www/agentx-buildingculture/apps/web",
      script: "npm",
      args: "start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PORT: "3041",
        HOSTNAME: "0.0.0.0",
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

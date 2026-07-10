module.exports = {
  apps: [
    {
      name: "worldcup-os",
      cwd: "/var/www/wmos-buildingculture",
      script: "/var/www/wmos-buildingculture/scripts/start-server.sh",
      interpreter: "bash",
      env: {
        NODE_ENV: "production",
        PORT: "3017",
        HOST: "0.0.0.0",
      },
      max_memory_restart: "800M",
      autorestart: true,
    },
    {
      name: "worldcup-worker",
      cwd: "/var/www/wmos-buildingculture",
      script: "/var/www/wmos-buildingculture/scripts/start-worker.sh",
      interpreter: "bash",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "512M",
      autorestart: true,
    },
  ],
};

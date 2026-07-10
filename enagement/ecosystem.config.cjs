module.exports = {
  apps: [
    {
      name: "matchmind-os",
      cwd: "/var/www/match-buildingculture/enagement",
      script: "/var/www/match-buildingculture/enagement/scripts/start-server.sh",
      interpreter: "bash",
      env: {
        NODE_ENV: "production",
        PORT: "3031",
        HOST: "0.0.0.0",
      },
      max_memory_restart: "800M",
      autorestart: true,
    },
  ],
};

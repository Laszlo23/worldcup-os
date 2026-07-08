module.exports = {
  apps: [
    {
      name: "worldcup-os",
      cwd: "/var/www/wmos-buildingculture",
      script: "/var/www/wmos-buildingculture/scripts/start-server.sh",
      interpreter: "bash",
      env: {
        NODE_ENV: "production",
        VITE_PORT: "3017",
        NITRO_DEV_PORT: "3018",
      },
      max_memory_restart: "800M",
      autorestart: true,
    },
  ],
};

module.exports = {
  apps: [
    {
      name: "mbti-backend",
      cwd: "/opt/mbti/backend",
      script: "src/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

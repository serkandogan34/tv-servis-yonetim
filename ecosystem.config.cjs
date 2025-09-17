// PM2 ecosystem configuration for TV Servis Yönetim Sistemi
module.exports = {
  apps: [
    {
      name: 'tv-servis-yonetim',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=tvservis-production --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
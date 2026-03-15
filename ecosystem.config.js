/**
 * PM2 ecosystem file
 *
 * Deploy時はこのファイルを使って起動 / 再起動を管理します。
 */

export default {
  apps: [
    {
      name: 'choms-schedule',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};

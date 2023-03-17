module.exports = {
  apps: [{
    name: 'dev',
    script: './app.js',
    watch: true,
    env: {
      NODE_ENV: 'dev',
      PORT: '8081',
      IP: '0.0.0.0',
    },
  }, {
    name: 'test',
    script: './app.js',
    watch: true,
    env: {
      NODE_ENV: 'test',
      PORT: '8082',
      IP: '0.0.0.0',
    },
  }, {
    name: 'prod',
    script: './app.js',
    watch: true,
    env: {
      NODE_ENV: 'prod',
      PORT: '8080',
      IP: '0.0.0.0',
    },
  }],
};

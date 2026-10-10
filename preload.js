// Lets the ユー website know it is running inside the protected desktop app.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('yuApp', {
  version: '1.0.1',
  platform: process.platform,
  captureProtected: true,
});

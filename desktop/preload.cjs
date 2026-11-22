const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('vcmDesktop', {
  isDesktop: true,
  platform: process.platform,
});

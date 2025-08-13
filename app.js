// app.js
// 小梦想游戏 - 小程序入口文件

App({
  onLaunch() {
    // 小程序初始化时触发
    console.log('小梦想游戏启动');
    
    // 获取系统信息
    this.globalData.systemInfo = wx.getSystemInfoSync();
    
    // 初始化本地存储
    this.initStorage();
    
    // 检查更新
    this.checkUpdate();
  },

  onShow() {
    // 小程序启动或从后台进入前台时触发
    console.log('小程序进入前台');
  },

  onHide() {
    // 小程序从前台进入后台时触发
    console.log('小程序进入后台');
    // 保存游戏状态
    this.saveGameState();
  },

  initStorage() {
    // 初始化本地存储
    const settings = wx.getStorageSync('settings');
    if (!settings) {
      // 设置默认配置
      wx.setStorageSync('settings', {
        soundEnabled: true,
        musicEnabled: true,
        vibrationEnabled: true
      });
    }
  },

  checkUpdate() {
    // 检查小程序更新
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      
      updateManager.onCheckForUpdate(res => {
        if (res.hasUpdate) {
          console.log('发现新版本');
        }
      });

      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: res => {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });

      updateManager.onUpdateFailed(() => {
        console.error('新版本下载失败');
      });
    }
  },

  saveGameState() {
    // 保存游戏状态到本地存储
    const currentPage = getCurrentPages();
    if (currentPage.length > 0) {
      const page = currentPage[currentPage.length - 1];
      if (page.saveState && typeof page.saveState === 'function') {
        page.saveState();
      }
    }
  },

  globalData: {
    userInfo: null,
    systemInfo: null,
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      vibrationEnabled: true
    },
    currentGame: null
  }
});
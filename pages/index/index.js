// pages/index/index.js
// 小梦想游戏 - 主页

Page({
  data: {
    // 游戏列表
    games: [
      {
        id: 'maze',
        name: '走迷宫',
        icon: '🌟',
        desc: '找到出口，挑战自己',
        color: '#B8E6D1',  // 淡薄荷绿
        path: '/pages/maze/maze'
      },
      {
        id: 'match3',
        name: '消消乐',
        icon: '💎',
        desc: '消除方块，获得高分',
        color: '#FFDAB9',  // 淡桃色
        path: '/pages/match3/match3'
      },
      {
        id: 'maze3d',
        name: '3D迷宫',
        icon: '🧊',
        desc: '身临其境的挑战',
        color: '#A7C7E7', // 淡蓝色
        path: '/pages/maze-3d/maze-3d'
      }
    ],
    // 设置
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      vibrationEnabled: true
    },
    // 显示设置弹窗
    showSettings: false,
    // 动画类
    animationClass: ''
  },

  onLoad() {
    console.log('主页加载');
    // 加载设置
    this.loadSettings();
    // 添加进入动画
    this.setData({
      animationClass: 'fade-in'
    });
  },

  onShow() {
    // 页面显示时刷新设置
    this.loadSettings();
  },

  // 加载设置
  loadSettings() {
    try {
      const settings = wx.getStorageSync('settings');
      if (settings) {
        this.setData({ settings });
      }
    } catch (e) {
      console.error('加载设置失败:', e);
    }
  },

  // 保存设置
  saveSettings() {
    try {
      wx.setStorageSync('settings', this.data.settings);
      // 更新全局设置
      const app = getApp();
      app.globalData.settings = this.data.settings;
    } catch (e) {
      console.error('保存设置失败:', e);
    }
  },

  // 进入游戏
  enterGame(e) {
    const { path } = e.currentTarget.dataset;
    
    // 播放点击音效
    if (this.data.settings.soundEnabled) {
      this.playSound('click');
    }
    
    // 震动反馈
    if (this.data.settings.vibrationEnabled) {
      wx.vibrateShort({ type: 'light' });
    }
    
    // 跳转到游戏页面
    wx.navigateTo({
      url: path,
      success: () => {
        console.log('跳转成功:', path);
      },
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '进入游戏失败',
          icon: 'none'
        });
      }
    });
  },

  // 显示设置
  showSettingsModal() {
    this.setData({ showSettings: true });
    
    // 播放点击音效
    if (this.data.settings.soundEnabled) {
      this.playSound('click');
    }
  },

  // 隐藏设置
  hideSettingsModal() {
    this.setData({ showSettings: false });
    this.saveSettings();
  },

  // 切换音效
  toggleSound() {
    const soundEnabled = !this.data.settings.soundEnabled;
    this.setData({
      'settings.soundEnabled': soundEnabled
    });
    
    // 播放反馈音效
    if (soundEnabled) {
      this.playSound('click');
    }
  },

  // 切换音乐
  toggleMusic() {
    const musicEnabled = !this.data.settings.musicEnabled;
    this.setData({
      'settings.musicEnabled': musicEnabled
    });
    
    // 控制背景音乐
    const app = getApp();
    if (musicEnabled) {
      this.playBackgroundMusic();
    } else {
      this.stopBackgroundMusic();
    }
  },

  // 切换震动
  toggleVibration() {
    const vibrationEnabled = !this.data.settings.vibrationEnabled;
    this.setData({
      'settings.vibrationEnabled': vibrationEnabled
    });
    
    // 震动反馈
    if (vibrationEnabled) {
      wx.vibrateShort({ type: 'light' });
    }
  },

  // 播放音效
  playSound(soundName) {
    const audio = wx.createInnerAudioContext();
    audio.src = `/assets/sounds/${soundName}.mp3`;
    audio.volume = 0.5;
    audio.play();
    
    // 自动销毁
    audio.onEnded(() => {
      audio.destroy();
    });
  },

  // 播放背景音乐
  playBackgroundMusic() {
    if (!this.bgm) {
      this.bgm = wx.createInnerAudioContext();
      this.bgm.src = '/assets/sounds/bgm.mp3';
      this.bgm.loop = true;
      this.bgm.volume = 0.3;
    }
    this.bgm.play();
  },

  // 停止背景音乐
  stopBackgroundMusic() {
    if (this.bgm) {
      this.bgm.pause();
    }
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '小梦想游戏 - 益智游戏合集',
      path: '/pages/index/index',
      imageUrl: '/assets/images/share.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '小梦想游戏 - 益智游戏合集',
      query: '',
      imageUrl: '/assets/images/share.png'
    };
  }
});
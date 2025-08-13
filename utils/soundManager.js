// utils/soundManager.js
// 音效管理器

class SoundManager {
  constructor() {
    this.enabled = true;
    this.musicEnabled = true;
    this.sounds = new Map();
    this.bgm = null;
    this.bgmVolume = 0.3;
    this.effectVolume = 0.5;
    
    // 音效配置
    this.soundConfig = {
      // 通用音效
      click: { volume: 0.5, duration: 200 },
      select: { volume: 0.5, duration: 150 },
      start: { volume: 0.6, duration: 500 },
      victory: { volume: 0.7, duration: 2000 },
      gameover: { volume: 0.6, duration: 1500 },
      
      // 迷宫游戏音效
      move: { volume: 0.4, duration: 100 },
      wall: { volume: 0.5, duration: 200 },
      hint: { volume: 0.4, duration: 300 },
      
      // 消消乐音效
      swap: { volume: 0.4, duration: 200 },
      match: { volume: 0.5, duration: 300 },
      match_large: { volume: 0.6, duration: 500 },
      explosion: { volume: 0.7, duration: 800 },
      invalid: { volume: 0.4, duration: 200 },
      combo: { volume: 0.6, duration: 400 }
    };
    
    // 初始化
    this.init();
  }
  
  // 初始化
  init() {
    // 加载设置
    this.loadSettings();
    
    // 预加载音效（如果需要）
    // this.preloadSounds();
  }
  
  // 加载设置
  loadSettings() {
    try {
      const settings = wx.getStorageSync('settings');
      if (settings) {
        this.enabled = settings.soundEnabled !== false;
        this.musicEnabled = settings.musicEnabled !== false;
      }
    } catch (e) {
      console.error('加载音效设置失败:', e);
    }
  }
  
  // 保存设置
  saveSettings() {
    try {
      const settings = wx.getStorageSync('settings') || {};
      settings.soundEnabled = this.enabled;
      settings.musicEnabled = this.musicEnabled;
      wx.setStorageSync('settings', settings);
    } catch (e) {
      console.error('保存音效设置失败:', e);
    }
  }
  
  // 播放音效
  play(soundName, options = {}) {
    if (!this.enabled) return;
    
    const config = this.soundConfig[soundName];
    if (!config) {
      console.warn(`音效 '${soundName}' 未配置`);
      return;
    }
    
    // 创建音频实例
    const audio = wx.createInnerAudioContext();
    audio.src = `/assets/sounds/${soundName}.mp3`;
    audio.volume = options.volume || config.volume || this.effectVolume;
    
    // 播放音效
    audio.play();
    
    // 错误处理
    audio.onError((err) => {
      console.log(`音效 ${soundName} 播放失败，使用备用方案`);
      // 可以在这里使用系统音效作为备用
      this.playSystemSound(soundName);
    });
    
    // 播放结束后销毁
    audio.onEnded(() => {
      audio.destroy();
    });
    
    // 存储引用（用于停止等操作）
    const audioId = Date.now();
    this.sounds.set(audioId, audio);
    
    // 自动清理
    setTimeout(() => {
      if (this.sounds.has(audioId)) {
        const audio = this.sounds.get(audioId);
        audio.destroy();
        this.sounds.delete(audioId);
      }
    }, config.duration + 1000);
    
    return audioId;
  }
  
  // 播放系统音效（备用方案）
  playSystemSound(soundName) {
    // 使用震动作为音效的替代
    if (soundName === 'click' || soundName === 'select') {
      wx.vibrateShort({ type: 'light' });
    } else if (soundName === 'wall' || soundName === 'invalid') {
      wx.vibrateShort({ type: 'heavy' });
    } else if (soundName === 'victory' || soundName === 'explosion') {
      wx.vibrateLong();
    }
  }
  
  // 播放背景音乐
  playBGM(musicName = 'bgm', options = {}) {
    if (!this.musicEnabled) return;
    
    // 如果已有背景音乐在播放，先停止
    if (this.bgm) {
      this.bgm.stop();
      this.bgm.destroy();
    }
    
    // 创建新的背景音乐实例
    this.bgm = wx.createInnerAudioContext();
    this.bgm.src = `/assets/sounds/${musicName}.mp3`;
    this.bgm.loop = options.loop !== false;
    this.bgm.volume = options.volume || this.bgmVolume;
    this.bgm.autoplay = true;
    
    // 播放
    this.bgm.play();
    
    // 错误处理
    this.bgm.onError((err) => {
      console.error('背景音乐播放失败:', err);
      this.bgm = null;
    });
  }
  
  // 停止背景音乐
  stopBGM() {
    if (this.bgm) {
      this.bgm.stop();
      this.bgm.destroy();
      this.bgm = null;
    }
  }
  
  // 暂停背景音乐
  pauseBGM() {
    if (this.bgm) {
      this.bgm.pause();
    }
  }
  
  // 恢复背景音乐
  resumeBGM() {
    if (this.bgm && this.musicEnabled) {
      this.bgm.play();
    }
  }
  
  // 设置背景音乐音量
  setBGMVolume(volume) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.bgm) {
      this.bgm.volume = this.bgmVolume;
    }
  }
  
  // 设置音效音量
  setEffectVolume(volume) {
    this.effectVolume = Math.max(0, Math.min(1, volume));
  }
  
  // 切换音效开关
  toggleSound() {
    this.enabled = !this.enabled;
    this.saveSettings();
    return this.enabled;
  }
  
  // 切换音乐开关
  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    
    if (this.musicEnabled) {
      this.resumeBGM();
    } else {
      this.pauseBGM();
    }
    
    this.saveSettings();
    return this.musicEnabled;
  }
  
  // 停止所有音效
  stopAll() {
    // 停止所有音效
    this.sounds.forEach(audio => {
      audio.stop();
      audio.destroy();
    });
    this.sounds.clear();
    
    // 停止背景音乐
    this.stopBGM();
  }
  
  // 震动反馈
  vibrate(type = 'light', enabled = true) {
    if (!enabled) return;
    
    switch (type) {
      case 'light':
        wx.vibrateShort({ type: 'light' });
        break;
      case 'medium':
        wx.vibrateShort({ type: 'medium' });
        break;
      case 'heavy':
        wx.vibrateShort({ type: 'heavy' });
        break;
      case 'long':
        wx.vibrateLong();
        break;
    }
  }
  
  // 播放连击音效（音调递增）
  playComboSound(comboLevel) {
    if (!this.enabled) return;
    
    // 根据连击等级调整音调
    const baseVolume = 0.5;
    const volumeIncrement = Math.min(comboLevel * 0.05, 0.3);
    
    this.play('combo', {
      volume: baseVolume + volumeIncrement
    });
  }
  
  // 清理资源
  destroy() {
    this.stopAll();
  }
}

// 单例模式
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new SoundManager();
  }
  return instance;
}

module.exports = {
  getInstance,
  SoundManager
};
// utils/storageManager.js
// 存储管理器

class StorageManager {
  constructor() {
    this.prefix = 'smallDreamGame_';
    this.cache = new Map();
  }
  
  // 获取完整的键名
  getFullKey(key) {
    return `${this.prefix}${key}`;
  }
  
  // 保存数据
  set(key, value) {
    const fullKey = this.getFullKey(key);
    
    try {
      wx.setStorageSync(fullKey, value);
      this.cache.set(fullKey, value);
      return true;
    } catch (e) {
      console.error(`保存数据失败 [${key}]:`, e);
      
      // 尝试清理存储空间
      this.cleanupStorage();
      
      // 再次尝试保存
      try {
        wx.setStorageSync(fullKey, value);
        this.cache.set(fullKey, value);
        return true;
      } catch (e2) {
        console.error(`二次保存失败 [${key}]:`, e2);
        return false;
      }
    }
  }
  
  // 获取数据
  get(key, defaultValue = null) {
    const fullKey = this.getFullKey(key);
    
    // 先从缓存获取
    if (this.cache.has(fullKey)) {
      return this.cache.get(fullKey);
    }
    
    // 从存储获取
    try {
      const value = wx.getStorageSync(fullKey);
      if (value !== '') {
        this.cache.set(fullKey, value);
        return value;
      }
    } catch (e) {
      console.error(`获取数据失败 [${key}]:`, e);
    }
    
    return defaultValue;
  }
  
  // 移除数据
  remove(key) {
    const fullKey = this.getFullKey(key);
    
    try {
      wx.removeStorageSync(fullKey);
      this.cache.delete(fullKey);
      return true;
    } catch (e) {
      console.error(`移除数据失败 [${key}]:`, e);
      return false;
    }
  }
  
  // 清空所有游戏数据
  clear() {
    try {
      // 获取所有存储键
      const res = wx.getStorageInfoSync();
      const keys = res.keys;
      
      // 只清除本游戏的数据
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          wx.removeStorageSync(key);
        }
      });
      
      // 清空缓存
      this.cache.clear();
      
      return true;
    } catch (e) {
      console.error('清空数据失败:', e);
      return false;
    }
  }
  
  // 获取存储信息
  getInfo() {
    try {
      const info = wx.getStorageInfoSync();
      const gameKeys = info.keys.filter(key => key.startsWith(this.prefix));
      
      return {
        keys: gameKeys,
        currentSize: info.currentSize,
        limitSize: info.limitSize,
        usage: `${((info.currentSize / info.limitSize) * 100).toFixed(2)}%`
      };
    } catch (e) {
      console.error('获取存储信息失败:', e);
      return null;
    }
  }
  
  // 清理存储空间
  cleanupStorage() {
    try {
      const info = this.getInfo();
      if (!info) return;
      
      // 如果使用率超过80%，清理旧数据
      if (info.currentSize / info.limitSize > 0.8) {
        console.log('存储空间不足，开始清理...');
        
        // 清理游戏状态缓存
        this.remove('mazeGameState');
        this.remove('match3GameState');
        
        // 清理旧的游戏记录（保留最近10条）
        const mazeRecords = this.get('mazeRecords', {});
        Object.keys(mazeRecords).forEach(difficulty => {
          if (mazeRecords[difficulty].completed && 
              mazeRecords[difficulty].completed.length > 10) {
            mazeRecords[difficulty].completed = 
              mazeRecords[difficulty].completed.slice(-10);
          }
        });
        this.set('mazeRecords', mazeRecords);
        
        console.log('清理完成');
      }
    } catch (e) {
      console.error('清理存储空间失败:', e);
    }
  }
  
  // 游戏设置相关
  getSettings() {
    return this.get('settings', {
      soundEnabled: true,
      musicEnabled: true,
      vibrationEnabled: true
    });
  }
  
  setSettings(settings) {
    return this.set('settings', settings);
  }
  
  // 迷宫游戏记录
  getMazeRecords() {
    return this.get('mazeRecords', {
      easy: { bestTime: null, bestSteps: null, completed: [] },
      medium: { bestTime: null, bestSteps: null, completed: [] },
      hard: { bestTime: null, bestSteps: null, completed: [] }
    });
  }
  
  saveMazeRecord(difficulty, time, steps) {
    const records = this.getMazeRecords();
    
    if (!records[difficulty]) {
      records[difficulty] = { bestTime: null, bestSteps: null, completed: [] };
    }
    
    // 更新最佳记录
    if (!records[difficulty].bestTime || time < records[difficulty].bestTime) {
      records[difficulty].bestTime = time;
    }
    
    if (!records[difficulty].bestSteps || steps < records[difficulty].bestSteps) {
      records[difficulty].bestSteps = steps;
    }
    
    // 添加完成记录
    records[difficulty].completed.push({
      time,
      steps,
      date: new Date().toISOString()
    });
    
    // 只保留最近20条记录
    if (records[difficulty].completed.length > 20) {
      records[difficulty].completed = records[difficulty].completed.slice(-20);
    }
    
    return this.set('mazeRecords', records);
  }
  
  // 消消乐游戏记录
  getMatch3Records() {
    return this.get('match3Records', {
      highScore: 0,
      totalScore: 0,
      gamesPlayed: 0,
      maxCombo: 0,
      history: []
    });
  }
  
  saveMatch3Record(score, combo, moves, time) {
    const records = this.getMatch3Records();
    
    // 更新最高分
    if (score > records.highScore) {
      records.highScore = score;
    }
    
    // 更新总分和游戏次数
    records.totalScore += score;
    records.gamesPlayed++;
    
    // 更新最大连击
    if (combo > records.maxCombo) {
      records.maxCombo = combo;
    }
    
    // 添加历史记录
    records.history.push({
      score,
      combo,
      moves,
      time,
      date: new Date().toISOString()
    });
    
    // 只保留最近30条记录
    if (records.history.length > 30) {
      records.history = records.history.slice(-30);
    }
    
    return this.set('match3Records', records);
  }
  
  // 成就系统
  getAchievements() {
    return this.get('achievements', {
      unlocked: [],
      progress: {}
    });
  }
  
  unlockAchievement(achievementId) {
    const achievements = this.getAchievements();
    
    if (!achievements.unlocked.includes(achievementId)) {
      achievements.unlocked.push(achievementId);
      achievements.progress[achievementId] = {
        unlockedAt: new Date().toISOString()
      };
      
      this.set('achievements', achievements);
      return true;
    }
    
    return false;
  }
  
  // 统计数据
  getStatistics() {
    return this.get('statistics', {
      totalPlayTime: 0,
      totalGames: 0,
      lastPlayDate: null,
      dailyPlayTime: {},
      favoriteGame: null
    });
  }
  
  updateStatistics(gameType, playTime) {
    const stats = this.getStatistics();
    const today = new Date().toDateString();
    
    // 更新总游戏时间
    stats.totalPlayTime += playTime;
    stats.totalGames++;
    stats.lastPlayDate = new Date().toISOString();
    
    // 更新每日游戏时间
    if (!stats.dailyPlayTime[today]) {
      stats.dailyPlayTime[today] = 0;
    }
    stats.dailyPlayTime[today] += playTime;
    
    // 清理30天前的数据
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    Object.keys(stats.dailyPlayTime).forEach(date => {
      if (new Date(date) < thirtyDaysAgo) {
        delete stats.dailyPlayTime[date];
      }
    });
    
    return this.set('statistics', stats);
  }
}

// 单例模式
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new StorageManager();
  }
  return instance;
}

module.exports = {
  getInstance,
  StorageManager
};
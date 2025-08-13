// pages/match3/match3.js
// 消消乐游戏页面

const Match3Logic = require('../../utils/match3Logic.js');

Page({
  data: {
    // 游戏状态
    gameStatus: 'ready', // ready, playing, paused, gameover
    gameMode: 'classic', // classic, survival
    
    // 游戏数据
    grid: [],
    gridSize: 8,
    cellSize: 40,
    score: 0,
    combo: 0,
    maxCombo: 0,
    comboStatus: '',
    comboColor: '',
    
    // 生存模式
    survivalLevel: 1,
    threatLevel: 0,
    corruptedCount: 0,
    
    // 选中的方块
    selectedBlock: null,
    
    // 动画状态
    isAnimating: false,
    
    // 统计数据
    highScore: 0,
    totalMoves: 0,
    totalTime: 0,
    
    // Canvas相关
    canvasWidth: 320,
    canvasHeight: 320,
    
    // 设置
    settings: {},
    
    // 特效显示
    showComboEffect: false,
    scorePopups: []
  },

  // 游戏逻辑实例
  gameLogic: null,
  
  // 计时器
  timer: null,
  animationTimer: null,
  
  // Canvas上下文
  ctx: null,
  
  // 触摸相关
  touchStartPos: null,

  onLoad(options) {
    console.log('消消乐游戏加载');
    
    // 加载设置
    this.loadSettings();
    
    // 加载最高分
    this.loadHighScore();
    
    // 初始化Canvas
    this.initCanvas();
    
    // 初始化游戏逻辑
    this.gameLogic = new Match3Logic(8, 6);
    
    // 设置游戏模式
    if (options.mode) {
      this.setData({ gameMode: options.mode });
    }
    
    // 初始化游戏
    this.initGame();
  },

  onReady() {
    // 获取Canvas上下文
    const query = wx.createSelectorQuery();
    query.select('#match3Canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]) {
          const canvas = res[0].node;
          this.ctx = canvas.getContext('2d');
          
          // 设置Canvas尺寸
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = this.data.canvasWidth * dpr;
          canvas.height = this.data.canvasHeight * dpr;
          this.ctx.scale(dpr, dpr);
          
          // 绘制游戏
          this.drawGame();
        }
      });
  },

  onUnload() {
    // 清理计时器
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
    }
    // 保存游戏状态
    this.saveGameState();
  },

  // 初始化Canvas
  initCanvas() {
    const systemInfo = wx.getSystemInfoSync();
    const screenWidth = systemInfo.windowWidth;
    const canvasSize = Math.min(screenWidth - 40, 400);
    const cellSize = Math.floor(canvasSize / 8);
    
    this.setData({
      canvasWidth: canvasSize,
      canvasHeight: canvasSize,
      cellSize: cellSize
    });
  },

  // 加载设置
  loadSettings() {
    try {
      const settings = wx.getStorageSync('settings') || {
        soundEnabled: true,
        musicEnabled: true,
        vibrationEnabled: true
      };
      this.setData({ settings });
    } catch (e) {
      console.error('加载设置失败:', e);
    }
  },

  // 加载最高分
  loadHighScore() {
    try {
      const records = wx.getStorageSync('match3Records') || {};
      this.setData({
        highScore: records.highScore || 0
      });
    } catch (e) {
      console.error('加载记录失败:', e);
    }
  },

  // 保存最高分
  saveHighScore() {
    if (this.data.score > this.data.highScore) {
      try {
        const records = wx.getStorageSync('match3Records') || {};
        records.highScore = this.data.score;
        records.lastScore = this.data.score;
        records.maxCombo = Math.max(records.maxCombo || 0, this.data.maxCombo);
        wx.setStorageSync('match3Records', records);
        
        this.setData({
          highScore: this.data.score
        });
      } catch (e) {
        console.error('保存记录失败:', e);
      }
    }
  },

  // 初始化游戏
  initGame() {
    this.gameLogic.initGrid();
    const state = this.gameLogic.getGameState();
    
    this.setData({
      grid: state.grid,
      score: 0,
      combo: 0,
      maxCombo: 0,
      totalMoves: 0,
      totalTime: 0,
      gameStatus: 'ready',
      selectedBlock: null,
      isAnimating: false,
      survivalLevel: 1,
      threatLevel: 0,
      corruptedCount: 0
    });
    
    if (this.ctx) {
      this.drawGame();
    }
  },

  // 开始游戏
  startGame() {
    if (this.data.gameStatus === 'playing') return;
    
    this.setData({
      gameStatus: 'playing'
    });
    
    // 开始计时
    this.timer = setInterval(() => {
      this.setData({
        totalTime: this.data.totalTime + 1
      });
      
      // 生存模式：定期添加腐蚀方块
      if (this.data.gameMode === 'survival' && this.data.totalTime % 10 === 0) {
        this.addCorruptedBlocks();
      }
    }, 1000);
    
    // 播放背景音乐
    if (this.data.settings.musicEnabled) {
      this.playBackgroundMusic();
    }
    
    // 播放开始音效
    if (this.data.settings.soundEnabled) {
      this.playSound('start');
    }
  },

  // 暂停游戏
  pauseGame() {
    if (this.data.gameStatus !== 'playing') return;
    
    this.setData({
      gameStatus: 'paused'
    });
    
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  // 继续游戏
  resumeGame() {
    if (this.data.gameStatus !== 'paused') return;
    
    this.setData({
      gameStatus: 'playing'
    });
    
    // 继续计时
    this.timer = setInterval(() => {
      this.setData({
        totalTime: this.data.totalTime + 1
      });
      
      if (this.data.gameMode === 'survival' && this.data.totalTime % 10 === 0) {
        this.addCorruptedBlocks();
      }
    }, 1000);
  },

  // 重新开始
  restartGame() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    this.initGame();
  },

  // 绘制游戏
  drawGame() {
    if (!this.ctx) return;
    
    const { grid, cellSize, selectedBlock } = this.data;
    const ctx = this.ctx;
    
    // 清空画布
    ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制背景
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制网格和方块
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const x = col * cellSize;
        const y = row * cellSize;
        
        // 绘制网格背景
        ctx.fillStyle = '#34495E';
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        
        const block = grid[row][col];
        if (block) {
          // 绘制方块
          if (block.type === 1) {
            // 腐蚀方块
            ctx.fillStyle = '#95A5A6';
            ctx.fillRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
            
            // 绘制腐蚀纹理
            ctx.strokeStyle = '#7F8C8D';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 8, y + 8);
            ctx.lineTo(x + cellSize - 8, y + cellSize - 8);
            ctx.moveTo(x + cellSize - 8, y + 8);
            ctx.lineTo(x + 8, y + cellSize - 8);
            ctx.stroke();
          } else {
            // 普通方块
            const colors = this.gameLogic.colors;
            ctx.fillStyle = colors[block.color] || '#999';
            
            // 绘制圆角矩形
            this.drawRoundedRect(ctx, x + 4, y + 4, cellSize - 8, cellSize - 8, 8);
            ctx.fill();
            
            // 添加光泽效果
            const gradient = ctx.createLinearGradient(x, y, x, y + cellSize);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
            ctx.fillStyle = gradient;
            this.drawRoundedRect(ctx, x + 4, y + 4, cellSize - 8, cellSize - 8, 8);
            ctx.fill();
          }
          
          // 绘制选中效果
          if (selectedBlock && selectedBlock.row === row && selectedBlock.col === col) {
            ctx.strokeStyle = '#F39C12';
            ctx.lineWidth = 3;
            this.drawRoundedRect(ctx, x + 2, y + 2, cellSize - 4, cellSize - 4, 8);
            ctx.stroke();
            
            // 添加脉冲效果
            ctx.strokeStyle = 'rgba(243, 156, 18, 0.5)';
            ctx.lineWidth = 5;
            this.drawRoundedRect(ctx, x, y, cellSize, cellSize, 8);
            ctx.stroke();
          }
        }
      }
    }
    
    // 绘制连击特效
    if (this.data.showComboEffect) {
      this.drawComboEffect(ctx);
    }
  },

  // 绘制圆角矩形
  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  },

  // 绘制连击特效
  drawComboEffect(ctx) {
    const { canvasWidth, canvasHeight, comboColor } = this.data;
    
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = comboColor || '#FFD700';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, canvasWidth - 10, canvasHeight - 10);
    ctx.restore();
  },

  // 触摸开始
  touchStart(e) {
    if (this.data.gameStatus !== 'playing' || this.data.isAnimating) return;
    
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const col = Math.floor(x / this.data.cellSize);
    const row = Math.floor(y / this.data.cellSize);
    
    if (row >= 0 && row < this.data.gridSize && 
        col >= 0 && col < this.data.gridSize &&
        this.data.grid[row][col]) {
      
      this.touchStartPos = { row, col };
      
      if (!this.data.selectedBlock) {
        // 第一次选择
        this.setData({
          selectedBlock: { row, col }
        });
        this.drawGame();
        
        // 播放选择音效
        if (this.data.settings.soundEnabled) {
          this.playSound('select');
        }
      } else {
        // 第二次选择，尝试交换
        this.trySwapBlocks(this.data.selectedBlock, { row, col });
      }
    }
  },

  // 触摸移动
  touchMove(e) {
    if (!this.touchStartPos || this.data.isAnimating) return;
    
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const col = Math.floor(x / this.data.cellSize);
    const row = Math.floor(y / this.data.cellSize);
    
    // 检查是否滑动到相邻方块
    if (this.gameLogic.isAdjacent(
      this.touchStartPos.row, this.touchStartPos.col, row, col
    )) {
      this.trySwapBlocks(this.touchStartPos, { row, col });
      this.touchStartPos = null;
    }
  },

  // 触摸结束
  touchEnd(e) {
    // 开始游戏
    if (this.data.gameStatus === 'ready') {
      this.startGame();
    }
  },

  // 尝试交换方块
  trySwapBlocks(block1, block2) {
    if (this.data.isAnimating) return;
    
    // 检查是否相邻
    if (!this.gameLogic.isAdjacent(
      block1.row, block1.col, block2.row, block2.col
    )) {
      // 不相邻，更新选中
      this.setData({
        selectedBlock: block2
      });
      this.drawGame();
      return;
    }
    
    this.setData({
      isAnimating: true,
      selectedBlock: null
    });
    
    // 执行交换
    const success = this.gameLogic.swapBlocks(
      block1.row, block1.col, block2.row, block2.col
    );
    
    if (success) {
      // 交换成功
      this.setData({
        grid: this.gameLogic.grid,
        totalMoves: this.data.totalMoves + 1
      });
      
      // 播放交换音效
      if (this.data.settings.soundEnabled) {
        this.playSound('swap');
      }
      
      // 震动反馈
      if (this.data.settings.vibrationEnabled) {
        wx.vibrateShort({ type: 'light' });
      }
      
      // 处理消除
      setTimeout(() => {
        this.processMatches();
      }, 300);
    } else {
      // 交换失败，恢复
      this.setData({
        isAnimating: false
      });
      
      // 播放失败音效
      if (this.data.settings.soundEnabled) {
        this.playSound('invalid');
      }
      
      // 震动反馈
      if (this.data.settings.vibrationEnabled) {
        wx.vibrateShort({ type: 'heavy' });
      }
    }
    
    this.drawGame();
  },

  // 处理消除
  processMatches() {
    const matches = this.gameLogic.findAllMatches();
    
    if (matches.length > 0) {
      // 有匹配，执行消除
      const result = this.gameLogic.removeMatches(matches);
      
      // 更新分数和连击
      this.setData({
        score: this.gameLogic.score,
        combo: this.gameLogic.combo,
        maxCombo: this.gameLogic.maxCombo
      });
      
      // 显示连击状态
      const comboStatus = this.gameLogic.getComboStatus();
      if (comboStatus.text) {
        this.setData({
          comboStatus: comboStatus.text,
          comboColor: comboStatus.color,
          showComboEffect: true
        });
        
        setTimeout(() => {
          this.setData({ showComboEffect: false });
        }, 1000);
      }
      
      // 播放消除音效
      if (this.data.settings.soundEnabled) {
        if (matches.length > 10) {
          this.playSound('explosion');
        } else if (matches.length > 5) {
          this.playSound('match_large');
        } else {
          this.playSound('match');
        }
      }
      
      // 震动反馈
      if (this.data.settings.vibrationEnabled) {
        if (matches.length > 5) {
          wx.vibrateLong();
        } else {
          wx.vibrateShort({ type: 'medium' });
        }
      }
      
      // 显示得分动画
      this.showScorePopup(result.points, matches[0]);
      
      // 更新网格
      this.setData({
        grid: this.gameLogic.grid
      });
      this.drawGame();
      
      // 方块下落
      setTimeout(() => {
        this.dropAndFill();
      }, 300);
    } else {
      // 没有匹配，结束动画
      this.setData({
        isAnimating: false
      });
      
      // 检查是否还有可用移动
      if (!this.gameLogic.hasValidMoves()) {
        // 没有可用移动，重新洗牌
        this.shuffleGrid();
      }
    }
  },

  // 方块下落和填充
  dropAndFill() {
    // 方块下落
    this.gameLogic.dropBlocks();
    this.setData({ grid: this.gameLogic.grid });
    this.drawGame();
    
    // 填充空位
    setTimeout(() => {
      this.gameLogic.fillEmpty();
      this.setData({ grid: this.gameLogic.grid });
      this.drawGame();
      
      // 再次检查匹配
      setTimeout(() => {
        this.processMatches();
      }, 300);
    }, 200);
  },

  // 重新洗牌
  shuffleGrid() {
    wx.showToast({
      title: '没有可用移动，重新洗牌',
      icon: 'none',
      duration: 2000
    });
    
    this.gameLogic.shuffle();
    this.setData({
      grid: this.gameLogic.grid,
      isAnimating: false
    });
    this.drawGame();
  },

  // 添加腐蚀方块（生存模式）
  addCorruptedBlocks() {
    if (this.data.gameMode !== 'survival') return;
    
    const level = this.data.survivalLevel;
    const count = Math.min(Math.floor(level / 2) + 1, 3);
    
    this.gameLogic.addCorruptedBlocks(count);
    
    this.setData({
      grid: this.gameLogic.grid,
      corruptedCount: this.data.corruptedCount + count,
      threatLevel: Math.min(this.data.threatLevel + 10, 100)
    });
    
    // 检查威胁等级
    if (this.data.threatLevel >= 100) {
      this.gameOver();
    }
    
    this.drawGame();
  },

  // 显示得分弹出
  showScorePopup(points, position) {
    const popup = {
      points: points,
      x: position.col * this.data.cellSize + this.data.cellSize / 2,
      y: position.row * this.data.cellSize,
      opacity: 1
    };
    
    const popups = this.data.scorePopups;
    popups.push(popup);
    
    this.setData({ scorePopups: popups });
    
    // 动画消失
    let opacity = 1;
    const fadeInterval = setInterval(() => {
      opacity -= 0.05;
      popup.opacity = opacity;
      popup.y -= 2;
      
      if (opacity <= 0) {
        clearInterval(fadeInterval);
        const index = popups.indexOf(popup);
        if (index > -1) {
          popups.splice(index, 1);
          this.setData({ scorePopups: popups });
        }
      }
    }, 50);
  },

  // 游戏结束
  gameOver() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    this.setData({
      gameStatus: 'gameover'
    });
    
    // 保存最高分
    this.saveHighScore();
    
    // 播放游戏结束音效
    if (this.data.settings.soundEnabled) {
      this.playSound('gameover');
    }
    
    // 显示结果
    wx.showModal({
      title: '游戏结束',
      content: `得分: ${this.data.score}\n最大连击: ${this.data.maxCombo}\n用时: ${this.formatTime(this.data.totalTime)}`,
      confirmText: '再来一局',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          this.restartGame();
        } else {
          wx.navigateBack();
        }
      }
    });
  },

  // 格式化时间
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },

  // 播放音效
  playSound(soundName) {
    const audio = wx.createInnerAudioContext();
    audio.src = `/assets/sounds/${soundName}.mp3`;
    audio.volume = 0.5;
    audio.play();
    
    audio.onError(() => {
      console.log(`音效${soundName}播放失败`);
    });
    
    audio.onEnded(() => {
      audio.destroy();
    });
  },

  // 播放背景音乐
  playBackgroundMusic() {
    if (!this.bgm) {
      this.bgm = wx.createInnerAudioContext();
      this.bgm.src = '/assets/sounds/match3_bgm.mp3';
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

  // 保存游戏状态
  saveGameState() {
    if (this.data.gameStatus === 'playing') {
      try {
        wx.setStorageSync('match3GameState', {
          grid: this.data.grid,
          score: this.data.score,
          combo: this.data.combo,
          totalMoves: this.data.totalMoves,
          totalTime: this.data.totalTime,
          gameMode: this.data.gameMode
        });
      } catch (e) {
        console.error('保存游戏状态失败:', e);
      }
    }
  },

  // 返回主页
  backToHome() {
    wx.navigateBack();
  },

  // 分享
  onShareAppMessage() {
    return {
      title: `我在消消乐获得了${this.data.score}分！`,
      path: '/pages/match3/match3',
      imageUrl: '/assets/images/match3-share.png'
    };
  }
});
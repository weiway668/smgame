// pages/maze/maze.js
// 迷宫游戏页面

const MazeGenerator = require('../../utils/mazeGenerator.js');

// requestAnimationFrame polyfill for WeChat Mini Program
const requestAnimationFrame = (callback) => {
  return setTimeout(callback, 1000 / 60);
};

const cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

Page({
  data: {
    // 游戏状态
    gameStatus: 'ready', // ready, playing, paused, win
    difficulty: 'easy', // easy, medium, hard
    
    // 迷宫数据
    maze: [],
    mazeSize: 11,
    cellSize: 30,
    
    // 玩家位置
    playerX: 1,
    playerY: 1,
    
    // 游戏统计
    steps: 0,
    time: 0,
    bestTime: null,
    bestSteps: null,
    
    // 显示控制
    showHint: false,
    solution: [],
    
    // 难度选择
    difficulties: [
      { value: 'easy', label: '简单', size: 11 },
      { value: 'medium', label: '中等', size: 15 },
      { value: 'hard', label: '困难', size: 21 }
    ],
    
    // Canvas相关
    canvasWidth: 330,
    canvasHeight: 330,
    
    // 设置
    settings: {}
  },

  // 迷宫生成器实例
  mazeGenerator: null,
  
  // 计时器
  timer: null,
  
  // Canvas上下文
  ctx: null,
  canvas: null,
  
  // 离屏Canvas用于缓存背景
  offscreenCanvas: null,
  offscreenCtx: null,
  backgroundCached: false,
  
  // 动画控制
  animationId: null,
  lastPlayerX: -1,
  lastPlayerY: -1,

  onLoad(options) {
    console.log('迷宫游戏加载');
    
    // 加载设置
    this.loadSettings();
    
    // 加载最佳记录
    this.loadBestRecords();
    
    // 初始化Canvas
    this.initCanvas();
    
    // 生成迷宫
    if (options.difficulty) {
      this.setData({ difficulty: options.difficulty });
    }
    this.generateMaze();
  },

  onReady() {
    // 获取Canvas上下文
    const query = wx.createSelectorQuery();
    query.select('#mazeCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]) {
          this.canvas = res[0].node;
          this.ctx = this.canvas.getContext('2d');
          
          // 设置Canvas尺寸
          const dpr = wx.getSystemInfoSync().pixelRatio;
          this.canvas.width = this.data.canvasWidth * dpr;
          this.canvas.height = this.data.canvasHeight * dpr;
          this.ctx.scale(dpr, dpr);
          
          // 创建离屏Canvas用于缓存迷宫背景（使用逻辑尺寸，不是物理尺寸）
          this.offscreenCanvas = wx.createOffscreenCanvas({
            type: '2d',
            width: this.data.canvasWidth,
            height: this.data.canvasHeight
          });
          this.offscreenCtx = this.offscreenCanvas.getContext('2d');
          // 离屏Canvas不需要DPR缩放，保持逻辑坐标系
          
          // 初始化绘制
          this.initDraw();
        }
      });
  },

  onUnload() {
    // 清理计时器
    if (this.timer) {
      clearInterval(this.timer);
    }
    // 清理动画
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    // 保存游戏状态
    this.saveGameState();
  },

  // 初始化Canvas
  initCanvas() {
    const systemInfo = wx.getSystemInfoSync();
    const screenWidth = systemInfo.windowWidth;
    // 根据屏幕宽度设置画布尺寸，留出适当边距
    const canvasSize = Math.floor(screenWidth - 40); // 左右各留20px边距
    
    this.setData({
      canvasWidth: canvasSize,
      canvasHeight: canvasSize
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

  // 加载最佳记录
  loadBestRecords() {
    try {
      const records = wx.getStorageSync('mazeRecords') || {};
      const difficulty = this.data.difficulty;
      
      this.setData({
        bestTime: records[difficulty]?.bestTime || null,
        bestSteps: records[difficulty]?.bestSteps || null
      });
    } catch (e) {
      console.error('加载记录失败:', e);
    }
  },

  // 保存最佳记录
  saveBestRecords() {
    try {
      const records = wx.getStorageSync('mazeRecords') || {};
      const difficulty = this.data.difficulty;
      
      if (!records[difficulty]) {
        records[difficulty] = {};
      }
      
      // 更新最佳时间
      if (!records[difficulty].bestTime || this.data.time < records[difficulty].bestTime) {
        records[difficulty].bestTime = this.data.time;
      }
      
      // 更新最少步数
      if (!records[difficulty].bestSteps || this.data.steps < records[difficulty].bestSteps) {
        records[difficulty].bestSteps = this.data.steps;
      }
      
      wx.setStorageSync('mazeRecords', records);
      
      this.setData({
        bestTime: records[difficulty].bestTime,
        bestSteps: records[difficulty].bestSteps
      });
    } catch (e) {
      console.error('保存记录失败:', e);
    }
  },

  // 生成迷宫
  generateMaze() {
    const config = MazeGenerator.getDifficultyConfig(this.data.difficulty);
    this.mazeGenerator = new MazeGenerator(config.size, config.size);
    const maze = this.mazeGenerator.generate();
    
    // 找到起点
    const start = this.mazeGenerator.findCell(2);
    
    // 计算单元格大小，确保迷宫完全填充画布
    const cellSize = Math.floor(this.data.canvasWidth / config.size);
    
    this.setData({
      maze: maze,
      mazeSize: config.size,
      cellSize: cellSize,
      playerX: start.x,
      playerY: start.y,
      steps: 0,
      time: 0,
      gameStatus: 'ready',
      showHint: false,
      solution: []
    });
    
    // 标记背景需要重新缓存
    this.backgroundCached = false;
    this.lastPlayerX = -1;
    this.lastPlayerY = -1;
    
    // 初始化绘制
    if (this.ctx) {
      this.initDraw();
    }
  },
  
  // 初始化绘制
  initDraw() {
    if (!this.ctx) return;
    
    // 缓存背景
    this.cacheBackground();
    
    // 绘制完整画面（使用简化版避免问题）
    this.renderSimple();
  },
  
  // 缓存静态背景（迷宫）
  cacheBackground() {
    if (!this.offscreenCtx || this.backgroundCached) return;
    
    const { maze, cellSize } = this.data;
    const ctx = this.offscreenCtx;
    
    // 清空离屏画布
    ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 先填充整个画布背景
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制迷宫
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        const cell = maze[y][x];
        const px = x * cellSize;
        const py = y * cellSize;
        
        if (cell === 1) {
          // 墙壁 - 深色
          ctx.fillStyle = '#2C3E50';
          ctx.fillRect(px, py, cellSize, cellSize);
        } else if (cell === 0) {
          // 路径 - 浅色
          ctx.fillStyle = '#ECF0F1';
          ctx.fillRect(px, py, cellSize, cellSize);
        } else if (cell === 2) {
          // 起点 - 绿色
          ctx.fillStyle = '#27AE60';
          ctx.fillRect(px, py, cellSize, cellSize);
          ctx.fillStyle = 'white';
          ctx.font = `${Math.floor(cellSize * 0.5)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('S', px + cellSize / 2, py + cellSize / 2);
        } else if (cell === 3) {
          // 终点 - 红色
          ctx.fillStyle = '#E74C3C';
          ctx.fillRect(px, py, cellSize, cellSize);
          ctx.fillStyle = 'white';
          ctx.font = `${Math.floor(cellSize * 0.5)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('E', px + cellSize / 2, py + cellSize / 2);
        }
        
        // 绘制细网格线
        ctx.strokeStyle = 'rgba(189, 195, 199, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, cellSize, cellSize);
      }
    }
    
    this.backgroundCached = true;
  },
  
  // 渲染画面
  render() {
    if (!this.ctx || !this.offscreenCanvas) return;
    
    const ctx = this.ctx;
    const { cellSize, playerX, playerY, showHint, solution } = this.data;
    
    // 复制背景到主画布（离屏Canvas已经是逻辑尺寸）
    ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    ctx.drawImage(
      this.offscreenCanvas, 
      0, 0, this.data.canvasWidth, this.data.canvasHeight,  // 源区域
      0, 0, this.data.canvasWidth, this.data.canvasHeight  // 目标区域
    );
    
    // 绘制提示路径
    if (showHint && solution.length > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 193, 7, 0.5)';
      ctx.lineWidth = cellSize * 0.3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      for (let i = 0; i < solution.length; i++) {
        const [x, y] = solution[i];
        const px = x * cellSize + cellSize / 2;
        const py = y * cellSize + cellSize / 2;
        
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      ctx.restore();
    }
    
    // 绘制玩家
    this.drawPlayer();
    
    // 记录玩家位置
    this.lastPlayerX = playerX;
    this.lastPlayerY = playerY;
  },
  
  // 绘制玩家
  drawPlayer() {
    if (!this.ctx) return;
    
    const { cellSize, playerX, playerY } = this.data;
    const ctx = this.ctx;
    
    // 清除上一次玩家位置（从缓存的背景恢复）
    if (this.lastPlayerX >= 0 && this.lastPlayerY >= 0 && this.offscreenCanvas) {
      const lastX = this.lastPlayerX * cellSize;
      const lastY = this.lastPlayerY * cellSize;
      
      // 从离屏Canvas恢复该区域（离屏Canvas是逻辑尺寸）
      ctx.save();
      // 清除旧位置
      ctx.clearRect(lastX, lastY, cellSize, cellSize);
      // 从离屏Canvas复制背景
      ctx.drawImage(
        this.offscreenCanvas,
        lastX, lastY, cellSize, cellSize,  // 源区域
        lastX, lastY, cellSize, cellSize  // 目标区域
      );
      ctx.restore();
    }
    
    // 绘制新的玩家位置
    const px = playerX * cellSize + cellSize / 2;
    const py = playerY * cellSize + cellSize / 2;
    
    ctx.save();
    
    // 绘制玩家圆形
    ctx.fillStyle = '#3498DB';
    ctx.beginPath();
    ctx.arc(px, py, cellSize * 0.35, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制玩家眼睛
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(px - cellSize * 0.1, py - cellSize * 0.05, cellSize * 0.08, 0, Math.PI * 2);
    ctx.arc(px + cellSize * 0.1, py - cellSize * 0.05, cellSize * 0.08, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  },

  // 兼容旧方法名（重定向到render）
  drawMaze() {
    this.render();
  },
  
  // 更新玩家位置（优化版）
  updatePlayerPosition() {
    if (!this.ctx) return;
    
    const { playerX, playerY } = this.data;
    
    // 如果位置没有变化，不需要更新
    if (playerX === this.lastPlayerX && playerY === this.lastPlayerY) {
      return;
    }
    
    // 直接渲染，不使用requestAnimationFrame（避免异步问题）
    this.renderSimple();
  },
  
  // 简化的渲染方法（避免背景变白）
  renderSimple() {
    if (!this.ctx || !this.offscreenCanvas) return;
    
    const ctx = this.ctx;
    const { cellSize, playerX, playerY, showHint, solution } = this.data;
    
    // 完整复制背景
    ctx.save();
    // 先用墙壁颜色填充整个画布，防止出现白边
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制离屏Canvas内容
    ctx.drawImage(
      this.offscreenCanvas, 
      0, 0, this.data.canvasWidth, this.data.canvasHeight,
      0, 0, this.data.canvasWidth, this.data.canvasHeight
    );
    
    // 绘制提示路径
    if (showHint && solution.length > 0) {
      ctx.strokeStyle = 'rgba(255, 193, 7, 0.5)';
      ctx.lineWidth = cellSize * 0.3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      for (let i = 0; i < solution.length; i++) {
        const [x, y] = solution[i];
        const px = x * cellSize + cellSize / 2;
        const py = y * cellSize + cellSize / 2;
        
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }
    
    // 直接绘制玩家
    const px = playerX * cellSize + cellSize / 2;
    const py = playerY * cellSize + cellSize / 2;
    
    ctx.fillStyle = '#3498DB';
    ctx.beginPath();
    ctx.arc(px, py, cellSize * 0.35, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制眼睛
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(px - cellSize * 0.1, py - cellSize * 0.05, cellSize * 0.08, 0, Math.PI * 2);
    ctx.arc(px + cellSize * 0.1, py - cellSize * 0.05, cellSize * 0.08, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // 记录位置
    this.lastPlayerX = playerX;
    this.lastPlayerY = playerY;
  },

  // 开始游戏
  startGame() {
    if (this.data.gameStatus === 'playing') return;
    
    this.setData({
      gameStatus: 'playing',
      time: 0,
      steps: 0
    });
    
    // 开始计时
    this.timer = setInterval(() => {
      this.setData({
        time: this.data.time + 1
      });
    }, 1000);
    
    // 播放音效
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
        time: this.data.time + 1
      });
    }, 1000);
  },

  // 重新开始
  restartGame() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    // 清理动画
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // 重置玩家位置记录
    this.lastPlayerX = -1;
    this.lastPlayerY = -1;
    
    this.generateMaze();
  },

  // 移动玩家
  movePlayer(direction) {
    if (this.data.gameStatus !== 'playing') {
      // 如果游戏未开始，先开始游戏
      if (this.data.gameStatus === 'ready') {
        this.startGame();
      } else {
        return;
      }
    }
    
    const { playerX, playerY, maze } = this.data;
    let newX = playerX;
    let newY = playerY;
    
    switch (direction) {
      case 'up':
        newY = playerY - 1;
        break;
      case 'down':
        newY = playerY + 1;
        break;
      case 'left':
        newX = playerX - 1;
        break;
      case 'right':
        newX = playerX + 1;
        break;
    }
    
    // 检查是否可以移动
    if (this.mazeGenerator.isValidMove(newX, newY)) {
      this.setData({
        playerX: newX,
        playerY: newY,
        steps: this.data.steps + 1
      });
      
      // 播放移动音效
      if (this.data.settings.soundEnabled) {
        this.playSound('move');
      }
      
      // 震动反馈
      if (this.data.settings.vibrationEnabled) {
        wx.vibrateShort({ type: 'light' });
      }
      
      // 检查是否到达终点
      if (maze[newY][newX] === 3) {
        this.winGame();
      }
      
      // 更新玩家位置（优化绘制）
      this.updatePlayerPosition();
    } else {
      // 撞墙音效
      if (this.data.settings.soundEnabled) {
        this.playSound('wall');
      }
      
      // 震动反馈
      if (this.data.settings.vibrationEnabled) {
        wx.vibrateShort({ type: 'medium' });
      }
    }
  },

  // 触摸开始
  touchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  },

  // 触摸结束
  touchEnd(e) {
    if (this.data.gameStatus === 'win') return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;
    
    // 判断滑动方向
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 水平滑动
      if (deltaX > 30) {
        this.movePlayer('right');
      } else if (deltaX < -30) {
        this.movePlayer('left');
      }
    } else {
      // 垂直滑动
      if (deltaY > 30) {
        this.movePlayer('down');
      } else if (deltaY < -30) {
        this.movePlayer('up');
      }
    }
  },

  // 方向键控制
  onDirectionTap(e) {
    const direction = e.currentTarget.dataset.direction;
    this.movePlayer(direction);
  },

  // 切换提示
  toggleHint() {
    if (this.data.gameStatus !== 'playing') return;
    
    if (!this.data.showHint) {
      // 计算解决方案
      const solution = this.mazeGenerator.findSolution();
      this.setData({
        showHint: true,
        solution: solution
      });
    } else {
      this.setData({
        showHint: false,
        solution: []
      });
    }
    
    // 重新渲染（提示路径改变了）
    this.renderSimple();
    
    // 播放音效
    if (this.data.settings.soundEnabled) {
      this.playSound('click');
    }
  },

  // 切换难度
  changeDifficulty(e) {
    const difficulty = e.detail.value;
    this.setData({ difficulty });
    this.loadBestRecords();
    this.restartGame();
  },

  // 游戏胜利
  winGame() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    this.setData({
      gameStatus: 'win'
    });
    
    // 保存记录
    this.saveBestRecords();
    
    // 播放胜利音效
    if (this.data.settings.soundEnabled) {
      this.playSound('victory');
    }
    
    // 震动反馈
    if (this.data.settings.vibrationEnabled) {
      wx.vibrateLong();
    }
    
    // 显示胜利提示
    const config = MazeGenerator.getDifficultyConfig(this.data.difficulty);
    wx.showModal({
      title: '恭喜你！',
      content: `你用了${this.data.steps}步，${this.formatTime(this.data.time)}完成了${config.name}难度的迷宫！`,
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
    return `${minutes}分${secs}秒`;
  },

  // 播放音效
  playSound(soundName) {
    const audio = wx.createInnerAudioContext();
    // 使用默认音效或占位音效
    audio.src = `/assets/sounds/${soundName}.mp3`;
    audio.volume = 0.5;
    audio.play();
    
    audio.onError(() => {
      console.log(`音效${soundName}播放失败，使用系统音效`);
    });
    
    audio.onEnded(() => {
      audio.destroy();
    });
  },

  // 保存游戏状态
  saveGameState() {
    if (this.data.gameStatus === 'playing') {
      try {
        wx.setStorageSync('mazeGameState', {
          difficulty: this.data.difficulty,
          steps: this.data.steps,
          time: this.data.time,
          playerX: this.data.playerX,
          playerY: this.data.playerY,
          maze: this.data.maze
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
      title: '来挑战迷宫游戏吧！',
      path: '/pages/maze/maze',
      imageUrl: '/assets/images/maze-share.png'
    };
  }
});
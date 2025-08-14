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
    
    // 路径痕迹
    visitedCells: [],
    
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
  animationFrame: 0,

  onLoad(options) {
    
    // 加载设置
    this.loadSettings();
    
    // 加载最佳记录
    this.loadBestRecords();
    
    // 初始化Canvas
    this.initCanvas();
    
    // 保存难度参数，等Canvas初始化后再生成迷宫
    if (options && options.difficulty) {
      this.tempDifficulty = options.difficulty;
    }
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
          
          // 现在Canvas已初始化，设置难度并生成迷宫
          if (this.tempDifficulty) {
            this.setData({ difficulty: this.tempDifficulty });
          }
          this.generateMaze();
          
          // 启动动画循环
          this.startAnimationLoop();
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
    // 停止动画循环
    this.stopAnimationLoop();
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
      solution: [],
      visitedCells: [] // 重置路径痕迹
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
    
    // 先填充整个画布背景 - 更深的墙壁颜色
    ctx.fillStyle = '#1A252F';
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制迷宫
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        const cell = maze[y][x];
        const px = x * cellSize;
        const py = y * cellSize;
        
        if (cell === 1) {
          // 墙壁 - 更深的颜色
          ctx.fillStyle = '#1A252F';
          ctx.fillRect(px, py, cellSize, cellSize);
          // 添加内阴影效果
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
        } else if (cell === 0) {
          // 路径 - 纯白色
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(px, py, cellSize, cellSize);
        } else if (cell === 2) {
          // 起点 - 绿色带渐变
          const gradient = ctx.createRadialGradient(
            px + cellSize / 2, py + cellSize / 2, 0,
            px + cellSize / 2, py + cellSize / 2, cellSize / 2
          );
          gradient.addColorStop(0, '#4CAF50');
          gradient.addColorStop(1, '#27AE60');
          ctx.fillStyle = gradient;
          ctx.fillRect(px, py, cellSize, cellSize);
          
          ctx.fillStyle = 'white';
          ctx.font = `bold ${Math.floor(cellSize * 0.5)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('S', px + cellSize / 2, py + cellSize / 2);
        } else if (cell === 3) {
          // 终点 - 红色带渐变
          const gradient = ctx.createRadialGradient(
            px + cellSize / 2, py + cellSize / 2, 0,
            px + cellSize / 2, py + cellSize / 2, cellSize / 2
          );
          gradient.addColorStop(0, '#FF5252');
          gradient.addColorStop(1, '#E74C3C');
          ctx.fillStyle = gradient;
          ctx.fillRect(px, py, cellSize, cellSize);
          
          ctx.fillStyle = 'white';
          ctx.font = `bold ${Math.floor(cellSize * 0.5)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('E', px + cellSize / 2, py + cellSize / 2);
        }
        
        // 绘制细网格线
        ctx.strokeStyle = 'rgba(189, 195, 199, 0.2)';
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
    const { cellSize, playerX, playerY, showHint, solution, visitedCells, maze } = this.data;
    
    // 完整复制背景
    ctx.save();
    // 先用墙壁颜色填充整个画布，防止出现白边
    ctx.fillStyle = '#1A252F';
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制离屏Canvas内容
    ctx.drawImage(
      this.offscreenCanvas, 
      0, 0, this.data.canvasWidth, this.data.canvasHeight,
      0, 0, this.data.canvasWidth, this.data.canvasHeight
    );
    
    // 绘制路径痕迹
    if (visitedCells && visitedCells.length > 0) {
      ctx.fillStyle = 'rgba(52, 152, 219, 0.15)';
      visitedCells.forEach(([x, y]) => {
        // 不绘制起点和终点的痕迹
        if (maze[y][x] === 0) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      });
    }
    
    // 绘制起点和终点的动画效果
    this.drawAnimatedMarkers();
    
    // 绘制自动寻路路径
    if (this.autoPath && this.autoPath.length > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(100, 181, 246, 0.6)';
      ctx.lineWidth = cellSize * 0.25;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([5, 5]);
      
      ctx.beginPath();
      // 从当前位置开始
      ctx.moveTo(playerX * cellSize + cellSize / 2, playerY * cellSize + cellSize / 2);
      
      for (let i = 0; i < this.autoPath.length; i++) {
        const [x, y] = this.autoPath[i];
        const px = x * cellSize + cellSize / 2;
        const py = y * cellSize + cellSize / 2;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
      
      // 在目标位置绘制涟漪效果
      const targetX = this.autoPath[this.autoPath.length - 1][0];
      const targetY = this.autoPath[this.autoPath.length - 1][1];
      const targetPx = targetX * cellSize + cellSize / 2;
      const targetPy = targetY * cellSize + cellSize / 2;
      
      ctx.save();
      const ripple = (Date.now() / 1000) % 1;
      ctx.globalAlpha = 1 - ripple;
      ctx.strokeStyle = '#64B5F6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(targetPx, targetPy, cellSize * 0.3 * ripple, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    
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
  
  // 绘制动画标记（起点/终点）
  drawAnimatedMarkers() {
    if (!this.ctx) return;
    
    const ctx = this.ctx;
    const { maze, cellSize } = this.data;
    
    // 更新动画帧
    this.animationFrame = (this.animationFrame || 0) + 1;
    const pulse = Math.sin(this.animationFrame * 0.05) * 0.3 + 0.7;
    
    // 绘制起点和终点的光晕效果
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        const cell = maze[y][x];
        const px = x * cellSize + cellSize / 2;
        const py = y * cellSize + cellSize / 2;
        
        if (cell === 2) {
          // 起点脉冲光效
          ctx.save();
          ctx.globalAlpha = pulse * 0.3;
          ctx.fillStyle = '#4CAF50';
          ctx.beginPath();
          ctx.arc(px, py, cellSize * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (cell === 3) {
          // 终点呼吸灯效果
          ctx.save();
          ctx.globalAlpha = (1 - pulse) * 0.4;
          ctx.fillStyle = '#E74C3C';
          ctx.beginPath();
          ctx.arc(px, py, cellSize * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
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
      // 记录走过的路径
      const visitedCells = this.data.visitedCells || [];
      // 检查是否已经访问过
      const visited = visitedCells.some(([x, y]) => x === newX && y === newY);
      
      if (!visited) {
        visitedCells.push([newX, newY]);
        // 限制最大长度
        if (visitedCells.length > 200) {
          visitedCells.shift();
        }
      }
      
      this.setData({
        playerX: newX,
        playerY: newY,
        steps: this.data.steps + 1,
        visitedCells: visitedCells
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

  // 处理tap事件（简单点击）
  handleTap(e) {
    if (this.data.gameStatus === 'win') return;
    
    // 如果游戏未开始，先开始游戏但不返回，继续处理点击
    if (this.data.gameStatus === 'ready') {
      this.startGame();
      // 不返回，继续处理点击
    }
    
    if (this.data.gameStatus === 'paused') return;
    
    // 获取touch-layer元素的位置来校正坐标
    const query = wx.createSelectorQuery();
    query.select('.touch-layer').boundingClientRect();
    query.select('#mazeCanvas').boundingClientRect();
    query.exec((res) => {
      const touchLayerRect = res[0];
      const canvasRect = res[1];
      
      // e.detail.x/y似乎是页面坐标，需要转换为相对于Canvas的坐标
      let x, y;
      
      // 尝试不同的坐标获取方式
      if (e.touches && e.touches.length > 0) {
        // 触摸事件坐标
        const touch = e.touches[0];
        x = touch.clientX - touchLayerRect.left;
        y = touch.clientY - touchLayerRect.top;
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        // 触摸结束事件坐标
        const touch = e.changedTouches[0];
        x = touch.clientX - touchLayerRect.left;
        y = touch.clientY - touchLayerRect.top;
      } else {
        // 使用detail坐标（可能需要修正）
        x = e.detail.x;
        y = e.detail.y;
        
        // 检查detail坐标是否是相对坐标
        if (x > touchLayerRect.width || y > touchLayerRect.height) {
          // 可能是页面坐标，需要转换
          x = x - touchLayerRect.left;
          y = y - touchLayerRect.top;
        }
      }
      
      // 验证坐标是否在有效范围内
      if (x !== undefined && y !== undefined && x >= 0 && x <= this.data.canvasWidth && y >= 0 && y <= this.data.canvasHeight) {
        this.processCanvasClick(x, y);
      }
    });
    
    return;
    
    // 验证坐标是否在有效范围内
    if (x !== undefined && y !== undefined && x >= 0 && x <= this.data.canvasWidth && y >= 0 && y <= this.data.canvasHeight) {
      this.processCanvasClick(x, y);
    } else {
      console.log('handleTap - 坐标无效或超出Canvas范围');
      console.log('handleTap - x:', x, 'y:', y);
    }
  },
  
  // 触摸开始
  touchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  },
  
  // 鼠标按下（模拟器支持）
  mouseDown(e) {
    // 记录鼠标开始位置
    this.mouseStartX = e.detail.x;
    this.mouseStartY = e.detail.y;
    this.isMouseDown = true;
  },
  
  // 鼠标释放（模拟器支持）
  mouseUp(e) {
    if (!this.isMouseDown) return;
    
    const mouseEndX = e.detail.x;
    const mouseEndY = e.detail.y;
    
    const deltaX = mouseEndX - this.mouseStartX;
    const deltaY = mouseEndY - this.mouseStartY;
    
    // 检测是否为点击（移动距离很小）
    if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) {
      // 如果游戏未开始，先开始游戏
      if (this.data.gameStatus === 'ready') {
        this.startGame();
        this.isMouseDown = false;
        return;
      }
      
      if (this.data.gameStatus !== 'playing') {
        this.isMouseDown = false;
        return;
      }
      
      // 直接处理点击，不需要计算Canvas位置，因为e.detail.x/y已经是相对坐标
      this.processCanvasClick(mouseEndX, mouseEndY);
    } else {
      // 处理滑动操作
      if (this.data.gameStatus === 'ready') {
        this.startGame();
      }
      
      if (this.data.gameStatus === 'playing') {
        // 判断滑动方向
        const threshold = 15;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // 水平滑动
          if (deltaX > threshold) {
            this.stopAutoMove();
            this.movePlayer('right');
          } else if (deltaX < -threshold) {
            this.stopAutoMove();
            this.movePlayer('left');
          }
        } else {
          // 垂直滑动
          if (deltaY > threshold) {
            this.stopAutoMove();
            this.movePlayer('down');
          } else if (deltaY < -threshold) {
            this.stopAutoMove();
            this.movePlayer('up');
          }
        }
      }
    }
    
    this.isMouseDown = false;
  },

  // 触摸结束
  touchEnd(e) {
    if (this.data.gameStatus === 'win') return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;
    
    // 降低滑动阈值，提高灵敏度
    const threshold = 15;
    
    // 检测是否为点击（移动距离很小）
    // 注意：tap事件会自动处理点击，这里只处理滑动
    if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) {
      // 点击已由handleTap处理，这里不需要重复处理
      return;
    }
    
    // 处理滑动操作
    // 如果游戏未开始，滑动也开始游戏
    if (this.data.gameStatus === 'ready') {
      this.startGame();
    }
    
    if (this.data.gameStatus !== 'playing') return;
    
    // 判断滑动方向
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 水平滑动
      if (deltaX > threshold) {
        this.stopAutoMove();  // 停止自动移动
        this.movePlayer('right');
      } else if (deltaX < -threshold) {
        this.stopAutoMove();  // 停止自动移动
        this.movePlayer('left');
      }
    } else {
      // 垂直滑动
      if (deltaY > threshold) {
        this.stopAutoMove();  // 停止自动移动
        this.movePlayer('down');
      } else if (deltaY < -threshold) {
        this.stopAutoMove();  // 停止自动移动
        this.movePlayer('up');
      }
    }
  },

  // Canvas点击事件
  canvasClick(e) {
    if (this.data.gameStatus === 'win') return;
    
    // 如果游戏未开始，先开始游戏
    if (this.data.gameStatus === 'ready') {
      this.startGame();
    }
    
    if (this.data.gameStatus !== 'playing') return;
    
    // 兼容不同平台的坐标获取方式
    let x, y;
    
    // 微信开发者工具模拟器使用offsetX/offsetY
    if (e.detail && typeof e.detail.x !== 'undefined') {
      x = e.detail.x;
      y = e.detail.y;
    } else if (e.touches && e.touches.length > 0) {
      // 触摸事件
      const touch = e.touches[0];
      const query = wx.createSelectorQuery();
      query.select('#mazeCanvas').boundingClientRect();
      query.exec((res) => {
        if (res[0]) {
          x = touch.clientX - res[0].left;
          y = touch.clientY - res[0].top;
          this.processCanvasClick(x, y);
        }
      });
      return;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      // 触摸结束事件
      const touch = e.changedTouches[0];
      const query = wx.createSelectorQuery();
      query.select('#mazeCanvas').boundingClientRect();
      query.exec((res) => {
        if (res[0]) {
          x = touch.clientX - res[0].left;
          y = touch.clientY - res[0].top;
          this.processCanvasClick(x, y);
        }
      });
      return;
    } else {
      // 开发者工具鼠标事件fallback
      x = e.offsetX || e.layerX || 0;
      y = e.offsetY || e.layerY || 0;
    }
    
    this.processCanvasClick(x, y);
  },
  
  // 处理Canvas点击
  processCanvasClick(x, y) {
    // 转换为迷宫格子坐标
    const { cellSize } = this.data;
    const targetX = Math.floor(x / cellSize);
    const targetY = Math.floor(y / cellSize);
    
    // 寻找路径并自动移动
    this.findAndMove(targetX, targetY);
  },
  
  // 寻找路径并自动移动
  findAndMove(targetX, targetY) {
    const { playerX, playerY, maze, mazeSize } = this.data;
    
    // 检查目标是否在迷宫范围内
    if (targetX < 0 || targetX >= mazeSize || targetY < 0 || targetY >= mazeSize) {
      return;
    }
    
    // 如果点击当前位置，不做任何操作
    if (targetX === playerX && targetY === playerY) {
      return;
    }
    
    // 寻找路径
    const path = this.mazeGenerator.findPath(playerX, playerY, targetX, targetY);
    
    if (path === null) {
      // 目标不可达，显示提示
      wx.showToast({
        title: '无法到达',
        icon: 'none',
        duration: 1000
      });
      
      // 震动反馈
      if (this.data.settings.vibrationEnabled) {
        wx.vibrateShort({ type: 'heavy' });
      }
      return;
    }
    
    // 开始自动移动
    this.autoMoveAlongPath(path);
  },
  
  // 沿路径自动移动
  autoMoveAlongPath(path) {
    if (!path || path.length <= 1) return;
    
    // 停止之前的自动移动
    this.stopAutoMove();
    
    // 移除第一个点（当前位置）
    const movePath = path.slice(1);
    
    // 显示路径
    this.showAutoPath(movePath);
    
    let index = 0;
    
    // 创建移动定时器
    this.autoMoveTimer = setInterval(() => {
      if (index >= movePath.length) {
        this.stopAutoMove();
        return;
      }
      
      const [nextX, nextY] = movePath[index];
      const { playerX, playerY } = this.data;
      
      // 确定移动方向
      let direction = null;
      if (nextX > playerX) direction = 'right';
      else if (nextX < playerX) direction = 'left';
      else if (nextY > playerY) direction = 'down';
      else if (nextY < playerY) direction = 'up';
      
      if (direction) {
        this.movePlayer(direction);
      }
      
      index++;
    }, 200);  // 每200ms移动一步
  },
  
  // 显示自动寻路路径
  showAutoPath(path) {
    this.autoPath = path;
    this.renderSimple();
  },
  
  // 停止自动移动
  stopAutoMove() {
    if (this.autoMoveTimer) {
      clearInterval(this.autoMoveTimer);
      this.autoMoveTimer = null;
    }
    this.autoPath = null;
    this.renderSimple();
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
  },
  
  // 启动动画循环
  startAnimationLoop() {
    const animate = () => {
      if (this.ctx) {
        // 只在需要时更新动画标记
        if (this.data.gameStatus === 'playing' || this.data.gameStatus === 'ready') {
          this.renderSimple();
        }
      }
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  },
  
  // 停止动画循环
  stopAnimationLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
});
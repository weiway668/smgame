// pages/maze/maze.js (WXML Refactored Version)
// 最终版本 - 增加了关闭弹窗查看答案的功能

const MazeGenerator = require('../../utils/mazeGenerator.js');

// 关卡配置 (共20关)
const LEVELS = [
  { width: 11, height: 11, timeLimit: 45 }, { width: 11, height: 13, timeLimit: 50 }, { width: 13, height: 13, timeLimit: 60 }, { width: 13, height: 15, timeLimit: 70 }, { width: 15, height: 15, timeLimit: 80 },
  { width: 15, height: 17, timeLimit: 90 }, { width: 17, height: 17, timeLimit: 100 }, { width: 17, height: 19, timeLimit: 120 }, { width: 19, height: 19, timeLimit: 140 }, { width: 19, height: 21, timeLimit: 160 },
  { width: 21, height: 21, timeLimit: 180 }, { width: 21, height: 23, timeLimit: 200 }, { width: 23, height: 23, timeLimit: 220 }, { width: 23, height: 25, timeLimit: 250 }, { width: 25, height: 25, timeLimit: 280 },
  { width: 25, height: 27, timeLimit: 300 }, { width: 27, height: 27, timeLimit: 330 }, { width: 27, height: 29, timeLimit: 360 }, { width: 29, height: 29, timeLimit: 400 }, { width: 29, height: 31, timeLimit: 440 },
];

Page({
  data: {
    gameStatus: 'ready', // ready, playing, win, lose
    isOverlayVisible: false, // 控制弹窗显示
    currentLevel: 1,
    allLevelsCompleted: false,
    maze: [],
    mazeWidth: 11,
    mazeHeight: 11,
    player: {
      x: 1.5, // 浮点数坐标，初始位置在(1,1)格子的中心
      y: 1.5,
      angle: Math.PI / 4, // 初始朝向角度 (45度)
      speed: 0.1,         // 移动速度
      rotateSpeed: 0.05   // 旋转速度
    },
    steps: 0,
    time: 0,
    timeLimit: 45,
    settings: {},
  },

  mazeGenerator: null,
  timer: null,
  canvas: null,
  ctx: null,
  offscreenCanvas: null, // 离屏Canvas
  offscreenCtx: null, // 离屏Canvas的上下文
  texture: null, // 墙壁纹理
  animationFrameId: null,
  
  // 触摸控制相关
  touchStartX: 0,
  isMoving: false, // 是否正在持续移动（前进/后退）
  isTurning: false, // 是否正在持续转向

  onLoad(options) {
    this.loadSettings();
    const savedLevel = wx.getStorageSync('mazePlayerLevel') || 1;
    this.setData({
      currentLevel: parseInt(savedLevel, 10)
    });
  },

  onReady() {
    this.generateMaze();
    // 获取 Canvas 组件
    const query = wx.createSelectorQuery();
    query.select('#maze-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          console.error("无法获取到Canvas节点");
          return;
        }
        this.canvas = res[0].node;
        this.ctx = this.canvas.getContext('2d');

        // --- 优化：创建离屏Canvas ---
        this.offscreenCanvas = wx.createOffscreenCanvas({type: '2d', width: 320, height: 240});
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');

        // 加载纹理
        this.texture = this.offscreenCanvas.createImage();
        this.texture.src = 'https://opengameart.org/sites/default/files/bricks_2.png';
        this.texture.onload = () => {
            console.log('纹理加载成功');
        };
        this.texture.onerror = (err) => {
            console.error('纹理加载失败', err);
            this.texture = null; // 加载失败则不使用纹理
        }
        
        // 设置主Canvas的DPR
        const dpr = wx.getSystemInfoSync().pixelRatio;
        this.canvas.width = res[0].width * dpr;
        this.canvas.height = res[0].height * dpr;
        this.ctx.scale(dpr, dpr);

        // 启动渲染循环
        this.renderLoop();
      });
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer);
    if (this.animationFrameId) this.canvas.cancelAnimationFrame(this.animationFrameId);
  },

  loadSettings() {
    try {
      const settings = wx.getStorageSync('settings') || { soundEnabled: true, vibrationEnabled: true };
      this.setData({ settings });
    } catch (e) {
      console.error('加载设置失败:', e);
    }
  },

  generateMaze() {
    const levelIndex = this.data.currentLevel > LEVELS.length ? LEVELS.length - 1 : this.data.currentLevel - 1;
    const levelConf = LEVELS[levelIndex];
    this.mazeGenerator = new MazeGenerator(levelConf.width, levelConf.height);
    const maze = this.mazeGenerator.generate();
    const start = this.mazeGenerator.findCell(2);
    
    this.setData({
      maze: maze,
      mazeWidth: levelConf.width,
      mazeHeight: levelConf.height,
      timeLimit: levelConf.timeLimit,
      'player.x': start.x + 0.5,
      'player.y': start.y + 0.5,
      'player.angle': Math.PI / 4,
      steps: 0,
      time: 0,
      gameStatus: 'ready',
      isOverlayVisible: true,
      allLevelsCompleted: this.data.currentLevel > LEVELS.length
    });
  },

  startGame() {
    if (this.data.gameStatus === 'playing') return;
    this.setData({ 
      gameStatus: 'playing', 
      isOverlayVisible: false,
      time: 0, 
      steps: 0,
    }, () => {
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(() => {
        const newTime = this.data.time + 1;
        if (newTime >= this.data.timeLimit) {
          clearInterval(this.timer);
          this.loseGame();
        } else {
          this.setData({ time: newTime });
        }
      }, 1000);
      if (this.data.settings.soundEnabled) this.playSound('start');
    });
  },

  restartGame() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.generateMaze();
  },
  
  nextLevel() {
    let next = this.data.currentLevel;
    if (this.data.allLevelsCompleted) {
      next = 1;
    } 
    this.setData({ currentLevel: next });
    wx.setStorageSync('mazePlayerLevel', next);
    this.generateMaze();
    setTimeout(() => {
      this.startGame();
    }, 50);
  },

  // --- 新的移动和控制逻辑 ---
  
  turn(e) {
    if (this.data.gameStatus !== 'playing') return;
    const direction = typeof e === 'string' ? e : e.currentTarget.dataset.direction;
    const rotateSpeed = this.data.player.rotateSpeed;
    const newAngle = this.data.player.angle + (direction === 'right' ? rotateSpeed : -rotateSpeed);
    this.setData({ 'player.angle': newAngle });
  },

  walk(e) {
    if (this.data.gameStatus !== 'playing') return;
    const direction = typeof e === 'string' ? e : e.currentTarget.dataset.direction;
    const { player, maze } = this.data;
    const moveSpeed = player.speed * (direction === 'forward' ? 1 : -1);
    
    const newX = player.x + Math.cos(player.angle) * moveSpeed;
    const newY = player.y + Math.sin(player.angle) * moveSpeed;

    // 碰撞检测
    if (!this.isColliding(newX, newY)) {
      this.setData({ 
        'player.x': newX,
        'player.y': newY,
        steps: this.data.steps + 1
      });
      
      // 胜利条件判断
      const gridX = Math.floor(newX);
      const gridY = Math.floor(newY);
      if (maze[gridY] && maze[gridY][gridX] === 3) {
        this.winGame();
      }
    } else {
        if (this.data.settings.soundEnabled) this.playSound('wall');
        if (this.data.settings.vibrationEnabled) wx.vibrateShort({ type: 'light' });
    }
  },

  isColliding(x, y) {
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);
    if (gridY < 0 || gridY >= this.data.mazeHeight || gridX < 0 || gridX >= this.data.mazeWidth) {
      return true; // 边界碰撞
    }
    return this.data.maze[gridY][gridX] === 1; // 墙壁碰撞
  },

  touchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    // 可以在这里根据触摸位置判断是转向还是前进
  },

  touchMove(e) {
    if (this.data.gameStatus !== 'playing') return;
    const deltaX = e.touches[0].clientX - this.touchStartX;
    
    // 简单的滑动转向逻辑
    if (Math.abs(deltaX) > 5) { // 阈值防止过于敏感
        this.turn(deltaX > 0 ? 'right' : 'left');
        this.touchStartX = e.touches[0].clientX; // 更新起始点，实现连续转向
    }
  },

  touchEnd(e) {
    // 停止所有持续移动/转向
    this.isMoving = false;
    this.isTurning = false;
  },

  // --- 渲染循环 ---
  
  renderLoop() {
    if (this.data.gameStatus === 'playing') {
      this.castRays();
      // 将离屏canvas绘制到主canvas上
      this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.canvas.width / (wx.getSystemInfoSync().pixelRatio), this.canvas.height / (wx.getSystemInfoSync().pixelRatio));
    }
    this.animationFrameId = this.canvas.requestAnimationFrame(this.renderLoop.bind(this));
  },

  castRays() {
    if (!this.offscreenCtx || !this.offscreenCanvas) return;

    const screenWidth = this.offscreenCanvas.width;
    const screenHeight = this.offscreenCanvas.height;
    const ctx = this.offscreenCtx;

    const { player, maze, mazeWidth, mazeHeight } = this.data;

    // 1. 绘制天空和地面
    ctx.fillStyle = '#87CEEB'; // 天空蓝
    ctx.fillRect(0, 0, screenWidth, screenHeight / 2);
    ctx.fillStyle = '#3A3A3A'; // 地面灰
    ctx.fillRect(0, screenHeight / 2, screenWidth, screenHeight / 2);

    const fov = Math.PI / 3; // 60度视野

    // 遍历屏幕的每一列像素
    for (let i = 0; i < screenWidth; i++) {
      // 计算当前像素列对应的光线角度
      const rayAngle = (player.angle - fov / 2) + (i / screenWidth) * fov;

      const rayDirX = Math.cos(rayAngle);
      const rayDirY = Math.sin(rayAngle);

      // 玩家所在的格子坐标
      let mapX = Math.floor(player.x);
      let mapY = Math.floor(player.y);

      // 光线从起点到下一个x或y方向的网格线的距离
      let sideDistX;
      let sideDistY;

      // 在x和y方向上，光线从一个网格线移动到下一个网格线所需的距离
      const deltaDistX = (rayDirX === 0) ? 1e30 : Math.abs(1 / rayDirX);
      const deltaDistY = (rayDirY === 0) ? 1e30 : Math.abs(1 / rayDirY);

      // x和y方向上的步进方向 (1 或 -1)
      let stepX;
      let stepY;

      let hit = 0; // 是否碰到墙壁
      let side; // 碰到的是x方向还是y方向的墙壁

      // 计算初始的sideDist和step
      if (rayDirX < 0) {
        stepX = -1;
        sideDistX = (player.x - mapX) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
      }
      if (rayDirY < 0) {
        stepY = -1;
        sideDistY = (player.y - mapY) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
      }

      // DDA算法循环
      while (hit === 0) {
        // 跳到下一个网格
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0; // 碰到x方向的墙
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1; // 碰到y方向的墙
        }
        // 检查是否碰到墙
        if (mapX < 0 || mapX >= mazeWidth || mapY < 0 || mapY >= mazeHeight) {
            hit = 1; // 超出边界也算作墙
        } else if (maze[mapY][mapX] === 1) {
            hit = 1;
        }
      }

      // 计算光线到墙壁的垂直距离 (修正鱼眼效果)
      let perpWallDist;
      if (side === 0) {
        perpWallDist = (mapX - player.x + (1 - stepX) / 2) / rayDirX;
      } else {
        perpWallDist = (mapY - player.y + (1 - stepY) / 2) / rayDirY;
      }
      
      // 根据距离计算墙壁在屏幕上的高度
      const lineHeight = Math.floor(screenHeight / perpWallDist);

      // 计算墙壁的绘制起始和结束位置
      let drawStart = -lineHeight / 2 + screenHeight / 2;
      if (drawStart < 0) drawStart = 0;
      let drawEnd = lineHeight / 2 + screenHeight / 2;
      if (drawEnd >= screenHeight) drawEnd = screenHeight - 1;

      // 如果纹理已加载，则使用纹理，否则回退到纯色
      if (this.texture && this.texture.complete) {
        // 计算墙壁的精确撞击点
        let wallX; // 墙壁的x坐标
        if (side === 0) {
          wallX = player.y + perpWallDist * rayDirY;
        } else {
          wallX = player.x + perpWallDist * rayDirX;
        }
        wallX -= Math.floor(wallX);

        // 计算纹理的x坐标
        const textureWidth = 64; // 假设纹理宽度为64px
        let texX = Math.floor(wallX * textureWidth);
        if (side === 0 && rayDirX > 0) texX = textureWidth - texX - 1;
        if (side === 1 && rayDirY < 0) texX = textureWidth - texX - 1;

        ctx.drawImage(
          this.texture,
          texX, 0, // 源图像中的x, y
          1, this.texture.height, // 源图像中的切片宽高
          i, drawStart, // 目标canvas中的x, y
          1, drawEnd - drawStart // 目标canvas中的切片宽高
        );

        // 为了增加深度感，给东西朝向的墙加个阴影
        if (side === 1) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(i, drawStart, 1, drawEnd - drawStart);
        }

      } else {
        // 选择墙壁颜色 (根据墙壁朝向)
        let color = side === 1 ? '#00008B' : '#0000CD'; // 深蓝色/中蓝色
        ctx.fillStyle = color;
        ctx.fillRect(i, drawStart, 1, drawEnd - drawStart);
      }
    }
  },

  // --- 游戏状态 ---

  winGame() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    
    let nextLevel = this.data.currentLevel + 1;
    let allLevelsCompleted = nextLevel > LEVELS.length;
    
    if (!allLevelsCompleted) {
      wx.setStorageSync('mazePlayerLevel', nextLevel);
    }
    
    this.setData({ 
      gameStatus: 'win',
      isOverlayVisible: true,
      allLevelsCompleted: allLevelsCompleted,
      currentLevel: nextLevel 
    });
    
    if (this.data.settings.soundEnabled) this.playSound('victory');
    if (this.data.settings.vibrationEnabled) wx.vibrateLong();
  },

  loseGame() {
    this.setData({ gameStatus: 'lose', isOverlayVisible: true });
    if (this.data.settings.soundEnabled) this.playSound('gameover');
    if (this.data.settings.vibrationEnabled) wx.vibrateShort({ type: 'heavy' });
  },

  showSolution() {
    // 2.5D模式下查看答案需要新的实现方式，例如在小地图上绘制
    // 暂时禁用
    wx.showToast({
      title: '3D模式暂不支持查看答案',
      icon: 'none'
    });
  },


  playSound(soundName) {
    const audio = wx.createInnerAudioContext();
    audio.src = `/assets/sounds/${soundName}.mp3`;
    audio.volume = 0.5;
    audio.play();
    audio.onEnded(() => audio.destroy());
  },

  onShareAppMessage() {
    return {
      title: '来挑战这个超有趣的迷宫游戏吧！',
      path: '/pages/maze/maze',
      imageUrl: '/assets/images/maze-share.png'
    };
  }
});

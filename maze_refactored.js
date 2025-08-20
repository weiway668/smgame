// pages/maze/maze.js (WXML Refactored Version)
// 最终版本 - 增加了时间限制和游戏结束功能

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
    currentLevel: 1,
    allLevelsCompleted: false,
    maze: [],
    mazeWidth: 11,
    mazeHeight: 11,
    playerX: 1,
    playerY: 1,
    steps: 0,
    time: 0,
    timeLimit: 45,
    visitedCells: [],
    settings: {},
    playerStyle: 'top: 0; left: 0;'
  },

  mazeGenerator: null,
  timer: null,
  isMoving: false,

  onLoad(options) {
    this.loadSettings();
    const savedLevel = wx.getStorageSync('mazePlayerLevel') || 1;
    this.setData({
      currentLevel: parseInt(savedLevel, 10)
    });
  },

  onReady() {
    this.generateMaze();
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer);
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
      playerX: start.x,
      playerY: start.y,
      steps: 0,
      time: 0,
      gameStatus: 'ready',
      visitedCells: [],
      allLevelsCompleted: this.data.currentLevel > LEVELS.length
    });
    
    this.updatePlayerStyle(start.x, start.y);
  },

  updatePlayerStyle(x, y) {
    const top = (y / this.data.mazeHeight) * 100;
    const left = (x / this.data.mazeWidth) * 100;
    this.setData({
      playerStyle: `top: ${top}%; left: ${left}%;`
    });
  },

  startGame(e) {
    const callback = (typeof e === 'function') ? e : null;
    if (this.data.gameStatus === 'playing') {
      if (callback) callback();
      return;
    }
    this.setData({ 
      gameStatus: 'playing', 
      time: 0, 
      steps: 0, 
      visitedCells: [[this.data.playerX, this.data.playerY]] 
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
      if (callback) callback();
    });
  },

  restartGame() {
    if (this.isMoving) return;
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

  movePlayer(direction) {
    if (this.data.gameStatus === 'win' || this.data.gameStatus === 'lose') return;
    
    const performMove = () => {
      const { playerX, playerY, maze } = this.data;
      let newX = playerX, newY = playerY;
      
      switch (direction) {
        case 'up': newY--; break;
        case 'down': newY++; break;
        case 'left': newX--; break;
        case 'right': newX++; break;
      }
      
      if (this.mazeGenerator.isValidMove(newX, newY)) {
        const visitedCells = this.data.visitedCells;
        if (!visitedCells.some(([x, y]) => x === newX && y === newY)) {
          visitedCells.push([newX, newY]);
        }
        
        this.setData({ playerX: newX, playerY: newY, steps: this.data.steps + 1, visitedCells });
        this.updatePlayerStyle(newX, newY);
        
        if (this.data.settings.soundEnabled) this.playSound('move');
        if (this.data.settings.vibrationEnabled) wx.vibrateShort({ type: 'light' });
        
        if (maze[newY][newX] === 3) this.winGame();
      } else {
        if (this.data.settings.soundEnabled) this.playSound('wall');
        if (this.data.settings.vibrationEnabled) wx.vibrateShort({ type: 'medium' });
      }
    };

    if (this.data.gameStatus === 'ready') {
      this.startGame(performMove);
    } else {
      performMove();
    }
  },
  
  touchStart(e) {
    if (this.isMoving) return;
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  },

  touchEnd(e) {
    if (this.isMoving || this.data.gameStatus === 'win' || this.data.gameStatus === 'lose') return;
    const deltaX = e.changedTouches[0].clientX - this.touchStartX;
    const deltaY = e.changedTouches[0].clientY - this.touchStartY;

    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      return;
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      this.movePlayer(deltaX > 0 ? 'right' : 'left');
    } else {
      this.movePlayer(deltaY > 0 ? 'down' : 'up');
    }
  },

  handleTap(e) {
    if (this.isMoving || this.data.gameStatus === 'win' || this.data.gameStatus === 'lose') return;
    const touch = e.changedTouches[0] || e.touches[0];
    if (!touch) return;

    wx.createSelectorQuery().select('.maze-grid').boundingClientRect(rect => {
      if (!rect) return;
      
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      const { mazeWidth, mazeHeight, playerX, playerY, maze } = this.data;
      const cellWidth = rect.width / mazeWidth;
      const cellHeight = rect.height / mazeHeight;

      const targetX = Math.floor(touchX / cellWidth);
      const targetY = Math.floor(touchY / cellHeight);

      if (maze[targetY][targetX] === 1) return;
      if (targetX === playerX && targetY === playerY) return;

      if (targetX === playerX || targetY === playerY) {
        if (this.isPathClear(playerX, playerY, targetX, targetY)) {
          this.moveAlongPath(targetX, targetY);
        }
      } else {
        const isAdjacent = (Math.abs(targetX - playerX) === 1 && targetY === playerY) ||
                           (Math.abs(targetY - playerY) === 1 && targetX === playerX);
        if (isAdjacent) {
          let direction = null;
          if (targetX > playerX) direction = 'right';
          else if (targetX < playerX) direction = 'left';
          else if (targetY > playerY) direction = 'down';
          else if (targetY < playerY) direction = 'up';
          if (direction) this.movePlayer(direction);
        }
      }
    }).exec();
  },

  isPathClear(x1, y1, x2, y2) {
    const { maze } = this.data;
    if (x1 === x2) {
      const startY = Math.min(y1, y2);
      const endY = Math.max(y1, y2);
      for (let y = startY + 1; y < endY; y++) {
        if (maze[y][x1] === 1) return false;
      }
    } else if (y1 === y2) {
      const startX = Math.min(x1, x2);
      const endX = Math.max(x1, x2);
      for (let x = startX + 1; x < endX; x++) {
        if (maze[y1][x] === 1) return false;
      }
    }
    return true;
  },

  moveAlongPath(targetX, targetY) {
    const { playerX, playerY } = this.data;
    const steps = [];
    if (targetX === playerX) {
      const direction = targetY > playerY ? 'down' : 'up';
      const distance = Math.abs(targetY - playerY);
      for (let i = 0; i < distance; i++) steps.push(direction);
    } else if (targetY === playerY) {
      const direction = targetX > playerX ? 'right' : 'left';
      const distance = Math.abs(targetX - playerX);
      for (let i = 0; i < distance; i++) steps.push(direction);
    }

    if (steps.length > 0) {
      this.executeMoveSequence(steps);
    }
  },

  executeMoveSequence(steps) {
    if (this.isMoving) return;
    this.isMoving = true;

    const move = () => {
      if (steps.length === 0 || (this.data.gameStatus !== 'playing' && this.data.gameStatus !== 'ready')) {
        this.isMoving = false;
        return;
      }
      const direction = steps.shift();
      this.movePlayer(direction);
      if (this.data.gameStatus !== 'playing') {
        this.isMoving = false;
        return;
      }
      setTimeout(move, 100);
    };
    move();
  },

  winGame() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.isMoving = false;
    
    let nextLevel = this.data.currentLevel + 1;
    let allLevelsCompleted = nextLevel > LEVELS.length;
    
    if (!allLevelsCompleted) {
      wx.setStorageSync('mazePlayerLevel', nextLevel);
    }
    
    this.setData({ 
      gameStatus: 'win',
      allLevelsCompleted: allLevelsCompleted,
      currentLevel: nextLevel 
    });
    
    if (this.data.settings.soundEnabled) this.playSound('victory');
    if (this.data.settings.vibrationEnabled) wx.vibrateLong();
  },

  loseGame() {
    this.isMoving = false;
    this.setData({ gameStatus: 'lose' });
    if (this.data.settings.soundEnabled) this.playSound('gameover');
    if (this.data.settings.vibrationEnabled) wx.vibrateShort({ type: 'heavy' });
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

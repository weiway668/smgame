// pages/maze/maze.js (WXML Refactored Version)
// 最终版本

const MazeGenerator = require('../../utils/mazeGenerator.js');

// 关卡配置 (共20关)
const LEVELS = [
  { width: 11, height: 11 }, { width: 11, height: 13 }, { width: 13, height: 13 }, { width: 13, height: 15 }, { width: 15, height: 15 },
  { width: 15, height: 17 }, { width: 17, height: 17 }, { width: 17, height: 19 }, { width: 19, height: 19 }, { width: 19, height: 21 },
  { width: 21, height: 21 }, { width: 21, height: 23 }, { width: 23, height: 23 }, { width: 23, height: 25 }, { width: 25, height: 25 },
  { width: 25, height: 27 }, { width: 27, height: 27 }, { width: 27, height: 29 }, { width: 29, height: 29 }, { width: 29, height: 31 },
];

Page({
  data: {
    gameStatus: 'ready', // ready, playing, win
    currentLevel: 1,
    allLevelsCompleted: false,
    maze: [],
    mazeWidth: 11,
    mazeHeight: 11,
    playerX: 1,
    playerY: 1,
    steps: 0,
    time: 0,
    visitedCells: [],
    settings: {},
    playerStyle: 'top: 0; left: 0;'
  },

  mazeGenerator: null,
  timer: null,

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
        this.setData({ time: this.data.time + 1 });
      }, 1000);
      if (this.data.settings.soundEnabled) this.playSound('start');
      if (callback) callback();
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
  },

  movePlayer(direction) {
    if (this.data.gameStatus === 'win') return;
    
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
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  },

  touchEnd(e) {
    if (this.data.gameStatus === 'win') return;
    const deltaX = e.changedTouches[0].clientX - this.touchStartX;
    const deltaY = e.changedTouches[0].clientY - this.touchStartY;

    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      this.handleTap(e);
      return;
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      this.movePlayer(deltaX > 0 ? 'right' : 'left');
    } else {
      this.movePlayer(deltaY > 0 ? 'down' : 'up');
    }
  },

  handleTap(e) {
    const touch = e.changedTouches[0];
    if (!touch) return;

    wx.createSelectorQuery().select('.maze-grid').boundingClientRect(rect => {
      if (!rect) return;
      
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      const { mazeWidth, mazeHeight } = this.data;
      const cellWidth = rect.width / mazeWidth;
      const cellHeight = rect.height / mazeHeight;

      const targetX = Math.floor(touchX / cellWidth);
      const targetY = Math.floor(touchY / cellHeight);

      const { playerX, playerY } = this.data;

      const isAdjacent = (Math.abs(targetX - playerX) === 1 && targetY === playerY) ||
                         (Math.abs(targetY - playerY) === 1 && targetX === playerX);

      if (isAdjacent) {
        let direction = null;
        if (targetX > playerX) direction = 'right';
        else if (targetX < playerX) direction = 'left';
        else if (targetY > playerY) direction = 'down';
        else if (targetY < playerY) direction = 'up';
        
        if (direction) {
          this.movePlayer(direction);
        }
      }
    }).exec();
  },

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
      allLevelsCompleted: allLevelsCompleted,
      currentLevel: nextLevel 
    });
    
    if (this.data.settings.soundEnabled) this.playSound('victory');
    if (this.data.settings.vibrationEnabled) wx.vibrateLong();
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

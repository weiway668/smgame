// utils/mazeGenerator.js
// 迷宫生成算法

class MazeGenerator {
  constructor(width, height) {
    // 确保宽高为奇数
    this.width = width % 2 === 0 ? width + 1 : width;
    this.height = height % 2 === 0 ? height + 1 : height;
    this.maze = [];
    this.solution = [];
  }

  // 初始化迷宫
  initMaze() {
    this.maze = [];
    for (let y = 0; y < this.height; y++) {
      this.maze[y] = [];
      for (let x = 0; x < this.width; x++) {
        // 1表示墙，0表示路径
        this.maze[y][x] = 1;
      }
    }
  }

  // 生成迷宫
  generate() {
    this.initMaze();
    
    // 使用递归回溯算法生成迷宫
    this.carvePath(1, 1);
    
    // 设置起点和终点
    this.maze[1][1] = 2; // 起点
    this.maze[this.height - 2][this.width - 2] = 3; // 终点
    
    // 创建额外的路径，使迷宫更有趣
    this.createLoops();
    
    return this.maze;
  }

  // 递归回溯算法雕刻路径
  carvePath(x, y) {
    // 标记当前位置为路径
    this.maze[y][x] = 0;
    
    // 四个方向：上、右、下、左
    const directions = [
      [0, -2], // 上
      [2, 0],  // 右
      [0, 2],  // 下
      [-2, 0]  // 左
    ];
    
    // 随机打乱方向
    this.shuffle(directions);
    
    // 尝试每个方向
    for (let [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      
      // 检查边界和是否已访问
      if (this.isValidCell(nx, ny) && this.maze[ny][nx] === 1) {
        // 打通中间的墙
        this.maze[y + dy / 2][x + dx / 2] = 0;
        // 递归继续生成
        this.carvePath(nx, ny);
      }
    }
  }

  // 创建循环路径
  createLoops() {
    const loopCount = Math.floor(this.width * this.height / 100);
    let created = 0;
    
    for (let attempt = 0; attempt < loopCount * 10 && created < loopCount; attempt++) {
      const x = 1 + Math.floor(Math.random() * ((this.width - 2) / 2)) * 2;
      const y = 1 + Math.floor(Math.random() * ((this.height - 2) / 2)) * 2;
      
      // 检查是否可以安全地打通墙壁
      if (this.maze[y][x] === 1 && this.canBreakWall(x, y)) {
        this.maze[y][x] = 0;
        created++;
      }
    }
  }

  // 检查是否可以打通墙壁
  canBreakWall(x, y) {
    let pathCount = 0;
    const neighbors = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    
    for (let [dx, dy] of neighbors) {
      const nx = x + dx;
      const ny = y + dy;
      if (ny >= 0 && ny < this.height && nx >= 0 && nx < this.width) {
        if (this.maze[ny][nx] === 0 || this.maze[ny][nx] === 2 || this.maze[ny][nx] === 3) {
          pathCount++;
        }
      }
    }
    
    // 只有当恰好连接两条路径时才打通
    return pathCount === 2;
  }

  // 检查单元格是否有效
  isValidCell(x, y) {
    return x > 0 && x < this.width - 1 && y > 0 && y < this.height - 1;
  }

  // 随机打乱数组
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // 寻找最短路径（用于提示功能）
  findSolution() {
    const start = this.findCell(2); // 找到起点
    const end = this.findCell(3);   // 找到终点
    
    if (!start || !end) return [];
    
    // 使用BFS算法寻找最短路径
    const queue = [[start.x, start.y, []]];
    const visited = new Set();
    visited.add(`${start.x},${start.y}`);
    
    const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    
    while (queue.length > 0) {
      const [x, y, path] = queue.shift();
      
      // 到达终点
      if (x === end.x && y === end.y) {
        return [...path, [x, y]];
      }
      
      // 探索四个方向
      for (let [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;
        
        if (this.isValidMove(nx, ny) && !visited.has(key)) {
          visited.add(key);
          queue.push([nx, ny, [...path, [x, y]]]);
        }
      }
    }
    
    return [];
  }

  // 查找特定值的单元格
  findCell(value) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.maze[y][x] === value) {
          return { x, y };
        }
      }
    }
    return null;
  }

  // 检查是否可以移动到指定位置
  isValidMove(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    // 可以移动到路径、起点或终点
    return this.maze[y][x] === 0 || this.maze[y][x] === 2 || this.maze[y][x] === 3;
  }

  // 获取难度配置
  static getDifficultyConfig(difficulty) {
    const configs = {
      easy: {
        size: 11,
        name: '简单',
        color: '#4CAF50',
        timeBonus: 1000
      },
      medium: {
        size: 15,
        name: '中等',
        color: '#FF9800',
        timeBonus: 2000
      },
      hard: {
        size: 21,
        name: '困难',
        color: '#F44336',
        timeBonus: 3000
      }
    };
    return configs[difficulty] || configs.easy;
  }
}

module.exports = MazeGenerator;
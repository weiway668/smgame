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

  // 生成迷宫，并确保其具有足够的复杂度
  generate() {
    let solutionPath;
    // 设定最小路径长度门槛，保证迷宫具有一定挑战性。
    // 这里我们取宽高之和的80%作为一个合理的阈值。
    const minPathLength = Math.floor((this.width + this.height) * 0.8);
    let attempts = 0; // 防止无限循环

    // 循环生成迷宫，直到满足所有难度要求
    do {
      this.initMaze();
      
      // 使用递归回溯算法生成迷宫
      this.carvePath(1, 1);
      
      // 设置起点和终点
      this.maze[1][1] = 2; // 起点
      this.maze[this.height - 2][this.width - 2] = 3; // 终点
      
      // 创建额外的路径，使迷宫更有趣
      this.createLoops();

      // 寻找最短路径以校验难度
      solutionPath = this.findSolution();
      
      attempts++;
      // 添加一个尝试次数上限，以防在某些极端情况下发生无限循环
      if (attempts > 20) {
        console.warn('Maze generation exceeded max attempts. Using last generated maze.');
        break;
      }

    } while (
      !solutionPath ||                               // 保证有解
      solutionPath.length < minPathLength ||         // 保证路径够长
      this.hasStraightThroughPath()                  // 保证没有横/竖直通路径
    );

    this.solution = solutionPath; // 缓存找到的路径，可用于提示功能
    return this.maze;
  }

  // 检查是否存在横穿或竖穿的无障碍路径
  hasStraightThroughPath() {
    // 检查行 (从y=1到height-2)
    for (let y = 1; y < this.height - 1; y++) {
      let isRowClear = true;
      for (let x = 1; x < this.width - 1; x++) {
        if (this.maze[y][x] === 1) { // 1表示墙
          isRowClear = false;
          break;
        }
      }
      if (isRowClear) {
        return true; // 发现了一条横向直通路径
      }
    }

    // 检查列 (从x=1到width-2)
    for (let x = 1; x < this.width - 1; x++) {
      let isColClear = true;
      for (let y = 1; y < this.height - 1; y++) {
        if (this.maze[y][x] === 1) { // 1表示墙
          isColClear = false;
          break;
        }
      }
      if (isColClear) {
        return true; // 发现了一条纵向直通路径
      }
    }

    return false; // 没有发现直通路径
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

  // 创建循环路径，增加迷宫复杂度和可玩性
  createLoops() {
    // 增加破墙数量，将除数从100减小到30，以创造更多路径
    const loopsToCreate = Math.floor((this.width * this.height) / 30);
    let created = 0;

    // 增加尝试次数以确保能创建足够多的循环
    for (let attempt = 0; attempt < loopsToCreate * 5 && created < loopsToCreate; attempt++) {
      // 随机选择一个非边界点（x和y都在1到width/height-2之间）
      const x = Math.floor(Math.random() * (this.width - 2)) + 1;
      const y = Math.floor(Math.random() * (this.height - 2)) + 1;

      // 如果选中的点是墙(1)，就把它变成路(0)
      if (this.maze[y][x] === 1) {
        this.maze[y][x] = 0;
        created++;
      }
    }
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
  
  // 寻找从指定位置到目标位置的路径
  findPath(fromX, fromY, toX, toY) {
    // 检查目标位置是否可达
    if (!this.isValidMove(toX, toY)) {
      return null;
    }
    
    // 使用BFS算法寻找最短路径
    const queue = [[fromX, fromY, []]];
    const visited = new Set();
    visited.add(`${fromX},${fromY}`);
    
    const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    
    while (queue.length > 0) {
      const [x, y, path] = queue.shift();
      
      // 到达目标
      if (x === toX && y === toY) {
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
    
    return null;  // 无法到达目标
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
        width: 11,
        height: 11,
        name: '简单',
        color: '#4CAF50',
        timeBonus: 1000
      },
      medium: {
        width: 15,
        height: 15,
        name: '中等',
        color: '#FF9800',
        timeBonus: 2000
      },
      hard: {
        width: 17,
        height: 25,
        name: '困难',
        color: '#F44336',
        timeBonus: 3000
      }
    };
    return configs[difficulty] || configs.easy;
  }
}

module.exports = MazeGenerator;
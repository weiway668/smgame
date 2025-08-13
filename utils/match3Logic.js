// utils/match3Logic.js
// 消消乐游戏核心逻辑

class Match3Logic {
  constructor(gridSize = 8, colors = 6) {
    this.gridSize = gridSize;
    this.colorCount = colors;
    this.grid = [];
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.lastMatchTime = 0;
    this.comboTimeout = 2000; // 连击超时时间（毫秒）
    
    // 颜色配置
    this.colors = [
      '#FF6B6B', // 红色
      '#4ECDC4', // 青色
      '#45B7D1', // 蓝色
      '#96CEB4', // 绿色
      '#FFEAA7', // 黄色
      '#DDA0DD', // 紫色
    ];
    
    // 特殊方块类型
    this.specialTypes = {
      normal: 0,
      corrupted: 1,  // 腐蚀方块
      bomb: 2,       // 炸弹方块
      rainbow: 3     // 彩虹方块
    };
  }

  // 初始化游戏网格
  initGrid() {
    this.grid = [];
    for (let row = 0; row < this.gridSize; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        do {
          this.grid[row][col] = {
            color: Math.floor(Math.random() * this.colorCount),
            type: this.specialTypes.normal,
            marked: false,
            animation: null
          };
        } while (this.checkInitialMatches(row, col));
      }
    }
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
  }

  // 检查初始化时是否有匹配（避免游戏开始就有消除）
  checkInitialMatches(row, col) {
    const color = this.grid[row][col].color;
    
    // 检查横向
    if (col >= 2) {
      if (this.grid[row][col - 1].color === color &&
          this.grid[row][col - 2].color === color) {
        return true;
      }
    }
    
    // 检查纵向
    if (row >= 2) {
      if (this.grid[row - 1][col].color === color &&
          this.grid[row - 2][col].color === color) {
        return true;
      }
    }
    
    return false;
  }

  // 交换两个方块
  swapBlocks(row1, col1, row2, col2) {
    // 检查是否相邻
    if (!this.isAdjacent(row1, col1, row2, col2)) {
      return false;
    }
    
    // 执行交换
    const temp = this.grid[row1][col1];
    this.grid[row1][col1] = this.grid[row2][col2];
    this.grid[row2][col2] = temp;
    
    // 检查交换后是否有匹配
    const matches = this.findAllMatches();
    
    if (matches.length === 0) {
      // 没有匹配，交换回来
      const temp = this.grid[row1][col1];
      this.grid[row1][col1] = this.grid[row2][col2];
      this.grid[row2][col2] = temp;
      return false;
    }
    
    return true;
  }

  // 检查两个位置是否相邻
  isAdjacent(row1, col1, row2, col2) {
    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  // 查找所有匹配
  findAllMatches() {
    const matches = [];
    const processed = new Set();
    
    // 查找横向匹配
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize - 2; col++) {
        const match = this.findHorizontalMatch(row, col);
        if (match.length >= 3) {
          match.forEach(pos => {
            const key = `${pos.row},${pos.col}`;
            if (!processed.has(key)) {
              matches.push(pos);
              processed.add(key);
            }
          });
        }
      }
    }
    
    // 查找纵向匹配
    for (let col = 0; col < this.gridSize; col++) {
      for (let row = 0; row < this.gridSize - 2; row++) {
        const match = this.findVerticalMatch(row, col);
        if (match.length >= 3) {
          match.forEach(pos => {
            const key = `${pos.row},${pos.col}`;
            if (!processed.has(key)) {
              matches.push(pos);
              processed.add(key);
            }
          });
        }
      }
    }
    
    // 查找连通区域匹配
    const connectedMatches = this.findConnectedMatches();
    connectedMatches.forEach(pos => {
      const key = `${pos.row},${pos.col}`;
      if (!processed.has(key)) {
        matches.push(pos);
        processed.add(key);
      }
    });
    
    return matches;
  }

  // 查找横向匹配
  findHorizontalMatch(row, col) {
    const matches = [];
    const color = this.grid[row][col].color;
    
    if (this.grid[row][col].type === this.specialTypes.corrupted) {
      return matches;
    }
    
    let matchLength = 1;
    matches.push({ row, col });
    
    // 向右查找
    for (let c = col + 1; c < this.gridSize; c++) {
      if (this.grid[row][c].color === color &&
          this.grid[row][c].type !== this.specialTypes.corrupted) {
        matchLength++;
        matches.push({ row, col: c });
      } else {
        break;
      }
    }
    
    return matchLength >= 3 ? matches : [];
  }

  // 查找纵向匹配
  findVerticalMatch(row, col) {
    const matches = [];
    const color = this.grid[row][col].color;
    
    if (this.grid[row][col].type === this.specialTypes.corrupted) {
      return matches;
    }
    
    let matchLength = 1;
    matches.push({ row, col });
    
    // 向下查找
    for (let r = row + 1; r < this.gridSize; r++) {
      if (this.grid[r][col].color === color &&
          this.grid[r][col].type !== this.specialTypes.corrupted) {
        matchLength++;
        matches.push({ row: r, col });
      } else {
        break;
      }
    }
    
    return matchLength >= 3 ? matches : [];
  }

  // 查找连通区域匹配
  findConnectedMatches() {
    const matches = [];
    const visited = new Set();
    
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const key = `${row},${col}`;
        if (!visited.has(key) && 
            this.grid[row][col].type !== this.specialTypes.corrupted) {
          const connected = this.dfsConnected(row, col, visited);
          if (connected.length >= 5) {  // 连通区域至少5个才消除
            matches.push(...connected);
          }
        }
      }
    }
    
    return matches;
  }

  // 深度优先搜索连通区域
  dfsConnected(row, col, visited) {
    const color = this.grid[row][col].color;
    const stack = [{ row, col }];
    const connected = [];
    
    while (stack.length > 0) {
      const { row: r, col: c } = stack.pop();
      const key = `${r},${c}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      connected.push({ row: r, col: c });
      
      // 检查四个方向
      const neighbors = [
        { row: r - 1, col: c },
        { row: r + 1, col: c },
        { row: r, col: c - 1 },
        { row: r, col: c + 1 }
      ];
      
      for (let neighbor of neighbors) {
        const { row: nr, col: nc } = neighbor;
        if (nr >= 0 && nr < this.gridSize &&
            nc >= 0 && nc < this.gridSize &&
            this.grid[nr][nc].color === color &&
            this.grid[nr][nc].type !== this.specialTypes.corrupted &&
            !visited.has(`${nr},${nc}`)) {
          stack.push({ row: nr, col: nc });
        }
      }
    }
    
    return connected;
  }

  // 消除匹配的方块
  removeMatches(matches) {
    let points = 0;
    let removedCount = 0;
    
    // 标记要消除的方块
    matches.forEach(({ row, col }) => {
      if (this.grid[row][col] && !this.grid[row][col].marked) {
        this.grid[row][col].marked = true;
        removedCount++;
        
        // 基础分数
        points += 10;
        
        // 检查是否消除了腐蚀方块周围的方块
        this.checkCorruptedNeighbors(row, col);
      }
    });
    
    // 连击奖励
    const now = Date.now();
    if (now - this.lastMatchTime < this.comboTimeout) {
      this.combo++;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
    } else {
      this.combo = 1;
    }
    this.lastMatchTime = now;
    
    // 连击加成
    const comboMultiplier = this.getComboMultiplier();
    points = Math.floor(points * comboMultiplier);
    
    // 更新分数
    this.score += points;
    
    // 实际移除方块
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.grid[row][col] && this.grid[row][col].marked) {
          this.grid[row][col] = null;
        }
      }
    }
    
    return {
      points,
      removedCount,
      combo: this.combo,
      comboMultiplier
    };
  }

  // 检查腐蚀方块周围
  checkCorruptedNeighbors(row, col) {
    const neighbors = [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 }
    ];
    
    neighbors.forEach(({ row: r, col: c }) => {
      if (r >= 0 && r < this.gridSize &&
          c >= 0 && c < this.gridSize &&
          this.grid[r][c] &&
          this.grid[r][c].type === this.specialTypes.corrupted) {
        // 消除腐蚀方块
        this.grid[r][c].marked = true;
        this.score += 50; // 额外奖励
      }
    });
  }

  // 获取连击倍数
  getComboMultiplier() {
    if (this.combo >= 8) {
      return 2.0; // 超级爆发
    } else if (this.combo >= 5) {
      return 1.5; // 狂热状态
    } else if (this.combo >= 3) {
      return 1.2; // 热火状态
    }
    return 1.0;
  }

  // 方块下落
  dropBlocks() {
    let moved = false;
    
    for (let col = 0; col < this.gridSize; col++) {
      let writePos = this.gridSize - 1;
      
      // 从下往上扫描
      for (let row = this.gridSize - 1; row >= 0; row--) {
        if (this.grid[row][col] !== null) {
          if (row !== writePos) {
            this.grid[writePos][col] = this.grid[row][col];
            this.grid[row][col] = null;
            moved = true;
          }
          writePos--;
        }
      }
    }
    
    return moved;
  }

  // 填充空缺位置
  fillEmpty() {
    let filled = false;
    
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.grid[row][col] === null) {
          this.grid[row][col] = {
            color: Math.floor(Math.random() * this.colorCount),
            type: this.specialTypes.normal,
            marked: false,
            animation: 'drop'
          };
          filled = true;
        }
      }
    }
    
    return filled;
  }

  // 添加腐蚀方块（生存模式）
  addCorruptedBlocks(count = 1) {
    const added = [];
    let attempts = 0;
    
    while (added.length < count && attempts < 100) {
      const row = Math.floor(Math.random() * this.gridSize);
      const col = Math.floor(Math.random() * this.gridSize);
      
      if (this.grid[row][col] && 
          this.grid[row][col].type === this.specialTypes.normal) {
        this.grid[row][col].type = this.specialTypes.corrupted;
        this.grid[row][col].color = -1; // 特殊颜色标记
        added.push({ row, col });
      }
      
      attempts++;
    }
    
    return added;
  }

  // 检查是否还有可能的移动
  hasValidMoves() {
    // 检查所有相邻的方块对
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        // 检查右边
        if (col < this.gridSize - 1) {
          // 模拟交换
          const temp = this.grid[row][col];
          this.grid[row][col] = this.grid[row][col + 1];
          this.grid[row][col + 1] = temp;
          
          // 检查是否有匹配
          const matches = this.findAllMatches();
          
          // 恢复
          this.grid[row][col + 1] = this.grid[row][col];
          this.grid[row][col] = temp;
          
          if (matches.length > 0) {
            return true;
          }
        }
        
        // 检查下边
        if (row < this.gridSize - 1) {
          // 模拟交换
          const temp = this.grid[row][col];
          this.grid[row][col] = this.grid[row + 1][col];
          this.grid[row + 1][col] = temp;
          
          // 检查是否有匹配
          const matches = this.findAllMatches();
          
          // 恢复
          this.grid[row + 1][col] = this.grid[row][col];
          this.grid[row][col] = temp;
          
          if (matches.length > 0) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  // 重新洗牌（没有可用移动时）
  shuffle() {
    const blocks = [];
    
    // 收集所有非腐蚀方块
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.grid[row][col] && 
            this.grid[row][col].type !== this.specialTypes.corrupted) {
          blocks.push(this.grid[row][col]);
        }
      }
    }
    
    // 随机打乱
    for (let i = blocks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    }
    
    // 放回网格
    let index = 0;
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.grid[row][col] && 
            this.grid[row][col].type !== this.specialTypes.corrupted) {
          this.grid[row][col] = blocks[index++];
        }
      }
    }
  }

  // 获取游戏状态
  getGameState() {
    return {
      grid: this.grid,
      score: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      hasValidMoves: this.hasValidMoves()
    };
  }

  // 获取连击状态描述
  getComboStatus() {
    if (this.combo >= 8) {
      return { text: '超级爆发!', color: '#FF0000', multiplier: 2.0 };
    } else if (this.combo >= 5) {
      return { text: '狂热状态!', color: '#FF6B6B', multiplier: 1.5 };
    } else if (this.combo >= 3) {
      return { text: '热火状态!', color: '#FFA500', multiplier: 1.2 };
    }
    return { text: '', color: '', multiplier: 1.0 };
  }
}

module.exports = Match3Logic;
# GEMINI.md

This file provides guidance to GEMINI Code (GEMINI.ai/code) when working with code in this repository.

## 项目概述

小梦想游戏是一个微信小程序游戏平台，包含迷宫和消消乐两个益智游戏，专为6-12岁儿童设计。

## 项目结构

```
/Users/weiway/smgame/
├── app.js                    # 小程序入口文件
├── app.json                  # 小程序全局配置
├── app.wxss                  # 全局样式（蓝色主题）
├── pages/                    # 页面目录
│   ├── index/               # 主页（游戏选择界面）
│   ├── maze/                # 迷宫游戏
│   └── match3/              # 消消乐游戏
├── utils/                   # 工具类
│   ├── mazeGenerator.js    # 迷宫生成算法（递归回溯）
│   ├── match3Logic.js      # 消消乐核心逻辑
│   ├── soundManager.js     # 音效管理器
│   ├── storageManager.js   # 存储管理器
│   └── animation.js        # 动画辅助函数
└── doc/                     # 项目文档
    ├── 产品设计文档.md
    ├── 开发计划.md
    └── 技术方案.md
```

## 开发命令

### 微信开发者工具
1. 导入项目：选择项目根目录 `/Users/weiway/smgame/`
2. AppID：使用测试号或填入实际AppID
3. 预览：点击预览按钮生成二维码
4. 真机调试：点击真机调试按钮

### 测试注意事项
- 迷宫游戏支持滑动和方向键两种控制方式
- 消消乐游戏支持拖拽交换方块
- 音效文件需要放在 `/assets/sounds/` 目录
- Canvas渲染使用2D模式以获得更好的性能

## 核心架构

### 迷宫游戏
- **算法**：递归回溯算法生成迷宫
- **难度**：简单(11×11)、中等(15×15)、困难(21×21)
- **渲染**：Canvas 2D绘制
- **控制**：触摸滑动 + 方向按钮
- **数据**：本地存储最佳记录

### 消消乐游戏
- **匹配规则**：横向、纵向3消，连通区域5消
- **连击系统**：3/5/8连击加成（1.2x/1.5x/2.0x）
- **生存模式**：腐蚀方块机制
- **特效**：粒子系统 + 屏幕震动
- **渲染**：Canvas 2D + 动画系统

### 数据存储
- 使用 `wx.setStorageSync` 本地存储
- 存储前缀：`smallDreamGame_`
- 自动清理：存储超过80%时自动清理旧数据

## 代码规范

### 文件命名
- 页面文件：小写，与页面名称一致
- 工具类：驼峰命名（如 `mazeGenerator.js`）
- 资源文件：小写，用连字符分隔

### 代码风格
- 使用ES6+语法
- 异步操作使用Promise
- 工具类使用单例模式
- Canvas操作封装为独立方法

### 性能优化
- Canvas使用双缓冲技术（离屏渲染）
- 动画使用requestAnimationFrame
- 及时清理不用的音频实例
- 限制粒子数量和动画数量

## 常见问题处理

### Canvas绘制问题
```javascript
// 获取Canvas上下文（微信小程序2D模式）
const query = wx.createSelectorQuery();
query.select('#canvasId')
  .fields({ node: true, size: true })
  .exec((res) => {
    const canvas = res[0].node;
    const ctx = canvas.getContext('2d');
    // 设置DPR
    const dpr = wx.getSystemInfoSync().pixelRatio;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
  });
```

### 音效播放失败处理
```javascript
// 使用震动作为备用方案
audio.onError(() => {
  wx.vibrateShort({ type: 'light' });
});
```

### 存储空间不足
```javascript
// 自动清理旧数据
if (info.currentSize / info.limitSize > 0.8) {
  // 清理游戏状态缓存和旧记录
}
```

## 调试技巧

1. **Canvas调试**：在绘制方法中添加 `console.log` 输出坐标信息
2. **触摸事件**：使用 `wx.showToast` 显示触摸位置
3. **性能监控**：使用 FPS 计数器监控帧率
4. **内存监控**：监听 `wx.onMemoryWarning` 事件

## 发布检查清单

- [ ] 移除所有 console.log 语句
- [ ] 检查所有音效文件是否存在
- [ ] 测试不同屏幕尺寸适配
- [ ] 验证存储功能正常
- [ ] 确认游戏难度平衡
- [ ] 测试网络断开情况
- [ ] 检查内存使用情况
# 小梦想游戏 - 微信小程序

一个专为6-12岁儿童设计的益智游戏合集微信小程序，包含迷宫和消消乐两个经典游戏。

## 🎮 游戏特色

- **走迷宫** - 使用递归回溯算法生成的随机迷宫，支持3种难度
- **消消乐** - 经典三消游戏，包含连击系统和生存模式
- **儿童友好** - 清新活泼的视觉设计，无广告无内购
- **益智教育** - 培养逻辑思维和反应能力

## 🚀 快速开始

### 1. 导入项目

1. 下载并安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开微信开发者工具
3. 选择"导入项目"
4. 项目目录选择：`/Users/weiway/smgame/`
5. AppID：使用测试号或填入实际AppID
6. 点击"导入"

### 2. 添加资源文件

项目需要以下资源文件（需自行添加）：

#### 音效文件 `/assets/sounds/`
- `bgm.mp3` - 背景音乐
- `click.mp3` - 点击音效
- `select.mp3` - 选择音效
- `start.mp3` - 游戏开始
- `victory.mp3` - 胜利音效
- `gameover.mp3` - 游戏结束
- `move.mp3` - 移动音效（迷宫）
- `wall.mp3` - 撞墙音效（迷宫）
- `swap.mp3` - 交换音效（消消乐）
- `match.mp3` - 消除音效（消消乐）
- `match_large.mp3` - 大量消除音效
- `explosion.mp3` - 爆炸音效
- `invalid.mp3` - 无效操作音效
- `combo.mp3` - 连击音效

#### 图片文件 `/assets/images/`
- `logo.png` - 游戏Logo
- `share.png` - 分享图片
- `maze-share.png` - 迷宫游戏分享图
- `match3-share.png` - 消消乐分享图

### 3. 运行项目

1. 在微信开发者工具中点击"编译"
2. 选择模拟器或扫码在真机预览
3. 首次运行会使用默认音效（震动反馈）

## 📱 游戏玩法

### 走迷宫
- **操作方式**：滑动屏幕或使用方向键控制小球移动
- **游戏目标**：从绿色起点到达红色终点
- **难度选择**：简单(11×11)、中等(15×15)、困难(21×21)
- **提示功能**：点击提示按钮显示路径

### 消消乐
- **操作方式**：点击或拖动交换相邻方块
- **消除规则**：3个或以上相同颜色横向/纵向排列消除
- **连击系统**：
  - 3连击：热火状态（1.2倍分数）
  - 5连击：狂热状态（1.5倍分数）
  - 8连击：超级爆发（2.0倍分数）
- **生存模式**：定期出现腐蚀方块，增加游戏难度

## 🛠 技术栈

- 微信小程序原生框架
- Canvas 2D API
- 本地存储 (wx.storage)
- ES6+ JavaScript

## 📂 项目结构

```
smgame/
├── app.js                    # 小程序入口
├── app.json                  # 全局配置
├── app.wxss                  # 全局样式
├── pages/                    # 页面文件
│   ├── index/               # 主页
│   ├── maze/                # 迷宫游戏
│   └── match3/              # 消消乐游戏
├── utils/                   # 工具类
│   ├── mazeGenerator.js    # 迷宫生成算法
│   ├── match3Logic.js      # 消消乐逻辑
│   ├── soundManager.js     # 音效管理
│   ├── storageManager.js   # 存储管理
│   └── animation.js        # 动画系统
├── assets/                  # 资源文件
│   ├── images/             # 图片资源
│   └── sounds/             # 音效资源
└── doc/                     # 项目文档
```

## 🔧 配置说明

### 修改AppID

编辑 `project.config.json` 文件：
```json
{
  "appid": "你的AppID"
}
```

### 调整游戏参数

- 迷宫难度：编辑 `utils/mazeGenerator.js` 中的 `getDifficultyConfig`
- 消消乐配置：编辑 `utils/match3Logic.js` 中的构造函数参数
- 音效音量：编辑 `utils/soundManager.js` 中的音量设置

## 📝 开发说明

### 添加新游戏

1. 在 `pages/` 创建新游戏页面目录
2. 在 `app.json` 中注册页面路径
3. 在主页 `pages/index/index.js` 添加游戏入口
4. 实现游戏逻辑和界面

### 调试技巧

- Canvas调试：在控制台查看绘制日志
- 性能监控：使用开发者工具的性能面板
- 真机调试：使用微信开发者工具的真机调试功能

## 🐛 常见问题

### Q: 音效无法播放？
A: 确保音效文件已添加到 `/assets/sounds/` 目录，文件格式为mp3

### Q: Canvas显示异常？
A: 检查设备像素比(DPR)设置，确保正确缩放

### Q: 游戏卡顿？
A: 减少粒子效果数量，优化Canvas重绘频率

## 📄 许可证

本项目仅供学习和参考使用。

## 👨‍💻 作者

小梦想游戏开发团队

## 🤝 贡献

欢迎提交Issue和Pull Request！

---

*使用 Claude Code 协助开发*
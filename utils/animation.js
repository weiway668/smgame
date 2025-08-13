// utils/animation.js
// 动画辅助函数

// 缓动函数集合
const Easing = {
  // 线性
  linear: (t) => t,
  
  // 二次缓动
  quadIn: (t) => t * t,
  quadOut: (t) => t * (2 - t),
  quadInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  // 三次缓动
  cubicIn: (t) => t * t * t,
  cubicOut: (t) => (--t) * t * t + 1,
  cubicInOut: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  // 四次缓动
  quartIn: (t) => t * t * t * t,
  quartOut: (t) => 1 - (--t) * t * t * t,
  quartInOut: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  
  // 五次缓动
  quintIn: (t) => t * t * t * t * t,
  quintOut: (t) => 1 + (--t) * t * t * t * t,
  quintInOut: (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,
  
  // 正弦缓动
  sineIn: (t) => 1 - Math.cos(t * Math.PI / 2),
  sineOut: (t) => Math.sin(t * Math.PI / 2),
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  
  // 指数缓动
  expoIn: (t) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  expoOut: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  expoInOut: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  
  // 圆形缓动
  circIn: (t) => 1 - Math.sqrt(1 - t * t),
  circOut: (t) => Math.sqrt(1 - (--t) * t),
  circInOut: (t) => t < 0.5 
    ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 
    : (Math.sqrt(1 - 4 * (t - 1) * (t - 1)) + 1) / 2,
  
  // 弹性缓动
  elasticIn: (t) => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    const s = p / 4;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1 - s) * (2 * Math.PI) / p);
  },
  elasticOut: (t) => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    const s = p / 4;
    return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
  },
  elasticInOut: (t) => {
    if (t === 0 || t === 1) return t;
    const p = 0.3 * 1.5;
    const s = p / 4;
    if (t < 0.5) {
      return -0.5 * Math.pow(2, 20 * t - 10) * Math.sin((t * 2 - 1 - s) * (2 * Math.PI) / p);
    }
    return Math.pow(2, -20 * t + 10) * Math.sin((t * 2 - 1 - s) * (2 * Math.PI) / p) * 0.5 + 1;
  },
  
  // 回弹缓动
  backIn: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  backOut: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  backInOut: (t) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    if (t < 0.5) {
      return (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2;
    }
    return (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  
  // 弹跳缓动
  bounceIn: (t) => 1 - Easing.bounceOut(1 - t),
  bounceOut: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  bounceInOut: (t) => t < 0.5 
    ? (1 - Easing.bounceOut(1 - 2 * t)) / 2 
    : (1 + Easing.bounceOut(2 * t - 1)) / 2
};

// 动画类
class Animation {
  constructor(options = {}) {
    this.duration = options.duration || 1000;
    this.easing = options.easing || 'linear';
    this.onUpdate = options.onUpdate || (() => {});
    this.onComplete = options.onComplete || (() => {});
    
    this.startTime = 0;
    this.isRunning = false;
    this.animationId = null;
  }
  
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startTime = Date.now();
    
    const animate = () => {
      if (!this.isRunning) return;
      
      const now = Date.now();
      const elapsed = now - this.startTime;
      const progress = Math.min(elapsed / this.duration, 1);
      
      // 应用缓动函数
      const easingFunc = typeof this.easing === 'function' 
        ? this.easing 
        : Easing[this.easing] || Easing.linear;
      const easedProgress = easingFunc(progress);
      
      // 调用更新回调
      this.onUpdate(easedProgress, progress);
      
      if (progress >= 1) {
        this.isRunning = false;
        this.onComplete();
      } else {
        this.animationId = requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

// 补间动画
function tween(target, props, duration, easing = 'quadOut') {
  return new Promise((resolve) => {
    const startProps = {};
    const endProps = props;
    
    // 记录起始值
    for (let key in endProps) {
      startProps[key] = target[key];
    }
    
    const animation = new Animation({
      duration,
      easing,
      onUpdate: (progress) => {
        // 更新属性值
        for (let key in endProps) {
          const start = startProps[key];
          const end = endProps[key];
          target[key] = start + (end - start) * progress;
        }
      },
      onComplete: () => {
        resolve();
      }
    });
    
    animation.start();
    
    return animation;
  });
}

// 序列动画
async function sequence(animations) {
  for (let anim of animations) {
    await anim();
  }
}

// 并行动画
function parallel(animations) {
  return Promise.all(animations.map(anim => anim()));
}

// 延迟
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 弹簧动画
class SpringAnimation {
  constructor(options = {}) {
    this.stiffness = options.stiffness || 100;
    this.damping = options.damping || 10;
    this.mass = options.mass || 1;
    this.onUpdate = options.onUpdate || (() => {});
    this.onComplete = options.onComplete || (() => {});
    
    this.position = 0;
    this.velocity = 0;
    this.target = 0;
    this.isRunning = false;
    this.animationId = null;
  }
  
  setTarget(target) {
    this.target = target;
    if (!this.isRunning) {
      this.start();
    }
  }
  
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    let lastTime = Date.now();
    
    const animate = () => {
      if (!this.isRunning) return;
      
      const now = Date.now();
      const deltaTime = (now - lastTime) / 1000; // 转换为秒
      lastTime = now;
      
      // 计算弹簧力
      const springForce = -this.stiffness * (this.position - this.target);
      const dampingForce = -this.damping * this.velocity;
      const acceleration = (springForce + dampingForce) / this.mass;
      
      // 更新速度和位置
      this.velocity += acceleration * deltaTime;
      this.position += this.velocity * deltaTime;
      
      // 调用更新回调
      this.onUpdate(this.position);
      
      // 检查是否达到稳定状态
      if (Math.abs(this.velocity) < 0.01 && 
          Math.abs(this.position - this.target) < 0.01) {
        this.position = this.target;
        this.velocity = 0;
        this.isRunning = false;
        this.onComplete();
      } else {
        this.animationId = requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

// 粒子动画
class ParticleAnimation {
  constructor(options = {}) {
    this.particles = [];
    this.maxParticles = options.maxParticles || 50;
    this.emissionRate = options.emissionRate || 5;
    this.particleLife = options.particleLife || 2000;
    this.onUpdate = options.onUpdate || (() => {});
    
    this.isRunning = false;
    this.animationId = null;
  }
  
  emit(x, y, options = {}) {
    if (this.particles.length >= this.maxParticles) return;
    
    const particle = {
      x,
      y,
      vx: options.vx || (Math.random() - 0.5) * 100,
      vy: options.vy || (Math.random() - 0.5) * 100,
      life: 1.0,
      decay: 1 / this.particleLife,
      color: options.color || '#FFD700',
      size: options.size || 5,
      gravity: options.gravity || 100
    };
    
    this.particles.push(particle);
  }
  
  update(deltaTime) {
    // 更新粒子
    this.particles = this.particles.filter(particle => {
      // 更新位置
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      
      // 应用重力
      particle.vy += particle.gravity * deltaTime;
      
      // 应用阻力
      particle.vx *= 0.98;
      particle.vy *= 0.98;
      
      // 减少生命值
      particle.life -= particle.decay * deltaTime * 1000;
      
      return particle.life > 0;
    });
    
    // 调用更新回调
    this.onUpdate(this.particles);
  }
  
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    let lastTime = Date.now();
    
    const animate = () => {
      if (!this.isRunning) return;
      
      const now = Date.now();
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;
      
      this.update(deltaTime);
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  clear() {
    this.particles = [];
  }
}

// 微信小程序的 requestAnimationFrame polyfill
if (typeof requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 1000 / 60);
  };
  
  global.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
}

module.exports = {
  Easing,
  Animation,
  SpringAnimation,
  ParticleAnimation,
  tween,
  sequence,
  parallel,
  delay
};
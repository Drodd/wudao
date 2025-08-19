// 游戏配置
const CONFIG = {
    get CANVAS_WIDTH() { return window.innerWidth; },
    get CANVAS_HEIGHT() { return window.innerHeight; },
    INITIAL_ENERGY: 100,
    INITIAL_CHARACTER_COUNT: 32,
    ENERGY_TRANSFER_RATE: 0.02, // 每毫秒传输的能量
    TRANSFER_INTERVAL: 10, // 传输间隔（毫秒）
    INTERACTION_DISTANCE: 50, // 激活能量吸收的距离阈值
    BASE_RADIUS: 8, // 基础半径
    RADIUS_SCALE: 0.8, // 半径缩放系数
    BASE_SPEED: 500, // 基础速度
    SPEED_SCALE: 20, // 速度缩放系数
    MIN_SPAWN_DISTANCE: 80, // 初始生成时的最小距离
    FLOAT_SPEED: 15, // 原地飘浮速度（像水面尘埃）
    
    // Boss配置
    BOSS_SPAWN_INTERVAL: 10000, // Boss刷新间隔（毫秒）
    BOSS_MOVE_TIME: 10000, // Boss移动到中心的时间（毫秒）
    BOSS_RADIUS: 40, // Boss半径
    BOSS_ABSORPTION_DISTANCE: 50, // Boss吸收距离
    BOSS_REQUIRED_ENERGY_MIN: 200, // Boss所需最小能量
    BOSS_REQUIRED_ENERGY_MAX: 400, // Boss所需最大能量
    BOSS_EXPLOSION_SPEED: 150, // Boss爆炸扩张速度
    BOSS_FADE_SPEED: 100, // Boss淡出扩散速度
    BOSS_EXPLOSION_DURATION: 0.5 // Boss爆炸扩散时间（秒）
};

// 标题界面的中心吸收点类
class TitleCore {
    constructor() {
        this.x = CONFIG.CANVAS_WIDTH / 2;
        this.y = CONFIG.CANVAS_HEIGHT / 2 - 20; // 位于"悟道"两字中间，与标题同一水平线
        this.energy = 1; // 初始少量能量，确保小黑点可见
        this.maxEnergy = 35; // 需要吸收的能量来开始游戏（2秒内完成）
        this.radius = 6; // 初始半径
        this.maxRadius = 35; // 外圈半径，足够大以观察变化
        this.absorptionDistance = CONFIG.INTERACTION_DISTANCE * 3; // 标题界面扩大3倍吸收距离
        this.isAbsorbing = false;
        this.absorbingFrom = null;
        this.lastTransferTime = 0;
        
        // 初始化半径
        this.updateRadius();
    }
    
    canAbsorbFrom(character) {
        if (!character || character.isDead || character.isDying) return false;
        const distance = Math.sqrt(
            Math.pow(this.x - character.x, 2) + 
            Math.pow(this.y - character.y, 2)
        );
        return distance <= this.absorptionDistance;
    }
    
    startAbsorbing(character) {
        this.isAbsorbing = true;
        this.absorbingFrom = character;
        character.isAbsorbing = true;
        character.absorbingFrom = this;
    }
    
    stopAbsorbing() {
        if (this.absorbingFrom) {
            this.absorbingFrom.isAbsorbing = false;
            this.absorbingFrom.absorbingFrom = null;
        }
        this.isAbsorbing = false;
        this.absorbingFrom = null;
    }
    
    update(currentTime, characters) {
        // 如果正在吸收，继续传输能量
        if (this.isAbsorbing && this.absorbingFrom) {
            // 检查距离
            if (!this.canAbsorbFrom(this.absorbingFrom)) {
                this.stopAbsorbing();
                return false;
            }
            
            // 能量传输
            if (currentTime - this.lastTransferTime >= CONFIG.TRANSFER_INTERVAL) {
                const transferAmount = CONFIG.ENERGY_TRANSFER_RATE * CONFIG.TRANSFER_INTERVAL * 2.5; // 调整传输速度，填充更快
                const actualTransfer = Math.min(transferAmount, this.absorbingFrom.energy - 10); // 保留10点能量防止死亡
                
                if (actualTransfer > 0) {
                    this.energy += actualTransfer;
                    this.absorbingFrom.energy -= actualTransfer;
                    this.absorbingFrom.updateDerivedProperties();
                    this.updateRadius();
                    

                }
                
                this.lastTransferTime = currentTime;
            }
        } else {
            // 寻找可以吸收的角色
            for (const character of characters) {
                if (this.canAbsorbFrom(character) && !character.isAbsorbing) {
                    this.startAbsorbing(character);
                    break;
                }
            }
        }
        
        // 检查是否达到开始游戏的条件
        return this.energy >= this.maxEnergy;
    }
    
    updateRadius() {
        const progress = Math.min(this.energy / this.maxEnergy, 1);
        const minRadius = 6;
        this.radius = minRadius + progress * (this.maxRadius - minRadius);
    }
    
    render(ctx, breathingScale = 1, isExiting = false, exitProgress = 0) {
        ctx.save();
        
        // 绘制吸收线条（如果正在吸收）
        if (this.isAbsorbing && this.absorbingFrom) {
            this.renderAbsorptionLine(ctx);
        }
        
        // 计算呼吸动画效果
        const pulseScale = 1 + Math.sin(Date.now() * 0.005) * 0.05;
        const glowIntensity = 0.4 + Math.sin(Date.now() * 0.003) * 0.2;
        
        // 出场动画效果
        let effectiveRadius = this.radius;
        let effectiveMaxRadius = this.maxRadius;
        let coreOpacity = 1;
        
        if (isExiting) {
            // 填充完成后的爆发效果
            const burstScale = 1 + exitProgress * 2; // 爆发放大
            effectiveRadius = this.maxRadius * burstScale;
            effectiveMaxRadius = this.maxRadius * burstScale;
            coreOpacity = 1 - exitProgress * 0.7; // 逐渐淡出但保留一些
            
            // 添加爆发光环
            const burstGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, effectiveRadius * 1.5);
            burstGradient.addColorStop(0, `rgba(255, 255, 255, ${0.3 * (1 - exitProgress)})`);
            burstGradient.addColorStop(0.7, `rgba(200, 200, 200, ${0.1 * (1 - exitProgress)})`);
            burstGradient.addColorStop(1, 'rgba(100, 100, 100, 0)');
            
            ctx.fillStyle = burstGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, effectiveRadius * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 绘制外圈（目标圈）- 添加呼吸效果
        const outerOpacity = isExiting ? 0.4 * coreOpacity : 0.4 * glowIntensity;
        ctx.strokeStyle = `rgba(100, 100, 100, ${outerOpacity})`;
        ctx.lineWidth = 2 * pulseScale;
        ctx.beginPath();
        ctx.arc(this.x, this.y, effectiveMaxRadius * pulseScale, 0, Math.PI * 2);
        ctx.stroke();
        
        // 绘制中心核心（当前进度）
        if (effectiveRadius > 0) {
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, effectiveRadius);
            gradient.addColorStop(0, `rgba(20, 20, 20, ${0.9 * coreOpacity})`);
            gradient.addColorStop(0.7, `rgba(40, 40, 40, ${0.8 * coreOpacity})`);
            gradient.addColorStop(1, `rgba(60, 60, 60, ${0.6 * coreOpacity})`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, effectiveRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // 绘制内圈边框
            ctx.strokeStyle = `rgba(80, 80, 80, ${0.8 * coreOpacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, effectiveRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    renderAbsorptionLine(ctx) {
        if (!this.absorbingFrom) return;
        
        ctx.save();
        ctx.strokeStyle = 'rgba(120, 120, 120, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        ctx.moveTo(this.absorbingFrom.x, this.absorbingFrom.y);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
        
        // 绘制能量粒子
        const time = Date.now();
        for (let i = 0; i < 3; i++) {
            const progress = ((time * 0.001 + i * 0.3) % 1);
            const particleX = this.absorbingFrom.x + (this.x - this.absorbingFrom.x) * progress;
            const particleY = this.absorbingFrom.y + (this.y - this.absorbingFrom.y) * progress;
            
            ctx.fillStyle = `rgba(150, 150, 150, ${1 - progress})`;
            ctx.beginPath();
            ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Boss类
class Boss {
    constructor() {
        this.isActive = false;
        this.x = 0;
        this.y = 0;
        this.targetX = CONFIG.CANVAS_WIDTH / 2;
        this.targetY = CONFIG.CANVAS_HEIGHT / 2;
        this.requiredEnergy = 0;
        this.absorbedEnergy = 0;
        this.moveStartTime = 0;
        this.canAbsorb = true;
        this.state = 'moving'; // 'moving', 'defeated', 'exploding'
        this.explosionRadius = 0;
        this.opacity = 1;
        this.lastAbsorptionTime = 0;
        
        // 新增：移动控制
        this.isAbsorbing = false;
        this.originalMoveStartTime = 0;
        this.pauseTime = 0;
        
        // 新增：死亡后转换的角色
        this.convertedCharacter = null;
        this.conversionAnimation = 0;
        this.conversionDuration = 2.5; // 转换动画持续时间（秒）
        
        // 转化动画系统
        this.transformParticles = []; // 转化粒子系统
        this.transformRipples = []; // 转化波纹系统
        this.energyOrbs = []; // 能量球效果
        this.transformPhase = 0; // 转化阶段 0: 收缩, 1: 重组, 2: 新生
        this.transformScale = 1; // 转化缩放
        this.transformShake = 0; // 转化震动
        this.transformColorTransition = 0; // 颜色过渡
        
        // 新增：流动液体动画状态
        this.flowAnimation = 0;
        this.flowSpeed = 2.0; // 流动速度
        this.absorbingCharacters = []; // 正在被吸收的角色列表
        
        // 新增：漩涡入场和退场动画
        this.vortexAppearTime = 0;
        this.vortexAppearDuration = 2000; // 入场动画持续2秒
        this.vortexScale = 0; // 漩涡缩放系数，从0开始
        this.vortexDisappearTime = 0; // 退场动画开始时间
        this.vortexDisappearDuration = 1500; // 退场动画持续1.5秒
        this.isVortexDisappearing = false; // 是否正在退场
        
        // 新增：波纹追踪系统
        this.lastX = 0;
        this.lastY = 0;
        this.lastRippleTime = 0;
        this.rippleThreshold = 8; // Boss移动阈值，比角色稍大
        
        // 新增：爆炸动画时间记录
        this.explosionStartTime = 0; // 爆炸开始时间
        
        this.spawn();
    }
    
    spawn() {
        this.isActive = true;
        this.absorbedEnergy = 0;
        this.canAbsorb = true;
        this.state = 'moving';
        this.explosionRadius = 0;
        this.opacity = 1;
        this.startX = undefined;
        this.startY = undefined;
        this.rewardGiven = false;
        this.damageDealt = false;
        this.isAbsorbing = false;
        this.originalMoveStartTime = 0;
        this.pauseTime = 0;
        this.convertedCharacter = null;
        this.conversionAnimation = 0;
        this.absorbingCharacters = [];
        
        // 重置转化动画系统
        this.transformParticles = [];
        this.transformRipples = [];
        this.energyOrbs = [];
        this.transformPhase = 0;
        this.transformScale = 1;
        this.transformShake = 0;
        this.transformColorTransition = 0;
        
        // 初始化漩涡入场和退场动画
        this.vortexAppearTime = Date.now();
        this.vortexScale = 0;
        this.vortexDisappearTime = 0;
        this.isVortexDisappearing = false;
        
        // 初始化波纹追踪
        this.lastRippleTime = 0;
        
        // 重置爆炸时间
        this.explosionStartTime = 0;
        
        // 随机所需能量
        this.requiredEnergy = Math.random() * (CONFIG.BOSS_REQUIRED_ENERGY_MAX - CONFIG.BOSS_REQUIRED_ENERGY_MIN) + CONFIG.BOSS_REQUIRED_ENERGY_MIN;
        
        // 随机从屏幕边缘进入
        const side = Math.floor(Math.random() * 4);
        const margin = CONFIG.BOSS_RADIUS + 20;
        
        switch(side) {
            case 0: // 上
                this.x = Math.random() * CONFIG.CANVAS_WIDTH;
                this.y = -margin;
                break;
            case 1: // 右
                this.x = CONFIG.CANVAS_WIDTH + margin;
                this.y = Math.random() * CONFIG.CANVAS_HEIGHT;
                break;
            case 2: // 下
                this.x = Math.random() * CONFIG.CANVAS_WIDTH;
                this.y = CONFIG.CANVAS_HEIGHT + margin;
                break;
            case 3: // 左
                this.x = -margin;
                this.y = Math.random() * CONFIG.CANVAS_HEIGHT;
                break;
        }
        
        // 初始化波纹追踪位置
        this.lastX = this.x;
        this.lastY = this.y;
        
        // moveStartTime将在Boss.update中首次调用时设置
    }
    
    update(characters, currentTime, deltaTime) {
        if (!this.isActive) return;
        
        if (this.state === 'moving') {
            // 第一次更新时设置移动开始时间
            if (this.moveStartTime === 0) {
                this.moveStartTime = currentTime;
                this.originalMoveStartTime = currentTime;
            }
            
            // 检查是否正在吸收能量
            let currentlyAbsorbing = false;
            this.absorbingCharacters = [];
            if (this.canAbsorb && currentTime - this.lastAbsorptionTime >= CONFIG.TRANSFER_INTERVAL) {
                characters.forEach(character => {
                    if (!character.isDead && !character.isDying && this.getDistanceToCharacter(character) <= CONFIG.BOSS_ABSORPTION_DISTANCE) {
                        const absorptionAmount = CONFIG.ENERGY_TRANSFER_RATE * CONFIG.TRANSFER_INTERVAL;
                        const actualAbsorption = Math.min(absorptionAmount, character.energy);
                        
                        character.energy -= actualAbsorption;
                        this.absorbedEnergy += actualAbsorption;
                        character.updateDerivedProperties();
                        
                        if (character.energy <= 0) {
                            character.startDeathAnimation();
                        }
                        
                        currentlyAbsorbing = true;
                        this.absorbingCharacters.push(character);
                    }
                });
                this.lastAbsorptionTime = currentTime;
            }
            
            // 处理吸收状态变化
            if (currentlyAbsorbing && !this.isAbsorbing) {
                // 开始吸收，暂停移动
                this.isAbsorbing = true;
                this.pauseTime = currentTime;
            } else if (!currentlyAbsorbing && this.isAbsorbing) {
                // 停止吸收，恢复移动
                this.isAbsorbing = false;
                this.moveStartTime += currentTime - this.pauseTime;
            }
            
            // 计算移动进度（考虑暂停时间）
            const effectiveMoveStartTime = this.isAbsorbing ? this.pauseTime : this.moveStartTime;
            const elapsed = currentTime - effectiveMoveStartTime;
            const progress = Math.min(elapsed / CONFIG.BOSS_MOVE_TIME, 1);
            
            // 计算初始位置
            if (!this.startX) {
                this.startX = this.x;
                this.startY = this.y;
            }
            
            // 线性插值到目标位置（只在非吸收状态时移动）
            if (!this.isAbsorbing) {
                const oldX = this.x;
                const oldY = this.y;
                
                this.x = this.startX + (this.targetX - this.startX) * progress;
                this.y = this.startY + (this.targetY - this.startY) * progress;
                
                // 生成Boss移动波纹
                this.generateMovementRipple(oldX, oldY);
            }
            
            // 检查是否被击败
            if (this.absorbedEnergy >= this.requiredEnergy) {
                this.state = 'defeated';
                this.canAbsorb = false;
                
                // 开始漩涡退场动画
                this.startVortexDisappearAnimation();
                
                // 初始化转化动画
                if (this.conversionAnimation === 0) {
                    this.createTransformInitialEffects();
                }
            }
            // 检查是否到达中心（基于实际距离而不是时间进度）
            else {
                const distanceToCenter = Math.sqrt(
                    (this.x - this.targetX) * (this.x - this.targetX) + 
                    (this.y - this.targetY) * (this.y - this.targetY)
                );
                if (distanceToCenter <= 0) {
                this.state = 'exploding';
                this.canAbsorb = false;
                this.explosionRadius = CONFIG.BOSS_RADIUS;
                this.explosionStartTime = currentTime; // 记录爆炸开始时间
                
                // 开始漩涡退场动画
                this.startVortexDisappearAnimation();
                }
            }
        }
        else if (this.state === 'defeated') {
            // 高级转换动画系统
            this.conversionAnimation += deltaTime;
            const progress = this.conversionAnimation / this.conversionDuration;
            
            // 分阶段转化
            if (progress < 0.3) {
                // 阶段0: 收缩准备 (0-30%)
                this.transformPhase = 0;
                this.updateTransformPhase0(progress / 0.3, deltaTime);
            } else if (progress < 0.7) {
                // 阶段1: 能量重组 (30-70%)
                this.transformPhase = 1;
                this.updateTransformPhase1((progress - 0.3) / 0.4, deltaTime);
            } else if (progress < 1.0) {
                // 阶段2: 角色新生 (70-100%)
                this.transformPhase = 2;
                this.updateTransformPhase2((progress - 0.7) / 0.3, deltaTime);
            } else {
                // 动画完成，创建新角色
                if (!this.convertedCharacter) {
                    const newCharacter = new Character(this.x, this.y, this.absorbedEnergy);
                    characters.push(newCharacter);
                    this.convertedCharacter = newCharacter;
                    
                    // 生成转化完成的特效
                    this.createTransformationRipple();
            }
                this.isActive = false;
            }
            
            // 更新转化粒子和特效
            this.updateTransformEffects(deltaTime);
        }
        else if (this.state === 'exploding') {
            // 爆炸扩张（0.5秒扩散到全屏）
            const maxRadius = Math.max(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            const explosionSpeed = maxRadius / CONFIG.BOSS_EXPLOSION_DURATION;
            this.explosionRadius += explosionSpeed * deltaTime;
            
            // 对角色造成伤害（只执行一次）
            if (!this.damageDealt) {
                const aliveCount = characters.filter(c => !c.isDead).length;
                if (aliveCount > 0) {
                    const damage = this.requiredEnergy * 999;
                    characters.forEach(character => {
                        if (!character.isDead) {
                            character.energy = Math.max(0, character.energy - damage);
                            character.updateDerivedProperties();
                            
                            if (character.energy <= 0) {
                                character.startDeathAnimation();
                            }
                            
                            // 受击反馈
                            character.hitFeedback = true;
                            setTimeout(() => { character.hitFeedback = false; }, 200);
                        }
                    });
                }
                this.damageDealt = true;
            }
            
            if (this.explosionRadius > maxRadius) {
                this.isActive = false;
            }
        }
    }
    
    generateMovementRipple(oldX, oldY) {
        // 检查Boss是否实际移动了
        const actualMoveDistance = Math.sqrt((this.x - oldX) ** 2 + (this.y - oldY) ** 2);
        const totalMoveDistance = Math.sqrt((this.x - this.lastX) ** 2 + (this.y - this.lastY) ** 2);
        const currentTime = Date.now();
        
        // Boss移动条件：实际移动 + 累积距离达到阈值 + 时间间隔
        if (actualMoveDistance > 0.1 && 
            totalMoveDistance > this.rippleThreshold && 
            currentTime - this.lastRippleTime > 150) { // Boss波纹频率稍低
            
            // 计算Boss移动速度（用于波纹强度）
            const timeElapsed = Math.max(currentTime - this.lastRippleTime, 50);
            const bossSpeed = (totalMoveDistance / timeElapsed) * 1000; // 像素/秒
            
            // 获取游戏实例的波纹回调
            if (window.gameInstance && window.gameInstance.rippleCallback) {
                // Boss波纹比角色更大更壮观
                window.gameInstance.createBossRipple(this.x, this.y, bossSpeed, CONFIG.BOSS_RADIUS);
            }
            
            // 更新追踪位置和时间
            this.lastX = this.x;
            this.lastY = this.y;
            this.lastRippleTime = currentTime;
        }
        
        // 防止累积距离过大导致的问题
        if (totalMoveDistance > this.rippleThreshold * 3) {
            this.lastX = this.x;
            this.lastY = this.y;
        }
    }
    
    // 转化阶段0: 收缩准备
    updateTransformPhase0(phaseProgress, deltaTime) {
        // Boss开始剧烈震动和收缩
        this.transformScale = 1 - phaseProgress * 0.3; // 收缩30%
        this.transformShake = Math.sin(phaseProgress * Math.PI * 20) * (1 - phaseProgress) * 3;
        
        // 生成收缩波纹
        if (Math.random() < 0.3) {
            this.createTransformRipple('contraction');
        }
    }
    
    // 转化阶段1: 能量重组
    updateTransformPhase1(phaseProgress, deltaTime) {
        // 能量爆散然后重新聚集
        this.transformScale = 0.7 + Math.sin(phaseProgress * Math.PI * 3) * 0.4;
        this.transformShake = Math.sin(phaseProgress * Math.PI * 15) * 2;
        
        // 生成能量球
        if (Math.random() < 0.4) {
            this.createEnergyOrb();
        }
        
        // 生成重组波纹
        if (Math.random() < 0.25) {
            this.createTransformRipple('reorganization');
        }
    }
    
    // 转化阶段2: 角色新生
    updateTransformPhase2(phaseProgress, deltaTime) {
        const targetRadius = Math.sqrt(this.absorbedEnergy) * CONFIG.RADIUS_SCALE + CONFIG.BASE_RADIUS;
        const currentBossRadius = CONFIG.BOSS_RADIUS * this.transformScale;
        
        // 平滑过渡到角色大小
        this.transformScale = (currentBossRadius * (1 - phaseProgress) + targetRadius * phaseProgress) / CONFIG.BOSS_RADIUS;
        this.transformShake = Math.sin(phaseProgress * Math.PI * 8) * (1 - phaseProgress) * 1.5;
        
        // 颜色逐渐变化到角色颜色
        this.transformColorTransition = phaseProgress;
        
        // 生成新生波纹
        if (Math.random() < 0.2) {
            this.createTransformRipple('birth');
        }
    }
    
    // 更新转化特效
    updateTransformEffects(deltaTime) {
        // 更新转化粒子
        this.transformParticles.forEach(particle => {
            particle.life += deltaTime;
            const progress = particle.life / particle.maxLife;
            
            // 更新位置
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            
            // 重力和阻力
            particle.vy += particle.gravity * deltaTime;
            particle.vx *= 0.995;
            particle.vy *= 0.995;
            
            // 透明度变化
            particle.opacity = (1 - progress) * particle.baseOpacity;
            
            // 尺寸变化
            particle.size = particle.baseSize * (0.5 + 0.5 * Math.sin(progress * Math.PI));
        });
        
        // 移除过期粒子
        this.transformParticles = this.transformParticles.filter(p => p.life < p.maxLife);
        
        // 更新能量球
        this.energyOrbs.forEach(orb => {
            orb.life += deltaTime;
            const progress = orb.life / orb.maxLife;
            
            // 螺旋运动
            orb.angle += orb.angularSpeed * deltaTime;
            orb.radius -= orb.contractSpeed * deltaTime;
            orb.x = this.x + Math.cos(orb.angle) * orb.radius;
            orb.y = this.y + Math.sin(orb.angle) * orb.radius;
            
            // 透明度和大小变化
            orb.opacity = (1 - progress) * 0.8;
            orb.size = orb.baseSize * (1 + Math.sin(progress * Math.PI) * 0.5);
        });
        
        // 移除过期能量球
        this.energyOrbs = this.energyOrbs.filter(orb => orb.life < orb.maxLife && orb.radius > 5);
    }
    
    // 创建转化初始特效
    createTransformInitialEffects() {
        // 生成转化粒子
        for (let i = 0; i < 25; i++) {
            const angle = (Math.PI * 2 * i) / 25;
            const speed = 40 + Math.random() * 30;
            
            this.transformParticles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 4,
                baseSize: 3 + Math.random() * 4,
                opacity: 0.9,
                baseOpacity: 0.9,
                life: 0,
                maxLife: 1.5 + Math.random() * 1.0,
                gravity: -20 + Math.random() * 40,
                type: 'transform'
            });
        }
        
        // 生成转化开始波纹
        this.createTransformRipple('start');
    }
    
    // 创建转化波纹
    createTransformRipple(type) {
        if (!window.gameInstance) return;
        
        const rippleConfig = {
            start: { intensity: 1.5, maxRadius: 150, lifetime: 2000 },
            contraction: { intensity: 1.0, maxRadius: 100, lifetime: 1500 },
            reorganization: { intensity: 1.8, maxRadius: 200, lifetime: 2500 },
            birth: { intensity: 1.2, maxRadius: 120, lifetime: 1800 }
        };
        
        const config = rippleConfig[type] || rippleConfig.start;
        config.type = type; // 确保传递转化类型
        window.gameInstance.createTransformRipple(this.x, this.y, config);
    }
    
    // 创建能量球
    createEnergyOrb() {
        const angle = Math.random() * Math.PI * 2;
        const radius = 40 + Math.random() * 60;
        
        this.energyOrbs.push({
            x: this.x + Math.cos(angle) * radius,
            y: this.y + Math.sin(angle) * radius,
            angle: angle,
            radius: radius,
            angularSpeed: 2 + Math.random() * 3,
            contractSpeed: 15 + Math.random() * 10,
            size: 4 + Math.random() * 6,
            baseSize: 4 + Math.random() * 6,
            opacity: 0.8,
            life: 0,
            maxLife: 1.5 + Math.random() * 1.0
        });
    }
    
    // 创建转化完成波纹
    createTransformationRipple() {
        if (window.gameInstance && window.gameInstance.createDeathRipple) {
            // 使用加强版的死亡波纹来表示转化完成
            window.gameInstance.createDeathRipple(this.x, this.y, CONFIG.BOSS_RADIUS);
        }
    }
    
    // 渲染转化动画
    renderTransformAnimation(ctx) {
        ctx.save();
        
        // 应用震动效果
        if (this.transformShake) {
            const shakeX = (Math.random() - 0.5) * this.transformShake;
            const shakeY = (Math.random() - 0.5) * this.transformShake;
            ctx.translate(shakeX, shakeY);
        }
        
        // 计算当前半径和透明度
        const currentRadius = CONFIG.BOSS_RADIUS * (this.transformScale || 1);
        const progress = this.conversionAnimation / this.conversionDuration;
        
        // 渲染转化粒子
        this.renderTransformParticles(ctx);
        
        // 渲染能量球
        this.renderEnergyOrbs(ctx);
        
        // 根据转化阶段渲染不同效果
        if (this.transformPhase === 0) {
            // 阶段0: 收缩震动
            this.renderPhase0Effects(ctx, currentRadius, progress);
        } else if (this.transformPhase === 1) {
            // 阶段1: 能量重组
            this.renderPhase1Effects(ctx, currentRadius, progress);
        } else if (this.transformPhase === 2) {
            // 阶段2: 角色新生
            this.renderPhase2Effects(ctx, currentRadius, progress);
        }
        
        ctx.restore();
    }
    
    // 渲染转化粒子
    renderTransformParticles(ctx) {
        this.transformParticles.forEach(particle => {
            if (particle.opacity <= 0) return;
            
            ctx.save();
            ctx.globalAlpha = particle.opacity;
            
            // 粒子渐变
            const gradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size
            );
            gradient.addColorStop(0, 'rgba(120, 120, 120, 0.9)');
            gradient.addColorStop(0.5, 'rgba(80, 80, 80, 0.7)');
            gradient.addColorStop(1, 'rgba(40, 40, 40, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
    }
    
    // 渲染能量球
    renderEnergyOrbs(ctx) {
        this.energyOrbs.forEach(orb => {
            if (orb.opacity <= 0) return;
            
            ctx.save();
            ctx.globalAlpha = orb.opacity;
            
            // 能量球光晕
            const glowGradient = ctx.createRadialGradient(
                orb.x, orb.y, 0,
                orb.x, orb.y, orb.size * 2
            );
            glowGradient.addColorStop(0, 'rgba(150, 150, 150, 0.8)');
            glowGradient.addColorStop(0.5, 'rgba(100, 100, 100, 0.5)');
            glowGradient.addColorStop(1, 'rgba(50, 50, 50, 0)');
            
            ctx.fillStyle = glowGradient;
                ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.size * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // 能量球核心
            const coreGradient = ctx.createRadialGradient(
                orb.x, orb.y, 0,
                orb.x, orb.y, orb.size
            );
            coreGradient.addColorStop(0, 'rgba(200, 200, 200, 1)');
            coreGradient.addColorStop(0.7, 'rgba(120, 120, 120, 0.8)');
            coreGradient.addColorStop(1, 'rgba(60, 60, 60, 0.4)');
            
            ctx.fillStyle = coreGradient;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
    }
    
    // 阶段0效果: 收缩震动
    renderPhase0Effects(ctx, currentRadius, progress) {
        // Boss本体 - 保持原始外观但收缩
        const bodyGradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, currentRadius
        );
        bodyGradient.addColorStop(0, 'rgba(140, 140, 140, 0.3)');
        bodyGradient.addColorStop(0.4, 'rgba(100, 100, 100, 0.5)');
        bodyGradient.addColorStop(0.7, 'rgba(80, 80, 80, 0.6)');
        bodyGradient.addColorStop(1, 'rgba(60, 60, 60, 0.4)');
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 收缩边缘效果
        ctx.strokeStyle = `rgba(80, 80, 80, ${0.7 + progress * 0.3})`;
        ctx.lineWidth = 2 + progress * 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // 阶段1效果: 能量重组
    renderPhase1Effects(ctx, currentRadius, progress) {
        // 不稳定的能量核心
        const instabilityRadius = currentRadius * (0.8 + Math.sin(Date.now() * 0.01) * 0.3);
        
        const chaosGradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, instabilityRadius
        );
        chaosGradient.addColorStop(0, 'rgba(160, 160, 160, 0.6)');
        chaosGradient.addColorStop(0.3, 'rgba(120, 120, 120, 0.8)');
        chaosGradient.addColorStop(0.6, 'rgba(80, 80, 80, 0.6)');
        chaosGradient.addColorStop(1, 'rgba(40, 40, 40, 0.2)');
        
        ctx.fillStyle = chaosGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, instabilityRadius, 0, Math.PI * 2);
                ctx.fill();
                
        // 能量脉冲环
        for (let i = 0; i < 3; i++) {
            const pulseRadius = currentRadius * (1.2 + i * 0.3 + Math.sin(Date.now() * 0.008 + i) * 0.2);
            const pulseOpacity = (1 - progress) * (0.3 - i * 0.08);
            
            ctx.strokeStyle = `rgba(100, 100, 100, ${pulseOpacity})`;
            ctx.lineWidth = 3 - i;
            ctx.beginPath();
            ctx.arc(this.x, this.y, pulseRadius, 0, Math.PI * 2);
                ctx.stroke();
        }
    }
    
    // 阶段2效果: 角色新生
    renderPhase2Effects(ctx, currentRadius, progress) {
        const targetRadius = Math.sqrt(this.absorbedEnergy) * CONFIG.RADIUS_SCALE + CONFIG.BASE_RADIUS;
        const currentSize = currentRadius;
        
        // Boss到角色的颜色过渡
        const bossColor = { r: 100, g: 100, b: 100 };
        const characterColor = { r: 80, g: 80, b: 80 };
        
        const transitionProgress = this.transformColorTransition || 0;
        const r = Math.floor(bossColor.r * (1 - transitionProgress) + characterColor.r * transitionProgress);
        const g = Math.floor(bossColor.g * (1 - transitionProgress) + characterColor.g * transitionProgress);
        const b = Math.floor(bossColor.b * (1 - transitionProgress) + characterColor.b * transitionProgress);
        
        // 新生角色外观
        const birthGradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, currentSize
        );
        birthGradient.addColorStop(0, `rgba(${r + 20}, ${g + 20}, ${b + 20}, 0.9)`);
        birthGradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.95)`);
        birthGradient.addColorStop(1, `rgba(${r - 20}, ${g - 20}, ${b - 20}, 0.8)`);
        
        ctx.fillStyle = birthGradient;
                ctx.beginPath();
        ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
                ctx.fill();
        
        // 新生光环
        const birthGlow = ctx.createRadialGradient(
            this.x, this.y, currentSize * 0.8,
            this.x, this.y, currentSize * 1.6
        );
        birthGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
        birthGlow.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${0.15 * (1 - progress)})`);
        birthGlow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.fillStyle = birthGlow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentSize * 1.6, 0, Math.PI * 2);
        ctx.fill();
        
        // 边缘描边
        ctx.strokeStyle = `rgba(${r - 10}, ${g - 10}, ${b - 10}, 0.8)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // 开始漩涡退场动画
    startVortexDisappearAnimation() {
        if (!this.isVortexDisappearing) {
            this.isVortexDisappearing = true;
            this.vortexDisappearTime = Date.now();
            
            // 创建漩涡消失波纹效果
            this.createVortexDisappearRipple();
        }
    }
    
    // 创建漩涡消失波纹
    createVortexDisappearRipple() {
        if (window.gameInstance) {
            const config = {
                intensity: 2.0,
                maxRadius: 200,
                lifetime: 2000,
                type: 'vortex_disappear'
            };
            window.gameInstance.createTransformRipple(this.targetX, this.targetY, config);
        }
    }
    
    getDistanceToCharacter(character) {
        const dx = this.x - character.x;
        const dy = this.y - character.y;
        return Math.sqrt(dx * dx + dy * dy) - CONFIG.BOSS_RADIUS - character.radius;
    }
    
    render(ctx) {
        // 即使不活跃，如果还在爆炸状态也要渲染爆炸效果
        if (!this.isActive && this.state !== 'exploding') return;
        
        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        if (this.state === 'moving') {
            // 现代几何Boss设计
            const time = Date.now() * 0.001;
            
            // 外圈：现代同心圆设计
            const rings = 3;
            for (let ring = 0; ring < rings; ring++) {
                const ringRadius = CONFIG.BOSS_RADIUS * (0.6 + ring * 0.2);
                const ringOpacity = 0.4 - ring * 0.1;
                const ringWidth = 3 - ring * 0.8;
                
                // 几何环形渐变
                const ringGradient = ctx.createRadialGradient(
                    this.x, this.y, ringRadius * 0.8,
                    this.x, this.y, ringRadius * 1.1
                );
                ringGradient.addColorStop(0, `rgba(120, 120, 120, 0)`);
                ringGradient.addColorStop(0.5, `rgba(90, 90, 90, ${ringOpacity})`);
                ringGradient.addColorStop(1, `rgba(60, 60, 60, 0)`);
                
                ctx.strokeStyle = ringGradient;
                ctx.lineWidth = ringWidth;
                ctx.lineCap = 'round';
                
                // 绘制几何环形
            ctx.beginPath();
                ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            // 主体：现代渐变圆形
            const bodyGradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, CONFIG.BOSS_RADIUS
            );
            bodyGradient.addColorStop(0, 'rgba(140, 140, 140, 0.3)'); // 中心亮灰
            bodyGradient.addColorStop(0.4, 'rgba(100, 100, 100, 0.5)'); // 中灰
            bodyGradient.addColorStop(0.7, 'rgba(80, 80, 80, 0.6)'); // 深灰
            bodyGradient.addColorStop(1, 'rgba(60, 60, 60, 0.4)'); // 边缘灰
            
            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, CONFIG.BOSS_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            
            // 几何边缘线
            ctx.strokeStyle = 'rgba(80, 80, 80, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, CONFIG.BOSS_RADIUS, 0, Math.PI * 2);
            ctx.stroke();
            
            // 现代光晕效果
            const glowLayers = 3;
            for (let layer = 0; layer < glowLayers; layer++) {
                const glowRadius = CONFIG.BOSS_RADIUS * (1.2 + layer * 0.3);
                const glowOpacity = 0.06 - layer * 0.02;
                
                const glowGradient = ctx.createRadialGradient(
                    this.x, this.y, CONFIG.BOSS_RADIUS,
                    this.x, this.y, glowRadius
                );
                glowGradient.addColorStop(0, `rgba(100, 100, 100, ${glowOpacity})`);
                glowGradient.addColorStop(1, `rgba(100, 100, 100, 0)`);
                
                ctx.fillStyle = glowGradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 现代几何进度指示器
            const fillRadius = (this.absorbedEnergy / this.requiredEnergy) * CONFIG.BOSS_RADIUS;
            if (fillRadius > 0) {
                // 进度核心 - 现代渐变设计
                const progressGradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, fillRadius
                );
                progressGradient.addColorStop(0, 'rgba(80, 80, 80, 0.9)'); // 中心深灰
                progressGradient.addColorStop(0.5, 'rgba(60, 60, 60, 0.95)'); // 更深灰
                progressGradient.addColorStop(1, 'rgba(40, 40, 40, 0.85)'); // 边缘很深
                
                ctx.fillStyle = progressGradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, fillRadius, 0, Math.PI * 2);
            ctx.fill();
            
                // 几何进度边缘 - 加深边缘描边
                ctx.strokeStyle = 'rgba(40, 40, 40, 0.95)';
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.arc(this.x, this.y, fillRadius, 0, Math.PI * 2);
            ctx.stroke();
            
                // 现代进度光晕 - 增强可见度
                const progressGlow = ctx.createRadialGradient(
                    this.x, this.y, fillRadius * 0.7,
                    this.x, this.y, fillRadius * 1.4
                );
                progressGlow.addColorStop(0, 'rgba(70, 70, 70, 0)');
                progressGlow.addColorStop(0.5, 'rgba(50, 50, 50, 0.25)');
                progressGlow.addColorStop(1, 'rgba(30, 30, 30, 0)');
                
                ctx.fillStyle = progressGlow;
            ctx.beginPath();
                ctx.arc(this.x, this.y, fillRadius * 1.3, 0, Math.PI * 2);
            ctx.fill();
            }
            
            // 去掉数字显示
        }
        else if (this.state === 'defeated') {
            // 高级转化动画渲染
            this.renderTransformAnimation(ctx);
        }
        else if (this.state === 'exploding') {
            // 增强的爆炸效果 - 多层冲击波
            const explosionProgress = this.explosionRadius / Math.max(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            
            // 主爆炸冲击波 - 红色
            const mainWaveGradient = ctx.createRadialGradient(
                this.x, this.y, this.explosionRadius * 0.8,
                this.x, this.y, this.explosionRadius * 1.2
            );
            mainWaveGradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
            mainWaveGradient.addColorStop(0.7, `rgba(255, 60, 60, ${0.8 * (1 - explosionProgress)})`);
            mainWaveGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            
            ctx.strokeStyle = mainWaveGradient;
            ctx.lineWidth = 6 * (1 - explosionProgress * 0.5); // 厚度随时间减少
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.explosionRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            // 内层冲击波
            if (this.explosionRadius > CONFIG.BOSS_RADIUS * 2) {
                const innerRadius = this.explosionRadius * 0.6;
                ctx.strokeStyle = `rgba(255, 100, 100, ${0.6 * (1 - explosionProgress)})`;
                ctx.lineWidth = 4 * (1 - explosionProgress * 0.5);
                ctx.beginPath();
                ctx.arc(this.x, this.y, innerRadius, 0, Math.PI * 2);
            ctx.stroke();
            }
            
            // 外层冲击波
            if (this.explosionRadius > CONFIG.BOSS_RADIUS * 1.5) {
                const outerRadius = this.explosionRadius * 1.3;
                ctx.strokeStyle = `rgba(255, 150, 150, ${0.4 * (1 - explosionProgress)})`;
                ctx.lineWidth = 2 * (1 - explosionProgress * 0.5);
                ctx.beginPath();
                ctx.arc(this.x, this.y, outerRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            // 中心爆炸核心
            const coreSize = CONFIG.BOSS_RADIUS * (1.5 - explosionProgress);
            if (coreSize > 0) {
                const coreGradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, coreSize
                );
                coreGradient.addColorStop(0, `rgba(255, 255, 255, ${0.9 * (1 - explosionProgress)})`);
                coreGradient.addColorStop(0.4, `rgba(255, 100, 100, ${0.7 * (1 - explosionProgress)})`);
                coreGradient.addColorStop(1, `rgba(255, 0, 0, ${0.3 * (1 - explosionProgress)})`);
                
                ctx.fillStyle = coreGradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, coreSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Boss吸收能量时的水墨笔触流动效果
        if (this.absorbingCharacters && this.absorbingCharacters.length > 0) {
            const flowAnimation = (Date.now() || Date.now()) * this.flowSpeed * 0.001;
            this.absorbingCharacters.forEach(character => {
                // 计算连接线参数
                const dx = this.x - character.x;
                const dy = this.y - character.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);
                
                // 创建水墨笔触连接线
                const brushPoints = this.createBrushConnection(character.x, character.y, this.x, this.y);
                
                // 渐变主线
                const gradient = ctx.createLinearGradient(character.x, character.y, this.x, this.y);
                gradient.addColorStop(0, 'rgba(26, 26, 26, 0.9)'); // 浓墨
                gradient.addColorStop(0.3, 'rgba(45, 45, 45, 0.7)'); // 中墨
                gradient.addColorStop(0.7, 'rgba(74, 74, 74, 0.5)'); // 淡墨
                gradient.addColorStop(1, 'rgba(26, 26, 26, 0.9)'); // 浓墨
                
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                
                // 绘制笔触连接线
                ctx.beginPath();
                ctx.moveTo(brushPoints[0].x, brushPoints[0].y);
                for (let i = 1; i < brushPoints.length; i++) {
                    const point = brushPoints[i];
                    const prevPoint = brushPoints[i - 1];
                    
                    // 使用更平滑的贝塞尔曲线，避免尖锐转折
                    const seed = Math.floor(character.x / 10) + Math.floor(character.y / 10) * 1000 + i * 30;
                    const random = this.seededRandom(seed);
                    
                    // 计算更平滑的控制点
                    const midX = (prevPoint.x + point.x) / 2;
                    const midY = (prevPoint.y + point.y) / 2;
                    const offsetX = (random - 0.5) * 0.2; // 减小偏移
                    const offsetY = (random - 0.5) * 0.2;
                    
                    const cpX = midX + offsetX;
                    const cpY = midY + offsetY;
                    
                    ctx.quadraticCurveTo(cpX, cpY, point.x, point.y);
                }
                ctx.stroke();
                // 粒子流动
                const particleCount = Math.floor(distance / 15);
                for (let i = 0; i < particleCount; i++) {
                    const progress = (i / particleCount + flowAnimation) % 1;
                    const particleX = character.x + dx * progress;
                    const particleY = character.y + dy * progress;
                    // 波动
                    const waveOffset = Math.sin(progress * Math.PI * 3 + flowAnimation * 5) * 3;
                    const perpX = -dy / distance;
                    const perpY = dx / distance;
                    const finalX = particleX + perpX * waveOffset;
                    const finalY = particleY + perpY * waveOffset;
                    const particleSize = 1.5 + Math.sin(progress * Math.PI * 4 + flowAnimation * 8) * 1.5;
                    const grad = ctx.createRadialGradient(finalX, finalY, 0, finalX, finalY, particleSize);
                    grad.addColorStop(0, 'rgba(0,0,0,0.9)');
                    grad.addColorStop(0.7, 'rgba(0,0,0,0.6)');
                    grad.addColorStop(1, 'rgba(0,0,0,0.1)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(finalX, finalY, particleSize, 0, Math.PI * 2);
                    ctx.fill();
                }
                // 连接点液体滴
                const dropSize = 5;
                // 起点
                const startGrad = ctx.createRadialGradient(character.x, character.y, 0, character.x, character.y, dropSize);
                startGrad.addColorStop(0, 'rgba(0,0,0,1)');
                startGrad.addColorStop(0.6, 'rgba(0,0,0,0.8)');
                startGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
                ctx.fillStyle = startGrad;
                ctx.beginPath();
                ctx.arc(character.x, character.y, dropSize, 0, Math.PI * 2);
                ctx.fill();
                // 终点
                const endGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, dropSize);
                endGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
                endGrad.addColorStop(0.6, 'rgba(0,0,0,0.4)');
                endGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
                ctx.fillStyle = endGrad;
                ctx.beginPath();
                ctx.arc(this.x, this.y, dropSize, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        
        ctx.restore();
    }
    
    renderCenterVortex(ctx) {
        // 现代极简中心指示器 - 支持入场和退场动画
        const shouldRender = this.state === 'moving' || this.isVortexDisappearing;
        
        if (shouldRender) {
            ctx.save();
            
            const time = Date.now() * 0.002; // 更慢、更优雅的节奏
            
            // 计算漩涡缩放
            if (this.isVortexDisappearing) {
                // 退场动画：从当前大小收缩到0
                const elapsed = Date.now() - this.vortexDisappearTime;
                const progress = Math.min(elapsed / this.vortexDisappearDuration, 1);
                
                // 退场缓动函数：快速收缩后慢慢淡出
                const easeInCubic = (t) => t * t * t;
                this.vortexScale = (1 - easeInCubic(progress));
                
                // 动画完成后停止渲染
                if (progress >= 1) {
                    this.vortexScale = 0;
                    ctx.restore();
                    return;
                }
            } else {
                // 入场动画：从0缓慢放大到1
                const elapsed = Date.now() - this.vortexAppearTime;
                const progress = Math.min(elapsed / this.vortexAppearDuration, 1);
                
                // 缓动函数：从0缓慢放大到1
                const easeOutBack = (t) => {
                    const c1 = 1.70158;
                    const c3 = c1 + 1;
                    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
                };
                
                this.vortexScale = easeOutBack(progress);
            }
            
            // 放大漩涡基础尺寸
            const baseRadius = 80; // 从30增加到80
            
            ctx.translate(this.targetX, this.targetY);
            
            // 退场动画特效
            if (this.isVortexDisappearing) {
                const elapsed = Date.now() - this.vortexDisappearTime;
                const progress = Math.min(elapsed / this.vortexDisappearDuration, 1);
                
                // 添加轻微震动效果
                const shakeIntensity = progress * 2; // 震动强度随时间增加
                const shakeX = (Math.random() - 0.5) * shakeIntensity;
                const shakeY = (Math.random() - 0.5) * shakeIntensity;
                ctx.translate(shakeX, shakeY);
                
                // 整体透明度变化
                const fadeOpacity = 1 - progress * 0.7; // 保留30%透明度到最后
                ctx.globalAlpha *= fadeOpacity;
            }
            
            ctx.scale(this.vortexScale, this.vortexScale); // 应用缩放动画
            
            // 几何抽象环形指示器 - 增加环数量，提高透明度
            const rings = 6; // 从4增加到6
            for (let ring = 0; ring < rings; ring++) {
                const ringRadius = baseRadius * (0.2 + ring * 0.15);
                const ringOpacity = (0.25 - ring * 0.03) * this.vortexScale; // 透明度与缩放关联
                const ringRotation = time * (0.5 + ring * 0.3);
                
                ctx.save();
                ctx.rotate(ringRotation);
                
                // 现代几何弧段 - 增加段数量
                const segments = 8; // 从6增加到8
                for (let i = 0; i < segments; i++) {
                    const segmentAngle = (i / segments) * Math.PI * 2;
                    const arcLength = Math.PI / 4; // 45度弧段
                    
                    // 计算弧段位置
                    const startAngle = segmentAngle - arcLength / 2;
                    const endAngle = segmentAngle + arcLength / 2;
                    
                    // 现代渐变效果 - 增强可见度
                    const segmentGradient = ctx.createRadialGradient(0, 0, ringRadius * 0.7, 0, 0, ringRadius * 1.2);
                    segmentGradient.addColorStop(0, `rgba(40, 40, 40, 0)`);
                    segmentGradient.addColorStop(0.4, `rgba(70, 70, 70, ${ringOpacity})`);
                    segmentGradient.addColorStop(0.8, `rgba(90, 90, 90, ${ringOpacity * 1.2})`);
                    segmentGradient.addColorStop(1, `rgba(20, 20, 20, 0)`);
                    
                    ctx.strokeStyle = segmentGradient;
                    ctx.lineWidth = 3.5 - ring * 0.3; // 增加线条宽度
                    ctx.lineCap = 'round';
                
                ctx.beginPath();
                    ctx.arc(0, 0, ringRadius, startAngle, endAngle);
                ctx.stroke();
            }
            
            ctx.restore();
        }
            
            // 中心几何核心 - 增强入场效果
            const coreTime = time * 1.5;
            const coreSize = (6 + Math.sin(coreTime) * 2) * this.vortexScale; // 核心尺寸随缩放变化
            const coreIntensity = this.vortexScale * 0.9; // 强度随缩放变化
            
            // 外层发光
            const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize * 3);
            coreGradient.addColorStop(0, `rgba(90, 90, 90, ${coreIntensity})`);
            coreGradient.addColorStop(0.3, `rgba(70, 70, 70, ${coreIntensity * 0.6})`);
            coreGradient.addColorStop(0.7, `rgba(50, 50, 50, ${coreIntensity * 0.3})`);
            coreGradient.addColorStop(1, 'rgba(30, 30, 30, 0)');
            
            ctx.fillStyle = coreGradient;
            ctx.beginPath();
            ctx.arc(0, 0, coreSize * 3, 0, Math.PI * 2);
            ctx.fill();
            
            // 几何中心点
            ctx.fillStyle = `rgba(70, 70, 70, ${coreIntensity})`;
            ctx.beginPath();
            ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
            ctx.fill();
            
            // 动态几何粒子
            const dots = 8;
            for (let i = 0; i < dots; i++) {
                const dotAngle = (i / dots) * Math.PI * 2 + time * 0.8;
                const dotRadius = baseRadius * (1.2 + Math.sin(time * 1.5 + i) * 0.1);
                const dotX = Math.cos(dotAngle) * dotRadius;
                const dotY = Math.sin(dotAngle) * dotRadius;
                const dotSize = 1.5 + Math.sin(time * 2.5 + i * 1.5) * 0.8;
                
                const dotGradient = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, dotSize * 1.5);
                dotGradient.addColorStop(0, 'rgba(85, 85, 85, 0.7)');
                dotGradient.addColorStop(1, 'rgba(85, 85, 85, 0)');
                
                ctx.fillStyle = dotGradient;
                ctx.beginPath();
                ctx.arc(dotX, dotY, dotSize * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }
    }
    
    // 创建水墨笔触连接线
    createBrushConnection(startX, startY, endX, endY) {
        const points = [];
        const segments = 8; // 连接线段数
        
        for (let i = 0; i <= segments; i++) {
            const progress = i / segments;
            const baseX = startX + (endX - startX) * progress;
            const baseY = startY + (endY - startY) * progress;
            
            // 添加更平滑的笔触变化，避免尖锐转折
            const brushVariation = Math.sin(progress * Math.PI * 1.5) * 1.5; // 使用更平滑的正弦波
            const seed = Math.floor(startX / 10) + Math.floor(startY / 10) * 1000 + i * 50;
            const random = this.seededRandom(seed);
            const randomVariation = (random - 0.5) * 1; // 减小变化幅度
            
            // 计算垂直偏移
            const dx = endX - startX;
            const dy = endY - startY;
            const length = Math.sqrt(dx * dx + dy * dy);
            const perpX = -dy / length;
            const perpY = dx / length;
            
            const finalX = baseX + perpX * (brushVariation + randomVariation);
            const finalY = baseY + perpY * (brushVariation + randomVariation);
            
            points.push({ x: finalX, y: finalY });
        }
        
        return points;
    }
    
    // 基于种子的随机数生成器，确保相同输入产生相同输出
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
    
    // 创建Boss的水墨笔触轮廓点
    createBossBrushStrokes(radius) {
        const points = [];
        const segments = 20; // Boss使用更多段数以获得更精细的效果
        
        // 使用基于Boss位置的固定随机种子
        const seedX = Math.floor(this.x / 10);
        const seedY = Math.floor(this.y / 10);
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const baseRadius = radius;
            
            // 使用固定种子生成笔触变化
            const seed = seedX + seedY * 1000 + i * 100;
            const random = this.seededRandom(seed);
            
            // Boss使用更微妙的变化，保持威严感
            const smoothVariation = Math.sin(angle * 2.5) * 0.02 + Math.cos(angle * 1.8) * 0.01;
            const randomVariation = (random - 0.5) * 0.015; // 极小的随机变化
            
            const finalRadius = baseRadius * (1 + smoothVariation + randomVariation);
            
            const x = this.x + Math.cos(angle) * finalRadius;
            const y = this.y + Math.sin(angle) * finalRadius;
            
            points.push({ x, y });
        }
        
        return points;
    }
}

// 角色类
class Character {
    constructor(x, y, energy, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.energy = energy;
        this.isPlayer = isPlayer;
        this.isDead = false;
        this.isAbsorbing = false;
        this.absorbingFrom = null;
        this.lastTransferTime = 0;
        
        // 飘浮状态
        this.floatDirection = { x: 0, y: 0 };
        this.floatDuration = 0;
        this.floatTimer = 0;
        
        // 受击反馈
        this.hitFeedback = false;
        this.healFeedback = false;
        
        // 新增：流动液体动画状态
        this.flowAnimation = 0;
        this.flowSpeed = 2.0; // 流动速度
        
        // 新增：尺寸变化强调动画
        this.sizeChangeAnimation = 0; // 动画时间
        this.isGrowing = false; // 是否正在变大（吸收能量）
        this.isShrinking = false; // 是否正在变小（被吸收能量）
        this.animationRadius = this.radius; // 动画半径
        this.pulseSpeed = 2.0; // 脉冲速度
        
        // 新增：波纹生成追踪
        this.lastX = x;
        this.lastY = y;
        this.lastRippleTime = 0;
        this.rippleThreshold = 30; // 移动距离阈值，超过后生成波纹（降低阈值）
        
        // 新增：死亡动画系统
        this.isDying = false; // 是否正在死亡动画中
        this.deathAnimationTime = 0; // 死亡动画时间
        this.deathAnimationDuration = 1.5; // 死亡动画持续时间（秒）
        this.deathParticles = []; // 死亡粒子系统
        this.deathOpacity = 1; // 死亡时的透明度
        this.deathScale = 1; // 死亡时的缩放
        
        this.updateDerivedProperties();
    }
    
    // 开始死亡动画
    startDeathAnimation() {
        if (this.isDying || this.isDead) return; // 防止重复触发
        
        this.isDying = true;
        this.deathAnimationTime = 0;
        this.deathOpacity = 1;
        this.deathScale = 1;
        
        // 创建死亡粒子系统
        this.createDeathParticles();
        
        // 创建死亡波纹效果
        this.createDeathRipple();
        
        // 停止所有正在进行的操作
        this.stopAbsorbing();
    }
    
    // 创建死亡粒子
    createDeathParticles() {
        this.deathParticles = [];
        const particleCount = Math.floor(this.radius * 0.8 + 8); // 根据大小决定粒子数量
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
            const speed = 30 + Math.random() * 40; // 粒子速度
            const size = 2 + Math.random() * 4; // 粒子大小
            
            this.deathParticles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                opacity: 0.8 + Math.random() * 0.2,
                life: 0,
                maxLife: 0.8 + Math.random() * 0.7, // 粒子生命周期
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 4
            });
        }
    }
    
    updateDerivedProperties() {
        // 半径根据能量计算：sqrt(能量) * 系数
        this.radius = Math.sqrt(this.energy) * CONFIG.RADIUS_SCALE + CONFIG.BASE_RADIUS;
        
        // 速度与能量成反比
        this.speed = CONFIG.BASE_SPEED / (1 + this.energy / CONFIG.SPEED_SCALE);
        
        // 标题界面角色移动速度增加4倍
        if (this.isTitleCharacter) {
            this.speed *= 2;
        }
    }
    
    // 更新尺寸变化动画状态
    updateSizeChangeAnimation(characters, deltaTime) {
        if (this.isDead) return;
        
        // 检查当前状态
        const wasGrowing = this.isGrowing;
        const wasShrinking = this.isShrinking;
        
        // 判断是否正在吸收能量（变大）
        this.isGrowing = this.isAbsorbing && this.absorbingFrom;
        
        // 判断是否被吸收能量（变小）
        const absorber = this.findAbsorber(characters);
        this.isShrinking = absorber !== null;
        
        // 如果状态发生变化，重置动画
        if (this.isGrowing !== wasGrowing || this.isShrinking !== wasShrinking) {
            this.sizeChangeAnimation = 0;
        }
        
        // 更新动画时间
        if (this.isGrowing || this.isShrinking) {
            this.sizeChangeAnimation += deltaTime * this.pulseSpeed;
        } else {
            this.sizeChangeAnimation = 0;
        }
    }
    
    // 创建死亡波纹
    createDeathRipple() {
        // 获取游戏实例的波纹回调
        if (window.gameInstance && window.gameInstance.createDeathRipple) {
            window.gameInstance.createDeathRipple(this.x, this.y, this.radius);
        }
    }
    
    // 更新死亡动画
    updateDeathAnimation(deltaTime) {
        if (!this.isDying) return;
        
        this.deathAnimationTime += deltaTime;
        const progress = this.deathAnimationTime / this.deathAnimationDuration;
        
        if (progress >= 1) {
            // 死亡动画完成，标记为真正死亡
            this.isDead = true;
            this.isDying = false; // 结束死亡动画状态

            return;
        }
        
        // 动画进度曲线 - 先快后慢的淡出
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        // 透明度渐变
        this.deathOpacity = 1 - easeProgress;
        
        // 尺寸变化 - 先轻微放大再收缩
        if (progress < 0.3) {
            this.deathScale = 1 + (progress / 0.3) * 0.2; // 前30%时间放大20%
        } else {
            this.deathScale = 1.2 - ((progress - 0.3) / 0.7) * 1.2; // 后70%时间收缩到0
        }
        
        // 更新死亡粒子
        this.deathParticles.forEach(particle => {
            particle.life += deltaTime;
            const particleProgress = particle.life / particle.maxLife;
            
            if (particleProgress < 1) {
                // 更新粒子位置
                particle.x += particle.vx * deltaTime;
                particle.y += particle.vy * deltaTime;
                
                // 粒子减速
                particle.vx *= 0.98;
                particle.vy *= 0.98;
                
                // 粒子淡出
                particle.opacity = (1 - particleProgress) * 0.8;
                
                // 粒子旋转
                particle.rotation += particle.rotationSpeed * deltaTime;
                
                // 粒子尺寸变化
                particle.size *= 0.995;
            }
        });
        
        // 移除生命周期结束的粒子
        this.deathParticles = this.deathParticles.filter(particle => 
            particle.life < particle.maxLife
        );
    }
    
    move(dx, dy, deltaTime, rippleCallback = null) {
        if (this.isDead || this.isDying) return;
        
        // 保存移动前的位置
        const oldX = this.x;
        const oldY = this.y;
        
        // 归一化移动向量
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
            dx /= length;
            dy /= length;
        }
        
        // 应用速度和时间
        this.x += dx * this.speed * deltaTime;
        this.y += dy * this.speed * deltaTime;
        
        // 边界检查
        this.x = Math.max(this.radius, Math.min(CONFIG.CANVAS_WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(CONFIG.CANVAS_HEIGHT - this.radius, this.y));
        
        // 检查是否需要生成波纹
        const moveDistance = Math.sqrt((this.x - this.lastX) ** 2 + (this.y - this.lastY) ** 2);
        const currentTime = Date.now();
        
        // 只要有实际移动就尝试生成波纹
        const actualMoveDistance = Math.sqrt((this.x - oldX) ** 2 + (this.y - oldY) ** 2);
        
        // 移动设备使用更长的波纹生成间隔
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 'ontouchstart' in window;
        const rippleInterval = isMobile ? 200 : 100; // 移动设备200ms间隔，桌面100ms
        
        if (actualMoveDistance > 0.5 && // 确实有移动
            moveDistance > this.rippleThreshold && 
            currentTime - this.lastRippleTime > rippleInterval && // 动态调整波纹生成频率
            rippleCallback) {
            
            // 生成波纹
            rippleCallback(this.x, this.y, this.speed, this.radius);
            
            // 更新追踪位置和时间
            this.lastX = this.x;
            this.lastY = this.y;
            this.lastRippleTime = currentTime;
        }
        
        // 如果移动距离不足以生成波纹，但累积距离过大，重置追踪位置
        if (moveDistance > this.rippleThreshold * 2) {
            this.lastX = this.x;
            this.lastY = this.y;
        }
    }
    
    getDistanceToCharacter(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const centerDistance = Math.sqrt(dx * dx + dy * dy);
        // 返回圆周之间的距离
        return centerDistance - this.radius - other.radius;
    }
    
    canInteractWith(other) {
        return !this.isDead && !other.isDead && !this.isDying && !other.isDying && 
               this.getDistanceToCharacter(other) <= CONFIG.INTERACTION_DISTANCE;
    }
    
    startAbsorbing(target) {
        this.isAbsorbing = true;
        this.absorbingFrom = target;
        return true;
    }
    
    stopAbsorbing() {
        this.isAbsorbing = false;
        this.absorbingFrom = null;
    }
    
    transferEnergy(currentTime) {
        if (!this.isAbsorbing || !this.absorbingFrom || this.absorbingFrom.isDead) {
            this.stopAbsorbing();
            return;
        }
        
        // 检查距离是否还满足吸收条件
        if (this.getDistanceToCharacter(this.absorbingFrom) > CONFIG.INTERACTION_DISTANCE) {
            this.stopAbsorbing();
            return;
        }
        
        if (currentTime - this.lastTransferTime >= CONFIG.TRANSFER_INTERVAL) {
            const transferAmount = CONFIG.ENERGY_TRANSFER_RATE * CONFIG.TRANSFER_INTERVAL;
            const actualTransfer = Math.min(transferAmount, this.absorbingFrom.energy);
            
            this.energy += actualTransfer;
            this.absorbingFrom.energy -= actualTransfer;
            
            // 先更新属性，再检查是否需要停止吸收
            this.updateDerivedProperties();
            this.absorbingFrom.updateDerivedProperties();
            
            if (this.absorbingFrom.energy <= 0) {
                this.absorbingFrom.startDeathAnimation();
                this.stopAbsorbing();
            }
            
            this.lastTransferTime = currentTime;
        }
    }
    
    // 检查是否有角色在吸收自己
    findAbsorber(characters) {
        for (const character of characters) {
            if (character.isAbsorbing && character.absorbingFrom === this) {
                return character;
            }
        }
        return null;
    }
    
    // 检查角色是否在角落
    isInCorner(margin) {
        const nearLeft = this.x - this.radius <= margin;
        const nearRight = this.x + this.radius >= CONFIG.CANVAS_WIDTH - margin;
        const nearTop = this.y - this.radius <= margin;
        const nearBottom = this.y + this.radius >= CONFIG.CANVAS_HEIGHT - margin;
        
        // 如果同时接近两个边界，则认为在角落
        return (nearLeft || nearRight) && (nearTop || nearBottom);
    }
    
    // 检查角色是否将要撞墙
    willHitWall(nextX, nextY, margin) {
        return nextX - this.radius <= margin || 
               nextX + this.radius >= CONFIG.CANVAS_WIDTH - margin ||
               nextY - this.radius <= margin || 
               nextY + this.radius >= CONFIG.CANVAS_HEIGHT - margin;
    }
    
    // 调整移动方向以避免撞墙
    adjustDirectionForBoundary(dx, dy, margin) {
        let adjustedDx = dx;
        let adjustedDy = dy;
        
        // 检查水平边界
        if (this.x - this.radius <= margin && dx < 0) {
            // 接近左边界且向左移动，改为向右
            adjustedDx = Math.abs(dx);
        } else if (this.x + this.radius >= CONFIG.CANVAS_WIDTH - margin && dx > 0) {
            // 接近右边界且向右移动，改为向左
            adjustedDx = -Math.abs(dx);
        }
        
        // 检查垂直边界
        if (this.y - this.radius <= margin && dy < 0) {
            // 接近上边界且向上移动，改为向下
            adjustedDy = Math.abs(dy);
        } else if (this.y + this.radius >= CONFIG.CANVAS_HEIGHT - margin && dy > 0) {
            // 接近下边界且向下移动，改为向上
            adjustedDy = -Math.abs(dy);
        }
        
        // 如果调整后的方向仍然会导致撞墙，则选择最佳的替代方向
        if (this.willHitWall(this.x + adjustedDx * 10, this.y + adjustedDy * 10, margin)) {
            // 计算到屏幕中心的方向作为备选
            const centerX = CONFIG.CANVAS_WIDTH / 2;
            const centerY = CONFIG.CANVAS_HEIGHT / 2;
            const toCenterX = centerX - this.x;
            const toCenterY = centerY - this.y;
            const toCenterDistance = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
            
            if (toCenterDistance > 0) {
                adjustedDx = toCenterX / toCenterDistance;
                adjustedDy = toCenterY / toCenterDistance;
            }
        }
        
        return { x: adjustedDx, y: adjustedDy };
    }
    
    // 计算智能移动方向
    getSmartMovement(characters, deltaTime) {
        let dx = 0, dy = 0;
        let hasAction = false;
        
        // 1. 如果被其他角色吸收，逃离吸收方
        const absorber = this.findAbsorber(characters);
        if (absorber) {
            const escapeX = this.x - absorber.x;
            const escapeY = this.y - absorber.y;
            const distance = Math.sqrt(escapeX * escapeX + escapeY * escapeY);
            if (distance > 0) {
                dx = escapeX / distance;
                dy = escapeY / distance;
                
                // 边界检测和智能避障
                const edgeMargin = this.radius * 3; // 提前3个半径距离开始避让
                const cornerMargin = this.radius * 5; // 角落检测的范围
                
                // 检测即将到达的位置
                const nextX = this.x + dx * CONFIG.BASE_SPEED * deltaTime;
                const nextY = this.y + dy * CONFIG.BASE_SPEED * deltaTime;
                
                // 死角检测：如果在角落且逃离方向会撞墙，则朝吸收方移动脱离死角
                const isInCorner = this.isInCorner(cornerMargin);
                const willHitWall = this.willHitWall(nextX, nextY, edgeMargin);
                
                if (isInCorner && willHitWall) {
                    // 朝吸收方移动脱离死角
                    const toAbsorberX = absorber.x - this.x;
                    const toAbsorberY = absorber.y - this.y;
                    const toAbsorberDistance = Math.sqrt(toAbsorberX * toAbsorberX + toAbsorberY * toAbsorberY);
                    if (toAbsorberDistance > 0) {
                        dx = toAbsorberX / toAbsorberDistance;
                        dy = toAbsorberY / toAbsorberDistance;
                    }
                } else if (willHitWall) {
                    // 边界避让：调整移动方向避免撞墙
                    dx = this.adjustDirectionForBoundary(dx, dy, edgeMargin).x;
                    dy = this.adjustDirectionForBoundary(dx, dy, edgeMargin).y;
                }
                
                hasAction = true;
            }
        }
        
        // 2. 如果正在吸收其他角色，追击被吸收方
        else if (this.isAbsorbing && this.absorbingFrom) {
            const chaseX = this.absorbingFrom.x - this.x;
            const chaseY = this.absorbingFrom.y - this.y;
            const distance = Math.sqrt(chaseX * chaseX + chaseY * chaseY);
            if (distance > 0) {
                dx = chaseX / distance;
                dy = chaseY / distance;
                hasAction = true;
            }
        }
        
        // 3. 如果没有特殊行为，执行缓慢的飘浮运动
        if (!hasAction) {
            // 更新飘浮计时器
            this.floatTimer += deltaTime;
            
            // 如果需要重新设置飘浮方向（初始化或时间到了）
            if (this.floatDuration === 0 || this.floatTimer >= this.floatDuration) {
                // 随机新的飘浮方向
                const angle = Math.random() * Math.PI * 2;
                this.floatDirection.x = Math.cos(angle);
                this.floatDirection.y = Math.sin(angle);
                
                // 随机飘浮持续时间（1-4秒）
                this.floatDuration = Math.random() * 3 + 1;
                this.floatTimer = 0;
            }
            
            // 使用慢速飘浮
            const floatSpeed = CONFIG.FLOAT_SPEED;
            dx = this.floatDirection.x * floatSpeed * deltaTime;
            dy = this.floatDirection.y * floatSpeed * deltaTime;
            
            this.x += dx;
            this.y += dy;
            
            // 边界检查和反弹
            if (this.x - this.radius <= 0 || this.x + this.radius >= CONFIG.CANVAS_WIDTH) {
                this.floatDirection.x *= -1; // 水平反弹
                this.x = Math.max(this.radius, Math.min(CONFIG.CANVAS_WIDTH - this.radius, this.x));
            }
            if (this.y - this.radius <= 0 || this.y + this.radius >= CONFIG.CANVAS_HEIGHT) {
                this.floatDirection.y *= -1; // 垂直反弹
                this.y = Math.max(this.radius, Math.min(CONFIG.CANVAS_HEIGHT - this.radius, this.y));
            }
            
            return { x: 0, y: 0 }; // 返回0表示已经处理了移动
        }
        
        return { x: dx, y: dy };
    }

    render(ctx, currentTime = 0) {
        if (this.isDead && !this.isDying) return;
        
        ctx.save();
        
        // 如果正在死亡动画中，应用死亡效果
        if (this.isDying) {
            ctx.globalAlpha = this.deathOpacity;
            
            // 渲染死亡粒子
            this.renderDeathParticles(ctx);
        }
        
        // 现代极简角色设计
        // 主体：清洁的几何圆形
        const currentRadius = this.isDying ? this.radius * this.deathScale : this.radius;
        
        const bodyGradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, currentRadius
        );
        bodyGradient.addColorStop(0, 'rgba(80, 80, 80, 0.9)'); // 中心灰
        bodyGradient.addColorStop(0.6, 'rgba(60, 60, 60, 0.95)'); // 深灰
        bodyGradient.addColorStop(1, 'rgba(40, 40, 40, 0.8)'); // 边缘深
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 几何边缘线
        ctx.strokeStyle = 'rgba(50, 50, 50, 0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
            ctx.stroke();
        
        // 现代柔和光晕
        const glowGradient = ctx.createRadialGradient(
            this.x, this.y, currentRadius * 0.8,
            this.x, this.y, currentRadius * 1.4
        );
        glowGradient.addColorStop(0, 'rgba(70, 70, 70, 0)');
        glowGradient.addColorStop(0.6, 'rgba(50, 50, 50, 0.06)');
        glowGradient.addColorStop(1, 'rgba(30, 30, 30, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius * 1.4, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制尺寸变化强调动画
        this.renderSizeChangeAnimation(ctx);
        
        // 去掉玩家角色的特殊标识，让玩家自己通过观察找到自己
        
        // 如果正在吸收能量，显示流动的墨迹连接
        if (this.isAbsorbing && this.absorbingFrom) {
            // 更新流动动画（使用全局时间）
            this.flowAnimation = currentTime * this.flowSpeed * 0.001;
            
            // 计算连接线的参数
            const dx = this.absorbingFrom.x - this.x;
            const dy = this.absorbingFrom.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            
            // 绘制流动的墨迹效果
            ctx.save();
            
            // 创建更柔和的墨色渐变效果
            const gradient = ctx.createLinearGradient(this.x, this.y, this.absorbingFrom.x, this.absorbingFrom.y);
            gradient.addColorStop(0, 'rgba(10, 10, 10, 0.8)'); // 浓墨
            gradient.addColorStop(0.3, 'rgba(26, 26, 26, 0.6)'); // 中墨
            gradient.addColorStop(0.7, 'rgba(45, 45, 45, 0.4)'); // 淡墨
            gradient.addColorStop(1, 'rgba(10, 10, 10, 0.8)'); // 浓墨
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2; // 更细的线条
            ctx.lineCap = 'round';
            
            // 现代简约连接线
            ctx.strokeStyle = 'rgba(90, 90, 90, 0.7)';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.absorbingFrom.x, this.absorbingFrom.y);
            ctx.stroke();
            
            // 几何流动粒子效果
            const particleCount = Math.floor(distance / 25);
            for (let i = 0; i < particleCount; i++) {
                const progress = (i / particleCount + this.flowAnimation) % 1;
                // 修正能量流动方向：从被吸收者流向吸收者
                const particleX = this.absorbingFrom.x - dx * progress;
                const particleY = this.absorbingFrom.y - dy * progress;
                
                // 现代几何粒子
                const particleSize = 1.5 + Math.sin(progress * Math.PI * 2 + this.flowAnimation * 4) * 0.8;
                const particleOpacity = 0.8 - progress * 0.3; // 向目标逐渐变淡
                
                // 简约渐变粒子
                const gradient = ctx.createRadialGradient(particleX, particleY, 0, particleX, particleY, particleSize * 1.5);
                gradient.addColorStop(0, `rgba(100, 100, 100, ${particleOpacity})`);
                gradient.addColorStop(0.7, `rgba(80, 80, 80, ${particleOpacity * 0.6})`);
                gradient.addColorStop(1, `rgba(60, 60, 60, 0)`);
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(particleX, particleY, particleSize * 1.5, 0, Math.PI * 2);
                ctx.fill();
        }
        
            // 现代几何连接点
            const dotSize = 2.5;
            
            // 吸收源点（较亮）
            const sourceGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, dotSize * 1.5);
            sourceGradient.addColorStop(0, 'rgba(120, 120, 120, 0.9)');
            sourceGradient.addColorStop(0.6, 'rgba(90, 90, 90, 0.6)');
            sourceGradient.addColorStop(1, 'rgba(60, 60, 60, 0)');
            
            ctx.fillStyle = sourceGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, dotSize * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // 被吸收点（较暗）
            const targetGradient = ctx.createRadialGradient(this.absorbingFrom.x, this.absorbingFrom.y, 0, this.absorbingFrom.x, this.absorbingFrom.y, dotSize * 1.5);
            targetGradient.addColorStop(0, 'rgba(100, 100, 100, 0.7)');
            targetGradient.addColorStop(0.6, 'rgba(70, 70, 70, 0.5)');
            targetGradient.addColorStop(1, 'rgba(40, 40, 40, 0)');
            
            ctx.fillStyle = targetGradient;
            ctx.beginPath();
            ctx.arc(this.absorbingFrom.x, this.absorbingFrom.y, dotSize * 1.5, 0, Math.PI * 2);
            ctx.fill();
        
        ctx.restore();
        }
        
        ctx.restore();
    }
    
    // 渲染死亡粒子效果
    renderDeathParticles(ctx) {
        if (!this.isDying || this.deathParticles.length === 0) return;
        
        ctx.save();
        
        this.deathParticles.forEach(particle => {
            if (particle.opacity <= 0) return;
            
            ctx.save();
            ctx.globalAlpha = particle.opacity;
            
            // 移动到粒子位置并旋转
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            
            // 创建墨迹粒子渐变
            const particleGradient = ctx.createRadialGradient(
                0, 0, 0,
                0, 0, particle.size
            );
            particleGradient.addColorStop(0, 'rgba(60, 60, 60, 0.9)');
            particleGradient.addColorStop(0.5, 'rgba(40, 40, 40, 0.7)');
            particleGradient.addColorStop(1, 'rgba(20, 20, 20, 0)');
            
            ctx.fillStyle = particleGradient;
            
            // 绘制不规则墨迹形状
            ctx.beginPath();
            const sides = 5 + Math.floor(particle.size / 2);
            for (let i = 0; i < sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                const variation = 0.7 + Math.random() * 0.6; // 形状变化
                const x = Math.cos(angle) * particle.size * variation;
                const y = Math.sin(angle) * particle.size * variation;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();
            
            // 墨迹边缘效果
            ctx.strokeStyle = `rgba(30, 30, 30, ${particle.opacity * 0.5})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            
            ctx.restore();
        });
        
        ctx.restore();
    }
    
    // 创建水墨笔触轮廓点
    createBrushStrokes() {
        const points = [];
        const segments = 16; // 增加段数以获得更平滑的曲线
        
        // 使用基于角色位置的固定随机种子，避免抖动
        const seedX = Math.floor(this.x / 10);
        const seedY = Math.floor(this.y / 10);
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const baseRadius = this.radius;
            
            // 使用固定种子生成笔触变化，避免抖动
            const seed = seedX + seedY * 1000 + i * 100;
            const random = this.seededRandom(seed);
            
            // 使用更平滑的变化函数，避免尖锐转折
            const smoothVariation = Math.sin(angle * 2) * 0.015 + Math.cos(angle * 1.5) * 0.008;
            const randomVariation = (random - 0.5) * 0.02; // 极小随机变化
            
            // 使用平滑插值确保轮廓连续
            const finalRadius = baseRadius * (1 + smoothVariation + randomVariation);
            
            const x = this.x + Math.cos(angle) * finalRadius;
            const y = this.y + Math.sin(angle) * finalRadius;
            
            points.push({ x, y });
        }
        
        return points;
    }
    
    // 基于种子的随机数生成器，确保相同输入产生相同输出
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
    
    // 渲染尺寸变化强调动画（纯水墨风格）
    renderSizeChangeAnimation(ctx) {
        if (!this.isGrowing && !this.isShrinking) return;
        
        ctx.save();
        
        if (this.isGrowing) {
            // 吸收能量时：浓墨向外晕开效果，如墨滴在宣纸上扩散
            const pulsePhase = this.sizeChangeAnimation % (Math.PI * 2);
            const pulseStrength = (Math.sin(pulsePhase * 0.8) + 1) * 0.5; // 较慢的节奏
            
            // 多层墨晕扩散效果
            const layerCount = 4;
            for (let layer = 0; layer < layerCount; layer++) {
                const layerDelay = layer * 0.4; // 更慢的层间延迟
                const layerPhase = (this.sizeChangeAnimation - layerDelay) % (Math.PI * 2);
                const layerPulse = Math.max(0, (Math.sin(layerPhase * 0.8) + 1) * 0.5);
                
                // 扩散半径 - 模拟墨汁在宣纸上的自然晕开
                const baseRadius = this.radius * (1.1 + layer * 0.25);
                const expansionRadius = baseRadius * (1 + layerPulse * 0.6);
                
                // 墨色浓度 - 使用更浓的墨色表示能量汇聚
                const baseOpacity = 0.18 - layer * 0.03;
                const inkDensity = baseOpacity * (1 - layerPulse * 0.7);
                
                if (inkDensity > 0.01) {
                    // 现代几何扩散效果
                    const gradient = ctx.createRadialGradient(
                        this.x, this.y, expansionRadius * 0.3,
                        this.x, this.y, expansionRadius
                    );
                    gradient.addColorStop(0, `rgba(100, 100, 100, ${inkDensity * 0.8})`); // 中心亮灰
                    gradient.addColorStop(0.4, `rgba(80, 80, 80, ${inkDensity * 0.6})`); // 中灰
                    gradient.addColorStop(0.8, `rgba(60, 60, 60, ${inkDensity * 0.3})`); // 深灰
                    gradient.addColorStop(1, `rgba(40, 40, 40, 0)`); // 完全透明
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, expansionRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // 现代核心强化效果
            const coreOpacity = pulseStrength * 0.12;
            const coreGradient = ctx.createRadialGradient(
                this.x, this.y, this.radius * 0.8,
                this.x, this.y, this.radius * 1.2
            );
            coreGradient.addColorStop(0, `rgba(110, 110, 110, ${coreOpacity})`);
            coreGradient.addColorStop(1, `rgba(70, 70, 70, 0)`);
            
            ctx.fillStyle = coreGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (this.isShrinking) {
            // 被吸收时：淡墨向内聚集涡旋效果，如水墨被抽走
            const pulsePhase = this.sizeChangeAnimation % (Math.PI * 2);
            const pulseStrength = (Math.sin(pulsePhase * 1.2) + 1) * 0.5; // 稍快的收缩节奏
            
            // 多层涡旋收缩效果
            const layerCount = 3;
            for (let layer = 0; layer < layerCount; layer++) {
                const layerDelay = layer * 0.3;
                const layerPhase = (this.sizeChangeAnimation + layerDelay) % (Math.PI * 2);
                const layerPulse = Math.max(0, (Math.sin(layerPhase * 1.2) + 1) * 0.5);
                
                // 收缩半径 - 模拟水墨向内聚集
                const baseRadius = this.radius * (1.6 - layer * 0.15);
                const contractionRadius = baseRadius * (1 - layerPulse * 0.5);
                
                // 淡墨效果 - 使用较淡的墨色表示能量流失
                const baseOpacity = 0.1 - layer * 0.02;
                const fadeOpacity = baseOpacity * layerPulse;
                
                if (fadeOpacity > 0.01 && contractionRadius > this.radius * 0.5) {
                    // 现代几何收缩效果
                    const gradient = ctx.createRadialGradient(
                        this.x, this.y, contractionRadius * 0.9,
                        this.x, this.y, contractionRadius
                    );
                    gradient.addColorStop(0, `rgba(90, 90, 90, 0)`); // 透明中心
                    gradient.addColorStop(0.3, `rgba(75, 75, 75, ${fadeOpacity * 0.6})`); // 浅灰
                    gradient.addColorStop(0.7, `rgba(60, 60, 60, ${fadeOpacity * 0.8})`); // 中灰
                    gradient.addColorStop(1, `rgba(45, 45, 45, ${fadeOpacity})`); // 深灰边缘
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, contractionRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // 现代消散边缘效果
            const fadeOpacity = pulseStrength * 0.1;
            const fadeGradient = ctx.createRadialGradient(
                this.x, this.y, this.radius * 0.6,
                this.x, this.y, this.radius * 1.1
            );
            fadeGradient.addColorStop(0, `rgba(85, 85, 85, ${fadeOpacity})`);
            fadeGradient.addColorStop(0.6, `rgba(70, 70, 70, ${fadeOpacity * 0.6})`);
            fadeGradient.addColorStop(1, `rgba(55, 55, 55, 0)`);
            
            ctx.fillStyle = fadeGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.1, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// 虚拟摇杆类
class VirtualJoystick {
    constructor() {
        this.joystick = document.getElementById('virtualJoystick');
        this.knob = document.getElementById('joystickKnob');
        
        // 调试信息
        console.log('VirtualJoystick: joystick element:', this.joystick);
        console.log('VirtualJoystick: knob element:', this.knob);
        
        this.isActive = false;
        this.startX = 0;
        this.startY = 0;
        this.deltaX = 0;
        this.deltaY = 0;
        this.maxDistance = 40;
        
        // 初始化时隐藏摇杆
        if (this.joystick) {
            this.joystick.style.display = 'none';
        }
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // 监听文档的触摸开始事件，动态定位摇杆
        document.addEventListener('touchstart', (e) => {
            // 调试信息
            console.log('VirtualJoystick: touchstart detected');
            console.log('isMobileDevice:', this.isMobileDevice());
            console.log('gameInstance:', window.gameInstance);
            console.log('gameState:', window.gameInstance?.gameState);
            
            // 只在移动设备上启用虚拟摇杆
            if (!this.isMobileDevice()) {
                console.log('VirtualJoystick: Not a mobile device, skipping');
                return;
            }
            
            // 检查游戏状态，只在需要控制角色时显示摇杆
            const game = window.gameInstance;
            if (!game) {
                console.log('VirtualJoystick: No game instance, skipping');
                return;
            }
            
            // 允许在标题界面和游戏进行中使用摇杆
            if (game.gameState !== 'playing' && game.gameState !== 'title') {
                console.log('VirtualJoystick: Wrong game state:', game.gameState);
                return;
            }
            
            const touch = e.touches[0];
            
            // 动态定位摇杆到触摸位置
            this.startX = touch.clientX;
            this.startY = touch.clientY;
            
            console.log('VirtualJoystick: Setting joystick position at', this.startX, this.startY);
            
            // 确保摇杆元素存在
            if (!this.joystick) {
                console.error('VirtualJoystick: joystick element not found!');
                return;
            }
            
            // 设置摇杆位置
            this.joystick.style.left = `${this.startX - 60}px`; // 60是摇杆半径
            this.joystick.style.top = `${this.startY - 60}px`;
            this.joystick.style.display = 'block';
            
            console.log('VirtualJoystick: Joystick should now be visible');
            console.log('VirtualJoystick: Joystick styles:', {
                left: this.joystick.style.left,
                top: this.joystick.style.top,
                display: this.joystick.style.display
            });
            
            this.isActive = true;
            this.deltaX = 0;
            this.deltaY = 0;
            
            // 重置把手位置
            this.knob.style.transform = 'translate(-50%, -50%)';
            
            // 阻止默认行为，避免页面滚动
            e.preventDefault();
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            if (!this.isActive) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            this.deltaX = touch.clientX - this.startX;
            this.deltaY = touch.clientY - this.startY;
            
            // 限制在圆形范围内
            const distance = Math.sqrt(this.deltaX * this.deltaX + this.deltaY * this.deltaY);
            if (distance > this.maxDistance) {
                this.deltaX = (this.deltaX / distance) * this.maxDistance;
                this.deltaY = (this.deltaY / distance) * this.maxDistance;
            }
            
            // 更新把手位置
            this.knob.style.transform = `translate(${this.deltaX - 20}px, ${this.deltaY - 20}px)`;
        }, { passive: false });
        
        document.addEventListener('touchend', () => {
            console.log('VirtualJoystick: touchend detected, isActive:', this.isActive);
            
            if (!this.isActive) return;
            
            this.isActive = false;
            this.deltaX = 0;
            this.deltaY = 0;
            
            // 隐藏摇杆
            if (this.joystick) {
                this.joystick.style.display = 'none';
                console.log('VirtualJoystick: Joystick hidden');
            }
            if (this.knob) {
                this.knob.style.transform = 'translate(-50%, -50%)';
            }
        }, { passive: false });
    }
    
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               'ontouchstart' in window ||
               window.innerWidth <= 768;
    }
    
    getInput() {
        if (!this.isActive) return { x: 0, y: 0 };
        
        return {
            x: this.deltaX / this.maxDistance,
            y: this.deltaY / this.maxDistance
        };
    }
}

// 输入处理类
class InputHandler {
    constructor() {
        this.keys = {};
        this.virtualJoystick = new VirtualJoystick();
        
        this.setupKeyboardListeners();
    }
    
    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    getMovementInput() {
        let x = 0, y = 0;
        
        // 键盘输入
        if (this.keys['w'] || this.keys['arrowup']) y -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) y += 1;
        if (this.keys['a'] || this.keys['arrowleft']) x -= 1;
        if (this.keys['d'] || this.keys['arrowright']) x += 1;
        
        // 如果没有键盘输入，使用虚拟摇杆
        if (x === 0 && y === 0) {
            const joystickInput = this.virtualJoystick.getInput();
            x = joystickInput.x;
            y = joystickInput.y;
        }
        
        return { x, y };
    }
}

// 主游戏类
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.inputHandler = new InputHandler();
        this.characters = [];
        this.playerCharacter = null;
        this.lastTime = 0;
        
        // Boss系统
        this.boss = null;
        this.lastBossSpawnTime = 0;
        this.gameStartTime = 0; // 将在第一次gameLoop中设置
        this.initialCharacterCount = CONFIG.INITIAL_CHARACTER_COUNT;
        
        // 波纹系统
        this.ripples = [];
        // 根据设备性能调整波纹数量
        this.maxRipples = this.isMobileDevice() ? 30 : 100; // 移动设备降低波纹数量
        
        // 绑定波纹生成回调
        this.rippleCallback = this.createRipple.bind(this);
        
        // 设置全局实例引用，供Boss访问
        window.gameInstance = this;
        
        // 背景音乐元素
        this.bgmElement = document.getElementById('bgm');
        this.sfxGameStartElement = document.getElementById('sfxGameStart');
        this.hasPlayedStartSfx = false;
        
        // 预解锁音频（基于一次用户手势）
        this.setupBgmUnlockOnUserGesture();
        
        // 计时系统
        this.gameTimer = 0; // 游戏时间（毫秒）
        this.isGameOver = false; // 游戏是否结束
        this.finalTime = 0; // 最终成绩
        this.gameOverReason = ''; // 游戏结束原因：'boss_explosion' 或 'player_death'
        
        // 游戏结束动画状态
        this.gameOverAnimationStart = 0; // 动画开始时间
        this.gameOverAnimationPhase = 0; // 动画阶段 0: 第一个字, 1: 第二个字, 2: 提示文字
        
        // 游戏状态管理
        this.gameState = 'title'; // 'title', 'playing', 'gameOver'
        this.gameStartAnimationTime = 0; // 游戏开始动画时间
        this.isGameStartAnimation = false; // 是否正在播放游戏开始动画
        
        // 标题界面系统
        this.titleCore = null;
        this.titleCharacterSpawnPositions = []; // 三个大圆圈的位置
        this.titleBreathingTime = 0; // 呼吸动画时间
        this.titleExitAnimation = false; // 是否正在播放出场动画
        this.titleExitStartTime = 0; // 出场动画开始时间
        this.titleExitDuration = 1000; // 出场动画持续时间(ms)
        
        this.setupCanvas();
        this.setupTitleScreen();
        this.setupRestartButton();
        this.gameLoop();
    }
    
    // 检测是否为移动设备
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               'ontouchstart' in window ||
               window.innerWidth <= 768;
    }
    
    setupCanvas() {
        // 设置canvas为实际像素尺寸
        this.updateCanvasSize();
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.updateCanvasSize();
        });
    }
    
    updateCanvasSize() {
        // 获取设备像素比
        const dpr = window.devicePixelRatio || 1;
        
        // 获取CSS尺寸（视口尺寸）
        const rect = this.canvas.getBoundingClientRect();
        const cssWidth = window.innerWidth;
        const cssHeight = window.innerHeight;
        
        // 设置Canvas的实际像素尺寸
        this.canvas.width = cssWidth * dpr;
        this.canvas.height = cssHeight * dpr;
        
        // 设置CSS显示尺寸
        this.canvas.style.width = cssWidth + 'px';
        this.canvas.style.height = cssHeight + 'px';
        
        // 缩放绘图上下文以匹配设备像素比
        this.ctx.scale(dpr, dpr);
        
        // 添加点击/触摸事件监听器，用于游戏结束后重新开始
        this.canvas.addEventListener('click', () => {
            if (this.isGameOver && this.gameOverAnimationPhase >= 2) {
                this.restartGame();
            }
        });
        
        // 添加触摸事件支持
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault(); // 防止触发点击事件
            if (this.isGameOver && this.gameOverAnimationPhase >= 2) {
                this.restartGame();
            }
        });
        
        // 防止默认的触摸行为，但允许虚拟摇杆工作
        this.canvas.addEventListener('touchstart', (e) => {
            // 不阻止touchstart，让虚拟摇杆能够正常工作
        });
        this.canvas.addEventListener('touchmove', (e) => {
            // 只在虚拟摇杆激活时允许触摸移动，否则阻止页面滚动
            const virtualJoystick = this.inputHandler?.virtualJoystick;
            if (!virtualJoystick?.isActive) {
                e.preventDefault();
            }
        });
    }
    
    setupTitleScreen() {
        // 初始化标题界面
        this.initializeTitleScreen();
    }
    
    initializeTitleScreen() {
        // 创建中心吸收点
        this.titleCore = new TitleCore();
        
        // 生成三个大圆圈的位置（用于玩家角色生成）
        this.titleCharacterSpawnPositions = [
            { x: CONFIG.CANVAS_WIDTH * 0.25, y: CONFIG.CANVAS_HEIGHT * 0.2 },
            { x: CONFIG.CANVAS_WIDTH * 0.75, y: CONFIG.CANVAS_HEIGHT * 0.2 },
            { x: CONFIG.CANVAS_WIDTH * 0.5, y: CONFIG.CANVAS_HEIGHT * 0.8 }
        ];
        
        // 清空角色数组并生成标题玩家角色
        this.characters = [];
        this.generateTitlePlayerCharacter();
    }
    
    generateTitlePlayerCharacter() {
        // 在所有三个位置都生成角色
        this.titleCharacterSpawnPositions.forEach((position, index) => {
            const character = new Character(position.x, position.y, 60); // 增加初始能量确保足够传输
            // 标记为标题界面角色，用于4倍移动速度
            character.isTitleCharacter = true;
            this.characters.push(character);
        });
        
        // 随机选择一个作为玩家角色
        const playerIndex = Math.floor(Math.random() * this.characters.length);
        this.characters[playerIndex].isPlayer = true;
        this.playerCharacter = this.characters[playerIndex];
    }
    

    
    setupRestartButton() {
        this.restartButton = document.getElementById('restartButton');
        if (this.restartButton) {
            this.restartButton.addEventListener('click', () => {
                this.restartGame();
            });
        }
    }
    
    showRestartButton() {
        if (this.restartButton) {
            this.restartButton.style.display = 'block';
        }
    }
    
    hideRestartButton() {
        if (this.restartButton) {
            this.restartButton.style.display = 'none';
        }
    }
    
    restartGame() {
        // 重置游戏状态
        this.isGameOver = false;
        this.gameTimer = 0;
        this.finalTime = 0;
        this.lastTime = 0;
        this.gameStartTime = 0;
        this.gameOverReason = '';
        this.gameOverAnimationStart = 0;
        this.gameOverAnimationPhase = 0;
        this.gameState = 'title';
        this.isGameStartAnimation = false;
        this.gameStartAnimationTime = 0;
        
        // 重置Boss系统
        this.boss = null;
        this.lastBossSpawnTime = 0;
        
        // 重置波纹系统
        this.ripples = [];
        
        // 清空角色
        this.characters = [];
        this.playerCharacter = null;
        
        // 隐藏重新开始按钮
        this.hideRestartButton();
        
        // 显示标题界面
        this.showTitleScreen();
    }
    
    showTitleScreen() {
        // 重置动画状态
        this.titleBreathingTime = 0;
        this.titleExitAnimation = false;
        this.titleExitStartTime = 0;
        
        // 重新初始化标题界面
        this.initializeTitleScreen();
    }
    
    // 更新游戏开始动画
    updateGameStartAnimation(currentTime) {
        const animationDuration = 2000; // 2秒动画时间
        const elapsed = currentTime - this.gameStartAnimationTime;
        
        if (elapsed >= animationDuration) {
            this.isGameStartAnimation = false;
        }
    }
    
    initializeGame() {
        this.characters = [];
        
        // 确保重新开始按钮是隐藏的
        this.hideRestartButton();
        
        // 根据设备类型调整角色数量
        const isMobile = this.isMobileDevice();
        const characterCount = isMobile ? Math.floor(CONFIG.INITIAL_CHARACTER_COUNT / 2) : CONFIG.INITIAL_CHARACTER_COUNT;
        
        // 生成角色
        for (let i = 0; i < characterCount; i++) {
            let x, y;
            let attempts = 0;
            
            do {
                x = Math.random() * (CONFIG.CANVAS_WIDTH - 100) + 50;
                y = Math.random() * (CONFIG.CANVAS_HEIGHT - 100) + 50;
                attempts++;
            } while (attempts < 100 && this.isTooCloseToOthers(x, y));
            
            // 随机能量在80-120之间
            const randomEnergy = Math.random() * 40 + 80; // 80 + (0-40)
            const character = new Character(x, y, randomEnergy);
            this.characters.push(character);
        }
        
        // 随机选择玩家角色
        if (this.characters.length > 0) {
            const playerIndex = Math.floor(Math.random() * this.characters.length);
            this.characters[playerIndex].isPlayer = true;
            this.playerCharacter = this.characters[playerIndex];
        }
    }
    
    isTooCloseToOthers(x, y) {
        for (const character of this.characters) {
            const dx = x - character.x;
            const dy = y - character.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < CONFIG.MIN_SPAWN_DISTANCE) {
                return true;
            }
        }
        return false;
    }
    
    update(deltaTime, currentTime) {
        // 标题状态的特殊处理
        if (this.gameState === 'title') {
            this.updateTitleScreen(deltaTime, currentTime);
            return;
        }
        
        // 只有在游戏进行中才更新游戏逻辑
        if (this.gameState !== 'playing') {
            return;
        }
        
        // 处理游戏开始动画
        if (this.isGameStartAnimation) {
            this.updateGameStartAnimation(currentTime);
        }
        
        // 更新游戏计时器（如果游戏未结束）
        if (!this.isGameOver) {
            this.gameTimer = currentTime - this.gameStartTime;
            
            // 检查游戏结束条件
            this.checkGameOverConditions(currentTime);
        }
        
        const input = this.inputHandler.getMovementInput();
        
        // 更新玩家移动
        if (this.playerCharacter && !this.playerCharacter.isDead && !this.playerCharacter.isDying) {
            this.playerCharacter.move(input.x, input.y, deltaTime, this.rippleCallback);
        }
        
        // AI移动（智能行为）
        this.characters.forEach(character => {
            if (!character.isPlayer && !character.isDead && !character.isDying) {
                // 检查该角色是否正在被Boss吸收能量
                let isBeingAbsorbedByBoss = false;
                if (this.boss && this.boss.isActive && this.boss.absorbingCharacters) {
                    isBeingAbsorbedByBoss = this.boss.absorbingCharacters.includes(character);
                }
                
                // 如果角色正在被Boss吸收，则不移动
                if (!isBeingAbsorbedByBoss) {
                    const movement = character.getSmartMovement(this.characters, deltaTime);
                    if (movement.x !== 0 || movement.y !== 0) {
                        character.move(movement.x, movement.y, deltaTime, this.rippleCallback);
                    }
                }
            }
        });
        
        // 检查角色间的交互
        this.checkInteractions(currentTime);
        
        // 处理能量传输
        this.characters.forEach(character => {
            character.transferEnergy(currentTime);
        });
        
        // 更新尺寸变化动画
        this.characters.forEach(character => {
            character.updateSizeChangeAnimation(this.characters, deltaTime);
        });
        
        // 更新死亡动画
        this.characters.forEach(character => {
            character.updateDeathAnimation(deltaTime);
        });
        
        // Boss系统（如果游戏未结束）
        if (!this.isGameOver) {
        this.updateBoss(currentTime, deltaTime);
        }
        
        // 移除死亡角色（但保留玩家角色用于游戏结束检查）
        this.characters = this.characters.filter(character => {
            // 如果是死亡的玩家角色且游戏还没结束，暂时保留用于游戏结束检查
            if (character.isDead && character.isPlayer && !this.isGameOver) {
                return true;
            }
            return !character.isDead;
        });
        
        // 更新波纹系统
        this.updateRipples(deltaTime);
        
        // 更新UI
        this.updateUI();
    }
    
    updateTitleScreen(deltaTime, currentTime) {
        // 更新呼吸动画时间
        this.titleBreathingTime += deltaTime * 1000; // 转换为毫秒
        
        // 如果正在播放出场动画
        if (this.titleExitAnimation) {
            const exitElapsed = currentTime - this.titleExitStartTime;
            if (exitElapsed >= this.titleExitDuration) {
                // 出场动画完成，真正开始游戏
                this.titleExitAnimation = false;
                this.gameState = 'playing';
                this.isGameStartAnimation = true;
                this.gameStartAnimationTime = performance.now();
                
                // 初始化游戏时间（这里才真正开始计时）
                this.gameStartTime = performance.now();
                this.lastBossSpawnTime = this.gameStartTime;
                
                // 清理标题界面资源
                this.titleCore = null;
                
                // 开始播放BGM（循环）
                this.playBgmLoop();

                // 初始化游戏内容
                this.initializeGame();
            }
            return;
        }
        
        // 更新玩家角色移动
        const input = this.inputHandler.getMovementInput();
        if (this.playerCharacter && !this.playerCharacter.isDead && !this.playerCharacter.isDying) {
            this.playerCharacter.move(input.x, input.y, deltaTime, this.rippleCallback);
        }
        
        // 更新中心吸收点
        if (this.titleCore) {
            const shouldStartGame = this.titleCore.update(currentTime, this.characters);
            if (shouldStartGame) {
                this.startTitleExitAnimation(currentTime);
                return;
            }
        }
        
        // 更新角色属性
        this.characters.forEach(character => {
            character.updateDerivedProperties();
        });
        
        // 更新波纹系统
        this.updateRipples(deltaTime);
    }
    
    startTitleExitAnimation(currentTime) {
        this.titleExitAnimation = true;
        this.titleExitStartTime = currentTime;
        if (!this.hasPlayedStartSfx) {
            this.playStartSfx();
            this.hasPlayedStartSfx = true;
        }
    }
    
    updateBoss(currentTime, deltaTime) {
        // 检查是否需要刷新Boss
        if (!this.boss || !this.boss.isActive) {
            const elapsed = currentTime - (this.lastBossSpawnTime || this.gameStartTime);
            if (elapsed >= CONFIG.BOSS_SPAWN_INTERVAL) {
                this.boss = new Boss();
                this.lastBossSpawnTime = currentTime;
            }
        }
        
        // 更新Boss
        if (this.boss && this.boss.isActive) {
            this.boss.update(this.characters, currentTime, deltaTime);
            
            // 如果Boss消失了，重置计时器
            if (!this.boss.isActive) {
                this.lastBossSpawnTime = currentTime;
            }
        }
    }
    
    checkInteractions(currentTime) {
        for (let i = 0; i < this.characters.length; i++) {
            for (let j = i + 1; j < this.characters.length; j++) {
                const char1 = this.characters[i];
                const char2 = this.characters[j];
                
                // 只检查还没有处于吸收状态的角色对
                if (!char1.isAbsorbing && !char2.isAbsorbing && char1.canInteractWith(char2)) {
                    // 能量不同时才激活吸收状态
                    if (char1.energy !== char2.energy) {
                        // 能量较低的角色开始吸收
                        if (char1.energy < char2.energy) {
                            char1.startAbsorbing(char2);
                        } else {
                            char2.startAbsorbing(char1);
                        }
                    }
                }
            }
        }
    }
    
    // 检查游戏结束条件
    checkGameOverConditions(currentTime) {

        
        // 如果Boss正在爆炸，优先让爆炸动画播放完成，不要因为玩家死亡而中断
        if (this.boss && this.boss.state === 'exploding') {
            // Boss爆炸完成（扩散完毕并且不再活跃，且爆炸动画已播放足够时间）
            if (!this.boss.isActive) {
                // 给爆炸动画至少1.5秒时间播放（增加到1.5秒让动画更完整）
                const explosionAnimationDuration = 1500; // 1.5秒
                const explosionElapsed = currentTime - this.boss.explosionStartTime;
                
                if (explosionElapsed >= explosionAnimationDuration) {
                    this.endGame('boss_explosion');
                    return;
                }
            }
            // Boss正在爆炸期间，不检查其他游戏结束条件，让爆炸动画完整播放
            return;
        }
        
        // 条件1: 玩家角色死亡（仅在非Boss爆炸期间检查）
        if (this.playerCharacter && this.playerCharacter.isDying) {
            // 玩家正在死亡动画中，等待动画完成
            return;
        }
        
        // 玩家死亡动画完成后才结束游戏
        if (this.playerCharacter && this.playerCharacter.isDead) {
            this.endGame('player_death');
            return;
        }
        
        // 如果玩家角色不存在（可能被意外移除），也检查一下
        if (!this.playerCharacter) {
            const deadPlayer = this.characters.find(char => char.isPlayer && char.isDead);
            if (deadPlayer) {
                this.endGame('player_death');
                return;
            }
        }
    }
    
    // 结束游戏
    endGame(reason = 'unknown') {
        if (!this.isGameOver) {
            // 停止BGM
            this.stopBgm();

            this.isGameOver = true;
            this.gameState = 'gameOver';
            this.finalTime = this.gameTimer;
            this.gameOverReason = reason;
            
            // 初始化游戏结束动画
            this.gameOverAnimationStart = this.lastTime;
            this.gameOverAnimationPhase = 0;
            
            // 隐藏重新开始按钮（改为点击任意位置重新开始）
            this.hideRestartButton();
        }
    }
    
    updateUI() {
        // UI面板已移除，保持简洁的游戏界面
        // 如需要显示信息，可在此添加其他方式的UI更新
    }

    // 音频：在用户第一次交互时尝试播放/暂停以解锁
    setupBgmUnlockOnUserGesture() {
        const unlock = () => {
            const audios = [this.bgmElement, this.sfxGameStartElement].filter(Boolean);
            for (const audio of audios) {
                try {
                    const p = audio.play();
                    if (p && typeof p.then === 'function') {
                        p.then(() => {
                            audio.pause();
                            audio.currentTime = 0;
                        }).catch(() => {});
                    }
                } catch (_) {}
            }
            window.removeEventListener('touchstart', unlock, true);
            window.removeEventListener('mousedown', unlock, true);
            window.removeEventListener('keydown', unlock, true);
        };
        window.addEventListener('touchstart', unlock, true);
        window.addEventListener('mousedown', unlock, true);
        window.addEventListener('keydown', unlock, true);
    }

    // 开始循环播放BGM（仅在正式开始游戏时调用）
    playBgmLoop() {
        const audio = this.bgmElement;
        if (!audio) return;
        audio.loop = true;
        try {
            const p = audio.play();
            if (p && typeof p.catch === 'function') {
                p.catch(() => {});
            }
        } catch (e) {
            // 忽略播放失败（通常是自动播放限制）
        }
    }

    // 立即停止BGM
    stopBgm() {
        const audio = this.bgmElement;
        if (!audio) return;
        if (!audio.paused) audio.pause();
        audio.currentTime = 0;
        audio.loop = false;
    }

    // 播放开场音效（不循环）
    playStartSfx() {
        const audio = this.sfxGameStartElement;
        if (!audio) return;
        audio.loop = false;
        try {
            audio.currentTime = 0;
            const p = audio.play();
            if (p && typeof p.catch === 'function') {
                p.catch(() => {});
            }
        } catch (_) {}
    }
    
    // 波纹系统方法
    createRipple(x, y, speed, characterRadius) {
        // 移除过多的波纹
        if (this.ripples.length >= this.maxRipples) {
            this.ripples.shift(); // 移除最老的波纹
        }
        
        // 创建新波纹
        const ripple = {
            x: x,
            y: y,
            radius: characterRadius * 0.5, // 起始半径更小
            maxRadius: characterRadius * 4 + Math.max(speed * 0.8, 20), // 确保最小可见半径
            age: 0,
            lifetime: 1500 + Math.random() * 1000, // 生命周期1.5-2.5秒
            intensity: Math.max(0.3, Math.min(speed / 80, 1)), // 确保最小可见强度
            fadeRate: 1 / (1500 + Math.random() * 1000)
        };
        
        // 调试信息（已禁用以减少控制台输出）
        // console.log(`波纹生成: 位置(${x.toFixed(1)}, ${y.toFixed(1)}), 速度: ${speed.toFixed(1)}, 强度: ${ripple.intensity.toFixed(2)}, 当前波纹数: ${this.ripples.length}`)
        
        this.ripples.push(ripple);
    }
    
    createBossRipple(x, y, speed, bossRadius) {
        // 移除过多的波纹
        if (this.ripples.length >= this.maxRipples) {
            this.ripples.shift(); // 移除最老的波纹
        }
        
        // Boss波纹 - 水墨扩散效果
        const ripple = {
            x: x,
            y: y,
            radius: bossRadius * 0.2, // 更小的起始半径
            maxRadius: bossRadius * 5 + Math.max(speed * 1.2, 80), // 适中的最大半径
            age: 0,
            lifetime: 3000, // 固定3秒持续时间
            intensity: Math.max(0.4, Math.min(speed / 80, 1)), // 适中的强度
            fadeRate: 1 / 3000,
            isBossRipple: true,
            // 新增属性用于水墨效果
            pulsePhase: Math.random() * Math.PI * 2, // 脉动相位
            irregularity: 0.1 + Math.random() * 0.05, // 不规则程度
            inkSpread: 0 // 墨迹扩散进度
        };
        
        this.ripples.push(ripple);
    }
    
    createDeathRipple(x, y, characterRadius) {
        // 移除过多的波纹
        if (this.ripples.length >= this.maxRipples) {
            this.ripples.shift();
        }
        
        // 死亡波纹比普通波纹更强烈更持久
        const ripple = {
            x: x,
            y: y,
            radius: characterRadius * 0.8, // 起始半径稍大
            maxRadius: characterRadius * 8 + 80, // 死亡波纹更大
            age: 0,
            lifetime: 2000 + Math.random() * 1000, // 持续2-3秒
            intensity: 1.2, // 死亡波纹强度更高
            fadeRate: 1 / (2000 + Math.random() * 1000),
            isDeathRipple: true // 标记为死亡波纹
        };
        
        this.ripples.push(ripple);
    }
    
    createTransformRipple(x, y, config) {
        // 移除过多的波纹
        if (this.ripples.length >= this.maxRipples) {
            this.ripples.shift();
        }
        
        // 转化波纹具有特殊的视觉效果
        const ripple = {
            x: x,
            y: y,
            radius: 10,
            maxRadius: config.maxRadius || 150,
            age: 0,
            lifetime: config.lifetime || 2000,
            intensity: config.intensity || 1.5,
            fadeRate: 1 / (config.lifetime || 2000),
            isTransformRipple: true,
            transformType: config.type || 'default'
        };
        
        this.ripples.push(ripple);
    }
    
    updateRipples(deltaTime) {
        const currentTime = this.lastTime;
        
        // 更新所有波纹
        this.ripples = this.ripples.filter(ripple => {
            ripple.age += deltaTime * 1000; // 转换为毫秒
            
            // 计算当前半径（从小到大扩散）
            const progress = ripple.age / ripple.lifetime;
            ripple.currentRadius = ripple.radius + (ripple.maxRadius - ripple.radius) * progress;
            
            // 计算当前透明度（逐渐淡出）- 提高基础透明度
            ripple.currentOpacity = ripple.intensity * (1 - progress) * 0.6;
            
            // 移除生命周期结束的波纹
            return ripple.age < ripple.lifetime;
        });
    }
    
    renderRipples() {
        this.ctx.save();
        
        // 渲染所有波纹
        this.ripples.forEach(ripple => {
            if (ripple.currentOpacity > 0.01) {
                if (ripple.isBossRipple) {
                    // Boss波纹 - 精细水墨效果
                    const gradient = this.ctx.createRadialGradient(
                        ripple.x, ripple.y, ripple.currentRadius * 0.9,
                        ripple.x, ripple.y, ripple.currentRadius * 1.05
                    );
                    
                    gradient.addColorStop(0, `rgba(80, 80, 80, 0)`);
                    gradient.addColorStop(0.6, `rgba(60, 60, 60, ${ripple.currentOpacity * 0.8})`);
                    gradient.addColorStop(1, `rgba(40, 40, 40, ${ripple.currentOpacity * 0.6})`);
                    
                    // Boss波纹主线条 - 比角色更细
                    this.ctx.strokeStyle = gradient;
                    this.ctx.lineWidth = 1.8; // 大幅调细
                    this.ctx.globalAlpha = ripple.currentOpacity;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(ripple.x, ripple.y, ripple.currentRadius, 0, Math.PI * 2);
                    this.ctx.stroke();
                    
                    // Boss波纹只保留一个淡淡的内圈
                    if (ripple.currentRadius > ripple.radius * 1.5) {
                        const innerRadius = ripple.currentRadius * 0.75;
                        this.ctx.globalAlpha = ripple.currentOpacity * 0.15; // 很淡的内圈
                        this.ctx.lineWidth = 1.2;
                        this.ctx.beginPath();
                        this.ctx.arc(ripple.x, ripple.y, innerRadius, 0, Math.PI * 2);
                        this.ctx.stroke();
                    }
                } else if (ripple.isDeathRipple) {
                    // 死亡波纹特效 - 强烈扩散的墨迹效果
                    const gradient = this.ctx.createRadialGradient(
                        ripple.x, ripple.y, ripple.currentRadius * 0.3,
                        ripple.x, ripple.y, ripple.currentRadius * 1.4
                    );
                    
                    gradient.addColorStop(0, `rgba(120, 120, 120, 0)`);
                    gradient.addColorStop(0.2, `rgba(80, 80, 80, ${ripple.currentOpacity * 1.5})`);
                    gradient.addColorStop(0.5, `rgba(50, 50, 50, ${ripple.currentOpacity * 1.2})`);
                    gradient.addColorStop(0.8, `rgba(30, 30, 30, ${ripple.currentOpacity * 0.8})`);
                    gradient.addColorStop(1, `rgba(10, 10, 10, 0)`);
                    
                    // 死亡波纹主环 - 更厚重
                    this.ctx.strokeStyle = gradient;
                    this.ctx.lineWidth = 3.5;
                    this.ctx.globalAlpha = ripple.currentOpacity;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(ripple.x, ripple.y, ripple.currentRadius, 0, Math.PI * 2);
                    this.ctx.stroke();
                    
                    // 死亡波纹的多重扩散效果
                    if (ripple.currentRadius > ripple.radius * 1.3) {
                        // 内圈 - 浓重的墨迹
                        const innerRadius = ripple.currentRadius * 0.6;
                        this.ctx.globalAlpha = ripple.currentOpacity * 0.7;
                        this.ctx.lineWidth = 2.5;
                        this.ctx.beginPath();
                        this.ctx.arc(ripple.x, ripple.y, innerRadius, 0, Math.PI * 2);
                        this.ctx.stroke();
                        
                        // 外圈 - 淡散的边缘
                        const outerRadius = ripple.currentRadius * 1.3;
                        this.ctx.globalAlpha = ripple.currentOpacity * 0.3;
                        this.ctx.lineWidth = 1.8;
                        this.ctx.beginPath();
                        this.ctx.arc(ripple.x, ripple.y, outerRadius, 0, Math.PI * 2);
                        this.ctx.stroke();
                    }
                } else if (ripple.isTransformRipple) {
                    // 转化波纹特效 - 神秘而优雅的变化效果
                    const transformGradient = this.ctx.createRadialGradient(
                        ripple.x, ripple.y, ripple.currentRadius * 0.2,
                        ripple.x, ripple.y, ripple.currentRadius * 1.6
                    );
                    
                    // 根据转化类型调整颜色
                    let colorIntensity = ripple.currentOpacity;
                    if (ripple.transformType === 'reorganization') {
                        colorIntensity *= 1.3; // 重组阶段更强烈
                        transformGradient.addColorStop(0, `rgba(160, 160, 160, ${colorIntensity * 0.8})`);
                        transformGradient.addColorStop(0.3, `rgba(120, 120, 120, ${colorIntensity})`);
                        transformGradient.addColorStop(0.7, `rgba(80, 80, 80, ${colorIntensity * 0.7})`);
                        transformGradient.addColorStop(1, `rgba(40, 40, 40, 0)`);
                    } else if (ripple.transformType === 'birth') {
                        // 新生阶段 - 温和的光芒
                        transformGradient.addColorStop(0, `rgba(140, 140, 140, ${colorIntensity * 0.6})`);
                        transformGradient.addColorStop(0.4, `rgba(100, 100, 100, ${colorIntensity * 0.8})`);
                        transformGradient.addColorStop(0.8, `rgba(70, 70, 70, ${colorIntensity * 0.5})`);
                        transformGradient.addColorStop(1, `rgba(50, 50, 50, 0)`);
                    } else if (ripple.transformType === 'vortex_disappear') {
                        // 漩涡消失效果 - 深沉的收缩波纹
                        colorIntensity *= 1.5; // 更强烈的效果
                        transformGradient.addColorStop(0, `rgba(80, 80, 80, ${colorIntensity})`);
                        transformGradient.addColorStop(0.2, `rgba(60, 60, 60, ${colorIntensity * 1.2})`);
                        transformGradient.addColorStop(0.5, `rgba(40, 40, 40, ${colorIntensity * 0.9})`);
                        transformGradient.addColorStop(0.8, `rgba(20, 20, 20, ${colorIntensity * 0.6})`);
                        transformGradient.addColorStop(1, `rgba(10, 10, 10, 0)`);
        } else {
                        // 默认转化效果
                        transformGradient.addColorStop(0, `rgba(130, 130, 130, ${colorIntensity * 0.7})`);
                        transformGradient.addColorStop(0.5, `rgba(90, 90, 90, ${colorIntensity})`);
                        transformGradient.addColorStop(1, `rgba(60, 60, 60, 0)`);
                    }
                    
                    // 转化波纹主环 - 有脉动效果
                    const pulseEffect = 1 + Math.sin(Date.now() * 0.01) * 0.15;
                    this.ctx.strokeStyle = transformGradient;
                    
                    // 漩涡消失波纹使用特殊线宽
                    if (ripple.transformType === 'vortex_disappear') {
                        this.ctx.lineWidth = 4.5 * pulseEffect; // 更厚的线条
        } else {
                        this.ctx.lineWidth = 2.8 * pulseEffect;
                    }
                    
                    this.ctx.globalAlpha = ripple.currentOpacity;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(ripple.x, ripple.y, ripple.currentRadius, 0, Math.PI * 2);
                    this.ctx.stroke();
                    
                    // 转化波纹的多重环效果
                    if (ripple.currentRadius > 30) {
                        // 内环 - 能量聚集
                        const innerRadius = ripple.currentRadius * 0.5;
                        this.ctx.globalAlpha = ripple.currentOpacity * 0.6;
                        this.ctx.lineWidth = 2.0;
                        this.ctx.beginPath();
                        this.ctx.arc(ripple.x, ripple.y, innerRadius, 0, Math.PI * 2);
                        this.ctx.stroke();
                        
                        // 外环 - 能量扩散
                        if (ripple.currentRadius > 60) {
                            const outerRadius = ripple.currentRadius * 1.25;
                            this.ctx.globalAlpha = ripple.currentOpacity * 0.35;
                            this.ctx.lineWidth = 1.5;
                            this.ctx.beginPath();
                            this.ctx.arc(ripple.x, ripple.y, outerRadius, 0, Math.PI * 2);
                            this.ctx.stroke();
                        }
                    }
                } else {
                    // 普通角色波纹
                    const gradient = this.ctx.createRadialGradient(
                        ripple.x, ripple.y, ripple.currentRadius * 0.8,
                        ripple.x, ripple.y, ripple.currentRadius
                    );
                    
                    gradient.addColorStop(0, `rgba(140, 140, 140, 0)`);
                    gradient.addColorStop(0.6, `rgba(110, 110, 110, ${ripple.currentOpacity})`);
                    gradient.addColorStop(1, `rgba(90, 90, 90, ${ripple.currentOpacity * 0.7})`);
                    
                    // 绘制波纹圆环
                    this.ctx.strokeStyle = gradient;
                    this.ctx.lineWidth = 2.5;
                    this.ctx.globalAlpha = ripple.currentOpacity;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(ripple.x, ripple.y, ripple.currentRadius, 0, Math.PI * 2);
                    this.ctx.stroke();
                    
                    // 额外的内圈效果
                    if (ripple.currentRadius > ripple.radius * 1.5) {
                        const innerRadius = ripple.currentRadius * 0.6;
                        this.ctx.globalAlpha = ripple.currentOpacity * 0.3;
                        this.ctx.beginPath();
                        this.ctx.arc(ripple.x, ripple.y, innerRadius, 0, Math.PI * 2);
                        this.ctx.stroke();
                    }
                }
            }
        });
        
        this.ctx.restore();
    }
    
    renderBackground() {
        const time = this.lastTime * 0.0003; // 很慢的时间流逝
        
        // 1. 基础渐变背景 - 增强深度感
        const bgGradient = this.ctx.createRadialGradient(
            CONFIG.CANVAS_WIDTH * 0.3, CONFIG.CANVAS_HEIGHT * 0.2, 0,
            CONFIG.CANVAS_WIDTH * 0.7, CONFIG.CANVAS_HEIGHT * 0.8, CONFIG.CANVAS_WIDTH * 1.2
        );
        bgGradient.addColorStop(0, '#ffffff'); // 中心纯白
        bgGradient.addColorStop(0.4, '#fafafa'); // 向外渐变
        bgGradient.addColorStop(0.7, '#f5f5f5'); // 更深层次
        bgGradient.addColorStop(1, '#f0f0f0'); // 边缘较深
        
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // 2. 抽象几何图案层 - 远景
        this.renderGeometricPatterns(time);
        
        // 3. 动态粒子层 - 中景
        this.renderBackgroundParticles(time);
        
        // 4. 抽象形状层 - 近景
        this.renderAbstractShapes(time);
        
        // 5. 光线与氛围层
        this.renderAtmosphere(time);
        
        // 6. 抽象线条艺术层
        this.renderAbstractLines(time);
        
        // 7. 巨大的计时器背景
        this.renderGameTimer();
    }
    
    renderGeometricPatterns(time) {
        this.ctx.save();
        
        // 网格图案 - 以屏幕中心为交点，无动画
        const gridSize = 80;
        const gridOpacity = 0.08;
        
        this.ctx.strokeStyle = `rgba(0, 0, 0, ${gridOpacity})`;
        this.ctx.lineWidth = 0.5;
        
        // 计算屏幕中心点
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        
        // 从中心向右绘制垂直线
        for (let x = centerX; x < CONFIG.CANVAS_WIDTH; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
            this.ctx.stroke();
        }
        
        // 从中心向左绘制垂直线
        for (let x = centerX - gridSize; x >= 0; x -= gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
            this.ctx.stroke();
        }
        
        // 从中心向下绘制水平线
        for (let y = centerY; y < CONFIG.CANVAS_HEIGHT; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(CONFIG.CANVAS_WIDTH, y);
            this.ctx.stroke();
        }
        
        // 从中心向上绘制水平线
        for (let y = centerY - gridSize; y >= 0; y -= gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(CONFIG.CANVAS_WIDTH, y);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    renderBackgroundParticles(time) {
        this.ctx.save();
        
        // 已移除背景粒子以减少视觉干扰
        
        this.ctx.restore();
    }
    
    renderAbstractShapes(time) {
        this.ctx.save();
        
        // 已移除大型抽象圆形以减少视觉干扰
        
        this.ctx.restore();
    }
    
    renderAtmosphere(time) {
        this.ctx.save();
        
        // 1. 微妙的光线效果 - 从左上角到右下角
        const lightGradient = this.ctx.createLinearGradient(
            0, 0, 
            CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT
        );
        lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        lightGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
        lightGradient.addColorStop(0.7, 'rgba(240, 240, 240, 0.03)');
        lightGradient.addColorStop(1, 'rgba(230, 230, 230, 0.08)');
        
        this.ctx.fillStyle = lightGradient;
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // 2. 动态光束 - 极其微妙的对角线光效
        const beamCount = 3;
        for (let i = 0; i < beamCount; i++) {
            const beamAngle = (i / beamCount) * Math.PI + time * 0.05;
            const beamLength = CONFIG.CANVAS_WIDTH * 1.5;
            const beamWidth = 150;
            
            const startX = CONFIG.CANVAS_WIDTH / 2 + Math.cos(beamAngle) * beamLength;
            const startY = CONFIG.CANVAS_HEIGHT / 2 + Math.sin(beamAngle) * beamLength;
            const endX = CONFIG.CANVAS_WIDTH / 2 - Math.cos(beamAngle) * beamLength;
            const endY = CONFIG.CANVAS_HEIGHT / 2 - Math.sin(beamAngle) * beamLength;
            
            // 创建光束渐变
            const beamGradient = this.ctx.createLinearGradient(startX, startY, endX, endY);
            const beamOpacity = 0.04 + Math.sin(time * 0.7 + i * 2) * 0.02;
            
            beamGradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
            beamGradient.addColorStop(0.3, `rgba(245, 245, 245, ${beamOpacity})`);
            beamGradient.addColorStop(0.7, `rgba(240, 240, 240, ${beamOpacity * 0.7})`);
            beamGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
            
            // 绘制光束
            this.ctx.save();
            this.ctx.translate(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
            this.ctx.rotate(beamAngle);
            
            this.ctx.fillStyle = beamGradient;
            this.ctx.fillRect(-beamLength, -beamWidth / 2, beamLength * 2, beamWidth);
            
            this.ctx.restore();
        }
        
        // 3. 视觉噪点 - 增加质感
        const noiseCount = Math.floor(CONFIG.CANVAS_WIDTH / 150);
        for (let i = 0; i < noiseCount; i++) {
            const noiseX = (i * 1337) % CONFIG.CANVAS_WIDTH;
            const noiseY = ((i * 7919) % CONFIG.CANVAS_HEIGHT);
            const noiseSize = 0.5 + Math.sin(time * 2 + i) * 0.3;
            const noiseOpacity = 0.08 + Math.cos(time * 1.5 + i * 0.5) * 0.04;
            
            this.ctx.fillStyle = `rgba(100, 100, 100, ${noiseOpacity})`;
            this.ctx.beginPath();
            this.ctx.arc(noiseX, noiseY, noiseSize, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // 4. 景深虚化效果 - 边缘渐暗
        const vignette = this.ctx.createRadialGradient(
            CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, 0,
            CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, 
            Math.max(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT) * 0.8
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(0.9, 'rgba(0, 0, 0, 0.01)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.03)');
        
        this.ctx.fillStyle = vignette;
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        this.ctx.restore();
    }
    
    renderAbstractLines(time) {
        this.ctx.save();
        
        // 已完全移除所有背景曲线和几何图形以减少视觉干扰
        
        this.ctx.restore();
    }
    
    // 渲染游戏计时器背景
    renderGameTimer() {
        // 只有在游戏进行中才显示计时器
        if (this.gameState !== 'playing' && this.gameState !== 'gameOver') {
            return;
        }
        
        this.ctx.save();
        
        // 计算入场动画进度
        let animationProgress = 1;
        if (this.isGameStartAnimation) {
            const elapsed = performance.now() - this.gameStartAnimationTime;
            const animationDelay = 1000; // 延迟1秒开始
            const animationDuration = 1000; // 1秒动画时间
            
            if (elapsed < animationDelay) {
                animationProgress = 0;
            } else {
                const effectiveElapsed = elapsed - animationDelay;
                animationProgress = Math.min(effectiveElapsed / animationDuration, 1);
                animationProgress = this.easeOutQuart(animationProgress);
            }
        }
        
        // 如果还没开始动画，不渲染
        if (animationProgress === 0) {
            this.ctx.restore();
            return;
        }
        
        // 使用当前时间或最终时间
        const currentTime = this.isGameOver ? this.finalTime : this.gameTimer;
        
        // 格式化时间为 mm.ss.xxx
        const minutes = Math.floor(currentTime / 60000);
        const seconds = Math.floor((currentTime % 60000) / 1000);
        const milliseconds = Math.floor(currentTime % 1000);
        
        const timeString = `${minutes.toString().padStart(2, '0')}.${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
        
        // 设置巨大字体
        const fontSize = Math.min(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT) * 0.15; // 占屏幕15%
        this.ctx.font = `300 ${fontSize}px 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // 计算位置（屏幕中心稍微偏上）
        const x = CONFIG.CANVAS_WIDTH / 2;
        let y = CONFIG.CANVAS_HEIGHT * 0.3; // 在屏幕上方30%处
        
        // 添加轻微的滚动效果（垂直飘浮）
        if (!this.isGameOver) {
            const floatOffset = Math.sin(currentTime * 0.001) * 8; // 慢速上下飘浮，8像素幅度
            y += floatOffset;
        }
        
        // 淡色效果 - 不干扰前景
        let opacity = 0.08; // 很淡的透明度
        if (this.isGameOver) {
            opacity = 0.25; // 游戏结束时稍微明显一些
        } else {
            // 运行时添加轻微的透明度脉动
            const pulse = 0.02 + Math.sin(currentTime * 0.003) * 0.02; // 轻微脉动
            opacity += pulse;
        }
        
        // 应用入场动画透明度
        opacity *= animationProgress;
        
        // 绘制文字阴影（增加层次感）
        this.ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.5})`;
        this.ctx.fillText(timeString, x + 3, y + 3);
        
        // 绘制主文字
        this.ctx.fillStyle = `rgba(100, 100, 100, ${opacity})`;
        this.ctx.fillText(timeString, x, y);
        
        // 添加轻微的字符间距效果（让数字看起来更现代）
        this.ctx.letterSpacing = '0.05em';
        
        // 游戏结束时不显示额外提示，保持简洁
        
        this.ctx.restore();
    }
    
    render() {
        // 渲染分层背景系统
        this.renderBackground();
        
        // 渲染标题界面（在背景之上）
        if (this.gameState === 'title') {
            this.renderTitleContent();
        }
        
        // 绘制Boss的漩涡提示（在背景层）
        if (this.boss && this.boss.isActive) {
            this.boss.renderCenterVortex(this.ctx);
        }
        
        // 绘制波纹系统（在背景之上，角色之下）
        this.renderRipples();
        
        // 绘制所有角色
        this.characters.forEach((character, index) => {
            this.ctx.save();
            
            // 计算标题出场动画对角色的影响
            if (this.gameState === 'title' && this.titleExitAnimation) {
                const exitElapsed = performance.now() - this.titleExitStartTime;
                const exitProgress = Math.min(exitElapsed / this.titleExitDuration, 1);
                const exitOpacity = 1 - exitProgress; // 淡出
                
                this.ctx.globalAlpha = exitOpacity;
            }
            // 计算角色入场动画
            else if (this.isGameStartAnimation) {
                const elapsed = performance.now() - this.gameStartAnimationTime;
                const characterDelay = 200 + index * 50; // 每个角色延迟50ms，前200ms总延迟
                const animationDuration = 800; // 800ms动画时间
                
                let characterProgress = 0;
                if (elapsed > characterDelay) {
                    const effectiveElapsed = elapsed - characterDelay;
                    characterProgress = Math.min(effectiveElapsed / animationDuration, 1);
                    characterProgress = this.easeOutBack(characterProgress);
                }
                
                // 应用入场动画效果
                if (characterProgress < 1) {
                    // 缩放动画（从小变大）
                    const scale = 0.3 + characterProgress * 0.7;
                    this.ctx.translate(character.x, character.y);
                    this.ctx.scale(scale, scale);
                    this.ctx.translate(-character.x, -character.y);
                    
                    // 透明度动画
                    this.ctx.globalAlpha = characterProgress;
                }
            }
            
            character.render(this.ctx, this.lastTime);
            this.ctx.restore();
        });
        
        // 绘制Boss（在前景层）- 即使不活跃也要渲染爆炸效果
        if (this.boss && (this.boss.isActive || this.boss.state === 'exploding')) {
            this.boss.render(this.ctx);
        }
        
        // 游戏结束检查和显示
        if (this.isGameOver) {
            this.renderGameOverAnimation();
        }
        // Boss爆炸期间的提示（可选，让玩家知道在等待爆炸完成）
        else if (this.boss && this.boss.state === 'exploding' && 
                 this.playerCharacter && (this.playerCharacter.isDead || this.playerCharacter.isDying)) {
            // 轻微的提示文字，表明正在等待爆炸完成
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.font = '400 20px \'Segoe UI\', \'PingFang SC\', \'Microsoft YaHei\', sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            const centerX = CONFIG.CANVAS_WIDTH / 2;
            const centerY = CONFIG.CANVAS_HEIGHT / 2 + 150;
            
            // 轻微闪烁效果
            const flickerOpacity = 0.3 + Math.sin(this.lastTime * 0.005) * 0.2;
            this.ctx.globalAlpha = flickerOpacity;
            
            this.ctx.fillText('Boss爆炸中...', centerX, centerY);
            
            this.ctx.restore();
        }
    }
    
    // 渲染标题内容
    renderTitleContent() {
        this.ctx.save();
        
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        
        // 计算呼吸动画和出场动画参数
        const breathingScale = 1 + Math.sin(this.titleBreathingTime * 0.002) * 0.03; // 呼吸缩放
        const breathingOpacity = 0.8 + Math.sin(this.titleBreathingTime * 0.002) * 0.2; // 呼吸透明度
        
        let exitProgress = 0;
        let exitScale = 1;
        let exitOpacity = 1;
        
        if (this.titleExitAnimation) {
            const elapsed = performance.now() - this.titleExitStartTime;
            exitProgress = Math.min(elapsed / this.titleExitDuration, 1);
            exitScale = 1 + exitProgress * 0.3; // 放大30%
            exitOpacity = 1 - exitProgress; // 淡出
        }
        
        // 应用出场动画的全局缩放和透明度
        this.ctx.globalAlpha = exitOpacity;
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(exitScale, exitScale);
        this.ctx.translate(-centerX, -centerY);
        
        // 渲染三个大圆圈（角色可能的生成位置）
        this.renderTitleSpawnPositions(breathingScale, breathingOpacity);
        
        // 渲染主标题 "悟道" - 分别渲染两个字以精确控制位置
        this.ctx.fillStyle = `rgba(45, 45, 45, ${0.9 * breathingOpacity})`;
        
        // 呼吸动画缩放
        const titleScale = breathingScale * 0.8 + 0.2; // 更微妙的呼吸效果
        const fontSize = Math.min(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT) * 0.15 * titleScale;
        this.ctx.font = `300 ${fontSize}px 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // 添加文字阴影
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 2;
        
        // 计算字间距 - 标题居中
        const titleY = centerY - 20; // 调整到更居中的位置
        const charSpacing = Math.min(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT) * 0.3; // 字间距，增大间距
        
        // 分别渲染"悟"和"道"，添加轻微浮动效果
        const floatOffset = Math.sin(this.titleBreathingTime * 0.0015) * 2;
        this.ctx.fillText('悟', centerX - charSpacing/2, titleY + floatOffset);
        this.ctx.fillText('道', centerX + charSpacing/2, titleY + floatOffset);
        
        // 重置阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // 渲染中心吸收点
        if (this.titleCore) {
            this.titleCore.render(this.ctx, breathingScale, this.titleExitAnimation, exitProgress);
        }
        
        // 渲染操作说明
        this.renderTitleInstructions(breathingOpacity);
        
        this.ctx.restore();
    }
    
    // 渲染标题界面的三个生成位置圆圈
    renderTitleSpawnPositions(breathingScale = 1, breathingOpacity = 1) {
        this.ctx.save();
        
        this.titleCharacterSpawnPositions.forEach((pos, index) => {
            // 呼吸动画偏移
            const breathingOffset = Math.sin(this.titleBreathingTime * 0.002 + index * Math.PI * 0.6) * 2;
            const pulseScale = 0.95 + Math.sin(this.titleBreathingTime * 0.003 + index * Math.PI * 0.4) * 0.05;
            
            // 外圈
            const outerGradient = this.ctx.createRadialGradient(pos.x, pos.y, 20 * pulseScale, pos.x, pos.y, 30 * pulseScale);
            outerGradient.addColorStop(0, `rgba(60, 60, 60, ${0.3 * breathingOpacity})`);
            outerGradient.addColorStop(1, `rgba(40, 40, 40, ${0.1 * breathingOpacity})`);
            
            this.ctx.fillStyle = outerGradient;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y + breathingOffset, 30 * pulseScale, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 内圈
            const innerGradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 20 * pulseScale);
            innerGradient.addColorStop(0, `rgba(80, 80, 80, ${0.6 * breathingOpacity})`);
            innerGradient.addColorStop(1, `rgba(60, 60, 60, ${0.3 * breathingOpacity})`);
            
            this.ctx.fillStyle = innerGradient;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y + breathingOffset, 20 * pulseScale, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.ctx.restore();
    }
    
    // 渲染操作说明
    renderTitleInstructions(breathingOpacity = 1) {
        this.ctx.save();
        
        const instructionY = CONFIG.CANVAS_HEIGHT * 0.9;
        const fontSize = Math.min(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT) * 0.02;
        
        // 添加轻微的呼吸淡入淡出效果
        const instructionOpacity = breathingOpacity * 0.8;
        this.ctx.fillStyle = `rgba(100, 100, 100, ${instructionOpacity})`;
        this.ctx.font = `400 ${fontSize}px 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.letterSpacing = '0.05em';
        
        // 根据设备类型显示不同的操作说明
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 'ontouchstart' in window || window.innerWidth <= 768;
        const instructionText = isMobile ? 
            '拖拽屏幕控制黑色圆点移动，靠近并填充圆心以开始游戏' : 
            '使用WASD控制黑色圆点移动，靠近并填充圆心以开始游戏';
        
        this.ctx.fillText(instructionText, CONFIG.CANVAS_WIDTH / 2, instructionY);
        
        this.ctx.restore();
    }
    
    // 渲染游戏结束动画
    renderGameOverAnimation() {
        // 更新动画状态
        this.updateGameOverAnimation();
        
        // 不添加黑色遮罩，保持画面清晰
        this.ctx.save();
        
        // 根据游戏结束原因确定文字
        const gameOverText = this.gameOverReason === 'boss_explosion' ? '湮灭' : '迷失';
        const char1 = gameOverText[0]; // 第一个字
        const char2 = gameOverText[1]; // 第二个字
        
        // 设置文字样式 - 与首页标题使用相同的字体设置
        const fontSize = Math.min(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT) * 0.15;
        this.ctx.font = `300 ${fontSize}px 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.CANVAS_HEIGHT / 2;
        const charSpacing = Math.min(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT) * 0.3; // 字符间距，与首页保持一致
        
        // 第一个字的位置
        const char1X = centerX - charSpacing;
        const char2X = centerX + charSpacing;
        
        // 渲染第一个字（阶段0开始显示）
        if (this.gameOverAnimationPhase >= 0) {
            const char1Progress = this.getCharacterAnimationProgress(0);
            this.renderAnimatedCharacter(char1, char1X, centerY, char1Progress);
        }
        
        // 渲染第二个字（阶段1开始显示）
        if (this.gameOverAnimationPhase >= 1) {
            const char2Progress = this.getCharacterAnimationProgress(1);
            this.renderAnimatedCharacter(char2, char2X, centerY, char2Progress);
        }
        
        this.ctx.restore();
        
        // 显示重新开始提示文字（阶段2）
        if (this.gameOverAnimationPhase >= 2) {
            this.renderRestartHint();
        }
    }
    
    // 渲染重新开始提示文字
    renderRestartHint() {
        this.ctx.save();
        
        // 设置文字样式 - 使用较小的字体
        const fontSize = Math.min(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT) * 0.03;
        this.ctx.font = `400 ${fontSize}px 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // 计算位置 - 偏下方
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const hintY = CONFIG.CANVAS_HEIGHT * 0.8; // 屏幕下方80%处
        
        // 添加轻微的呼吸动画效果
        const breathOpacity = 0.6 + Math.sin(this.lastTime * 0.003) * 0.2;
        
        // 渲染文字阴影
        this.ctx.fillStyle = `rgba(0, 0, 0, ${breathOpacity * 0.3})`;
        this.ctx.fillText('点击任意位置重新开始', centerX + 1, hintY + 1);
        
        // 渲染主文字
        this.ctx.fillStyle = `rgba(100, 100, 100, ${breathOpacity})`;
        this.ctx.fillText('点击任意位置重新开始', centerX, hintY);
        
        this.ctx.restore();
    }
    
    // 更新游戏结束动画状态
    updateGameOverAnimation() {
        const elapsed = this.lastTime - this.gameOverAnimationStart;
        const phaseDuration = 600; // 每个阶段持续600ms
        
        // 确定当前动画阶段
        if (elapsed < phaseDuration) {
            this.gameOverAnimationPhase = 0; // 第一个字
        } else if (elapsed < phaseDuration * 2) {
            this.gameOverAnimationPhase = 1; // 第二个字
        } else if (elapsed < phaseDuration * 3) {
            this.gameOverAnimationPhase = 2; // 提示文字出现
        } else {
            this.gameOverAnimationPhase = 2; // 动画完成
        }
    }
    
    // 获取字符动画进度
    getCharacterAnimationProgress(charIndex) {
        const elapsed = this.lastTime - this.gameOverAnimationStart;
        const phaseDuration = 600;
        const charStartTime = charIndex * phaseDuration;
        const charElapsed = Math.max(0, elapsed - charStartTime);
        const progress = Math.min(charElapsed / phaseDuration, 1);
        
        // 使用缓动函数，营造水墨晕染的感觉
        return this.easeOutQuart(progress);
    }
    
    // 渲染带动画的字符
    renderAnimatedCharacter(char, x, y, progress) {
        if (progress <= 0) return;
        
        // 字符缩放动画（从小到大，带轻微回弹）
        const scale = progress < 0.8 ? progress * 1.25 : 1 + (1 - progress) * 0.25;
        
        // 透明度动画（水墨晕染效果）
        const opacity = Math.min(progress * 1.2, 1);
        
        // 字符颜色（水墨深浅变化）
        const baseOpacity = 0.9 * opacity;
        
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(scale, scale);
        this.ctx.globalAlpha = opacity;
        
        // 渲染字符阴影（水墨晕染效果）
        this.ctx.fillStyle = `rgba(0, 0, 0, ${baseOpacity * 0.3})`;
        this.ctx.fillText(char, 3, 3);
        
        // 渲染主字符（水墨主体）
        this.ctx.fillStyle = `rgba(45, 45, 45, ${baseOpacity})`;
        this.ctx.fillText(char, 0, 0);
        
        // 渲染字符光晕（水墨扩散效果）
        if (progress > 0.3) {
            const glowOpacity = (progress - 0.3) * 0.4 * opacity;
            this.ctx.shadowColor = `rgba(80, 80, 80, ${glowOpacity})`;
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = `rgba(60, 60, 60, ${baseOpacity * 0.8})`;
            this.ctx.fillText(char, 0, 0);
        }
        
        this.ctx.restore();
    }
    
    // 缓动函数 - 四次方缓出（水墨晕染效果）
    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }
    
    // 缓动函数 - 回弹效果（角色入场动画）
    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    
    gameLoop(currentTime = 0) {
        // 初始化lastTime（用于deltaTime计算）
        if (this.lastTime === 0) {
            this.lastTime = currentTime;
        }
        
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        if (deltaTime < 0.1) { // 防止大的时间跳跃
            this.update(deltaTime, currentTime);
        }
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});


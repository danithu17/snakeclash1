import * as THREE from 'three';

/**
 * Snake Clash 3D - Full Systems Implementation
 * Boss Fights, Daily Rewards, and Item Persistence
 */

const SKINS = [
    { id: 'cyan', color: 0x00f2ff, name: 'Cyan Neon' },
    { id: 'pink', color: 0xff007a, name: 'Pink Blaze' },
    { id: 'green', color: 0x00ff88, name: 'Emerald' },
    { id: 'gold', color: 0xffaa00, name: 'Golden Sun' },
    { id: 'purple', color: 0x9d00ff, name: 'Royal Purple' }
];

class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        this.clock = new THREE.Clock();
        this.gameState = 'MENU';
        this.selectedSkin = SKINS[0];
        
        this.minimap = {
            canvas: document.getElementById('minimap-canvas'),
            ctx: document.getElementById('minimap-canvas').getContext('2d')
        };
        this.minimap.canvas.width = 200;
        this.minimap.canvas.height = 200;

        // Persistence & Economy
        this.data = JSON.parse(localStorage.getItem('snakeClashData')) || {
            coins: 500,
            gems: 0,
            upgrades: { level: 0, speed: 0, magnet: 0 },
            lastClaim: 0
        };

        this.sessionCoins = 0;
        this.sessionTime = 0;
        this.gameLimit = 120; // 2 minutes

        this.combo = {
            count: 0,
            timer: 0,
            maxTime: 2.0, // 2 seconds to keep combo
            multiplier: 1.0,
            ui: document.getElementById('combo-ui'),
            val: document.getElementById('combo-val')
        };

        this.entities = { player: null, bots: [], foods: [], coins: [], boss: null };
        this.joystick = { active: false, base: document.getElementById('joystick-base'), handle: document.getElementById('joystick-handle'), vector: { x: 0, y: 0, strength: 0 } };
        
        this.arenaSize = 400; // Radius of 400
        this.arenaShrinkSpeed = 0.5; // Units per second
        this.minArenaSize = 100;

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.scene.background = new THREE.Color(0x0a0a1a);
        this.scene.fog = new THREE.Fog(0x0a0a1a, 30, 250);
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        
        this.createEnvironment();
        this.setupUI();
        this.setupControls();
        this.checkDaily();
        this.spawnPreview();
        this.animate();
    }

    save() { localStorage.setItem('snakeClashData', JSON.stringify(this.data)); this.updateMenuUI(); }

    checkDaily() {
        if (this.dailyShown) return;
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (now - (this.data.lastClaim || 0) > oneDay) {
            document.getElementById('daily-modal').classList.remove('hidden');
            this.dailyShown = true;
        }
    }

    createEnvironment() {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ color: 0x111122 }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.5;
        this.scene.add(floor);
        for(let i=0; i<1000; i++) {
            const dot = new THREE.Mesh(new THREE.CircleGeometry(0.1, 8), new THREE.MeshBasicMaterial({ color: 0x222244 }));
            dot.position.set(Math.random()*1000-500, -0.48, Math.random()*1000-500);
            dot.rotation.x = -Math.PI/2;
            this.scene.add(dot);
        }

        // Arena boundary visual
        const boundaryGeom = new THREE.RingGeometry(400, 410, 64);
        const boundaryMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
        this.boundaryMesh = new THREE.Mesh(boundaryGeom, boundaryMat);
        this.boundaryMesh.rotation.x = -Math.PI / 2;
        this.boundaryMesh.position.y = -0.4;
        this.scene.add(this.boundaryMesh);
    }

    setupUI() {
        document.getElementById('btn-start').onclick = () => this.startGame();
        document.getElementById('btn-skins').onclick = () => this.setState('SKINS');
        document.getElementById('btn-skins-back').onclick = () => this.setState('MENU');
        document.getElementById('btn-clans').onclick = () => this.setState('CLANS');
        document.getElementById('btn-clans-back').onclick = () => this.setState('MENU');

        const tabClans = document.getElementById('tab-clans');
        const tabLeaderboard = document.getElementById('tab-leaderboard');
        const clansContent = document.getElementById('clans-content');
        const leaderContent = document.getElementById('leaderboard-content');

        tabClans.onclick = () => {
            tabClans.style.background = 'var(--secondary)'; tabClans.style.color = 'black';
            tabLeaderboard.style.background = 'rgba(255,255,255,0.1)'; tabLeaderboard.style.color = 'white';
            clansContent.classList.remove('hidden'); leaderContent.classList.add('hidden');
        };
        tabLeaderboard.onclick = () => {
            tabLeaderboard.style.background = 'var(--secondary)'; tabLeaderboard.style.color = 'black';
            tabClans.style.background = 'rgba(255,255,255,0.1)'; tabClans.style.color = 'white';
            leaderContent.classList.remove('hidden'); clansContent.classList.add('hidden');
        };
        const claimBtn = document.getElementById('btn-claim-daily');
        const claimHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.data.coins += 1000;
            this.data.lastClaim = Date.now();
            this.save();
            document.getElementById('daily-modal').classList.add('hidden');
            this.dailyShown = false;
        };
        claimBtn.onclick = claimHandler;
        claimBtn.ontouchstart = claimHandler;

        document.getElementById('btn-reset').onclick = () => {
            localStorage.clear();
            location.reload();
        };

        const upgrade = (type) => {
            const cost = 100 + this.data.upgrades[type] * 250;
            if (this.data.coins >= cost) {
                this.data.coins -= cost;
                this.data.upgrades[type]++;
                this.save();
            }
        };
        ['level', 'speed', 'magnet'].forEach(t => document.getElementById(`upgrade-${t}`).onclick = () => upgrade(t));

        const grid = document.getElementById('skins-grid');
        SKINS.forEach(s => {
            const div = document.createElement('div');
            div.className = 'skin-item' + (s.id === this.selectedSkin.id ? ' selected' : '');
            div.innerHTML = `<div style="width:50px; height:50px; border-radius:50%; background:#${s.color.toString(16).padStart(6,'0')}"></div>`;
            div.onclick = () => { this.selectedSkin = s; this.spawnPreview(); document.querySelectorAll('.skin-item').forEach(e => e.classList.remove('selected')); div.classList.add('selected'); };
            grid.appendChild(div);
        });
        this.updateMenuUI();
    }

    updateMenuUI() {
        document.getElementById('coins-val').innerText = this.data.coins >= 1000 ? (this.data.coins/1000).toFixed(1) + 'K' : this.data.coins;
        document.getElementById('clans-coins-val').innerText = document.getElementById('coins-val').innerText;
        document.getElementById('gems-val').innerText = this.data.gems;
        ['level', 'speed', 'magnet'].forEach(t => {
            document.getElementById(`val-${t}-up`).innerText = `Lv ${this.data.upgrades[t]}`;
            document.getElementById(`cost-${t}-up`).innerText = `💰 ${100 + this.data.upgrades[t] * 250}`;
        });
    }

    setState(state) {
        this.gameState = state;
        document.getElementById('menu-screen').classList.toggle('hidden', state !== 'MENU');
        document.getElementById('skins-screen').classList.toggle('hidden', state !== 'SKINS');
        document.getElementById('clans-screen').classList.toggle('hidden', state !== 'CLANS');
        document.getElementById('hud').classList.toggle('hidden', state !== 'PLAYING');
        document.getElementById('gameover-screen').classList.toggle('hidden', state !== 'GAME_OVER');
        if (state === 'MENU') this.spawnPreview();
    }

    setupControls() {
        const handler = (e) => {
            if (this.gameState !== 'PLAYING') return;
            const x = e.clientX || (e.touches && e.touches[0].clientX);
            const y = e.clientY || (e.touches && e.touches[0].clientY);
            
            if (e.type === 'mousedown' || e.type === 'touchstart') {
                this.joystick.active = true; this.joystick.start = { x, y };
                this.joystick.base.style.display = 'block'; this.joystick.base.style.left = `${x-50}px`; this.joystick.base.style.top = `${y-50}px`;
            } else if ((e.type === 'mousemove' || e.type === 'touchmove') && this.joystick.active) {
                const dy = y - this.joystick.start.y, dx = x - this.joystick.start.x;
                const d = Math.sqrt(dx*dx+dy*dy), max = 50, activeD = Math.min(d, max), angle = Math.atan2(dy, dx);
                this.joystick.handle.style.left = `${50 + Math.cos(angle)*activeD}px`; this.joystick.handle.style.top = `${50 + Math.sin(angle)*activeD}px`;
                this.joystick.vector = { x: Math.cos(angle), y: Math.sin(angle), strength: activeD/max };
            } else { this.joystick.active = false; this.joystick.base.style.display = 'none'; this.joystick.vector = { x: 0, y: 0, strength: 0 }; }
        };
        ['mousedown', 'mousemove', 'mouseup', 'touchstart', 'touchmove', 'touchend'].forEach(evt => window.addEventListener(evt, handler));
    }

    spawnPreview() {
        if(this.entities.preview) this.entities.preview.destroy();
        this.entities.preview = new Snake(this.scene, this.selectedSkin.color, false);
        this.entities.preview.head.position.set(0, 1.5, -10);
        this.entities.preview.level = 20;
    }

    startGame() {
        this.setState('PLAYING');
        if(this.entities.preview) { this.entities.preview.destroy(); this.entities.preview = null; }
        
        this.entities.player = new Snake(this.scene, this.selectedSkin.color, true);
        this.entities.player.level = 10 + (this.data.upgrades.level * 5);
        this.entities.player.moveSpeed = 8 + (this.data.upgrades.speed * 0.4);
        this.magnetRadius = 4 + (this.data.upgrades.magnet * 1.5);
        this.bossSpawned = false;

        this.entities.bots.forEach(b => b.destroy());
        this.entities.foods.forEach(f => this.scene.remove(f));
        this.entities.bots = []; this.entities.foods = [];
        for(let i=0; i<10; i++) this.spawnBot();
        for(let i=0; i<100; i++) this.spawnItem('food');
        for(let i=0; i<5; i++) this.spawnItem('chest');
        this.arenaSize = 400;
        this.sessionCoins = 0;
        this.sessionTime = 0;
        this.combo.count = 0;
        this.combo.timer = 0;
        this.combo.multiplier = 1.0;
        this.combo.ui.style.transform = 'translate(-50%, -50%) scale(0)';
    }

    gameOver(reason) {
        if (this.gameState !== 'PLAYING') return;
        this.setState('GAME_OVER');
        
        const title = document.getElementById('gameover-title');
        if (reason === 'TIME_UP') {
            title.innerText = "TIME'S UP!";
            title.style.color = "#ffaa00";
        } else {
            title.innerText = "GAME OVER";
            title.style.color = "#ff0000";
        }

        // Apply rewards
        this.data.coins += this.sessionCoins;
        this.save();

        document.getElementById('session-coins-val').innerText = `+${this.sessionCoins}`;
        document.getElementById('session-level-val').innerText = `Lv ${Math.floor(this.entities.player.level)}`;

        setTimeout(() => {
            if (this.gameState === 'GAME_OVER') this.setState('MENU');
        }, 3000);
    }

    spawnBot() {
        const bot = new Snake(this.scene, SKINS[Math.floor(Math.random()*SKINS.length)].color, false);
        bot.head.position.set(Math.random()*300-150, 0, Math.random()*300-150);
        bot.level = 5 + Math.random()*25;
        this.entities.bots.push(bot);
    }

    spawnBoss() {
        this.entities.boss = new Snake(this.scene, 0xff0000, false);
        this.entities.boss.head.position.set(0, 0, -100);
        this.entities.boss.level = 500;
        this.entities.boss.moveSpeed = 4;
        this.bossHealth = 500;
        document.getElementById('boss-hud').classList.remove('hidden');
        this.bossSpawned = true;
    }

    spawnItem(type) {
        const color = type === 'food' ? new THREE.Color(`hsl(${Math.random()*360}, 100%, 60%)`) : 0xffcc00;
        let mesh;
        if (type === 'chest') {
            mesh = new THREE.Mesh(new THREE.BoxGeometry(3,3,3), new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.8, roughness: 0.2 }));
            mesh.add(new THREE.PointLight(0xffaa00, 1, 10));
        } else {
            mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5,8,8), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 }));
        }
        mesh.position.set(Math.random()*400-200, 0, Math.random()*400-200);
        mesh.type = type;
        this.scene.add(mesh);
        this.entities.foods.push(mesh);
    }

    spawnPelletsAt(pos, count) {
        for(let i=0; i<count; i++) {
            const color = new THREE.Color(`hsl(${Math.random()*360}, 100%, 60%)`);
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5,8,8), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 }));
            mesh.position.set(pos.x + (Math.random()-0.5)*10, 0, pos.z + (Math.random()-0.5)*10);
            mesh.type = 'food';
            this.scene.add(mesh);
            this.entities.foods.push(mesh);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = Math.min(this.clock.getDelta(), 0.1);

        if (this.gameState === 'PLAYING') {
            const p = this.entities.player;
            if (this.joystick.vector.strength > 0.1) {
                const target = Math.atan2(this.joystick.vector.x, this.joystick.vector.y);
                let diff = target - p.rotation;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                p.rotation += diff * 12 * delta;
            }
            p.update(delta);

            if (!this.bossSpawned && p.level > 100) this.spawnBoss();

            this.entities.foods.forEach((food, i) => {
                const d = p.head.position.distanceTo(food.position);
                if (d < this.magnetRadius) {
                    const speed = (1 - d/this.magnetRadius) * 40;
                    food.position.lerp(p.head.position, delta * speed);
                    if (d < 1.5) {
                        this.scene.remove(food); this.entities.foods.splice(i, 1);
                        
                        // Increase Combo
                        this.addCombo(1);

                        const rewardMult = this.combo.multiplier;
                        if (food.type === 'chest') {
                            p.level += 50 * rewardMult; this.sessionCoins += 200 * rewardMult;
                            this.spawnPelletsAt(food.position, 15);
                        } else {
                            p.level += 2 * rewardMult; this.sessionCoins += 10 * rewardMult;
                        }
                        this.spawnItem(food.type);
                        document.getElementById('player-level').innerText = Math.floor(p.level);
                    }
                }
            });

            if (this.entities.boss) {
                const b = this.entities.boss;
                const angle = Math.atan2(p.head.position.x - b.head.position.x, p.head.position.z - b.head.position.z);
                b.rotation = angle;
                b.update(delta);
                const d = p.head.position.distanceTo(b.head.position);
                if (d < 10) {
                    if (p.level >= b.level) {
                        this.bossHealth -= 50 * delta;
                        document.getElementById('boss-health-fill').style.width = (this.bossHealth/500 * 100) + '%';
                        if (this.bossHealth <= 0) {
                            p.level += 200; this.sessionCoins += 1000;
                            b.destroy(); this.entities.boss = null;
                            document.getElementById('boss-hud').classList.add('hidden');
                        }
                    } else { this.gameOver('DIED'); }
                }
            }

            // Arena Shrinking
            if (this.arenaSize > this.minArenaSize) {
                this.arenaSize -= this.arenaShrinkSpeed * delta;
                this.boundaryMesh.scale.set(this.arenaSize/400, this.arenaSize/400, 1);
            }

            this.entities.bots.forEach((bot, bIdx) => {
                bot.rotation += (Math.random()-0.5)*0.1;
                bot.update(delta);
                
                // Arena Boundary check
                if (bot.head.position.length() > this.arenaSize) {
                    bot.rotation = Math.atan2(-bot.head.position.x, -bot.head.position.z);
                }

                if (p.head.position.distanceTo(bot.head.position) < 3) {
                    if (p.level >= bot.level) { 
                        this.addCombo(5); // Big combo boost for kills
                        const mult = this.combo.multiplier;
                        p.level += bot.level*0.4*mult; 
                        this.sessionCoins += 100 * mult;
                        this.spawnPelletsAt(bot.head.position, 10);
                        bot.destroy(); 
                        this.entities.bots.splice(bIdx, 1); 
                        this.spawnBot(); 
                    }
                    else { 
                        this.spawnPelletsAt(p.head.position, 20);
                        this.gameOver('DIED'); 
                    }
                }
            });

            // Combo Decay
            if (this.combo.timer > 0) {
                this.combo.timer -= delta;
                if (this.combo.timer <= 0) {
                    this.combo.count = 0;
                    this.combo.multiplier = 1.0;
                    this.combo.ui.style.transform = 'translate(-50%, -50%) scale(0)';
                }
            }

            // Timer Logic
            this.sessionTime += delta;
            const remaining = Math.max(0, this.gameLimit - this.sessionTime);
            const m = Math.floor(remaining / 60);
            const s = Math.floor(remaining % 60);
            document.getElementById('game-time').innerText = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
            if (remaining <= 0) {
                this.gameOver('TIME_UP');
            }

            // Player Arena Boundary check
            if (p.head.position.length() > this.arenaSize) {
                this.gameOver('OUT_OF_BOUNDS'); 
            }

            this.camera.position.lerp(new THREE.Vector3(p.head.position.x, 60, p.head.position.z + 30), 0.1);
            this.camera.lookAt(p.head.position);

            this.updateMinimap();
        } else if (this.entities.preview) {
            this.entities.preview.rotation += delta * 0.5; this.entities.preview.update(delta);
        }
        this.renderer.render(this.scene, this.camera);
    }

    updateMinimap() {
        const ctx = this.minimap.ctx;
        ctx.clearRect(0,0,200,200);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.arc(100, 100, 95, 0, Math.PI*2); ctx.fill();

        const mapScale = 95 / 400; // arenaSize is radius

        // Draw Arena Boundary
        ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(100, 100, this.arenaSize * mapScale, 0, Math.PI*2); ctx.stroke();

        // Items
        this.entities.foods.forEach(f => {
            if(f.type === 'chest') {
                ctx.fillStyle = '#ffaa00';
                ctx.fillRect(100 + f.position.x*mapScale-2, 100 + f.position.z*mapScale-2, 4, 4);
            }
        });

        // Bots
        ctx.fillStyle = '#ff0000';
        this.entities.bots.forEach(b => {
            ctx.beginPath(); ctx.arc(100 + b.head.position.x*mapScale, 100 + b.head.position.z*mapScale, 3, 0, Math.PI*2); ctx.fill();
        });

        // Boss
        if (this.entities.boss) {
            ctx.fillStyle = '#ff0000'; ctx.beginPath();
            ctx.arc(100 + this.entities.boss.head.position.x*mapScale, 100 + this.entities.boss.head.position.z*mapScale, 6, 0, Math.PI*2);
            ctx.fill();
        }

        // Player
        ctx.fillStyle = '#00ff00';
        const p = this.entities.player;
        ctx.beginPath(); ctx.arc(100 + p.head.position.x*mapScale, 100 + p.head.position.z*mapScale, 4, 0, Math.PI*2); ctx.fill();
    }

    addCombo(amount) {
        this.combo.count += amount;
        this.combo.timer = this.combo.maxTime;
        this.combo.multiplier = 1.0 + (Math.floor(this.combo.count / 5) * 0.2); // Every 5 units increases mult by 0.2
        
        if (this.combo.count >= 2) {
            this.combo.val.innerText = 'x' + this.combo.multiplier.toFixed(1);
            this.combo.ui.style.transform = 'translate(-50%, -50%) scale(1.2)';
            setTimeout(() => {
                if(this.combo.timer > 0) this.combo.ui.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 100);
        }
    }
}

class Snake {
    constructor(scene, color, isPlayer) {
        this.scene = scene; this.color = color; this.level = 10; this.rotation = 0; this.moveSpeed = 10; this.history = []; this.segments = [];
        this.head = new THREE.Group();
        const skull = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.3 }));
        skull.scale.set(1, 0.8, 1.4);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        const le = eye.clone(); le.position.set(0.5, 0.4, 0.7);
        const re = eye.clone(); re.position.set(-0.5, 0.4, 0.7);
        this.head.add(skull, le, re); this.scene.add(this.head);
        
        this.canvas = document.createElement('canvas'); this.canvas.width = 128; this.canvas.height = 64;
        this.ctx = this.canvas.getContext('2d'); this.tex = new THREE.CanvasTexture(this.canvas);
        this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex }));
        this.sprite.scale.set(8, 4, 1); this.scene.add(this.sprite);
    }

    update(delta) {
        if(this.moveSpeed > 0) {
            this.head.position.x += Math.sin(this.rotation)*this.moveSpeed*delta;
            this.head.position.z += Math.cos(this.rotation)*this.moveSpeed*delta;
            this.head.rotation.y = this.rotation;
        }
        this.sprite.position.set(this.head.position.x, 6, this.head.position.z);
        this.ctx.clearRect(0,0,128,64); this.ctx.fillStyle = 'rgba(0,0,0,0.6)'; this.ctx.fillRect(10,10,108,44);
        this.ctx.font = 'bold 24px Outfit'; this.ctx.textAlign='center'; this.ctx.fillStyle='#fff';
        this.ctx.fillText('Lv.' + Math.floor(this.level), 64, 40); this.tex.needsUpdate = true;
        
        this.history.unshift(this.head.position.clone());
        if(this.history.length > 500) this.history.pop();
        const count = Math.min(100, Math.floor(this.level / 2.5) + 3);
        while(this.segments.length < count) {
            const s = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 12), new THREE.MeshStandardMaterial({ color: this.color, transparent:true, opacity:0.8 }));
            this.scene.add(s); this.segments.push(s);
        }
        while(this.segments.length > count) this.scene.remove(this.segments.pop());
        const spacing = 5;
        this.segments.forEach((s, i) => {
            const hIdx = (i+1)*spacing;
            if(this.history[hIdx]) {
                s.position.lerp(this.history[hIdx], 0.3);
                const scale = Math.max(0.4, 1 - (i/this.segments.length)*0.6); s.scale.set(scale, scale, scale);
            }
        });
    }

    destroy() { this.scene.remove(this.head); this.scene.remove(this.sprite); this.segments.forEach(s => this.scene.remove(s)); }
}

new Game();

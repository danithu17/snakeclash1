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

        // Persistence & Economy
        this.data = JSON.parse(localStorage.getItem('snakeClashData')) || {
            coins: 500,
            gems: 0,
            upgrades: { level: 0, speed: 0, magnet: 0 },
            lastClaim: 0
        };

        this.entities = { player: null, bots: [], foods: [], coins: [], boss: null };
        this.joystick = { active: false, base: document.getElementById('joystick-base'), handle: document.getElementById('joystick-handle'), vector: { x: 0, y: 0, strength: 0 } };

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
    }

    setupUI() {
        document.getElementById('btn-start').onclick = () => this.startGame();
        document.getElementById('btn-skins').onclick = () => this.setState('SKINS');
        document.getElementById('btn-skins-back').onclick = () => this.setState('MENU');
        document.getElementById('btn-claim-daily').onclick = (e) => {
            e.stopPropagation();
            if(!this.dailyShown) return;
            this.data.coins += 1000;
            this.data.lastClaim = Date.now();
            this.save();
            document.getElementById('daily-modal').classList.add('hidden');
            this.dailyShown = false;
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
        document.getElementById('hud').classList.toggle('hidden', state !== 'PLAYING');
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
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5,8,8), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 }));
        mesh.position.set(Math.random()*400-200, 0, Math.random()*400-200);
        mesh.type = type;
        this.scene.add(mesh);
        this.entities.foods.push(mesh);
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
                    food.position.lerp(p.head.position, 0.2);
                    if (d < 1.5) {
                        this.scene.remove(food); this.entities.foods.splice(i, 1);
                        p.level += 2; this.data.coins += 5; this.save(); this.spawnItem('food');
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
                            p.level += 200; this.data.coins += 5000; this.save();
                            b.destroy(); this.entities.boss = null;
                            document.getElementById('boss-hud').classList.add('hidden');
                        }
                    } else { this.setState('MENU'); }
                }
            }

            this.entities.bots.forEach((bot, bIdx) => {
                bot.rotation += (Math.random()-0.5)*0.1;
                bot.update(delta);
                if (p.head.position.distanceTo(bot.head.position) < 3) {
                    if (p.level >= bot.level) { p.level += bot.level*0.4; bot.destroy(); this.entities.bots.splice(bIdx, 1); this.spawnBot(); }
                    else { this.setState('MENU'); }
                }
            });

            this.camera.position.lerp(new THREE.Vector3(p.head.position.x, 60, p.head.position.z + 30), 0.1);
            this.camera.lookAt(p.head.position);
        } else if (this.entities.preview) {
            this.entities.preview.rotation += delta * 0.5; this.entities.preview.update(delta);
        }
        this.renderer.render(this.scene, this.camera);
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

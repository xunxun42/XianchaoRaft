/**
 * 咸潮 · 木筏掠夺试验场（双人 / 单人 vs AI）
 * ------------------------------------------------------------
 * 目的：用最小的规则验证一件事 ——
 *   把别人木筏上的海水过滤器拆走，他会不会渴死。
 *
 * 全部画面用 cc.Graphics 矢量绘制，零美术资源，方便直接改数值。
 * 挂在 Game.scene 的 App 节点上。
 */

import {
    _decorator, Component, Node, Graphics, Label, UITransform, Color,
    input, Input, KeyCode, view, Layers,
} from 'cc';
import * as ccAll from 'cc';

const { ccclass } = _decorator;

const DW = 1600;
const DH = 900;

/* ============================ 数值（想调就调这里） ============================ */

const CFG = {
    walk: 300,            // 木筏上移动速度
    swim: 205,            // 水里游
    swimCarry: 135,       // 抱着过滤器游

    hpMax: 100,
    thirstMax: 100,
    thirstRate: 2.2,      // 每秒口渴
    drinkGain: 45,        // 喝一口回多少口渴
    tankMax: 2,           // 水箱容量（口）
    prodTime: 16,         // 过滤器每 16 秒产 1 口水

    buildWood: 4,
    buildPlastic: 3,

    stealTime: 2.6,       // 拆过滤器要按住多久
    buildTime: 1.6,
    installTime: 1.0,
    hookTime: 0.55,

    starveDmg: 9,         // 渴死时每秒掉血
    sharkDmg: 16,

    debrisEvery: 1.55,    // 每 1.55 秒漂来一块垃圾
};

const RAFT_W = 420;
const RAFT_H = 280;

const RAFTS = [
    { x: -470, y: -10, ph: 0.0 },
    { x: 470, y: 40, ph: 1.7 },
];

const FILTER_OFF = { x: -95, y: 6 };
const TANK_OFF = { x: 100, y: 6 };

/* ============================ 颜色工具 ============================ */

const _cc = new Map<string, Color>();
function col(hex: string, a = 255): Color {
    const k = hex + '|' + a;
    let c = _cc.get(k);
    if (!c) {
        const n = parseInt(hex.slice(1), 16);
        c = new Color((n >> 16) & 255, (n >> 8) & 255, n & 255, a);
        _cc.set(k, c);
    }
    return c;
}

/* ============================ 类型 ============================ */

interface Keys { up: boolean; down: boolean; left: boolean; right: boolean; use: boolean; }

interface Player {
    id: number;
    name: string;
    hex: string;
    x: number; y: number;
    dirx: number; diry: number;
    hp: number; thirst: number;
    wood: number; plastic: number;
    tank: number; filter: boolean; prodT: number;
    carrying: boolean;
    alive: boolean;
    stun: number;
    kx: number; ky: number;
    actCd: number;
    holdT: number; holdKey: string;
    ring: number;
    keys: Keys;
    isBot: boolean;
    botT: number;
    botGoal: any;
    onRaft: number;
}

interface Debris { id: number; kind: 'wood' | 'plastic'; x: number; y: number; vx: number; vy: number; ph: number; }
interface Drop { x: number; y: number; life: number; ph: number; }
interface Msg { text: string; t: number; hex: string; }
interface Action {
    kind: string; x: number; y: number; need: number;
    text: string; key: string; ref?: any;
}

/* ============================ 主组件 ============================ */

@ccclass('GameRoot')
export class GameRoot extends Component {

    private gw!: Graphics;
    private gh!: Graphics;
    private worldNode!: Node;
    private hudNode!: Node;

    private lbP1!: Label;
    private lbP2!: Label;
    private lbName1!: Label;
    private lbName2!: Label;
    private lbPrompt1!: Label;
    private lbPrompt2!: Label;
    private lbMsg!: Label;
    private lbHint!: Label;
    private lbTask!: Label;
    private lbBig!: Label;
    private lbSub!: Label;

    private t = 0;
    private phase: 'menu' | 'play' | 'over' = 'menu';
    private mode: 'solo' | 'duo' = 'solo';

    private players: Player[] = [];
    private debris: Debris[] = [];
    private drops: Drop[] = [];
    private msgs: Msg[] = [];
    private debrisId = 0;
    private spawnT = 0;

    private shark = {
        x: 0, y: 0, ang: 0,
        mode: 'patrol' as 'patrol' | 'chase' | 'flee',
        biteCd: 0, timer: 0, tx: 0, ty: 0,
    };

    private shakeT = 0;
    private shakeMag = 0;

    private task = { gather: false, built: false, stole: false, dead: false };
    private overText = '';

    /* ---------------------------- 节点搭建 ---------------------------- */

    start() {
        this.buildNodes();
        this.bindInput();
        this.resetAll();
        this.phase = 'menu';
        // 调试用：浏览器控制台里可以直接 __game.players[0] 看状态
        (globalThis as any).__game = this;
        // 关掉左下角的 FPS 面板，别挡住任务清单
        try {
            const ccAny: any = (globalThis as any).cc || ccAll;
            if (ccAny?.profiler) {
                if (typeof ccAny.profiler.hideStats === 'function') ccAny.profiler.hideStats();
                if (typeof ccAny.profiler.hide === 'function') ccAny.profiler.hide();
            }
        } catch (e) { /* 忽略 */ }
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    private buildNodes() {
        // 世界层
        this.worldNode = new Node('World');
        this.worldNode.layer = Layers.Enum.UI_2D;
        this.worldNode.addComponent(UITransform).setContentSize(DW, DH);
        this.gw = this.worldNode.addComponent(Graphics);
        this.node.addChild(this.worldNode);

        // HUD 层（Graphics 先画，子节点 Label 后画）
        this.hudNode = new Node('Hud');
        this.hudNode.layer = Layers.Enum.UI_2D;
        this.hudNode.addComponent(UITransform).setContentSize(DW, DH);
        this.gh = this.hudNode.addComponent(Graphics);
        this.node.addChild(this.hudNode);

        this.lbP1 = this.mkLabel('P1', 20, 0, 1);
        this.lbP2 = this.mkLabel('P2', 20, 2, 1);
        this.lbName1 = this.mkLabel('N1', 16, 1, 1);
        this.lbName2 = this.mkLabel('N2', 16, 1, 1);
        this.lbPrompt1 = this.mkLabel('Q1', 18, 1, 1);
        this.lbPrompt2 = this.mkLabel('Q2', 18, 1, 1);
        this.lbMsg = this.mkLabel('Msg', 26, 1, 1);
        this.lbHint = this.mkLabel('Hint', 18, 1, 0);
        this.lbTask = this.mkLabel('Task', 18, 0, 0);
        this.lbBig = this.mkLabel('Big', 54, 1, 1);
        this.lbSub = this.mkLabel('Sub', 22, 1, 1);

        this.lbMsg.color = col('#ffe9a8');
        this.lbHint.color = col('#9fd9e8', 200);
        this.lbTask.color = col('#b9e6a8');
        this.lbBig.color = col('#ffe9a8');
        this.lbSub.color = col('#d6eef6');
        this.lbName1.color = col('#ffcf7a');
        this.lbName2.color = col('#8fd0ff');
        this.lbPrompt1.color = col('#ffe9a8');
        this.lbPrompt2.color = col('#a9dcff');
    }

    /** hAlign: 0 左 / 1 中 / 2 右 */
    private mkLabel(name: string, size: number, hAlign: number, vAlign: number): Label {
        const n = new Node(name);
        n.layer = Layers.Enum.UI_2D;
        const tr = n.addComponent(UITransform);
        tr.setAnchorPoint(hAlign === 0 ? 0 : hAlign === 2 ? 1 : 0.5, vAlign === 0 ? 0 : 1);
        const lb = n.addComponent(Label);
        lb.fontSize = size;
        lb.lineHeight = Math.round(size * 1.32);
        lb.fontFamily = 'Microsoft YaHei';
        lb.useSystemFont = true;
        lb.horizontalAlign = hAlign === 0
            ? Label.HorizontalAlign.LEFT
            : hAlign === 2 ? Label.HorizontalAlign.RIGHT : Label.HorizontalAlign.CENTER;
        lb.verticalAlign = vAlign === 0
            ? Label.VerticalAlign.BOTTOM
            : vAlign === 1 ? Label.VerticalAlign.CENTER : Label.VerticalAlign.TOP;
        lb.overflow = Label.Overflow.NONE;
        lb.enableWrapText = false;
        lb.color = col('#ffffff');
        this.hudNode.addChild(n);
        return lb;
    }

    /* ---------------------------- 输入 ---------------------------- */

    private bindInput() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    private onKeyDown(e: any) {
        const k = e.keyCode as number;

        // 1 / 2 任何时候都能换模式重开
        if (k === KeyCode.DIGIT_1 || k === KeyCode.NUM_1) { this.startGame('solo'); return; }
        if (k === KeyCode.DIGIT_2 || k === KeyCode.NUM_2) { this.startGame('duo'); return; }
        if (k === KeyCode.KEY_R) { this.startGame(this.mode); return; }

        if (k === KeyCode.KEY_W) this.p1().keys.up = true;
        if (k === KeyCode.KEY_S) this.p1().keys.down = true;
        if (k === KeyCode.KEY_A) this.p1().keys.left = true;
        if (k === KeyCode.KEY_D) this.p1().keys.right = true;
        if (k === KeyCode.KEY_E) this.p1().keys.use = true;

        if (!this.p2().isBot) {
            if (k === KeyCode.ARROW_UP) this.p2().keys.up = true;
            if (k === KeyCode.ARROW_DOWN) this.p2().keys.down = true;
            if (k === KeyCode.ARROW_LEFT) this.p2().keys.left = true;
            if (k === KeyCode.ARROW_RIGHT) this.p2().keys.right = true;
            if (k === KeyCode.ENTER || k === KeyCode.NUM_ENTER || k === KeyCode.SLASH) this.p2().keys.use = true;
        }
    }

    private onKeyUp(e: any) {
        const k = e.keyCode as number;

        if (k === KeyCode.KEY_W) this.p1().keys.up = false;
        if (k === KeyCode.KEY_S) this.p1().keys.down = false;
        if (k === KeyCode.KEY_A) this.p1().keys.left = false;
        if (k === KeyCode.KEY_D) this.p1().keys.right = false;
        if (k === KeyCode.KEY_E) this.p1().keys.use = false;

        if (k === KeyCode.ARROW_UP) this.p2().keys.up = false;
        if (k === KeyCode.ARROW_DOWN) this.p2().keys.down = false;
        if (k === KeyCode.ARROW_LEFT) this.p2().keys.left = false;
        if (k === KeyCode.ARROW_RIGHT) this.p2().keys.right = false;
        if (k === KeyCode.ENTER || k === KeyCode.NUM_ENTER || k === KeyCode.SLASH) this.p2().keys.use = false;
    }

    /* ---------------------------- 状态 ---------------------------- */

    private p1() { return this.players[0]; }
    private p2() { return this.players[1]; }

    private mkPlayer(id: number, hex: string): Player {
        return {
            id,
            name: id === 0 ? '你' : '邻居',
            hex,
            x: RAFTS[id].x, y: RAFTS[id].y + 80,
            dirx: 0, diry: -1,
            hp: CFG.hpMax, thirst: CFG.thirstMax,
            wood: 0, plastic: 0,
            tank: 0, filter: false, prodT: 0,
            carrying: false,
            alive: true,
            stun: 0, kx: 0, ky: 0, actCd: 0,
            holdT: 0, holdKey: '', ring: 0,
            keys: { up: false, down: false, left: false, right: false, use: false },
            isBot: false, botT: 0, botGoal: null, onRaft: id,
        };
    }

    private resetAll() {
        this.players = [this.mkPlayer(0, '#ffb03a'), this.mkPlayer(1, '#63b6ff')];
        this.players[0].name = '你';
        this.players[1].name = this.mode === 'solo' ? '邻居(AI)' : 'P2';
        this.players[1].isBot = this.mode === 'solo';

        this.debris = [];
        this.drops = [];
        this.msgs = [];
        this.spawnT = 0;
        this.t = 0;
        this.task = { gather: false, built: false, stole: false, dead: false };
        this.overText = '';
        this.shakeT = 0;
        this.seedDebris();

        this.shark.x = 0;
        this.shark.y = -10;
        this.shark.ang = 0;
        this.shark.mode = 'patrol';
        this.shark.biteCd = 0;
        this.shark.timer = 0;
    }

    private startGame(mode: 'solo' | 'duo') {
        this.mode = mode;
        this.resetAll();
        this.phase = 'play';
        this.toast('木筏已下水。先按 E 打捞木料和塑料。', '#ffe9a8');
    }

    private toast(text: string, hex = '#ffffff') {
        this.msgs.push({ text, t: 4.2, hex });
        if (this.msgs.length > 3) this.msgs.shift();
    }

    /* ---------------------------- 主循环 ---------------------------- */

    update(dt: number) {
        dt = Math.min(dt, 0.05);
        this.t += dt;

        if (this.phase === 'play') this.step(dt);
        this.draw();
    }

    private step(dt: number) {
        const a = this.players[0];
        const b = this.players[1];

        if (b.isBot && b.alive) this.thinkBot(b, dt);

        for (const p of this.players) if (p.alive) this.movePlayer(p, dt);
        for (const p of this.players) if (p.alive) this.interact(p, dt);
        for (const p of this.players) if (p.alive) this.survive(p, dt);

        this.stepShark(dt);

        this.spawnT += dt;
        if (this.spawnT >= CFG.debrisEvery) {
            this.spawnT = 0;
            this.spawnDebris();
        }
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const d = this.debris[i];
            d.x += d.vx * dt;
            d.y += Math.sin(this.t * 1.5 + d.ph) * 6 * dt;
            if (d.x > 1000) this.debris.splice(i, 1);
        }

        for (let i = this.drops.length - 1; i >= 0; i--) {
            this.drops[i].life -= dt;
            if (this.drops[i].life <= 0) this.drops.splice(i, 1);
        }

        for (let i = this.msgs.length - 1; i >= 0; i--) {
            this.msgs[i].t -= dt;
            if (this.msgs[i].t <= 0) this.msgs.splice(i, 1);
        }

        if (a.wood >= CFG.buildWood && a.plastic >= CFG.buildPlastic) this.task.gather = true;

        if (this.shakeT > 0) this.shakeT -= dt;
    }

    private shake(mag: number) {
        this.shakeT = 0.35;
        this.shakeMag = mag;
    }

    /* ---------------------------- 移动 / 地形 ---------------------------- */

    private raftAt(x: number, y: number): number {
        for (let i = 0; i < 2; i++) {
            const r = RAFTS[i];
            if (Math.abs(x - r.x) <= RAFT_W / 2 && Math.abs(y - r.y) <= RAFT_H / 2) return i;
        }
        return -1;
    }

    private clampToRaft(x: number, y: number, idx: number): { x: number, y: number } {
        const r = RAFTS[idx];
        const mx = RAFT_W / 2 - 30;
        const my = RAFT_H / 2 - 30;
        return {
            x: Math.max(r.x - mx, Math.min(r.x + mx, x)),
            y: Math.max(r.y - my, Math.min(r.y + my, y)),
        };
    }

    private movePlayer(p: Player, dt: number) {
        const k = p.keys;
        let ax = (k.right ? 1 : 0) - (k.left ? 1 : 0);
        let ay = (k.up ? 1 : 0) - (k.down ? 1 : 0);
        const len = Math.hypot(ax, ay);
        if (len > 0) { ax /= len; ay /= len; p.dirx = ax; p.diry = ay; }

        p.onRaft = this.raftAt(p.x, p.y);
        const onRaft = p.onRaft >= 0;
        const sp = onRaft ? CFG.walk : (p.carrying ? CFG.swimCarry : CFG.swim);

        if (Math.abs(p.kx) > 1 || Math.abs(p.ky) > 1) {
            p.x += p.kx * dt;
            p.y += p.ky * dt;
            const damp = Math.pow(0.0016, dt);
            p.kx *= damp;
            p.ky *= damp;
        }

        if (p.stun > 0) {
            p.stun -= dt;
        } else if (len > 0) {
            p.x += ax * sp * dt;
            p.y += ay * sp * dt;
        }

        p.x = Math.max(-780, Math.min(780, p.x));
        p.y = Math.max(-450, Math.min(420, p.y));

        if (p.actCd > 0) p.actCd -= dt;
    }

    /* ---------------------------- 互动 ---------------------------- */

    private filterPos(i: number) { return { x: RAFTS[i].x + FILTER_OFF.x, y: RAFTS[i].y + FILTER_OFF.y }; }
    private tankPos(i: number) { return { x: RAFTS[i].x + TANK_OFF.x, y: RAFTS[i].y + TANK_OFF.y }; }

    private findAction(p: Player): Action | null {
        const enemy = this.players[1 - p.id];
        const onOwn = p.onRaft === p.id;
        const onEnemy = p.onRaft === (1 - p.id);
        const onAny = p.onRaft >= 0;

        const list: Action[] = [];
        const add = (a: Action, d: number) => {
            (a as any)._d = d;
            list.push(a);
        };

        // 拆对方的过滤器
        if (onEnemy && enemy.filter && !p.carrying) {
            const f = this.filterPos(enemy.id);
            const d = Math.hypot(p.x - f.x, p.y - f.y);
            if (d < 86) {
                add({
                    kind: 'steal', x: f.x, y: f.y, need: CFG.stealTime,
                    text: '按住 E / Enter 拆走过滤器', key: 'steal' + enemy.id,
                }, d);
            }
        }

        // 装 / 造自己的过滤器
        if (onOwn && !p.filter) {
            const f = this.filterPos(p.id);
            const d = Math.hypot(p.x - f.x, p.y - f.y);
            if (d < 86) {
                if (p.carrying) {
                    add({ kind: 'install', x: f.x, y: f.y, need: CFG.installTime, text: '按住 装上过滤器', key: 'install' }, d);
                } else {
                    const ok = p.wood >= CFG.buildWood && p.plastic >= CFG.buildPlastic;
                    add({
                        kind: 'build', x: f.x, y: f.y, need: CFG.buildTime,
                        text: ok ? `按住 建造过滤器（${CFG.buildWood}木板 ${CFG.buildPlastic}塑料）`
                            : `还需要 ${CFG.buildWood}木板 ${CFG.buildPlastic}塑料`,
                        key: 'build',
                    }, d);
                }
            }
        }

        // 喝水
        if (onOwn && p.filter) {
            const tp = this.tankPos(p.id);
            const d = Math.hypot(p.x - tp.x, p.y - tp.y);
            if (d < 80) {
                add({
                    kind: 'drink', x: tp.x, y: tp.y, need: 0,
                    text: p.tank > 0 ? '按 E 喝一口水' : '水箱空了，等过滤器造水',
                    key: 'drink',
                }, d);
            }
        }

        // 打捞
        if (onAny) {
            let best: Debris | null = null;
            let bd = 1e9;
            for (const db of this.debris) {
                const d = Math.hypot(db.x - p.x, db.y - p.y);
                if (d < bd) { bd = d; best = db; }
            }
            if (best && bd < 190) {
                add({
                    kind: 'hook', x: best.x, y: best.y, need: CFG.hookTime,
                    text: '按住 打捞漂流物', key: 'hook' + best.id, ref: best,
                }, bd + 30);
            }
        }

        // 捡水里的过滤器
        if (!p.carrying) {
            for (const dr of this.drops) {
                const d = Math.hypot(dr.x - p.x, dr.y - p.y);
                if (d < 80) {
                    add({ kind: 'pickup', x: dr.x, y: dr.y, need: 0.6, text: '按住 捞起过滤器', key: 'pickup', ref: dr }, d);
                    break;
                }
            }
        }

        // 推人
        if (enemy.alive && !enemy.isBot) {
            const d = Math.hypot(enemy.x - p.x, enemy.y - p.y);
            if (d < 66) {
                add({ kind: 'push', x: enemy.x, y: enemy.y, need: 0, text: '按 E 推开对方', key: 'push' }, d - 20);
            }
        }

        if (!list.length) return null;
        list.sort((m, n) => (m as any)._d - (n as any)._d);
        return list[0];
    }

    private interact(p: Player, dt: number) {
        const a = this.findAction(p);
        p.ring = 0;

        if (!a || !p.keys.use) { p.holdT = 0; p.holdKey = ''; return; }

        if (p.holdKey !== a.key) { p.holdKey = a.key; p.holdT = 0; }

        if (a.kind === 'drink' || a.kind === 'push') {
            if (p.actCd > 0) return;
            p.actCd = 0.6;
            if (a.kind === 'drink') this.doDrink(p);
            else this.doPush(p);
            return;
        }

        p.holdT += dt;
        p.ring = Math.min(1, p.holdT / a.need);
        if (p.holdT >= a.need) {
            p.holdT = 0;
            p.holdKey = '';
            p.ring = 0;
            this.doComplete(p, a);
        }
    }

    private doDrink(p: Player) {
        if (p.tank <= 0) { this.toast(`${p.name} 的水箱是空的`, '#ffb0b0'); return; }
        p.tank -= 1;
        p.thirst = Math.min(CFG.thirstMax, p.thirst + CFG.drinkGain);
    }

    private doPush(p: Player) {
        const enemy = this.players[1 - p.id];
        if (!enemy.alive) return;
        const dx = enemy.x - p.x;
        const dy = enemy.y - p.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        enemy.stun = 0.45;
        enemy.kx = (dx / d) * 520;
        enemy.ky = (dy / d) * 520;
        this.shake(6);
        if (enemy.carrying) {
            enemy.carrying = false;
            this.drops.push({ x: enemy.x, y: enemy.y, life: 999, ph: Math.random() * 6 });
            this.toast(`${p.name} 撞了 ${enemy.name} 一下，过滤器掉海里了！`, '#ffd28a');
        } else {
            this.toast(`${p.name} 推开了 ${enemy.name}`, '#d6eef6');
        }
    }

    private doComplete(p: Player, a: Action) {
        const enemy = this.players[1 - p.id];

        if (a.kind === 'steal') {
            enemy.filter = false;
            enemy.prodT = 0;
            p.carrying = true;
            p.holdT = 0;
            this.task.stole = true;
            this.toast(`${p.name} 拆走了 ${enemy.name} 的海水过滤器！`, '#ff9b6a');
            this.toast(`${enemy.name} 的造水中断了 —— 水箱只剩 ${enemy.tank} 口。`, '#ffd28a');
            this.shake(10);
        } else if (a.kind === 'install') {
            p.carrying = false;
            p.filter = true;
            if (p.id === 0) this.task.built = true;
            this.toast(`${p.name} 装好了过滤器，开始造水`, '#9fffc4');
        } else if (a.kind === 'build') {
            if (p.wood < CFG.buildWood || p.plastic < CFG.buildPlastic) {
                this.toast('材料不够', '#ffb0b0');
                return;
            }
            p.wood -= CFG.buildWood;
            p.plastic -= CFG.buildPlastic;
            p.filter = true;
            p.prodT = 0;
            if (p.id === 0) this.task.built = true;
            this.toast(`${p.name} 造好了一台海水过滤器`, '#9fffc4');
        } else if (a.kind === 'hook') {
            const db = a.ref as Debris;
            const i = this.debris.indexOf(db);
            if (i >= 0) this.debris.splice(i, 1);
            if (db.kind === 'wood') { p.wood += 2; this.toast(`${p.name} 捞到 木板 x2`, '#d8c39a'); }
            else { p.plastic += 1; this.toast(`${p.name} 捞到 塑料 x1`, '#a9dcff'); }
        } else if (a.kind === 'pickup') {
            const dr = a.ref as Drop;
            const i = this.drops.indexOf(dr);
            if (i >= 0) this.drops.splice(i, 1);
            p.carrying = true;
            this.toast(`${p.name} 捞起了过滤器`, '#9fffc4');
        }
    }

    /* ---------------------------- 生存 ---------------------------- */

    private survive(p: Player, dt: number) {
        p.thirst -= CFG.thirstRate * dt;
        if (p.thirst <= 0) {
            p.thirst = 0;
            p.hp -= CFG.starveDmg * dt;
        }
        if (p.filter) {
            p.prodT += dt;
            if (p.prodT >= CFG.prodTime) {
                p.prodT -= CFG.prodTime;
                if (p.tank < CFG.tankMax) p.tank += 1;
            }
        }
        if (p.hp <= 0) { p.hp = 0; this.die(p); }
    }

    private die(p: Player) {
        if (!p.alive) return;
        p.alive = false;
        this.phase = 'over';
        if (p.id === 1) this.task.dead = true;
        const why = p.thirst <= 0 ? '渴死了' : '死了';
        this.overText = `${p.name} ${why}`;
        this.toast(`${p.name} ${why}`, '#ff8a8a');
        this.shake(14);
    }

    /* ---------------------------- 鲨鱼 ---------------------------- */

    private stepShark(dt: number) {
        const s = this.shark;
        if (s.biteCd > 0) s.biteCd -= dt;

        let target: Player | null = null;
        let bd = 1e9;
        for (const p of this.players) {
            if (!p.alive) continue;
            if (this.raftAt(p.x, p.y) >= 0) continue;
            const d = Math.hypot(p.x - s.x, p.y - s.y);
            if (d < 360 && d < bd) { bd = d; target = p; }
        }

        if (s.mode === 'flee') {
            s.timer -= dt;
            const dx = s.x - s.tx, dy = s.y - s.ty;
            const d = Math.max(1, Math.hypot(dx, dy));
            s.x += (dx / d) * 300 * dt;
            s.y += (dy / d) * 300 * dt;
            if (s.timer <= 0) s.mode = 'patrol';
        } else if (target) {
            s.mode = 'chase';
            const dx = target.x - s.x, dy = target.y - s.y;
            const d = Math.max(1, Math.hypot(dx, dy));
            s.ang = Math.atan2(dy, dx);
            s.x += (dx / d) * 245 * dt;
            s.y += (dy / d) * 245 * dt;
            if (d < 36 && s.biteCd <= 0) {
                s.biteCd = 7;
                target.hp -= CFG.sharkDmg;
                target.kx = (dx / d) * 620;
                target.ky = (dy / d) * 620;
                this.shake(12);
                this.toast(`鲨鱼咬中了 ${target.name}！ -${CFG.sharkDmg}`, '#ff8a8a');
                if (target.hp <= 0) { target.hp = 0; this.die(target); }
                s.mode = 'flee';
                s.timer = 2.6;
                s.tx = target.x;
                s.ty = target.y;
            }
        } else {
            s.mode = 'patrol';
            s.ang += dt * 0.55;
            const tx = Math.cos(s.ang) * 300;
            const ty = -10 + Math.sin(s.ang) * 165;
            s.x += (tx - s.x) * Math.min(1, dt * 1.6);
            s.y += (ty - s.y) * Math.min(1, dt * 1.6);
        }

        s.x = Math.max(-760, Math.min(760, s.x));
        s.y = Math.max(-420, Math.min(400, s.y));
    }

    /* ---------------------------- 漂流物 ---------------------------- */

    private spawnDebris() {
        const kind: 'wood' | 'plastic' = Math.random() < 0.58 ? 'wood' : 'plastic';
        this.debris.push({
            id: this.debrisId++,
            kind,
            x: -820,
            y: -380 + Math.random() * 700,
            vx: 62 + Math.random() * 42,
            vy: 0,
            ph: Math.random() * 6.28,
        });
    }

    /** 开局先在水面上铺几块，别让人干等 */
    private seedDebris() {
        for (let i = 0; i < 7; i++) {
            this.debris.push({
                id: this.debrisId++,
                kind: Math.random() < 0.58 ? 'wood' : 'plastic',
                x: -560 + i * 190,
                y: -300 + Math.random() * 560,
                vx: 62 + Math.random() * 42,
                vy: 0,
                ph: Math.random() * 6.28,
            });
        }
    }

    /* ---------------------------- AI ---------------------------- */

    private thinkBot(p: Player, dt: number) {
        const enemy = this.players[1 - p.id];
        const k = p.keys;
        p.botT -= dt;
        if (p.botT <= 0) {
            p.botT = 0.32;
            p.botGoal = this.pickBotGoal(p, enemy);
        }
        k.up = false; k.down = false; k.left = false; k.right = false;

        const g = p.botGoal;
        if (!g) { k.use = false; return; }

        const dx = g.x - p.x;
        const dy = g.y - p.y;
        const d = Math.hypot(dx, dy);

        if (d > 24) {
            k.use = false;
            if (dx > 10) k.right = true; else if (dx < -10) k.left = true;
            if (dy > 10) k.up = true; else if (dy < -10) k.down = true;
        } else {
            k.use = true;
        }
    }

    private pickBotGoal(p: Player, enemy: Player): any {
        const myF = this.filterPos(p.id);
        const myT = this.tankPos(p.id);

        if (p.filter && enemy.alive && this.raftAt(enemy.x, enemy.y) === p.id) {
            if (Math.hypot(enemy.x - myF.x, enemy.y - myF.y) < 130) {
                return { kind: 'push', x: enemy.x, y: enemy.y };
            }
        }
        if (p.thirst < 62 && p.tank > 0) {
            return { kind: 'drink', x: myT.x, y: myT.y };
        }
        if (p.carrying && !p.filter) {
            return { kind: 'install', x: myF.x, y: myF.y };
        }
        if (!p.filter && !p.carrying && p.wood >= CFG.buildWood && p.plastic >= CFG.buildPlastic) {
            return { kind: 'build', x: myF.x, y: myF.y };
        }
        if (p.filter && !p.carrying && enemy.filter && enemy.alive && this.t > 50) {
            const ef = this.filterPos(enemy.id);
            return { kind: 'raid', x: ef.x, y: ef.y };
        }

        let best: Debris | null = null;
        let bd = 1e9;
        for (const db of this.debris) {
            const d = Math.hypot(db.x - p.x, db.y - p.y);
            if (d < bd) { bd = d; best = db; }
        }
        if (best) {
            const c = this.clampToRaft(best.x, best.y, p.id);
            return { kind: 'hook', x: c.x, y: c.y };
        }
        return { kind: 'idle', x: RAFTS[p.id].x, y: RAFTS[p.id].y + 60 };
    }

    /* ---------------------------- 绘制入口 ---------------------------- */

    private draw() {
        this.gw.clear();
        this.gh.clear();

        const sx = this.shakeT > 0 ? (Math.random() - 0.5) * this.shakeMag : 0;
        const sy = this.shakeT > 0 ? (Math.random() - 0.5) * this.shakeMag : 0;
        this.worldNode.setPosition(sx, sy, 0);

        this.drawOcean();
        this.drawRaft(0);
        this.drawRaft(1);
        this.drawEquipment(0);
        this.drawEquipment(1);
        this.drawDebris();
        this.drawDrops();
        this.drawShark();
        for (const p of this.players) this.drawPlayer(p);
        for (const p of this.players) this.drawHold(p);

        this.drawHud();
        this.updateLabels();

        if (this.phase === 'menu') this.drawMenu();
        if (this.phase === 'over') this.drawOver();
    }

    /* ---------------------------- 世界绘制 ---------------------------- */

    private drawOcean() {
        const g = this.gw;
        const t = this.t;

        g.fillColor = col('#14556d');
        g.rect(-1400, -800, 2800, 1600);
        g.fill();

        for (let i = 0; i < 20; i++) {
            const y = -560 + i * 58;
            g.strokeColor = col(i % 2 ? '#7fd4e8' : '#3e9dbd', 26);
            g.lineWidth = i % 2 ? 2 : 3;
            g.moveTo(-1400, y);
            for (let x = -1400; x <= 1400; x += 56) {
                g.lineTo(x, y + Math.sin(x * 0.006 + t * 1.1 + i * 0.7) * 9);
            }
            g.stroke();
        }

        for (let i = 0; i < 26; i++) {
            const px = ((i * 137.5) % 1400) - 700 + Math.sin(t * 0.35 + i) * 22;
            const py = ((i * 89.3) % 900) - 450 + Math.cos(t * 0.28 + i * 1.7) * 16;
            g.fillColor = col('#bfefff', 14);
            g.circle(px, py, 26 + (i % 4) * 12);
            g.fill();
        }
    }

    private raftBob(i: number) {
        return Math.sin(this.t * 1.25 + RAFTS[i].ph) * 4;
    }

    private drawRaft(i: number) {
        const g = this.gw;
        const r = RAFTS[i];
        const cx = r.x;
        const cy = r.y + this.raftBob(i);
        const w = RAFT_W, h = RAFT_H;

        g.fillColor = col('#08303f', 105);
        g.ellipse(cx, cy - h * 0.46, w * 0.56, h * 0.2);
        g.fill();

        g.fillColor = col('#6b4a2b');
        g.roundRect(cx - w / 2 - 10, cy - h / 2 - 10, w + 20, h + 20, 30);
        g.fill();

        g.fillColor = col('#cba06a');
        g.roundRect(cx - w / 2, cy - h / 2, w, h, 24);
        g.fill();

        g.strokeColor = col('#a8814f', 200);
        g.lineWidth = 3;
        for (let y = cy - h / 2 + 26; y < cy + h / 2 - 14; y += 26) {
            g.moveTo(cx - w / 2 + 16, y);
            g.lineTo(cx + w / 2 - 16, y);
        }
        g.stroke();

        g.strokeColor = col('#8a6236');
        g.lineWidth = 7;
        g.roundRect(cx - w / 2 + 7, cy - h / 2 + 7, w - 14, h - 14, 19);
        g.stroke();

        for (let k = 0; k < 4; k++) {
            const px = cx + (k % 2 === 0 ? -1 : 1) * (w / 2 - 20);
            const py = cy + (k < 2 ? 1 : -1) * (h / 2 - 20);
            g.fillColor = col('#7d5832');
            g.circle(px, py, 11);
            g.fill();
            g.fillColor = col('#a8814f');
            g.circle(px, py - 2, 6);
            g.fill();
        }

        g.fillColor = col(i === 0 ? '#ffb03a' : '#63b6ff', 90);
        g.roundRect(cx - 62, cy + h / 2 - 44, 124, 26, 12);
        g.fill();
    }

    private drawEquipment(i: number) {
        const g = this.gw;
        const p = this.players[i];
        const bob = this.raftBob(i);
        const f = this.filterPos(i);
        const tp = this.tankPos(i);
        const fx = f.x, fy = f.y + bob;
        const tx = tp.x, ty = tp.y + bob;

        // ---- 水箱 ----
        g.fillColor = col('#3e5058');
        g.roundRect(tx - 28, ty - 40, 56, 80, 12);
        g.fill();
        g.fillColor = col('#4f6870');
        g.roundRect(tx - 23, ty - 35, 46, 70, 9);
        g.fill();

        const lvl = Math.max(0, Math.min(1, p.tank / CFG.tankMax));
        if (lvl > 0.02) {
            const hh = 66 * lvl;
            g.fillColor = col('#39b9e8');
            g.roundRect(tx - 20, ty - 32, 40, hh, 7);
            g.fill();
            g.fillColor = col('#9fe8ff', 120);
            g.roundRect(tx - 20, ty - 32 + hh * 0.62, 40, hh * 0.38, 7);
            g.fill();
        }
        g.strokeColor = col('#243038');
        g.lineWidth = 3;
        g.roundRect(tx - 28, ty - 40, 56, 80, 12);
        g.stroke();
        g.strokeColor = col('#8fa3ae');
        g.lineWidth = 6;
        g.moveTo(tx - 28, ty - 22);
        g.lineTo(tx - 44, ty - 22);
        g.stroke();

        // ---- 过滤器 ----
        if (p.filter) {
            g.fillColor = col('#2f3d45');
            g.roundRect(fx - 38, fy - 44, 76, 88, 12);
            g.fill();
            g.fillColor = col('#93a9b4');
            g.roundRect(fx - 29, fy - 37, 58, 72, 9);
            g.fill();
            g.fillColor = col('#c3d6de');
            g.roundRect(fx - 25, fy - 33, 50, 22, 6);
            g.fill();

            g.fillColor = col('#0f3a44');
            g.circle(fx, fy + 8, 15);
            g.fill();
            const pulse = (Math.sin(this.t * 4) + 1) * 0.5;
            g.fillColor = col('#3fe0c0', 150 + pulse * 90);
            g.circle(fx, fy + 8, 9 + pulse * 3);
            g.fill();

            const on = Math.sin(this.t * 7) > 0;
            g.fillColor = on ? col('#7cff9a') : col('#2f9c4a');
            g.circle(fx - 21, fy + 36, 5);
            g.fill();

            g.strokeColor = col('#6e8491');
            g.lineWidth = 7;
            g.moveTo(fx + 38, fy - 8);
            g.lineTo(tx - 28, ty - 8);
            g.stroke();
        } else {
            g.fillColor = col('#000000', 40);
            g.roundRect(fx - 38, fy - 44, 76, 88, 12);
            g.fill();
            g.strokeColor = col('#ffffff', 90);
            g.lineWidth = 3;
            g.roundRect(fx - 38, fy - 44, 76, 88, 12);
            g.stroke();
        }
    }

    private drawDebris() {
        const g = this.gw;
        for (const d of this.debris) {
            const bob = Math.sin(this.t * 2 + d.ph) * 4;
            const x = d.x, y = d.y + bob;
            g.fillColor = col('#06222c', 70);
            g.ellipse(x, y - 8, 22, 7);
            g.fill();

            if (d.kind === 'wood') {
                g.fillColor = col('#b8874f');
                g.roundRect(x - 22, y - 8, 44, 16, 6);
                g.fill();
                g.strokeColor = col('#7d5a30');
                g.lineWidth = 2;
                g.roundRect(x - 22, y - 8, 44, 16, 6);
                g.stroke();
            } else {
                g.fillColor = col('#8fd8f0', 210);
                g.roundRect(x - 14, y - 11, 28, 22, 8);
                g.fill();
                g.fillColor = col('#ffffff', 120);
                g.roundRect(x - 9, y - 6, 8, 12, 3);
                g.fill();
            }
        }
    }

    private drawDrops() {
        const g = this.gw;
        for (const dr of this.drops) {
            const bob = Math.sin(this.t * 2.4 + dr.ph) * 5;
            const x = dr.x, y = dr.y + bob;
            g.fillColor = col('#0a3d4d', 90);
            g.ellipse(x, y - 12, 30, 10);
            g.fill();
            g.fillColor = col('#93a9b4');
            g.roundRect(x - 24, y - 20, 48, 40, 9);
            g.fill();
            g.fillColor = col('#3fe0c0', 140);
            g.circle(x, y, 8);
            g.fill();
            g.strokeColor = col('#ffffff', 160);
            g.lineWidth = 2;
            g.roundRect(x - 24, y - 20, 48, 40, 9);
            g.stroke();
        }
    }

    private drawShark() {
        const g = this.gw;
        const s = this.shark;
        const chase = s.mode === 'chase';
        const body = chase ? col('#4a5860') : col('#5b6b75');

        g.fillColor = col('#06222c', 80);
        g.ellipse(s.x, s.y - 16, 52, 18);
        g.fill();

        g.fillColor = body;
        g.moveTo(s.x - 44, s.y);
        g.lineTo(s.x - 74, s.y - 18);
        g.lineTo(s.x - 70, s.y + 6);
        g.close();
        g.fill();

        g.fillColor = body;
        g.ellipse(s.x, s.y, 46, 20);
        g.fill();

        g.fillColor = chase ? col('#38454c') : col('#46545c');
        g.moveTo(s.x - 6, s.y + 14);
        g.lineTo(s.x + 6, s.y + 40);
        g.lineTo(s.x + 18, s.y + 12);
        g.close();
        g.fill();

        g.fillColor = col('#ffffff');
        g.circle(s.x + 30, s.y + 6, 4);
        g.fill();
        g.fillColor = col('#1a1a1a');
        g.circle(s.x + 31, s.y + 6, 2);
        g.fill();
    }

    private drawPlayer(p: Player) {
        const g = this.gw;
        if (!p.alive) {
            g.fillColor = col('#000000', 90);
            g.circle(p.x, p.y, 18);
            g.fill();
            return;
        }
        const inWater = p.onRaft < 0;

        if (inWater) {
            const r1 = 22 + Math.sin(this.t * 4) * 4;
            g.strokeColor = col('#cdf4ff', 110);
            g.lineWidth = 2;
            g.circle(p.x, p.y, r1);
            g.stroke();
            g.strokeColor = col('#cdf4ff', 60);
            g.circle(p.x, p.y, r1 + 10);
            g.stroke();
        }

        g.fillColor = col('#000000', 70);
        g.ellipse(p.x, p.y - 18, 17, 7);
        g.fill();

        if (p.carrying) {
            g.fillColor = col('#8fa3ae');
            g.roundRect(p.x - 22, p.y + 8, 44, 34, 8);
            g.fill();
            g.fillColor = col('#3fe0c0', 180);
            g.circle(p.x, p.y + 25, 7);
            g.fill();
        }

        g.fillColor = col(p.hex);
        g.circle(p.x, p.y, 17);
        g.fill();
        g.strokeColor = col('#ffffff', 210);
        g.lineWidth = 3;
        g.circle(p.x, p.y, 17);
        g.stroke();

        const hx = p.x + p.dirx * 8;
        const hy = p.y + p.diry * 8;
        g.fillColor = col('#ffe0bd');
        g.circle(hx, hy, 8);
        g.fill();

        const px = -p.diry, py = p.dirx;
        g.fillColor = col('#22303a');
        g.circle(hx + px * 3, hy + py * 3, 1.8);
        g.fill();
        g.circle(hx - px * 3, hy - py * 3, 1.8);
        g.fill();

        if (p.stun > 0) {
            g.strokeColor = col('#ffd166');
            g.lineWidth = 3;
            g.circle(p.x, p.y, 24);
            g.stroke();
        }
    }

    private drawHold(p: Player) {
        if (p.ring <= 0.001) return;
        const g = this.gw;
        const start = Math.PI / 2;
        g.strokeColor = col('#000000', 110);
        g.lineWidth = 9;
        g.arc(p.x, p.y - 6, 27, 0, Math.PI * 2, false);
        g.stroke();
        g.strokeColor = col('#ffe9a8');
        g.lineWidth = 7;
        g.arc(p.x, p.y - 6, 27, start, start + Math.PI * 2 * p.ring, false);
        g.stroke();
    }

    /* ---------------------------- HUD ---------------------------- */

    private drawHud() {
        const g = this.gh;
        const vs = view.getVisibleSize();
        const hw = vs.width / 2;
        const hh = vs.height / 2;

        const pw = 420;
        const ph = 150;

        for (let i = 0; i < 2; i++) {
            const p = this.players[i];
            const x = i === 0 ? -hw + 26 : hw - 26 - pw;
            const y = hh - 26 - ph;
            g.fillColor = col('#04161e', 185);
            g.roundRect(x, y, pw, ph, 16);
            g.fill();
            g.strokeColor = col(i === 0 ? '#ffb03a' : '#63b6ff', 150);
            g.lineWidth = 3;
            g.roundRect(x, y, pw, ph, 16);
            g.stroke();

            const tw = pw - 32;
            g.fillColor = col('#000000', 120);
            g.roundRect(x + 16, y + 14, tw, 9, 4);
            g.fill();
            g.fillColor = col('#39b9e8');
            g.roundRect(x + 16, y + 14, tw * Math.max(0, p.thirst / CFG.thirstMax), 9, 4);
            g.fill();

            g.fillColor = col('#000000', 120);
            g.roundRect(x + 16, y + 28, tw, 9, 4);
            g.fill();
            g.fillColor = col('#ef6b6b');
            g.roundRect(x + 16, y + 28, tw * Math.max(0, p.hp / CFG.hpMax), 9, 4);
            g.fill();
        }

        if (this.msgs.length) {
            g.fillColor = col('#04161e', 120);
            g.roundRect(-330, hh - 132, 660, 40 + this.msgs.length * 30, 14);
            g.fill();
        }
    }

    private updateLabels() {
        const vs = view.getVisibleSize();
        const hw = vs.width / 2;
        const hh = vs.height / 2;

        for (let i = 0; i < 2; i++) {
            const p = this.players[i];
            const lb = i === 0 ? this.lbP1 : this.lbP2;
            const x = i === 0 ? -hw + 42 : hw - 42;
            const y = hh - 38;
            lb.node.setPosition(x, y, 0);
            const st = p.alive
                ? (p.filter ? '运转中' : (p.carrying ? '被拆走（抱着）' : '缺失'))
                : '死亡';
            lb.string =
                `P${i + 1} · ${p.name}\n` +
                `生命 ${Math.round(p.hp)}    口渴 ${Math.round(p.thirst)}\n` +
                `木板 ${p.wood}   塑料 ${p.plastic}   水箱 ${p.tank}/${CFG.tankMax}\n` +
                `过滤器：${st}`;
        }

        for (let i = 0; i < 2; i++) {
            const p = this.players[i];
            const lb = i === 0 ? this.lbName1 : this.lbName2;
            lb.node.setPosition(p.x, p.y + 46, 0);
            lb.string = p.alive ? p.name : `${p.name}（倒下）`;
            lb.node.active = p.alive;
        }

        for (let i = 0; i < 2; i++) {
            const p = this.players[i];
            const lb = i === 0 ? this.lbPrompt1 : this.lbPrompt2;
            const a = (p.alive && this.phase === 'play') ? this.findAction(p) : null;
            if (a) {
                lb.node.active = true;
                lb.node.setPosition(a.x, a.y - 54, 0);
                lb.string = a.text;
            } else {
                lb.node.active = false;
            }
        }

        if (this.msgs.length) {
            this.lbMsg.node.active = true;
            this.lbMsg.node.setPosition(0, hh - 96, 0);
            this.lbMsg.string = this.msgs.map(m => m.text).join('\n');
        } else {
            this.lbMsg.node.active = false;
        }

        this.lbHint.node.setPosition(0, -hh + 34, 0);
        this.lbHint.string = 'P1：WASD 移动 · E 互动      P2：←↑↓→ 移动 · Enter 互动       R 重开';

        this.lbTask.node.setPosition(-hw + 30, -hh + 78, 0);
        const ck = (v: boolean) => (v ? '☑' : '☐');
        this.lbTask.string =
            `【试验任务】\n` +
            `${ck(this.task.gather)} 打捞 4 木板 + 3 塑料\n` +
            `${ck(this.task.built)} 造一台海水过滤器\n` +
            `${ck(this.task.stole)} 游到对方木筏，拆走他的过滤器\n` +
            `${ck(this.task.dead)} 等他渴死`;

        this.lbBig.node.active = this.phase !== 'play';
        this.lbSub.node.active = this.phase !== 'play';
    }

    private drawMenu() {
        const g = this.gh;
        g.fillColor = col('#04161e', 215);
        g.rect(-1400, -800, 2800, 1600);
        g.fill();
        this.lbBig.string = '木筏 · 掠夺试验场';
        this.lbBig.node.setPosition(0, 150, 0);
        this.lbSub.string =
            '按【1】单人 —— 对手是 AI 邻居，方便你直接去抢\n' +
            '按【2】双人同屏 —— 两个人各守一台木筏\n\n' +
            '玩法：E 打捞木料塑料 → 造过滤器 → 游到对面把它拆了 → 他会渴死\n' +
            '小心海里那条鲨鱼：在水里待久了它会咬你';
        this.lbSub.node.setPosition(0, -70, 0);
    }

    private drawOver() {
        const g = this.gh;
        g.fillColor = col('#04161e', 200);
        g.rect(-1400, -800, 2800, 1600);
        g.fill();
        this.lbBig.string = this.overText;
        this.lbBig.node.setPosition(0, 110, 0);

        const winner = this.players[0].alive ? this.players[0] : this.players[1];
        this.lbSub.string =
            `${winner.name} 活了下来。\n\n` +
            `木板 ${winner.wood} · 塑料 ${winner.plastic} · 水箱 ${winner.tank}/${CFG.tankMax}\n\n` +
            `按【R】再来一局`;
        this.lbSub.node.setPosition(0, -80, 0);
    }
}

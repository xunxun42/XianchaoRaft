System.register("chunks:///_virtual/GameRoot.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _inheritsLoose, _createForOfIteratorHelperLoose, cclegacy, _decorator, ccAll, input, Input, Node, Layers, UITransform, Graphics, Label, KeyCode, view, Color, Component;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      ccAll = module;
      input = module.input;
      Input = module.Input;
      Node = module.Node;
      Layers = module.Layers;
      UITransform = module.UITransform;
      Graphics = module.Graphics;
      Label = module.Label;
      KeyCode = module.KeyCode;
      view = module.view;
      Color = module.Color;
      Component = module.Component;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "debce8xRNJPwqzjrUAjdKvh", "GameRoot", undefined);
      var ccclass = _decorator.ccclass;
      var DW = 1600;
      var DH = 900;

      /* ============================ 数值（想调就调这里） ============================ */

      var CFG = {
        walk: 300,
        // 木筏上移动速度
        swim: 205,
        // 水里游
        swimCarry: 135,
        // 抱着过滤器游

        hpMax: 100,
        thirstMax: 100,
        thirstRate: 2.2,
        // 每秒口渴
        drinkGain: 45,
        // 喝一口回多少口渴
        tankMax: 2,
        // 水箱容量（口）
        prodTime: 16,
        // 过滤器每 16 秒产 1 口水

        buildWood: 4,
        buildPlastic: 3,
        stealTime: 2.6,
        // 拆过滤器要按住多久
        buildTime: 1.6,
        installTime: 1.0,
        hookTime: 0.55,
        starveDmg: 9,
        // 渴死时每秒掉血
        sharkDmg: 16,
        debrisEvery: 1.55 // 每 1.55 秒漂来一块垃圾
      };

      var RAFT_W = 420;
      var RAFT_H = 280;
      var RAFTS = [{
        x: -470,
        y: -10,
        ph: 0.0
      }, {
        x: 470,
        y: 40,
        ph: 1.7
      }];
      var FILTER_OFF = {
        x: -95,
        y: 6
      };
      var TANK_OFF = {
        x: 100,
        y: 6
      };

      /* ============================ 颜色工具 ============================ */

      var _cc = new Map();
      function col(hex, a) {
        if (a === void 0) {
          a = 255;
        }
        var k = hex + '|' + a;
        var c = _cc.get(k);
        if (!c) {
          var n = parseInt(hex.slice(1), 16);
          c = new Color(n >> 16 & 255, n >> 8 & 255, n & 255, a);
          _cc.set(k, c);
        }
        return c;
      }

      /* ============================ 类型 ============================ */

      /* ============================ 主组件 ============================ */

      var GameRoot = exports('GameRoot', (_dec = ccclass('GameRoot'), _dec(_class = /*#__PURE__*/function (_Component) {
        _inheritsLoose(GameRoot, _Component);
        function GameRoot() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.gw = void 0;
          _this.gh = void 0;
          _this.worldNode = void 0;
          _this.hudNode = void 0;
          _this.lbP1 = void 0;
          _this.lbP2 = void 0;
          _this.lbName1 = void 0;
          _this.lbName2 = void 0;
          _this.lbPrompt1 = void 0;
          _this.lbPrompt2 = void 0;
          _this.lbMsg = void 0;
          _this.lbHint = void 0;
          _this.lbTask = void 0;
          _this.lbBig = void 0;
          _this.lbSub = void 0;
          _this.t = 0;
          _this.phase = 'menu';
          _this.mode = 'solo';
          _this.players = [];
          _this.debris = [];
          _this.drops = [];
          _this.msgs = [];
          _this.debrisId = 0;
          _this.spawnT = 0;
          _this.shark = {
            x: 0,
            y: 0,
            ang: 0,
            mode: 'patrol',
            biteCd: 0,
            timer: 0,
            tx: 0,
            ty: 0
          };
          _this.shakeT = 0;
          _this.shakeMag = 0;
          _this.task = {
            gather: false,
            built: false,
            stole: false,
            dead: false
          };
          _this.overText = '';
          return _this;
        }
        var _proto = GameRoot.prototype;
        /* ---------------------------- 节点搭建 ---------------------------- */
        _proto.start = function start() {
          this.buildNodes();
          this.bindInput();
          this.resetAll();
          this.phase = 'menu';
          // 调试用：浏览器控制台里可以直接 __game.players[0] 看状态
          globalThis.__game = this;
          // 关掉左下角的 FPS 面板，别挡住任务清单
          try {
            var ccAny = globalThis.cc || ccAll;
            if (ccAny != null && ccAny.profiler) {
              if (typeof ccAny.profiler.hideStats === 'function') ccAny.profiler.hideStats();
              if (typeof ccAny.profiler.hide === 'function') ccAny.profiler.hide();
            }
          } catch (e) {/* 忽略 */}
        };
        _proto.onDestroy = function onDestroy() {
          input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
          input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        };
        _proto.buildNodes = function buildNodes() {
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

        /** hAlign: 0 左 / 1 中 / 2 右 */;
        _proto.mkLabel = function mkLabel(name, size, hAlign, vAlign) {
          var n = new Node(name);
          n.layer = Layers.Enum.UI_2D;
          var tr = n.addComponent(UITransform);
          tr.setAnchorPoint(hAlign === 0 ? 0 : hAlign === 2 ? 1 : 0.5, vAlign === 0 ? 0 : 1);
          var lb = n.addComponent(Label);
          lb.fontSize = size;
          lb.lineHeight = Math.round(size * 1.32);
          lb.fontFamily = 'Microsoft YaHei';
          lb.useSystemFont = true;
          lb.horizontalAlign = hAlign === 0 ? Label.HorizontalAlign.LEFT : hAlign === 2 ? Label.HorizontalAlign.RIGHT : Label.HorizontalAlign.CENTER;
          lb.verticalAlign = vAlign === 0 ? Label.VerticalAlign.BOTTOM : vAlign === 1 ? Label.VerticalAlign.CENTER : Label.VerticalAlign.TOP;
          lb.overflow = Label.Overflow.NONE;
          lb.enableWrapText = false;
          lb.color = col('#ffffff');
          this.hudNode.addChild(n);
          return lb;
        }

        /* ---------------------------- 输入 ---------------------------- */;
        _proto.bindInput = function bindInput() {
          input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
          input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        };
        _proto.onKeyDown = function onKeyDown(e) {
          var k = e.keyCode;

          // 1 / 2 任何时候都能换模式重开
          if (k === KeyCode.DIGIT_1 || k === KeyCode.NUM_1) {
            this.startGame('solo');
            return;
          }
          if (k === KeyCode.DIGIT_2 || k === KeyCode.NUM_2) {
            this.startGame('duo');
            return;
          }
          if (k === KeyCode.KEY_R) {
            this.startGame(this.mode);
            return;
          }
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
        };
        _proto.onKeyUp = function onKeyUp(e) {
          var k = e.keyCode;
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

        /* ---------------------------- 状态 ---------------------------- */;
        _proto.p1 = function p1() {
          return this.players[0];
        };
        _proto.p2 = function p2() {
          return this.players[1];
        };
        _proto.mkPlayer = function mkPlayer(id, hex) {
          return {
            id: id,
            name: id === 0 ? '你' : '邻居',
            hex: hex,
            x: RAFTS[id].x,
            y: RAFTS[id].y + 80,
            dirx: 0,
            diry: -1,
            hp: CFG.hpMax,
            thirst: CFG.thirstMax,
            wood: 0,
            plastic: 0,
            tank: 0,
            filter: false,
            prodT: 0,
            carrying: false,
            alive: true,
            stun: 0,
            kx: 0,
            ky: 0,
            actCd: 0,
            holdT: 0,
            holdKey: '',
            ring: 0,
            keys: {
              up: false,
              down: false,
              left: false,
              right: false,
              use: false
            },
            isBot: false,
            botT: 0,
            botGoal: null,
            onRaft: id
          };
        };
        _proto.resetAll = function resetAll() {
          this.players = [this.mkPlayer(0, '#ffb03a'), this.mkPlayer(1, '#63b6ff')];
          this.players[0].name = '你';
          this.players[1].name = this.mode === 'solo' ? '邻居(AI)' : 'P2';
          this.players[1].isBot = this.mode === 'solo';
          this.debris = [];
          this.drops = [];
          this.msgs = [];
          this.spawnT = 0;
          this.t = 0;
          this.task = {
            gather: false,
            built: false,
            stole: false,
            dead: false
          };
          this.overText = '';
          this.shakeT = 0;
          this.seedDebris();
          this.shark.x = 0;
          this.shark.y = -10;
          this.shark.ang = 0;
          this.shark.mode = 'patrol';
          this.shark.biteCd = 0;
          this.shark.timer = 0;
        };
        _proto.startGame = function startGame(mode) {
          this.mode = mode;
          this.resetAll();
          this.phase = 'play';
          this.toast('木筏已下水。先按 E 打捞木料和塑料。', '#ffe9a8');
        };
        _proto.toast = function toast(text, hex) {
          if (hex === void 0) {
            hex = '#ffffff';
          }
          this.msgs.push({
            text: text,
            t: 4.2,
            hex: hex
          });
          if (this.msgs.length > 3) this.msgs.shift();
        }

        /* ---------------------------- 主循环 ---------------------------- */;
        _proto.update = function update(dt) {
          dt = Math.min(dt, 0.05);
          this.t += dt;
          if (this.phase === 'play') this.step(dt);
          this.draw();
        };
        _proto.step = function step(dt) {
          var a = this.players[0];
          var b = this.players[1];
          if (b.isBot && b.alive) this.thinkBot(b, dt);
          for (var _iterator = _createForOfIteratorHelperLoose(this.players), _step; !(_step = _iterator()).done;) {
            var p = _step.value;
            if (p.alive) this.movePlayer(p, dt);
          }
          for (var _iterator2 = _createForOfIteratorHelperLoose(this.players), _step2; !(_step2 = _iterator2()).done;) {
            var _p = _step2.value;
            if (_p.alive) this.interact(_p, dt);
          }
          for (var _iterator3 = _createForOfIteratorHelperLoose(this.players), _step3; !(_step3 = _iterator3()).done;) {
            var _p2 = _step3.value;
            if (_p2.alive) this.survive(_p2, dt);
          }
          this.stepShark(dt);
          this.spawnT += dt;
          if (this.spawnT >= CFG.debrisEvery) {
            this.spawnT = 0;
            this.spawnDebris();
          }
          for (var i = this.debris.length - 1; i >= 0; i--) {
            var d = this.debris[i];
            d.x += d.vx * dt;
            d.y += Math.sin(this.t * 1.5 + d.ph) * 6 * dt;
            if (d.x > 1000) this.debris.splice(i, 1);
          }
          for (var _i = this.drops.length - 1; _i >= 0; _i--) {
            this.drops[_i].life -= dt;
            if (this.drops[_i].life <= 0) this.drops.splice(_i, 1);
          }
          for (var _i2 = this.msgs.length - 1; _i2 >= 0; _i2--) {
            this.msgs[_i2].t -= dt;
            if (this.msgs[_i2].t <= 0) this.msgs.splice(_i2, 1);
          }
          if (a.wood >= CFG.buildWood && a.plastic >= CFG.buildPlastic) this.task.gather = true;
          if (this.shakeT > 0) this.shakeT -= dt;
        };
        _proto.shake = function shake(mag) {
          this.shakeT = 0.35;
          this.shakeMag = mag;
        }

        /* ---------------------------- 移动 / 地形 ---------------------------- */;
        _proto.raftAt = function raftAt(x, y) {
          for (var i = 0; i < 2; i++) {
            var r = RAFTS[i];
            if (Math.abs(x - r.x) <= RAFT_W / 2 && Math.abs(y - r.y) <= RAFT_H / 2) return i;
          }
          return -1;
        };
        _proto.clampToRaft = function clampToRaft(x, y, idx) {
          var r = RAFTS[idx];
          var mx = RAFT_W / 2 - 30;
          var my = RAFT_H / 2 - 30;
          return {
            x: Math.max(r.x - mx, Math.min(r.x + mx, x)),
            y: Math.max(r.y - my, Math.min(r.y + my, y))
          };
        };
        _proto.movePlayer = function movePlayer(p, dt) {
          var k = p.keys;
          var ax = (k.right ? 1 : 0) - (k.left ? 1 : 0);
          var ay = (k.up ? 1 : 0) - (k.down ? 1 : 0);
          var len = Math.hypot(ax, ay);
          if (len > 0) {
            ax /= len;
            ay /= len;
            p.dirx = ax;
            p.diry = ay;
          }
          p.onRaft = this.raftAt(p.x, p.y);
          var onRaft = p.onRaft >= 0;
          var sp = onRaft ? CFG.walk : p.carrying ? CFG.swimCarry : CFG.swim;
          if (Math.abs(p.kx) > 1 || Math.abs(p.ky) > 1) {
            p.x += p.kx * dt;
            p.y += p.ky * dt;
            var damp = Math.pow(0.0016, dt);
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

        /* ---------------------------- 互动 ---------------------------- */;
        _proto.filterPos = function filterPos(i) {
          return {
            x: RAFTS[i].x + FILTER_OFF.x,
            y: RAFTS[i].y + FILTER_OFF.y
          };
        };
        _proto.tankPos = function tankPos(i) {
          return {
            x: RAFTS[i].x + TANK_OFF.x,
            y: RAFTS[i].y + TANK_OFF.y
          };
        };
        _proto.findAction = function findAction(p) {
          var enemy = this.players[1 - p.id];
          var onOwn = p.onRaft === p.id;
          var onEnemy = p.onRaft === 1 - p.id;
          var onAny = p.onRaft >= 0;
          var list = [];
          var add = function add(a, d) {
            a._d = d;
            list.push(a);
          };

          // 拆对方的过滤器
          if (onEnemy && enemy.filter && !p.carrying) {
            var f = this.filterPos(enemy.id);
            var d = Math.hypot(p.x - f.x, p.y - f.y);
            if (d < 86) {
              add({
                kind: 'steal',
                x: f.x,
                y: f.y,
                need: CFG.stealTime,
                text: '按住 E / Enter 拆走过滤器',
                key: 'steal' + enemy.id
              }, d);
            }
          }

          // 装 / 造自己的过滤器
          if (onOwn && !p.filter) {
            var _f = this.filterPos(p.id);
            var _d = Math.hypot(p.x - _f.x, p.y - _f.y);
            if (_d < 86) {
              if (p.carrying) {
                add({
                  kind: 'install',
                  x: _f.x,
                  y: _f.y,
                  need: CFG.installTime,
                  text: '按住 装上过滤器',
                  key: 'install'
                }, _d);
              } else {
                var ok = p.wood >= CFG.buildWood && p.plastic >= CFG.buildPlastic;
                add({
                  kind: 'build',
                  x: _f.x,
                  y: _f.y,
                  need: CFG.buildTime,
                  text: ok ? "\u6309\u4F4F \u5EFA\u9020\u8FC7\u6EE4\u5668\uFF08" + CFG.buildWood + "\u6728\u677F " + CFG.buildPlastic + "\u5851\u6599\uFF09" : "\u8FD8\u9700\u8981 " + CFG.buildWood + "\u6728\u677F " + CFG.buildPlastic + "\u5851\u6599",
                  key: 'build'
                }, _d);
              }
            }
          }

          // 喝水
          if (onOwn && p.filter) {
            var tp = this.tankPos(p.id);
            var _d2 = Math.hypot(p.x - tp.x, p.y - tp.y);
            if (_d2 < 80) {
              add({
                kind: 'drink',
                x: tp.x,
                y: tp.y,
                need: 0,
                text: p.tank > 0 ? '按 E 喝一口水' : '水箱空了，等过滤器造水',
                key: 'drink'
              }, _d2);
            }
          }

          // 打捞
          if (onAny) {
            var best = null;
            var bd = 1e9;
            for (var _iterator4 = _createForOfIteratorHelperLoose(this.debris), _step4; !(_step4 = _iterator4()).done;) {
              var db = _step4.value;
              var _d3 = Math.hypot(db.x - p.x, db.y - p.y);
              if (_d3 < bd) {
                bd = _d3;
                best = db;
              }
            }
            if (best && bd < 190) {
              add({
                kind: 'hook',
                x: best.x,
                y: best.y,
                need: CFG.hookTime,
                text: '按住 打捞漂流物',
                key: 'hook' + best.id,
                ref: best
              }, bd + 30);
            }
          }

          // 捡水里的过滤器
          if (!p.carrying) {
            for (var _iterator5 = _createForOfIteratorHelperLoose(this.drops), _step5; !(_step5 = _iterator5()).done;) {
              var dr = _step5.value;
              var _d4 = Math.hypot(dr.x - p.x, dr.y - p.y);
              if (_d4 < 80) {
                add({
                  kind: 'pickup',
                  x: dr.x,
                  y: dr.y,
                  need: 0.6,
                  text: '按住 捞起过滤器',
                  key: 'pickup',
                  ref: dr
                }, _d4);
                break;
              }
            }
          }

          // 推人
          if (enemy.alive && !enemy.isBot) {
            var _d5 = Math.hypot(enemy.x - p.x, enemy.y - p.y);
            if (_d5 < 66) {
              add({
                kind: 'push',
                x: enemy.x,
                y: enemy.y,
                need: 0,
                text: '按 E 推开对方',
                key: 'push'
              }, _d5 - 20);
            }
          }
          if (!list.length) return null;
          list.sort(function (m, n) {
            return m._d - n._d;
          });
          return list[0];
        };
        _proto.interact = function interact(p, dt) {
          var a = this.findAction(p);
          p.ring = 0;
          if (!a || !p.keys.use) {
            p.holdT = 0;
            p.holdKey = '';
            return;
          }
          if (p.holdKey !== a.key) {
            p.holdKey = a.key;
            p.holdT = 0;
          }
          if (a.kind === 'drink' || a.kind === 'push') {
            if (p.actCd > 0) return;
            p.actCd = 0.6;
            if (a.kind === 'drink') this.doDrink(p);else this.doPush(p);
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
        };
        _proto.doDrink = function doDrink(p) {
          if (p.tank <= 0) {
            this.toast(p.name + " \u7684\u6C34\u7BB1\u662F\u7A7A\u7684", '#ffb0b0');
            return;
          }
          p.tank -= 1;
          p.thirst = Math.min(CFG.thirstMax, p.thirst + CFG.drinkGain);
        };
        _proto.doPush = function doPush(p) {
          var enemy = this.players[1 - p.id];
          if (!enemy.alive) return;
          var dx = enemy.x - p.x;
          var dy = enemy.y - p.y;
          var d = Math.max(1, Math.hypot(dx, dy));
          enemy.stun = 0.45;
          enemy.kx = dx / d * 520;
          enemy.ky = dy / d * 520;
          this.shake(6);
          if (enemy.carrying) {
            enemy.carrying = false;
            this.drops.push({
              x: enemy.x,
              y: enemy.y,
              life: 999,
              ph: Math.random() * 6
            });
            this.toast(p.name + " \u649E\u4E86 " + enemy.name + " \u4E00\u4E0B\uFF0C\u8FC7\u6EE4\u5668\u6389\u6D77\u91CC\u4E86\uFF01", '#ffd28a');
          } else {
            this.toast(p.name + " \u63A8\u5F00\u4E86 " + enemy.name, '#d6eef6');
          }
        };
        _proto.doComplete = function doComplete(p, a) {
          var enemy = this.players[1 - p.id];
          if (a.kind === 'steal') {
            enemy.filter = false;
            enemy.prodT = 0;
            p.carrying = true;
            p.holdT = 0;
            this.task.stole = true;
            this.toast(p.name + " \u62C6\u8D70\u4E86 " + enemy.name + " \u7684\u6D77\u6C34\u8FC7\u6EE4\u5668\uFF01", '#ff9b6a');
            this.toast(enemy.name + " \u7684\u9020\u6C34\u4E2D\u65AD\u4E86 \u2014\u2014 \u6C34\u7BB1\u53EA\u5269 " + enemy.tank + " \u53E3\u3002", '#ffd28a');
            this.shake(10);
          } else if (a.kind === 'install') {
            p.carrying = false;
            p.filter = true;
            if (p.id === 0) this.task.built = true;
            this.toast(p.name + " \u88C5\u597D\u4E86\u8FC7\u6EE4\u5668\uFF0C\u5F00\u59CB\u9020\u6C34", '#9fffc4');
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
            this.toast(p.name + " \u9020\u597D\u4E86\u4E00\u53F0\u6D77\u6C34\u8FC7\u6EE4\u5668", '#9fffc4');
          } else if (a.kind === 'hook') {
            var db = a.ref;
            var i = this.debris.indexOf(db);
            if (i >= 0) this.debris.splice(i, 1);
            if (db.kind === 'wood') {
              p.wood += 2;
              this.toast(p.name + " \u635E\u5230 \u6728\u677F x2", '#d8c39a');
            } else {
              p.plastic += 1;
              this.toast(p.name + " \u635E\u5230 \u5851\u6599 x1", '#a9dcff');
            }
          } else if (a.kind === 'pickup') {
            var dr = a.ref;
            var _i3 = this.drops.indexOf(dr);
            if (_i3 >= 0) this.drops.splice(_i3, 1);
            p.carrying = true;
            this.toast(p.name + " \u635E\u8D77\u4E86\u8FC7\u6EE4\u5668", '#9fffc4');
          }
        }

        /* ---------------------------- 生存 ---------------------------- */;
        _proto.survive = function survive(p, dt) {
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
          if (p.hp <= 0) {
            p.hp = 0;
            this.die(p);
          }
        };
        _proto.die = function die(p) {
          if (!p.alive) return;
          p.alive = false;
          this.phase = 'over';
          if (p.id === 1) this.task.dead = true;
          var why = p.thirst <= 0 ? '渴死了' : '死了';
          this.overText = p.name + " " + why;
          this.toast(p.name + " " + why, '#ff8a8a');
          this.shake(14);
        }

        /* ---------------------------- 鲨鱼 ---------------------------- */;
        _proto.stepShark = function stepShark(dt) {
          var s = this.shark;
          if (s.biteCd > 0) s.biteCd -= dt;
          var target = null;
          var bd = 1e9;
          for (var _iterator6 = _createForOfIteratorHelperLoose(this.players), _step6; !(_step6 = _iterator6()).done;) {
            var p = _step6.value;
            if (!p.alive) continue;
            if (this.raftAt(p.x, p.y) >= 0) continue;
            var _d7 = Math.hypot(p.x - s.x, p.y - s.y);
            if (_d7 < 360 && _d7 < bd) {
              bd = _d7;
              target = p;
            }
          }
          if (s.mode === 'flee') {
            s.timer -= dt;
            var dx = s.x - s.tx,
              dy = s.y - s.ty;
            var d = Math.max(1, Math.hypot(dx, dy));
            s.x += dx / d * 300 * dt;
            s.y += dy / d * 300 * dt;
            if (s.timer <= 0) s.mode = 'patrol';
          } else if (target) {
            s.mode = 'chase';
            var _dx = target.x - s.x,
              _dy = target.y - s.y;
            var _d6 = Math.max(1, Math.hypot(_dx, _dy));
            s.ang = Math.atan2(_dy, _dx);
            s.x += _dx / _d6 * 245 * dt;
            s.y += _dy / _d6 * 245 * dt;
            if (_d6 < 36 && s.biteCd <= 0) {
              s.biteCd = 7;
              target.hp -= CFG.sharkDmg;
              target.kx = _dx / _d6 * 620;
              target.ky = _dy / _d6 * 620;
              this.shake(12);
              this.toast("\u9CA8\u9C7C\u54AC\u4E2D\u4E86 " + target.name + "\uFF01 -" + CFG.sharkDmg, '#ff8a8a');
              if (target.hp <= 0) {
                target.hp = 0;
                this.die(target);
              }
              s.mode = 'flee';
              s.timer = 2.6;
              s.tx = target.x;
              s.ty = target.y;
            }
          } else {
            s.mode = 'patrol';
            s.ang += dt * 0.55;
            var tx = Math.cos(s.ang) * 300;
            var ty = -10 + Math.sin(s.ang) * 165;
            s.x += (tx - s.x) * Math.min(1, dt * 1.6);
            s.y += (ty - s.y) * Math.min(1, dt * 1.6);
          }
          s.x = Math.max(-760, Math.min(760, s.x));
          s.y = Math.max(-420, Math.min(400, s.y));
        }

        /* ---------------------------- 漂流物 ---------------------------- */;
        _proto.spawnDebris = function spawnDebris() {
          var kind = Math.random() < 0.58 ? 'wood' : 'plastic';
          this.debris.push({
            id: this.debrisId++,
            kind: kind,
            x: -820,
            y: -380 + Math.random() * 700,
            vx: 62 + Math.random() * 42,
            vy: 0,
            ph: Math.random() * 6.28
          });
        }

        /** 开局先在水面上铺几块，别让人干等 */;
        _proto.seedDebris = function seedDebris() {
          for (var i = 0; i < 7; i++) {
            this.debris.push({
              id: this.debrisId++,
              kind: Math.random() < 0.58 ? 'wood' : 'plastic',
              x: -560 + i * 190,
              y: -300 + Math.random() * 560,
              vx: 62 + Math.random() * 42,
              vy: 0,
              ph: Math.random() * 6.28
            });
          }
        }

        /* ---------------------------- AI ---------------------------- */;
        _proto.thinkBot = function thinkBot(p, dt) {
          var enemy = this.players[1 - p.id];
          var k = p.keys;
          p.botT -= dt;
          if (p.botT <= 0) {
            p.botT = 0.32;
            p.botGoal = this.pickBotGoal(p, enemy);
          }
          k.up = false;
          k.down = false;
          k.left = false;
          k.right = false;
          var g = p.botGoal;
          if (!g) {
            k.use = false;
            return;
          }
          var dx = g.x - p.x;
          var dy = g.y - p.y;
          var d = Math.hypot(dx, dy);
          if (d > 24) {
            k.use = false;
            if (dx > 10) k.right = true;else if (dx < -10) k.left = true;
            if (dy > 10) k.up = true;else if (dy < -10) k.down = true;
          } else {
            k.use = true;
          }
        };
        _proto.pickBotGoal = function pickBotGoal(p, enemy) {
          var myF = this.filterPos(p.id);
          var myT = this.tankPos(p.id);
          if (p.filter && enemy.alive && this.raftAt(enemy.x, enemy.y) === p.id) {
            if (Math.hypot(enemy.x - myF.x, enemy.y - myF.y) < 130) {
              return {
                kind: 'push',
                x: enemy.x,
                y: enemy.y
              };
            }
          }
          if (p.thirst < 62 && p.tank > 0) {
            return {
              kind: 'drink',
              x: myT.x,
              y: myT.y
            };
          }
          if (p.carrying && !p.filter) {
            return {
              kind: 'install',
              x: myF.x,
              y: myF.y
            };
          }
          if (!p.filter && !p.carrying && p.wood >= CFG.buildWood && p.plastic >= CFG.buildPlastic) {
            return {
              kind: 'build',
              x: myF.x,
              y: myF.y
            };
          }
          if (p.filter && !p.carrying && enemy.filter && enemy.alive && this.t > 50) {
            var ef = this.filterPos(enemy.id);
            return {
              kind: 'raid',
              x: ef.x,
              y: ef.y
            };
          }
          var best = null;
          var bd = 1e9;
          for (var _iterator7 = _createForOfIteratorHelperLoose(this.debris), _step7; !(_step7 = _iterator7()).done;) {
            var db = _step7.value;
            var d = Math.hypot(db.x - p.x, db.y - p.y);
            if (d < bd) {
              bd = d;
              best = db;
            }
          }
          if (best) {
            var c = this.clampToRaft(best.x, best.y, p.id);
            return {
              kind: 'hook',
              x: c.x,
              y: c.y
            };
          }
          return {
            kind: 'idle',
            x: RAFTS[p.id].x,
            y: RAFTS[p.id].y + 60
          };
        }

        /* ---------------------------- 绘制入口 ---------------------------- */;
        _proto.draw = function draw() {
          this.gw.clear();
          this.gh.clear();
          var sx = this.shakeT > 0 ? (Math.random() - 0.5) * this.shakeMag : 0;
          var sy = this.shakeT > 0 ? (Math.random() - 0.5) * this.shakeMag : 0;
          this.worldNode.setPosition(sx, sy, 0);
          this.drawOcean();
          this.drawRaft(0);
          this.drawRaft(1);
          this.drawEquipment(0);
          this.drawEquipment(1);
          this.drawDebris();
          this.drawDrops();
          this.drawShark();
          for (var _iterator8 = _createForOfIteratorHelperLoose(this.players), _step8; !(_step8 = _iterator8()).done;) {
            var p = _step8.value;
            this.drawPlayer(p);
          }
          for (var _iterator9 = _createForOfIteratorHelperLoose(this.players), _step9; !(_step9 = _iterator9()).done;) {
            var _p3 = _step9.value;
            this.drawHold(_p3);
          }
          this.drawHud();
          this.updateLabels();
          if (this.phase === 'menu') this.drawMenu();
          if (this.phase === 'over') this.drawOver();
        }

        /* ---------------------------- 世界绘制 ---------------------------- */;
        _proto.drawOcean = function drawOcean() {
          var g = this.gw;
          var t = this.t;
          g.fillColor = col('#14556d');
          g.rect(-1400, -800, 2800, 1600);
          g.fill();
          for (var i = 0; i < 20; i++) {
            var y = -560 + i * 58;
            g.strokeColor = col(i % 2 ? '#7fd4e8' : '#3e9dbd', 26);
            g.lineWidth = i % 2 ? 2 : 3;
            g.moveTo(-1400, y);
            for (var x = -1400; x <= 1400; x += 56) {
              g.lineTo(x, y + Math.sin(x * 0.006 + t * 1.1 + i * 0.7) * 9);
            }
            g.stroke();
          }
          for (var _i4 = 0; _i4 < 26; _i4++) {
            var px = _i4 * 137.5 % 1400 - 700 + Math.sin(t * 0.35 + _i4) * 22;
            var py = _i4 * 89.3 % 900 - 450 + Math.cos(t * 0.28 + _i4 * 1.7) * 16;
            g.fillColor = col('#bfefff', 14);
            g.circle(px, py, 26 + _i4 % 4 * 12);
            g.fill();
          }
        };
        _proto.raftBob = function raftBob(i) {
          return Math.sin(this.t * 1.25 + RAFTS[i].ph) * 4;
        };
        _proto.drawRaft = function drawRaft(i) {
          var g = this.gw;
          var r = RAFTS[i];
          var cx = r.x;
          var cy = r.y + this.raftBob(i);
          var w = RAFT_W,
            h = RAFT_H;
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
          for (var y = cy - h / 2 + 26; y < cy + h / 2 - 14; y += 26) {
            g.moveTo(cx - w / 2 + 16, y);
            g.lineTo(cx + w / 2 - 16, y);
          }
          g.stroke();
          g.strokeColor = col('#8a6236');
          g.lineWidth = 7;
          g.roundRect(cx - w / 2 + 7, cy - h / 2 + 7, w - 14, h - 14, 19);
          g.stroke();
          for (var k = 0; k < 4; k++) {
            var px = cx + (k % 2 === 0 ? -1 : 1) * (w / 2 - 20);
            var py = cy + (k < 2 ? 1 : -1) * (h / 2 - 20);
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
        };
        _proto.drawEquipment = function drawEquipment(i) {
          var g = this.gw;
          var p = this.players[i];
          var bob = this.raftBob(i);
          var f = this.filterPos(i);
          var tp = this.tankPos(i);
          var fx = f.x,
            fy = f.y + bob;
          var tx = tp.x,
            ty = tp.y + bob;

          // ---- 水箱 ----
          g.fillColor = col('#3e5058');
          g.roundRect(tx - 28, ty - 40, 56, 80, 12);
          g.fill();
          g.fillColor = col('#4f6870');
          g.roundRect(tx - 23, ty - 35, 46, 70, 9);
          g.fill();
          var lvl = Math.max(0, Math.min(1, p.tank / CFG.tankMax));
          if (lvl > 0.02) {
            var hh = 66 * lvl;
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
            var pulse = (Math.sin(this.t * 4) + 1) * 0.5;
            g.fillColor = col('#3fe0c0', 150 + pulse * 90);
            g.circle(fx, fy + 8, 9 + pulse * 3);
            g.fill();
            var on = Math.sin(this.t * 7) > 0;
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
        };
        _proto.drawDebris = function drawDebris() {
          var g = this.gw;
          for (var _iterator10 = _createForOfIteratorHelperLoose(this.debris), _step10; !(_step10 = _iterator10()).done;) {
            var d = _step10.value;
            var bob = Math.sin(this.t * 2 + d.ph) * 4;
            var x = d.x,
              y = d.y + bob;
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
        };
        _proto.drawDrops = function drawDrops() {
          var g = this.gw;
          for (var _iterator11 = _createForOfIteratorHelperLoose(this.drops), _step11; !(_step11 = _iterator11()).done;) {
            var dr = _step11.value;
            var bob = Math.sin(this.t * 2.4 + dr.ph) * 5;
            var x = dr.x,
              y = dr.y + bob;
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
        };
        _proto.drawShark = function drawShark() {
          var g = this.gw;
          var s = this.shark;
          var chase = s.mode === 'chase';
          var body = chase ? col('#4a5860') : col('#5b6b75');
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
        };
        _proto.drawPlayer = function drawPlayer(p) {
          var g = this.gw;
          if (!p.alive) {
            g.fillColor = col('#000000', 90);
            g.circle(p.x, p.y, 18);
            g.fill();
            return;
          }
          var inWater = p.onRaft < 0;
          if (inWater) {
            var r1 = 22 + Math.sin(this.t * 4) * 4;
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
          var hx = p.x + p.dirx * 8;
          var hy = p.y + p.diry * 8;
          g.fillColor = col('#ffe0bd');
          g.circle(hx, hy, 8);
          g.fill();
          var px = -p.diry,
            py = p.dirx;
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
        };
        _proto.drawHold = function drawHold(p) {
          if (p.ring <= 0.001) return;
          var g = this.gw;
          var start = Math.PI / 2;
          g.strokeColor = col('#000000', 110);
          g.lineWidth = 9;
          g.arc(p.x, p.y - 6, 27, 0, Math.PI * 2, false);
          g.stroke();
          g.strokeColor = col('#ffe9a8');
          g.lineWidth = 7;
          g.arc(p.x, p.y - 6, 27, start, start + Math.PI * 2 * p.ring, false);
          g.stroke();
        }

        /* ---------------------------- HUD ---------------------------- */;
        _proto.drawHud = function drawHud() {
          var g = this.gh;
          var vs = view.getVisibleSize();
          var hw = vs.width / 2;
          var hh = vs.height / 2;
          var pw = 420;
          var ph = 150;
          for (var i = 0; i < 2; i++) {
            var p = this.players[i];
            var x = i === 0 ? -hw + 26 : hw - 26 - pw;
            var y = hh - 26 - ph;
            g.fillColor = col('#04161e', 185);
            g.roundRect(x, y, pw, ph, 16);
            g.fill();
            g.strokeColor = col(i === 0 ? '#ffb03a' : '#63b6ff', 150);
            g.lineWidth = 3;
            g.roundRect(x, y, pw, ph, 16);
            g.stroke();
            var tw = pw - 32;
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
        };
        _proto.updateLabels = function updateLabels() {
          var vs = view.getVisibleSize();
          var hw = vs.width / 2;
          var hh = vs.height / 2;
          for (var i = 0; i < 2; i++) {
            var p = this.players[i];
            var lb = i === 0 ? this.lbP1 : this.lbP2;
            var x = i === 0 ? -hw + 42 : hw - 42;
            var y = hh - 38;
            lb.node.setPosition(x, y, 0);
            var st = p.alive ? p.filter ? '运转中' : p.carrying ? '被拆走（抱着）' : '缺失' : '死亡';
            lb.string = "P" + (i + 1) + " \xB7 " + p.name + "\n" + ("\u751F\u547D " + Math.round(p.hp) + "    \u53E3\u6E34 " + Math.round(p.thirst) + "\n") + ("\u6728\u677F " + p.wood + "   \u5851\u6599 " + p.plastic + "   \u6C34\u7BB1 " + p.tank + "/" + CFG.tankMax + "\n") + ("\u8FC7\u6EE4\u5668\uFF1A" + st);
          }
          for (var _i5 = 0; _i5 < 2; _i5++) {
            var _p4 = this.players[_i5];
            var _lb = _i5 === 0 ? this.lbName1 : this.lbName2;
            _lb.node.setPosition(_p4.x, _p4.y + 46, 0);
            _lb.string = _p4.alive ? _p4.name : _p4.name + "\uFF08\u5012\u4E0B\uFF09";
            _lb.node.active = _p4.alive;
          }
          for (var _i6 = 0; _i6 < 2; _i6++) {
            var _p5 = this.players[_i6];
            var _lb2 = _i6 === 0 ? this.lbPrompt1 : this.lbPrompt2;
            var a = _p5.alive && this.phase === 'play' ? this.findAction(_p5) : null;
            if (a) {
              _lb2.node.active = true;
              _lb2.node.setPosition(a.x, a.y - 54, 0);
              _lb2.string = a.text;
            } else {
              _lb2.node.active = false;
            }
          }
          if (this.msgs.length) {
            this.lbMsg.node.active = true;
            this.lbMsg.node.setPosition(0, hh - 96, 0);
            this.lbMsg.string = this.msgs.map(function (m) {
              return m.text;
            }).join('\n');
          } else {
            this.lbMsg.node.active = false;
          }
          this.lbHint.node.setPosition(0, -hh + 34, 0);
          this.lbHint.string = 'P1：WASD 移动 · E 互动      P2：←↑↓→ 移动 · Enter 互动       R 重开';
          this.lbTask.node.setPosition(-hw + 30, -hh + 78, 0);
          var ck = function ck(v) {
            return v ? '☑' : '☐';
          };
          this.lbTask.string = "\u3010\u8BD5\u9A8C\u4EFB\u52A1\u3011\n" + (ck(this.task.gather) + " \u6253\u635E 4 \u6728\u677F + 3 \u5851\u6599\n") + (ck(this.task.built) + " \u9020\u4E00\u53F0\u6D77\u6C34\u8FC7\u6EE4\u5668\n") + (ck(this.task.stole) + " \u6E38\u5230\u5BF9\u65B9\u6728\u7B4F\uFF0C\u62C6\u8D70\u4ED6\u7684\u8FC7\u6EE4\u5668\n") + (ck(this.task.dead) + " \u7B49\u4ED6\u6E34\u6B7B");
          this.lbBig.node.active = this.phase !== 'play';
          this.lbSub.node.active = this.phase !== 'play';
        };
        _proto.drawMenu = function drawMenu() {
          var g = this.gh;
          g.fillColor = col('#04161e', 215);
          g.rect(-1400, -800, 2800, 1600);
          g.fill();
          this.lbBig.string = '木筏 · 掠夺试验场';
          this.lbBig.node.setPosition(0, 150, 0);
          this.lbSub.string = '按【1】单人 —— 对手是 AI 邻居，方便你直接去抢\n' + '按【2】双人同屏 —— 两个人各守一台木筏\n\n' + '玩法：E 打捞木料塑料 → 造过滤器 → 游到对面把它拆了 → 他会渴死\n' + '小心海里那条鲨鱼：在水里待久了它会咬你';
          this.lbSub.node.setPosition(0, -70, 0);
        };
        _proto.drawOver = function drawOver() {
          var g = this.gh;
          g.fillColor = col('#04161e', 200);
          g.rect(-1400, -800, 2800, 1600);
          g.fill();
          this.lbBig.string = this.overText;
          this.lbBig.node.setPosition(0, 110, 0);
          var winner = this.players[0].alive ? this.players[0] : this.players[1];
          this.lbSub.string = winner.name + " \u6D3B\u4E86\u4E0B\u6765\u3002\n\n" + ("\u6728\u677F " + winner.wood + " \xB7 \u5851\u6599 " + winner.plastic + " \xB7 \u6C34\u7BB1 " + winner.tank + "/" + CFG.tankMax + "\n\n") + "\u6309\u3010R\u3011\u518D\u6765\u4E00\u5C40";
          this.lbSub.node.setPosition(0, -80, 0);
        };
        return GameRoot;
      }(Component)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/main", ['./GameRoot.ts'], function () {
  return {
    setters: [null],
    execute: function () {}
  };
});

(function(r) {
  r('virtual:///prerequisite-imports/main', 'chunks:///_virtual/main'); 
})(function(mid, cid) {
    System.register(mid, [cid], function (_export, _context) {
    return {
        setters: [function(_m) {
            var _exportObj = {};

            for (var _key in _m) {
              if (_key !== "default" && _key !== "__esModule") _exportObj[_key] = _m[_key];
            }
      
            _export(_exportObj);
        }],
        execute: function () { }
    };
    });
});
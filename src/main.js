const GAME_WIDTH = 540;
const GAME_HEIGHT = 960;

class BattleScene extends Phaser.Scene {
  constructor() {
    super("BattleScene");
    this.monsters = [];
    this.projectiles = [];
    this.magicShots = [];
  }

  create() {
    this.castleHpMax = 100;
    this.castleHp = this.castleHpMax;
    this.gold = 0;
    this.wave = 1;
    this.waveKills = 0;
    this.waveTargets = [8, 10, 1];
    this.isBossWave = false;
    this.isGameOver = false;
    this.magicCharges = 3;
    this.magicMaxCharges = 3;
    this.nextMagicRecharge = 0;

    this.drawBackground();
    this.createCastle();
    this.createHud();
    this.createInput();

    this.spawnTimer = this.time.addEvent({
      delay: 1200,
      callback: this.spawnMonster,
      callbackScope: this,
      loop: true
    });

    this.attackTimer = this.time.addEvent({
      delay: 650,
      callback: this.autoAttack,
      callbackScope: this,
      loop: true
    });

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  drawBackground() {
    this.add.rectangle(270, 480, 540, 960, 0x1f2937);
    this.add.rectangle(270, 650, 540, 420, 0x2f5f46);
    this.add.rectangle(270, 742, 540, 165, 0x3a3f2f);

    const laneY = [360, 500, 640, 780];
    laneY.forEach((y) => {
      this.add.rectangle(335, y, 365, 36, 0x475569, 0.22);
      this.add.line(335, y + 19, -180, 0, 180, 0, 0xf8fafc, 0.12);
    });

    this.add.rectangle(84, 585, 40, 650, 0x111827, 0.55);
  }

  createCastle() {
    this.castle = this.add.container(86, 590);
    this.castle.add(this.add.rectangle(0, 52, 92, 430, 0x64748b));
    this.castle.add(this.add.rectangle(0, -185, 106, 80, 0x94a3b8));
    this.castle.add(this.add.triangle(-34, -245, 0, 70, 38, 0, 76, 70, 0x334155));
    this.castle.add(this.add.triangle(34, -245, 0, 70, 38, 0, 76, 70, 0x334155));
    this.castle.add(this.add.rectangle(0, 186, 44, 90, 0x1e293b));
    this.castle.add(this.add.circle(0, -64, 18, 0xfacc15));

    this.castleZone = this.add.zone(120, 590, 38, 650);
    this.physics.add.existing(this.castleZone, true);
  }

  createHud() {
    this.topPanel = this.add.rectangle(270, 50, 500, 72, 0x0f172a, 0.8);
    this.waveText = this.add.text(44, 30, "", {
      fontSize: "24px",
      color: "#f8fafc",
      fontStyle: "bold"
    });
    this.goldText = this.add.text(390, 30, "", {
      fontSize: "24px",
      color: "#fde68a",
      fontStyle: "bold"
    });

    this.hpBack = this.add.rectangle(270, 96, 488, 16, 0x450a0a);
    this.hpFill = this.add.rectangle(26, 96, 488, 16, 0xef4444).setOrigin(0, 0.5);
    this.hpText = this.add.text(270, 116, "", {
      fontSize: "18px",
      color: "#fecaca"
    }).setOrigin(0.5);

    this.magicText = this.add.text(270, 884, "", {
      fontSize: "20px",
      color: "#dbeafe",
      fontStyle: "bold"
    }).setOrigin(0.5);
    this.hintText = this.add.text(270, 920, "화면을 터치하면 가장 가까운 적에게 마법 발사", {
      fontSize: "17px",
      color: "#cbd5e1"
    }).setOrigin(0.5);

    this.statusText = this.add.text(270, 172, "", {
      fontSize: "30px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#0f172a",
      strokeThickness: 5
    }).setOrigin(0.5);

    this.updateHud();
  }

  createInput() {
    this.input.on("pointerdown", (pointer) => {
      if (this.isGameOver) {
        this.scene.restart();
        return;
      }
      this.castMagic(pointer.x, pointer.y);
    });
  }

  spawnMonster() {
    if (this.isGameOver || this.waveKills >= this.waveTargets[this.wave - 1]) {
      return;
    }

    const remaining = this.waveTargets[this.wave - 1] - this.waveKills - this.monsters.length;
    if (remaining <= 0) {
      return;
    }

    const boss = this.wave === 3 && !this.isBossWave;
    this.isBossWave = this.isBossWave || boss;
    const y = boss ? 560 : Phaser.Math.Between(330, 790);
    const monster = this.add.container(570, y);
    const bodyColor = boss ? 0x7c2d12 : 0x7f1d1d;
    const hpMax = boss ? 240 : 40 + this.wave * 16;
    const speed = boss ? 32 : 45 + this.wave * 8;

    monster.hpMax = hpMax;
    monster.hp = hpMax;
    monster.speed = speed;
    monster.reward = boss ? 120 : 18 + this.wave * 4;
    monster.damage = boss ? 35 : 12;
    monster.isBoss = boss;

    monster.add(this.add.circle(0, 0, boss ? 34 : 22, bodyColor));
    monster.add(this.add.circle(-8, -8, boss ? 6 : 4, 0xfef2f2));
    monster.add(this.add.circle(10, -8, boss ? 6 : 4, 0xfef2f2));
    monster.add(this.add.rectangle(0, boss ? 42 : 30, boss ? 72 : 48, 7, 0x111827));
    monster.hpBar = this.add.rectangle(-(boss ? 36 : 24), boss ? 42 : 30, boss ? 72 : 48, 7, 0x22c55e).setOrigin(0, 0.5);
    monster.add(monster.hpBar);

    this.physics.add.existing(monster);
    monster.body.setCircle(boss ? 34 : 22);
    monster.body.setVelocityX(-speed);

    this.monsters.push(monster);
  }

  autoAttack() {
    if (this.isGameOver) {
      return;
    }
    const target = this.findNearestMonster();
    if (!target) {
      return;
    }
    this.fireProjectile(135, 520, target, 18, 0xfacc15, 470, this.projectiles);
  }

  castMagic(x, y) {
    if (this.magicCharges <= 0) {
      this.flashStatus("마법 충전 중");
      return;
    }
    const target = this.findNearestMonster(x, y);
    if (!target) {
      this.flashStatus("대상이 없음");
      return;
    }

    this.magicCharges -= 1;
    this.fireProjectile(x, y, target, 65, 0x38bdf8, 620, this.magicShots);
    this.cameras.main.flash(90, 59, 130, 246, false);
    this.updateHud();
  }

  fireProjectile(x, y, target, damage, color, speed, bucket) {
    const shot = this.add.circle(x, y, damage > 40 ? 10 : 7, color);
    shot.target = target;
    shot.damage = damage;
    this.physics.add.existing(shot);
    this.physics.moveToObject(shot, target, speed);
    bucket.push(shot);
  }

  update(time) {
    if (this.isGameOver) {
      return;
    }

    this.updateProjectiles(this.projectiles);
    this.updateProjectiles(this.magicShots);
    this.updateMonsters();
    this.rechargeMagic(time);
    this.checkWaveComplete();
  }

  updateProjectiles(bucket) {
    for (let i = bucket.length - 1; i >= 0; i -= 1) {
      const shot = bucket[i];
      if (!shot.active || shot.x < -20 || shot.x > GAME_WIDTH + 20 || shot.y < -20 || shot.y > GAME_HEIGHT + 20) {
        this.removeFrom(bucket, shot, i);
        continue;
      }

      const target = shot.target;
      if (!target || !target.active) {
        this.removeFrom(bucket, shot, i);
        continue;
      }

      this.physics.moveToObject(shot, target, shot.damage > 40 ? 620 : 470);
      if (Phaser.Math.Distance.Between(shot.x, shot.y, target.x, target.y) < 26) {
        this.damageMonster(target, shot.damage);
        this.removeFrom(bucket, shot, i);
      }
    }
  }

  updateMonsters() {
    for (let i = this.monsters.length - 1; i >= 0; i -= 1) {
      const monster = this.monsters[i];
      if (!monster.active) {
        this.monsters.splice(i, 1);
        continue;
      }
      if (monster.x <= 132) {
        this.castleHp = Math.max(0, this.castleHp - monster.damage);
        this.cameras.main.shake(160, 0.008);
        monster.destroy();
        this.monsters.splice(i, 1);
        this.updateHud();
        if (this.castleHp <= 0) {
          this.endGame(false);
        }
      }
    }
  }

  damageMonster(monster, damage) {
    monster.hp = Math.max(0, monster.hp - damage);
    monster.hpBar.width = (monster.isBoss ? 72 : 48) * (monster.hp / monster.hpMax);
    this.tweens.add({
      targets: monster,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 60,
      yoyo: true
    });

    if (monster.hp <= 0) {
      this.gold += monster.reward;
      this.waveKills += 1;
      this.addBurst(monster.x, monster.y, monster.isBoss ? 0xf97316 : 0xfacc15);
      monster.destroy();
      this.monsters = this.monsters.filter((item) => item !== monster);
      this.updateHud();
    }
  }

  addBurst(x, y, color) {
    for (let i = 0; i < 10; i += 1) {
      const spark = this.add.circle(x, y, 3, color);
      this.tweens.add({
        targets: spark,
        x: x + Phaser.Math.Between(-34, 34),
        y: y + Phaser.Math.Between(-34, 34),
        alpha: 0,
        duration: 360,
        onComplete: () => spark.destroy()
      });
    }
  }

  rechargeMagic(time) {
    if (this.magicCharges >= this.magicMaxCharges) {
      return;
    }
    if (time > this.nextMagicRecharge) {
      this.magicCharges += 1;
      this.nextMagicRecharge = time + 2800;
      this.updateHud();
    }
  }

  checkWaveComplete() {
    if (this.waveKills < this.waveTargets[this.wave - 1] || this.monsters.length > 0) {
      return;
    }

    if (this.wave >= 3) {
      this.endGame(true);
      return;
    }

    this.wave += 1;
    this.waveKills = 0;
    this.isBossWave = false;
    this.flashStatus(`웨이브 ${this.wave} 시작`);
    this.updateHud();
  }

  findNearestMonster(x = 140, y = 520) {
    let nearest = null;
    let bestDistance = Infinity;
    this.monsters.forEach((monster) => {
      if (!monster.active) {
        return;
      }
      const distance = Phaser.Math.Distance.Between(x, y, monster.x, monster.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = monster;
      }
    });
    return nearest;
  }

  updateHud() {
    this.waveText.setText(`Wave ${this.wave}/3`);
    this.goldText.setText(`Gold ${this.gold}`);
    this.hpFill.width = 488 * (this.castleHp / this.castleHpMax);
    this.hpText.setText(`Castle HP ${this.castleHp}/${this.castleHpMax}`);
    this.magicText.setText(`마법 ${this.magicCharges}/${this.magicMaxCharges}`);
  }

  flashStatus(message) {
    this.statusText.setText(message);
    this.statusText.setAlpha(1);
    this.tweens.killTweensOf(this.statusText);
    this.tweens.add({
      targets: this.statusText,
      alpha: 0,
      delay: 850,
      duration: 450
    });
  }

  endGame(victory) {
    this.isGameOver = true;
    this.spawnTimer.remove(false);
    this.attackTimer.remove(false);
    this.statusText.setText(victory ? "전투 승리!" : "게임 오버");
    this.statusText.setAlpha(1);
    this.hintText.setText("다시 시작하려면 화면을 터치");
  }

  removeFrom(bucket, item, index) {
    item.destroy();
    bucket.splice(index, 1);
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#111827",
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: BattleScene
};

new Phaser.Game(config);

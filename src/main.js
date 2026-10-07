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
    this.monsters = [];
    this.projectiles = [];
    this.magicShots = [];
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
    this.add.rectangle(270, 480, 540, 960, 0x4d9b45);
    this.add.rectangle(270, 520, 540, 880, 0x5aae4f);
    this.add.rectangle(270, 760, 540, 400, 0x499641);

    const laneY = [170, 320, 470, 620, 770, 900];
    laneY.forEach((y) => {
      this.add.rectangle(340, y, 360, 34, 0x2f6f35, 0.18);
      this.add.line(340, y + 18, -180, 0, 180, 0, 0xe7f8d9, 0.18);
    });

    for (let i = 0; i < 70; i += 1) {
      const x = Phaser.Math.Between(145, 520);
      const y = Phaser.Math.Between(64, 940);
      this.add.line(x, y, 0, 0, Phaser.Math.Between(-2, 2), -Phaser.Math.Between(5, 10), 0x8bd46f, 0.35);
    }
  }

  createCastle() {
    this.castle = this.add.container(66, 480);
    this.castle.add(this.add.rectangle(0, 0, 120, 960, 0x64748b));
    this.castle.add(this.add.rectangle(54, 0, 20, 960, 0x334155));
    this.castle.add(this.add.rectangle(0, -440, 128, 80, 0x94a3b8));
    this.castle.add(this.add.rectangle(0, 440, 128, 80, 0x475569));
    this.castle.add(this.add.rectangle(0, 0, 46, 160, 0x1e293b));
    this.castle.add(this.add.rectangle(0, -250, 52, 82, 0x475569));
    this.castle.add(this.add.circle(0, -280, 17, 0xfacc15));

    for (let y = -420; y <= 420; y += 120) {
      this.castle.add(this.add.rectangle(-36, y, 24, 48, 0x94a3b8));
      this.castle.add(this.add.rectangle(0, y, 24, 48, 0x94a3b8));
      this.castle.add(this.add.rectangle(36, y, 24, 48, 0x94a3b8));
    }

    this.hero = this.add.container(124, 480);
    this.hero.add(this.add.rectangle(0, 24, 34, 44, 0x1e40af));
    this.hero.add(this.add.circle(0, -8, 17, 0xffd7a8));
    this.hero.add(this.add.rectangle(19, 12, 10, 48, 0x111827));
    this.hero.add(this.add.triangle(28, -16, 0, 0, 34, 12, 0, 24, 0xf8fafc));
    this.hero.add(this.add.rectangle(0, 50, 44, 10, 0x334155));

    this.castleZone = this.add.zone(134, 480, 34, 960);
    this.physics.add.existing(this.castleZone, true);
  }

  createHud() {
    this.topPanel = this.add.rectangle(270, 18, 540, 34, 0x0f172a, 0.72);
    this.waveText = this.add.text(16, 8, "", {
      fontSize: "17px",
      color: "#f8fafc",
      fontStyle: "bold"
    });
    this.goldText = this.add.text(434, 8, "", {
      fontSize: "17px",
      color: "#fde68a",
      fontStyle: "bold"
    });

    this.hpBack = this.add.rectangle(270, 34, 250, 8, 0x450a0a);
    this.hpFill = this.add.rectangle(145, 34, 250, 8, 0xef4444).setOrigin(0, 0.5);
    this.hpText = this.add.text(270, 18, "", {
      fontSize: "15px",
      color: "#fecaca"
    }).setOrigin(0.5);

    this.magicText = this.add.text(270, 928, "", {
      fontSize: "18px",
      color: "#eff6ff",
      fontStyle: "bold",
      stroke: "#0f172a",
      strokeThickness: 4
    }).setOrigin(0.5);

    this.statusText = this.add.text(270, 86, "", {
      fontSize: "28px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#0f172a",
      strokeThickness: 5
    }).setOrigin(0.5);

    this.updateHud();
  }

  createInput() {
    this.input.on("pointerdown", () => {
      if (this.isGameOver) {
        this.scene.restart();
        return;
      }
      this.castMagic();
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
    const y = boss ? 520 : Phaser.Math.Between(90, 890);
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

    monster.add(this.add.circle(0, 0, boss ? 34 : 22, 0x111827));
    monster.add(this.add.circle(0, 0, boss ? 29 : 18, bodyColor));
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
    this.fireProjectile(148, 474, target, 18, 0xfff7ed, 470, this.projectiles);
  }

  castMagic() {
    if (this.magicCharges <= 0) {
      this.flashStatus("마법 충전 중");
      return;
    }
    const target = this.findNearestMonster();
    if (!target) {
      this.flashStatus("대상 없음");
      return;
    }

    this.magicCharges -= 1;
    this.fireProjectile(148, 474, target, 65, 0x7dd3fc, 620, this.magicShots);
    this.cameras.main.flash(90, 59, 130, 246, false);
    this.updateHud();
  }

  fireProjectile(x, y, target, damage, color, speed, bucket) {
    const shot = this.add.circle(x, y, damage > 40 ? 12 : 8, color);
    shot.setStrokeStyle(damage > 40 ? 4 : 3, damage > 40 ? 0x082f49 : 0x7c2d12);
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
      if (monster.x <= 134) {
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

  findNearestMonster(x = 148, y = 474) {
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
    this.hpFill.width = 250 * (this.castleHp / this.castleHpMax);
    this.hpText.setText(`HP ${this.castleHp}/${this.castleHpMax}`);
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
    this.magicText.setText("터치하여 다시 시작");
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
  backgroundColor: "#4d9b45",
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

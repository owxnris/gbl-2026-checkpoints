/* Data-driven stage and enemy extension. Add future stages in stages.json only. */
const stageMonsterTypes = {
  normal: { hp: 27, speed: 104, scale: 1, color: 0xdb4567, autoMultiplier: 1, powerMultiplier: 1 },
  scout: { hp: 10, speed: 156, scale: .62, color: 0xf1ca55, autoMultiplier: 1, powerMultiplier: 1 },
  tank: { hp: 170, speed: 54, scale: 1.55, color: 0x765c9e, autoMultiplier: .18, powerMultiplier: 2.7 }
};

const originalPreload = Battle.prototype.preload;
const originalCreate = Battle.prototype.create;
Battle.prototype.preload = function () {
  if (originalPreload) originalPreload.call(this);
  this.load.json('stageData', 'stages.json');
};
Battle.prototype.create = function () {
  originalCreate.call(this);
  this.stageData = this.cache.json.get('stageData').stages[0];
  this.currentWave = 0;
  this.powerReadyAt = 0;
  ui('wave').textContent = `1 / ${this.stageData.waves.length}`;
};
Battle.prototype.launchWave = function () {
  if (running || this.currentWave >= this.stageData.waves.length) return;
  const spec = this.stageData.waves[this.currentWave];
  this.enemyQueue = spec.enemies.flatMap(group => Array(group.count).fill(group.type));
  this.spawnQueue = this.enemyQueue.length;
  this.lastSpawn = 0;
  running = true;
  ui('game-state').textContent = '적 접근 중'; ui('start-wave').disabled = true;
  effects.sweepText(this, `WAVE ${String(this.currentWave + 1).padStart(2, '0')}`);
};
Battle.prototype.spawnEnemy = function () {
  const type = this.enemyQueue.shift();
  const data = stageMonsterTypes[type];
  const sprite = this.add.container(this.path[0].x, this.path[0].y);
  const graphic = this.add.graphics();
  graphic.fillStyle(data.color); graphic.fillTriangle(-13, 0, 0, -10, 13, 0, 0, 10);
  graphic.lineStyle(2, type === 'tank' ? 0xd6c8ff : 0xffe3b0); graphic.strokeTriangle(-13, 0, 0, -10, 13, 0, 0, 10);
  sprite.add(graphic).setScale(data.scale);
  this.enemies.push({ sprite, point: 0, hp: data.hp, maxHp: data.hp, speed: data.speed, type, data, dead: false, knockedBack: false });
};
Battle.prototype.applyDamage = function (enemy, damage, kind) {
  if (enemy.dead) return;
  enemy.hp -= damage * enemy.data[kind === 'power' ? 'powerMultiplier' : 'autoMultiplier'];
  if (enemy.hp > 0) return;
  enemy.dead = true;
  this.tweens.add({ targets: enemy.sprite, scale: enemy.sprite.scale * 1.8, alpha: 0, duration: 180, onComplete: () => { enemy.sprite.destroy(); this.enemies = this.enemies.filter(x => x !== enemy); energy += 5; updateTop(); } });
};
Battle.prototype.fireTower = function (tower, time) {
  if (time - tower.last < tower.data.cooldown) return;
  const enemy = this.enemies.filter(e => !e.dead).sort((a,b) => Phaser.Math.Distance.Between(tower.x,tower.y,a.sprite.x,a.sprite.y) - Phaser.Math.Distance.Between(tower.x,tower.y,b.sprite.x,b.sprite.y))[0];
  if (!enemy || Phaser.Math.Distance.Between(tower.x,tower.y,enemy.sprite.x,enemy.sprite.y) > tower.data.range) return;
  tower.last = time; const beam = this.add.graphics(); beam.lineStyle(7, 0x14222a, .8); beam.lineBetween(tower.x,tower.y,enemy.sprite.x,enemy.sprite.y); beam.lineStyle(3,tower.data.color,1); beam.lineBetween(tower.x,tower.y,enemy.sprite.x,enemy.sprite.y);
  this.tweens.add({ targets: beam, alpha: 0, duration: 105, onComplete: () => beam.destroy() }); this.applyDamage(enemy, tower.data.damage, 'auto');
};
Battle.prototype.fireHero = function (time) {
  const hero = this.hero; if (!hero || time - hero.last < hero.cooldown) return;
  const enemy = this.enemies.filter(e => !e.dead).sort((a,b) => Phaser.Math.Distance.Between(hero.x,hero.y,a.sprite.x,a.sprite.y) - Phaser.Math.Distance.Between(hero.x,hero.y,b.sprite.x,b.sprite.y))[0];
  if (!enemy || Phaser.Math.Distance.Between(hero.x,hero.y,enemy.sprite.x,enemy.sprite.y) > hero.range) return;
  hero.last = time; const shot = this.add.circle(hero.x, hero.y, 5, 0xfff5a6).setStrokeStyle(2, 0x5e3a12);
  this.tweens.add({ targets: shot, x: enemy.sprite.x, y: enemy.sprite.y, duration: 115, onComplete: () => { shot.destroy(); this.applyDamage(enemy, hero.damage, 'auto'); } });
};
Battle.prototype.update = function (time, delta) {
  if (running && this.spawnQueue && time - this.lastSpawn > 700) { this.spawnEnemy(); this.spawnQueue--; this.lastSpawn = time; }
  this.enemies.slice().forEach(enemy => this.moveEnemy(enemy, delta)); this.placed.forEach(tower => this.fireTower(tower, time)); this.fireHero(time);
  if (running && !this.spawnQueue && !this.enemies.length) {
    running = false; energy += 35; this.currentWave++; wave = this.currentWave + 1; updateTop();
    const done = this.currentWave >= this.stageData.waves.length; const button = ui('start-wave'); button.disabled = done;
    ui('game-state').textContent = done ? '스테이지 완료' : '파동 대기'; button.innerHTML = done ? '스테이지 1 방어 완료' : `WAVE ${String(wave).padStart(2, '0')} 시작 <span>›</span>`;
    ui('wave').textContent = `${Math.min(wave, this.stageData.waves.length)} / ${this.stageData.waves.length}`;
  }
};
Battle.prototype.powerAttack = function () {
  const now = this.time.now; if (now < this.powerReadyAt) return;
  const hero = this.hero; const target = this.enemies.filter(e => !e.dead).sort((a,b) => (b.type === 'tank') - (a.type === 'tank') || Phaser.Math.Distance.Between(hero.x,hero.y,a.sprite.x,a.sprite.y) - Phaser.Math.Distance.Between(hero.x,hero.y,b.sprite.x,b.sprite.y))[0];
  if (!target) return; this.powerReadyAt = now + 2500; ui('power-shot').disabled = true; ui('power-state').textContent = '충전 중';
  const blast = this.add.graphics(); blast.lineStyle(8, 0xffa348, 1); blast.lineBetween(hero.x, hero.y, target.sprite.x, target.sprite.y);
  this.tweens.add({ targets: blast, alpha: 0, duration: 180, onComplete: () => blast.destroy() }); this.applyDamage(target, 65, 'power');
  this.time.delayedCall(2500, () => { ui('power-shot').disabled = false; ui('power-state').textContent = '준비'; });
};
document.getElementById('power-shot').addEventListener('click', () => sceneRef && sceneRef.powerAttack());
window.addEventListener('keydown', event => { if (event.code === 'Space') { event.preventDefault(); if (sceneRef) sceneRef.powerAttack(); } });

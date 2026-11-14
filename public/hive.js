/* Hive Play: latar gradien, musik latar, efek suara, dan percikan.
   Semua suara dibuat langsung di browser (Web Audio): tanpa file lagu, bebas hak cipta. */
(() => {
  if (window.HP) return;
  const KEY = 'hp_sound', COLS = ['#8b7bff', '#ff7ab6', '#ffc14d', '#3fe0c5'];
  let on = true, held = !!window.HPHold; // held = musik ditahan (untuk game yang memakai mikrofon)
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) {}

  if (!document.querySelector('.mesh')) {
    const m = document.createElement('div');
    m.className = 'mesh'; m.setAttribute('aria-hidden', 'true');
    m.innerHTML = '<i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i><i class="band"></i>';
    document.body.prepend(m);
  }
  function burst() {
    for (let i = 0; i < 24; i++) {
      const e = document.createElement('i');
      e.className = 'hp-conf'; e.style.left = Math.random() * 98 + 'vw';
      e.style.background = COLS[i % 4]; e.style.animationDelay = Math.random() * 0.5 + 's';
      document.body.appendChild(e); setTimeout(() => e.remove(), 2700);
    }
  }
  function spark(el) {
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let q = 0; q < 10; q++) {
      const s = document.createElement('i'), a = q / 10 * 6.283, d = 70 + Math.random() * 40;
      s.className = 'spk';
      s.style.cssText = `left:${cx - 6}px;top:${cy - 6}px;background:${COLS[q % 4]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
      document.body.appendChild(s); setTimeout(() => s.remove(), 900);
    }
  }
  function say(t) {
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'id-ID'; u.rate = 0.85; speechSynthesis.speak(u); } catch (e) {}
  }

  /* ---------- audio ---------- */
  let ac, master, musicBus, sfxBus, started = false, next = 0, step = 0;
  const target = () => (held ? 0 : 0.45);

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain(); master.gain.value = on ? 1 : 0; master.connect(ac.destination);
      musicBus = ac.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
      sfxBus = ac.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(bus, f, t, d, type, v) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + 0.05);
  }
  function fade(to, sec) {
    if (!ac) return;
    musicBus.gain.cancelScheduledValues(ac.currentTime);
    musicBus.gain.setValueAtTime(musicBus.gain.value, ac.currentTime);
    musicBus.gain.linearRampToValueAtTime(to, ac.currentTime + sec);
  }

  /* musik: lagu pengantar tidur sederhana (C - Am - F - G), pelan dan lembut */
  const CH = [[261.63, 329.63, 392.0], [220.0, 261.63, 329.63], [174.61, 261.63, 349.23], [196.0, 246.94, 293.66]];
  const ROOT = [130.81, 110.0, 87.31, 98.0];
  const PENT = [523.25, 587.33, 659.25, 783.99, 880.0];
  const EIGHTH = 0.36;
  function schedule() {
    while (next < ac.currentTime + 0.7) {
      const bar = Math.floor(step / 8) % 4, k = step % 8;
      tone(musicBus, CH[bar][[0, 1, 2, 1, 0, 1, 2, 1][k]] * 2, next, 0.9, 'sine', 0.10);
      if (k === 0) tone(musicBus, ROOT[bar], next, 2.6, 'triangle', 0.16);
      if (k % 2 === 0 && Math.random() < 0.55) tone(musicBus, PENT[Math.floor(Math.random() * PENT.length)], next, 1.1, 'sine', 0.07);
      next += EIGHTH; step++;
    }
  }
  function startMusic() {
    if (started || !ctx()) return;
    started = true; next = ac.currentTime + 0.1;
    schedule(); setInterval(schedule, 250);
    fade(target(), 2);
  }

  /* efek suara */
  const play = (fn) => () => { if (on && ctx()) fn(ac.currentTime); };
  const sfx = {
    pop: play((t) => { const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.12);
      g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.2); }),
    tick(f) { play((t) => tone(sfxBus, f || 1100, t, 0.05, 'square', 0.07))(); },
    flip: play((t) => tone(sfxBus, 520, t, 0.12, 'triangle', 0.22)),
    match: play((t) => [659.25, 880].forEach((f, i) => tone(sfxBus, f, t + i * 0.1, 0.3, 'triangle', 0.3))),
    ok() { play((t) => [523.25, 659.25, 783.99].forEach((f, i) => tone(sfxBus, f, t + i * 0.09, 0.35, 'triangle', 0.3)))(); if (on) burst(); },
    no: play((t) => { tone(sfxBus, 300, t, 0.25, 'sine', 0.25); tone(sfxBus, 235, t + 0.14, 0.35, 'sine', 0.25); }),
    win() { play((t) => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(sfxBus, f, t + i * 0.13, 0.5, 'triangle', 0.3)))(); if (on) burst(['trophy', 'star', 'honey', 'bee', 'heart']); },
    burst, spark, say,
    hold(b) { held = !!b; fade(target(), 0.5); }, // true = tahan musik (mis. saat mikrofon dipakai)
  };
  window.HP = sfx;

  /* tombol suara */
  const btn = document.createElement('button');
  btn.className = 'hp-snd'; btn.type = 'button';
  function paint() { btn.innerHTML = A(on ? 'speakerOn' : 'speakerOff'); btn.setAttribute('aria-pressed', String(on)); btn.setAttribute('aria-label', on ? 'Matikan suara' : 'Nyalakan suara'); }
  paint();
  btn.onclick = () => {
    on = !on; try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
    if (ctx()) { master.gain.cancelScheduledValues(ac.currentTime); master.gain.linearRampToValueAtTime(on ? 1 : 0, ac.currentTime + 0.4); }
    if (on) startMusic();
    paint();
  };
  document.body.appendChild(btn);

  /* browser baru boleh bersuara setelah layar disentuh */
  const unlock = () => { if (on) startMusic(); else ctx(); };
  ['pointerdown', 'keydown'].forEach((e) => addEventListener(e, unlock, { once: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (ac) (document.hidden ? ac.suspend() : ac.resume()); });
})();
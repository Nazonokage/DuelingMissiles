// Shuffled jukebox — plays all available tracks in random order, advancing on 'ended'.
export class MusicManager {
  constructor(themes, _selection, makeAudio = () => new Audio()) {
    Object.assign(this, { themes, makeAudio, audio: null, queue: [], idx: 0, muted: false, hidden: false, volume: 0.42, stopped: true, pending: new WeakSet() });
  }

  /** Build a Fisher-Yates shuffled list of all tracks that have URLs. */
  _buildQueue() {
    const tracks = Object.values(this.themes).filter(t => t.url).map(t => t.url);
    for (let i = tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
    }
    return tracks;
  }

  _next() {
    if (!this.queue.length) return;
    this.idx = (this.idx + 1) % this.queue.length;
    this._load(this.queue[this.idx]);
  }

  _load(url) {
    if (this.audio) { this.audio.onended = null; this.audio.onerror = null; this.audio.pause(); }
    const a = this.makeAudio();
    a.src = url; a.volume = this.volume; a.preload = 'metadata';
    a.onended = () => this._next();
    a.onerror = () => {
      if (this.audio !== a) return;
      this.queue.splice(this.idx, 1);
      if (!this.queue.length) { this.stop(); return; }
      this.idx %= this.queue.length;
      this._load(this.queue[this.idx]);
    };
    this.audio = a;
    this.resume();
  }

  refresh() {
    this.stop();
    this.stopped = false;
    this.queue = this._buildQueue();
    this.idx = 0;
    if (this.queue.length) this._load(this.queue[0]);
    else { this.audio = null; this.stopped = true; }
  }

  resume() {
    const a = this.audio;
    if (!a || this.stopped || this.muted || this.hidden || !a.src || !a.paused || this.pending.has(a)) return;
    this.pending.add(a);
    const allowed = () => this.audio === a && !this.stopped && !this.muted && !this.hidden;
    Promise.resolve().then(() => { if (allowed()) return a.play(); })
      .then(() => { if (!allowed()) a.pause(); })
      .catch(() => {}).finally(() => this.pending.delete(a));
  }

  pause() { this.audio?.pause(); }
  stop()  { this.stopped = true; this.pause(); }

  // Called each turn — no-op now (jukebox plays continuously)
  setTurn() { this.resume(); }

  setMuted(v)  { this.muted = v;  v ? this.pause() : this.resume(); }
  setHidden(v) { this.hidden = v; v ? this.pause() : this.resume(); }
  setVolume(v) { this.volume = Math.max(0, Math.min(1, v)); if (this.audio) this.audio.volume = this.volume; }
}

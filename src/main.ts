import './style.css';

type Route = 'home' | 'demo' | 'privacy' | 'terms' | 'controller';
type GamePhase = 'preview' | 'waiting' | 'countdown' | 'racing' | 'paused' | 'finished';

interface Driver {
  id: string;
  label: string;
  color: string;
  ready: boolean;
  host?: boolean;
}

interface Car extends Driver {
  progress: number;
  lane: number;
  speed: number;
  boost: number;
  hitTimer: number;
}

interface Settings {
  sound: boolean;
  assist: boolean;
  controls: {
    left: string;
    right: string;
    drive: string;
  };
}

interface RoomState {
  code: string;
  players: Driver[];
  race?: RaceState;
}

interface RaceState {
  seed: number;
  startedAt: number;
  duration: number;
}

interface RaceSnapshot {
  version: 1;
  seed: number;
  phase: GamePhase;
  duration: number;
  raceSeconds: number;
  cars: Car[];
  autoPilot: boolean;
}

interface ServerMessage {
  type: string;
  room?: string;
  players?: Driver[];
  playerId?: string;
  seed?: number;
  error?: string;
  steer?: number;
  throttle?: boolean;
  boost?: boolean;
  ready?: boolean;
  race?: RaceState;
}

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Pocket Pitlane could not start.');
const app: HTMLDivElement = root;

const palette = ['#ff795f', '#65c9e8', '#d9f36c', '#ffc95e', '#cf9dff', '#ff94c7', '#70e1ba', '#f3f1e9'];
const storagePrefix = 'pocket-pitlane:';
const defaultControls = { left: 'ArrowLeft', right: 'ArrowRight', drive: 'ArrowUp' };
let route = routeFromLocation();
let settings = readSettings(isDemoRoute());
let room: RoomState | null = null;
let socket: RealtimeClient | null = null;
let game: RaceGame | null = null;
let hostId = '';
let connectionStatus = '';
let ariaText = '';

function routeFromLocation(): Route {
  if (location.pathname === '/demo' || new URLSearchParams(location.search).get('demo') === '1') return 'demo';
  if (location.pathname === '/privacy') return 'privacy';
  if (location.pathname === '/terms') return 'terms';
  if (location.pathname === '/controller') return 'controller';
  return 'home';
}

function isDemoRoute(): boolean {
  return route === 'demo';
}

function key(name: string): string {
  return `${isDemoRoute() ? 'demo:' : ''}${storagePrefix}${name}`;
}

function readSettings(demo: boolean): Settings {
  const fallback = (): Settings => ({ sound: true, assist: false, controls: { ...defaultControls } });
  try {
    const raw = localStorage.getItem(`${demo ? 'demo:' : ''}${storagePrefix}settings`);
    if (!raw) return fallback();
    const value = JSON.parse(raw) as Partial<Settings>;
    return {
      sound: value.sound !== false,
      assist: value.assist === true,
      controls: {
        left: typeof value.controls?.left === 'string' ? value.controls.left : defaultControls.left,
        right: typeof value.controls?.right === 'string' ? value.controls.right : defaultControls.right,
        drive: typeof value.controls?.drive === 'string' ? value.controls.drive : defaultControls.drive
      }
    };
  } catch {
    return fallback();
  }
}

function saveSettings(): void {
  localStorage.setItem(key('settings'), JSON.stringify(settings));
}

function readRaceSnapshot(): RaceSnapshot | null {
  try {
    const raw = localStorage.getItem(key('active-race'));
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as Partial<RaceSnapshot>;
    if (snapshot.version !== 1 || !Number.isFinite(snapshot.seed) || !Number.isFinite(snapshot.duration) || !Number.isFinite(snapshot.raceSeconds) || !Array.isArray(snapshot.cars) || !['countdown', 'racing', 'paused', 'finished'].includes(snapshot.phase ?? '')) return null;
    return snapshot as RaceSnapshot;
  } catch {
    return null;
  }
}

function saveRaceSnapshot(): void {
  const snapshot = game?.snapshot();
  if (!snapshot || snapshot.phase === 'preview' || snapshot.phase === 'waiting') return;
  try { localStorage.setItem(key('active-race'), JSON.stringify(snapshot)); } catch { /* A race can still finish when storage is unavailable. */ }
}

function clearRaceSnapshot(): void {
  try { localStorage.removeItem(key('active-race')); } catch { /* Storage is optional. */ }
}

function getOrCreateId(name: string): string {
  const storageName = `${storagePrefix}${name}`;
  let value = localStorage.getItem(storageName);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(storageName, value);
  }
  return value;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function keyName(value: string): string {
  if (value === ' ') return 'Space';
  return value.length === 1 ? value.toUpperCase() : value;
}

function setTitle(nextRoute: Route): void {
  const titles: Record<Route, string> = {
    home: 'Pocket Pitlane — Race on one shared screen',
    demo: 'Demo — Pocket Pitlane',
    privacy: 'Privacy — Pocket Pitlane',
    terms: 'Terms — Pocket Pitlane',
    controller: 'Controller — Pocket Pitlane'
  };
  document.title = titles[nextRoute];
}

function navigate(path: string): void {
  history.pushState({}, '', path);
  route = routeFromLocation();
  settings = readSettings(isDemoRoute());
  room = null;
  socket?.close();
  socket = null;
  render();
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  const heading = document.querySelector<HTMLElement>('h1');
  heading?.focus({ preventScroll: true });
}

window.addEventListener('popstate', () => {
  route = routeFromLocation();
  settings = readSettings(isDemoRoute());
  room = null;
  socket?.close();
  socket = null;
  render();
  const heading = document.querySelector<HTMLElement>('h1');
  heading?.focus({ preventScroll: true });
});

function pageShell(content: string): string {
  return `
    <a class="skip-link" href="#main">Skip to game and content</a>
    <header class="site-header">
      <div class="header-inner">
        <a class="wordmark" href="/" data-route>Pocket Pitlane</a>
        <nav aria-label="Site"><ul>
          <li><a href="/demo" data-route>Demo</a></li>
          <li><a href="/#how-to-play">How to play</a></li>
          <li><a href="/privacy" data-route>Privacy</a></li>
          <li><a href="/terms" data-route>Terms</a></li>
        </ul></nav>
      </div>
    </header>
    ${content}
    <footer class="site-footer"><div class="footer-inner">
      <span>A free shared-screen racing game for 2–8 people.</span>
      <span class="footer-links"><a href="/privacy" data-route>Privacy</a><a href="/terms" data-route>Terms</a><span>Built by Param Factory</span></span>
      <span>Build 1.0.0</span>
    </div></footer>
    <div class="route-announcer" aria-live="polite" aria-atomic="true">${escapeHtml(ariaText)}</div>`;
}

function gameMarkup(demo: boolean): string {
  return `
    <section class="game-frame" aria-label="Pocket Pitlane race screen">
      <canvas id="track" role="img" aria-label="Top-down race track with the current drivers"></canvas>
      <div class="race-hud">
        <span class="timer" id="race-timer">Practice track</span>
        <div class="hud-right"><span class="mode-badge">${demo ? 'Sample race' : 'Shared screen'}</span><button class="icon-button" id="settings-button" type="button" aria-haspopup="dialog" aria-label="Open game settings">⚙</button></div>
      </div>
      <p class="visually-hidden" id="game-input-status" aria-live="polite"></p>
      <div class="game-overlay" id="game-overlay"></div>
    </section>
    <dialog id="settings-dialog" aria-labelledby="settings-title">
      <form method="dialog" class="dialog-inner">
        <h2 id="settings-title">Game settings</h2>
        <label class="setting"><span>Sound effects</span><input id="sound-setting" type="checkbox" ${settings.sound ? 'checked' : ''}></label>
        <label class="setting"><span>Steering assist</span><input id="assist-setting" type="checkbox" ${settings.assist ? 'checked' : ''}></label>
        <fieldset class="key-settings"><legend>Keyboard controls</legend><p>Choose a control, then press one key.</p><div class="key-bindings"><button class="button-secondary" id="bind-left" type="button">Steer left: ${escapeHtml(keyName(settings.controls.left))}</button><button class="button-secondary" id="bind-right" type="button">Steer right: ${escapeHtml(keyName(settings.controls.right))}</button><button class="button-secondary" id="bind-drive" type="button">Drive and boost: ${escapeHtml(keyName(settings.controls.drive))}</button></div><button class="button-quiet" id="reset-key-bindings" type="button">Reset keyboard controls</button><p class="key-status" id="key-binding-status" aria-live="polite"></p></fieldset>
        <p>Controllers use touch buttons. The shared screen uses these keyboard controls.</p>
        <div class="dialog-actions"><button class="button-secondary" value="close">Close settings</button></div>
      </form>
    </dialog>`;
}

function homePage(demo: boolean): string {
  const firstPanel = demo
    ? `<div class="demo-banner" role="status"><span>Demo — sample data, nothing is saved</span><span><button class="button-quiet" id="reset-demo" type="button">Reset demo</button> <button class="button-quiet" id="start-real" type="button">Start for real</button></span></div>`
    : '';
  return pageShell(`
    <main id="main" class="page">
      <div class="racing-layout">
        ${firstPanel}
        <section class="intro" aria-labelledby="page-title">
          <div><h1 id="page-title" tabindex="-1">Race with friends on one shared screen</h1><p class="lead">For friends sharing a TV or laptop: phones become controllers and everyone sees the same race.</p><div class="hero-actions">${demo ? '<button class="button" id="start-sample-top" type="button">Start sample race</button><span>Runs the four-racer sample.</span>' : '<button class="button" id="create-room" type="button">Create room</button><a class="button-secondary" href="/demo" data-route>Try it with sample data</a><span>Starts a four-racer practice race.</span>'}</div></div>
          <ul class="facts" aria-label="Game facts"><li>Free first release</li><li>No accounts or contacts</li><li>Touch or keyboard controls</li></ul>
        </section>
        <div>${gameMarkup(demo)}</div>
        <aside class="setup-panel" aria-labelledby="room-title">
          <h2 id="room-title">${demo ? 'Sample room' : 'Start a room'}</h2>
          ${demo ? demoSetup() : realSetup()}
        </aside>
      </div>
      <section class="section" id="how-to-play" aria-labelledby="how-title">
        <h2 id="how-title">How to play</h2>
        <div class="steps"><article class="step"><h3>1. Create a room</h3><p>Put this screen where everyone can see it.</p></article><article class="step"><h3>2. Join from phones</h3><p>Open the controller link and tap Ready.</p></article><article class="step"><h3>3. Start the race</h3><p>Steer around hazards and use boost when it fills.</p></article></div>
      </section>
      <section class="section" aria-labelledby="privacy-title"><div class="details"><h2 id="privacy-title">What this game does not do</h2><p>It has no accounts, voice chat, ads, or contact access. The room service only keeps an anonymous controller token and the room state needed to run the race.</p></div></section>
    </main>`);
}

function demoSetup(): string {
  return `<p>Four sample racers are ready. Start to see the full shared-screen race.</p>
    <ul class="player-list" aria-label="Sample racers"><li><span>Mika</span><span class="ready">Ready</span></li><li><span>Ivo</span><span class="ready">Ready</span></li><li><span>June</span><span class="ready">Ready</span></li><li><span>Remy</span><span class="ready">Ready</span></li></ul>
    <p class="button-note">Sample room CALM42. Nothing is saved.</p><p class="status" id="demo-reset-status" aria-live="polite"></p>`;
}

function realSetup(): string {
  if (!room) {
    const savedRace = readRaceSnapshot();
    return `<p>Create a six-character room. Your keyboard is the first controller.</p><p class="button-note">Select Create room above, then share the link shown here.</p>${savedRace ? '<button class="button-secondary" id="resume-saved-race" type="button">Resume saved race</button><p class="button-note">Reconnects this browser to its active room.</p>' : ''}<p class="status ${connectionStatus.startsWith('Could not') ? 'error' : ''}" id="connection-status" aria-live="polite">${escapeHtml(connectionStatus)}</p>`;
  }
  const readyCount = room.players.filter((player) => player.ready).length;
  const players = room.players.map((player) => `<li><span>${escapeHtml(player.label)}${player.host ? ' (keyboard)' : ''}</span><span class="${player.ready ? 'ready' : 'not-ready'}">${player.ready ? 'Ready' : 'Waiting'}</span></li>`).join('');
  const controllerUrl = `${location.origin}/controller?room=${room.code}`;
  return `<p>Open this link on each phone. It opens a controller without an account.</p><div class="room-code" aria-label="Room code ${room.code.split('').join(' ')}">${room.code}</div><a class="share-link" href="${controllerUrl}">${controllerUrl}</a><ul class="player-list" aria-label="Drivers in room">${players}</ul><div class="button-row"><button class="button-secondary" id="host-ready" type="button">${room.players.find((player) => player.id === hostId)?.ready ? 'Mark keyboard not ready' : 'Mark keyboard ready'}</button><button class="button" id="start-race" type="button" ${readyCount < 2 ? 'disabled' : ''}>Start 90-second race</button></div><p class="button-note">${readyCount < 2 ? 'Two ready drivers are needed.' : 'Everyone is ready. Start when the group is set.'}</p><p class="status ${connectionStatus.startsWith('Could not') ? 'error' : 'good'}" id="connection-status" aria-live="polite">${escapeHtml(connectionStatus)}</p>`;
}

function textPage(kind: 'privacy' | 'terms'): string {
  const privacy = kind === 'privacy';
  return pageShell(`<main id="main" class="page route-page"><h1 tabindex="-1">${privacy ? 'Privacy for Pocket Pitlane' : 'Terms for Pocket Pitlane'}</h1>${privacy ? `
    <p>Pocket Pitlane does not ask for a name, email address, contacts, camera, or location.</p>
    <h2>Room data</h2><p>The room service stores random controller tokens and generated game state. That includes ready state, car colors, race state, room code, and timestamps. Rooms expire after four hours.</p>
    <h2>Device motion</h2><p>Motion steering is optional. The browser asks only after you tap the motion button. Touch steering works without permission.</p>
    <h2>Storage</h2><p>Game settings and an anonymous controller token stay in this browser. Demo storage uses a separate sample key and is discarded when you leave the demo.</p>
    <h2>Tracking</h2><p>This game has no ads, analytics, or third-party scripts.</p>
    <h2>Contact</h2><p>For a privacy request, contact the Param Factory operator through the product listing.</p>` : `
    <p>Pocket Pitlane is a free browser game for a shared screen and phone controllers.</p>
    <h2>Use the game safely</h2><p>Use a nickname-free room code only with people you trust. Do not use the game while driving a vehicle or in a place where looking at a screen is unsafe.</p>
    <h2>Availability</h2><p>The game is provided as available. A room can end when its host leaves or when the room service is unavailable.</p>
    <h2>Content and conduct</h2><p>Do not try to disrupt another room or bypass room limits. The game does not include chat or user-uploaded content.</p>
    <h2>Changes</h2><p>We may update the game and these terms as the first release improves.</p>`}</main>`);
}

function controllerPage(): string {
  const requestedRoom = (new URLSearchParams(location.search).get('room') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return pageShell(`<main id="main" class="controller-page"><h1 tabindex="-1">Use this phone as a race controller</h1><p>Join the room shown on the shared screen. No account or name is needed.</p><section class="controller-card" aria-labelledby="controller-title"><h2 id="controller-title">Controller</h2><form class="room-form" id="join-room"><label for="room-input">Six-character room code</label><input id="room-input" name="room" autocomplete="off" autocapitalize="characters" inputmode="text" maxlength="6" value="${requestedRoom}" required aria-describedby="join-help"><span id="join-help">Open the link from the shared screen, then tap Join room.</span><button class="button" type="submit">Join room</button></form><p id="controller-status" class="controller-status" aria-live="polite">${escapeHtml(connectionStatus)}</p><div id="controller-controls" hidden><button class="button ready-button" id="ready-controller" type="button" aria-pressed="false">Tap when ready</button><div class="pad" aria-label="Touch steering controls"><button type="button" data-control="left" aria-label="Steer left">← Left</button><button type="button" data-control="right" aria-label="Steer right">Right →</button><button class="boost" type="button" data-control="boost">Use boost</button></div><button class="button-secondary motion-permission" id="motion-controller" type="button">Use phone tilt</button><p>Hold left or right to steer. Boost works when your meter is full.</p></div></section></main>`);
}

function render(): void {
  game?.destroy();
  game = null;
  setTitle(route);
  ariaText = route === 'demo' ? 'Demo page loaded' : `${route[0].toUpperCase()}${route.slice(1)} page loaded`;
  app.innerHTML = route === 'home' || route === 'demo' ? homePage(route === 'demo') : route === 'controller' ? controllerPage() : textPage(route);
  bindRoutes();
  if (route === 'home' || route === 'demo') mountHome();
  if (route === 'controller') mountController();
  registerServiceWorker();
}

function bindRoutes(): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-route]').forEach((link) => link.addEventListener('click', (event) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    event.preventDefault();
    navigate(href);
  }));
}

function mountHome(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#track');
  if (!canvas) return;
  game = new RaceGame(canvas, settings, (phase, cars, seconds) => {
    gameOverlay(phase, cars, seconds);
    saveRaceSnapshot();
  });
  game.preview();
  bindSettings();
  if (isDemoRoute()) {
    document.querySelector<HTMLButtonElement>('#start-sample-top')?.addEventListener('click', () => startSampleRace());
    document.querySelector<HTMLButtonElement>('#reset-demo')?.addEventListener('click', () => resetDemo());
    document.querySelector<HTMLButtonElement>('#start-real')?.addEventListener('click', () => {
      localStorage.removeItem('demo:pocket-pitlane:settings');
      localStorage.removeItem('demo:pocket-pitlane:active-race');
      navigate('/');
    });
    if (new URLSearchParams(location.search).get('test-run') === '1') startSampleRace();
  } else {
    document.querySelector<HTMLButtonElement>('#create-room')?.addEventListener('click', createRoom);
    document.querySelector<HTMLButtonElement>('#resume-saved-race')?.addEventListener('click', createRoom);
    document.querySelector<HTMLButtonElement>('#host-ready')?.addEventListener('click', () => {
      const me = room?.players.find((player) => player.id === hostId);
      if (me) socket?.send({ type: 'ready', ready: !me.ready });
    });
    document.querySelector<HTMLButtonElement>('#start-race')?.addEventListener('click', () => socket?.send({ type: 'start' }));
  }
}

function bindSettings(): void {
  const dialog = document.querySelector<HTMLDialogElement>('#settings-dialog');
  document.querySelector<HTMLButtonElement>('#settings-button')?.addEventListener('click', () => dialog?.showModal());
  document.querySelector<HTMLInputElement>('#sound-setting')?.addEventListener('change', (event) => {
    settings.sound = (event.currentTarget as HTMLInputElement).checked;
    saveSettings();
    game?.setSettings(settings);
  });
  document.querySelector<HTMLInputElement>('#assist-setting')?.addEventListener('change', (event) => {
    settings.assist = (event.currentTarget as HTMLInputElement).checked;
    saveSettings();
    game?.setSettings(settings);
  });
  let listeningFor: keyof Settings['controls'] | null = null;
  const status = document.querySelector<HTMLElement>('#key-binding-status');
  const updateBindingButton = (control: keyof Settings['controls']): void => {
    const button = document.querySelector<HTMLButtonElement>(`#bind-${control}`);
    const labels: Record<keyof Settings['controls'], string> = { left: 'Steer left', right: 'Steer right', drive: 'Drive and boost' };
    if (button) button.textContent = `${labels[control]}: ${keyName(settings.controls[control])}`;
  };
  const stopListening = (): void => {
    listeningFor = null;
    window.removeEventListener('keydown', captureKey, true);
  };
  const captureKey = (event: KeyboardEvent): void => {
    if (!listeningFor) return;
    event.preventDefault();
    event.stopPropagation();
    const control = listeningFor;
    if (event.key === 'Escape') {
      status!.textContent = 'Key change cancelled.';
      stopListening();
      updateBindingButton(control);
      return;
    }
    if (event.key === 'Tab' || event.metaKey || event.ctrlKey || event.altKey || event.key === 'Shift') {
      status!.textContent = 'Choose one regular key.';
      return;
    }
    settings.controls[control] = event.key;
    saveSettings();
    game?.setSettings(settings);
    status!.textContent = `${control === 'drive' ? 'Drive and boost' : `Steer ${control}`} uses ${keyName(event.key)}.`;
    stopListening();
    updateBindingButton(control);
  };
  (['left', 'right', 'drive'] as const).forEach((control) => {
    document.querySelector<HTMLButtonElement>(`#bind-${control}`)?.addEventListener('click', () => {
      stopListening();
      listeningFor = control;
      const button = document.querySelector<HTMLButtonElement>(`#bind-${control}`);
      if (button) button.textContent = 'Press a key…';
      if (status) status.textContent = `Press the new key for ${control === 'drive' ? 'drive and boost' : `steering ${control}`}.`;
      window.addEventListener('keydown', captureKey, true);
    });
  });
  document.querySelector<HTMLButtonElement>('#reset-key-bindings')?.addEventListener('click', () => {
    settings.controls = { ...defaultControls };
    saveSettings();
    game?.setSettings(settings);
    (['left', 'right', 'drive'] as const).forEach(updateBindingButton);
    if (status) status.textContent = 'Keyboard controls reset.';
  });
  dialog?.addEventListener('close', stopListening);
}

function gameOverlay(phase: GamePhase, cars: Car[], seconds: number): void {
  const overlay = document.querySelector<HTMLDivElement>('#game-overlay');
  const timer = document.querySelector<HTMLElement>('#race-timer');
  if (!overlay || !timer) return;
  timer.textContent = phase === 'preview' || phase === 'waiting' ? 'Practice track' : phase === 'finished' ? 'Race complete' : `${Math.max(0, Math.ceil(seconds))} seconds`;
  if (phase === 'preview') {
    overlay.innerHTML = `<div class="overlay-panel"><h2>Race screen ready</h2><p>${isDemoRoute() ? 'The sample has four ready racers.' : 'Create a room, then share the phone controller link.'}</p></div>`;
  } else if (phase === 'waiting') {
    overlay.innerHTML = `<div class="overlay-panel"><h2>Race paused</h2><p>Resume when everyone can see the shared screen.</p><div class="button-row"><button class="button" id="resume-race" type="button">Resume race</button></div></div>`;
    document.querySelector<HTMLButtonElement>('#resume-race')?.addEventListener('click', () => game?.resume());
  } else if (phase === 'countdown') {
    overlay.innerHTML = `<div class="overlay-panel"><h2>Get ready</h2><p>The race starts now.</p></div>`;
  } else if (phase === 'racing') {
    overlay.innerHTML = '';
  } else if (phase === 'paused') {
    overlay.innerHTML = `<div class="overlay-panel"><h2>Race paused</h2><p>The race pauses while this tab is hidden.</p><div class="button-row"><button class="button" id="resume-race" type="button">Resume race</button></div></div>`;
    document.querySelector<HTMLButtonElement>('#resume-race')?.addEventListener('click', () => game?.resume());
  } else {
    const ordered = [...cars].sort((a, b) => b.progress - a.progress);
    overlay.innerHTML = `<div class="overlay-panel results-panel"><h2>Race results</h2><p>90-second race complete. ${escapeHtml(ordered[0]?.label ?? 'No driver')} wins this race.</p><ol>${ordered.map((car) => `<li>${escapeHtml(car.label)} — ${car.progress.toFixed(2)} laps</li>`).join('')}</ol><div class="button-row"><button class="button" id="race-again" type="button">Race again</button><button class="button-secondary" id="back-to-room" type="button">Back to room</button></div></div>`;
    document.querySelector<HTMLButtonElement>('#race-again')?.addEventListener('click', () => {
      if (isDemoRoute()) startSampleRace();
      else if (room) socket?.send({ type: 'start' });
    });
    document.querySelector<HTMLButtonElement>('#back-to-room')?.addEventListener('click', () => game?.preview());
    document.querySelector<HTMLButtonElement>('#back-to-room')?.addEventListener('click', clearRaceSnapshot);
  }
}

function sampleDrivers(): Driver[] {
  return [
    { id: 'sample-mika', label: 'Mika', color: palette[0], ready: true, host: true },
    { id: 'sample-ivo', label: 'Ivo', color: palette[1], ready: true },
    { id: 'sample-june', label: 'June', color: palette[2], ready: true },
    { id: 'sample-remy', label: 'Remy', color: palette[3], ready: true }
  ];
}

function sampleRaceSeed(): number {
  const candidate = Number(new URLSearchParams(location.search).get('test-seed'));
  return Number.isSafeInteger(candidate) && candidate >= 0 ? candidate : 423_515;
}

function sampleRaceDrivers(): Driver[] {
  return new URLSearchParams(location.search).get('test-hazard-fixture') === '1' ? sampleDrivers().slice(0, 3) : sampleDrivers();
}

function startSampleRace(duration = 90): void {
  game?.start(sampleRaceDrivers(), sampleRaceSeed(), duration, true);
}

function resetDemo(): void {
  localStorage.removeItem('demo:pocket-pitlane:settings');
  clearRaceSnapshot();
  settings = readSettings(true);
  game?.setSettings(settings);
  game?.preview();
  const note = document.querySelector<HTMLElement>('#demo-reset-status');
  if (note) note.textContent = 'Sample reset. Nothing was saved.';
}

function realtimeUrl(): string {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return 'ws://127.0.0.1:8787/ws';
  return 'wss://pocket-pitlane-realtime.sociobot.in/ws';
}

function createRoom(): void {
  hostId ||= getOrCreateId('host-id');
  connectionStatus = 'Creating your room…';
  render();
  socket = new RealtimeClient(handleHostMessage, setConnectionStatus);
  socket.connect(() => socket?.send({ type: 'host', playerId: hostId }));
}

function setConnectionStatus(message: string): void {
  connectionStatus = message;
  const status = document.querySelector<HTMLElement>('#connection-status');
  if (status) {
    status.textContent = message;
    status.className = `status ${message.startsWith('Could not') ? 'error' : 'good'}`;
  }
}

function handleHostMessage(message: ServerMessage): void {
  if (message.type === 'room' && message.room && message.players) {
    room = { code: message.room, players: message.players, race: message.race };
    connectionStatus = 'Room connected.';
    render();
    if (message.race) restoreSavedRace(message.race);
    else clearRaceSnapshot();
  } else if (message.type === 'input' && message.playerId) {
    game?.setRemoteInput(message.playerId, message.steer ?? 0, Boolean(message.throttle), Boolean(message.boost));
  } else if (message.type === 'race-start' && message.players && message.seed) {
    game?.start(message.players, message.seed, message.race?.duration ?? 90, false);
  } else if (message.type === 'error') {
    setConnectionStatus(message.error ?? 'Could not update this room. Try again.');
  }
}

function restoreSavedRace(race: RaceState): void {
  const snapshot = readRaceSnapshot();
  const elapsed = (Date.now() - race.startedAt) / 1000;
  if (!snapshot || snapshot.seed !== race.seed || snapshot.duration !== race.duration || elapsed > race.duration + 2) {
    if (elapsed > race.duration + 2) clearRaceSnapshot();
    return;
  }
  if (game?.restore(snapshot)) setConnectionStatus('Race restored on this browser.');
}

function mountController(): void {
  const form = document.querySelector<HTMLFormElement>('#join-room');
  const controls = document.querySelector<HTMLElement>('#controller-controls');
  const status = document.querySelector<HTMLElement>('#controller-status');
  const input = document.querySelector<HTMLInputElement>('#room-input');
  if (!form || !controls || !status || !input) return;
  let joined = false;
  let ready = false;
  const playerStorage = `${storagePrefix}controller:${input.value || 'pending'}`;
  let playerId = localStorage.getItem(playerStorage) || crypto.randomUUID();
  const updateStatus = (message: string, isError = false): void => {
    status.textContent = message;
    status.className = `controller-status ${isError ? 'error' : ''}`;
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const code = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    input.value = code;
    if (code.length !== 6) {
      updateStatus('Enter all six room characters.', true);
      input.focus();
      return;
    }
    playerId = localStorage.getItem(`${storagePrefix}controller:${code}`) || playerId;
    updateStatus('Joining room…');
    socket?.close();
    socket = new RealtimeClient((message) => {
      if (message.type === 'joined' && message.playerId) {
        localStorage.setItem(`${storagePrefix}controller:${code}`, message.playerId);
        joined = true;
        controls.hidden = false;
        updateStatus(`Joined room ${code}. Tap when ready.`);
      } else if (message.type === 'room' && message.players) {
        const mine = message.players.find((driver) => driver.id === playerId);
        if (mine) {
          ready = mine.ready;
          const button = document.querySelector<HTMLButtonElement>('#ready-controller');
          if (button) {
            button.textContent = ready ? 'Ready — tap to wait' : 'Tap when ready';
            button.setAttribute('aria-pressed', String(ready));
          }
        }
      } else if (message.type === 'error') updateStatus(message.error ?? 'Could not join this room. Check the code.', true);
    }, (message) => updateStatus(message, message.startsWith('Could not')));
    socket.connect(() => socket?.send({ type: 'join', room: code, playerId }));
  });
  document.querySelector<HTMLButtonElement>('#ready-controller')?.addEventListener('click', () => {
    if (!joined) return;
    ready = !ready;
    socket?.send({ type: 'ready', ready });
    const button = document.querySelector<HTMLButtonElement>('#ready-controller');
    if (button) {
      button.textContent = ready ? 'Ready — tap to wait' : 'Tap when ready';
      button.setAttribute('aria-pressed', String(ready));
    }
  });
  const sendControl = (steer: number, throttle: boolean, boost: boolean): void => {
    if (joined) socket?.send({ type: 'input', steer, throttle, boost });
  };
  document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach((button) => {
    const control = button.dataset.control;
    const down = (event: Event): void => {
      event.preventDefault();
      button.dataset.active = 'true';
      button.dataset.pointerUsed = 'true';
      if (control === 'left') sendControl(-1, true, false);
      if (control === 'right') sendControl(1, true, false);
      if (control === 'boost') sendControl(0, true, true);
    };
    const up = (): void => {
      button.dataset.active = 'false';
      sendControl(0, false, false);
      window.setTimeout(() => { button.dataset.pointerUsed = 'false'; }, 0);
    };
    button.addEventListener('pointerdown', down);
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    button.addEventListener('pointerleave', up);
    button.addEventListener('click', () => {
      if (button.dataset.pointerUsed === 'true') {
        button.dataset.pointerUsed = 'false';
        return;
      }
      if (control === 'left') sendControl(-1, true, false);
      if (control === 'right') sendControl(1, true, false);
      if (control === 'boost') sendControl(0, true, true);
      window.setTimeout(() => sendControl(0, false, false), 180);
    });
  });
  document.querySelector<HTMLButtonElement>('#motion-controller')?.addEventListener('click', async () => {
    type MotionPermission = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };
    const motion = DeviceOrientationEvent as MotionPermission;
    try {
      const permission = motion.requestPermission ? await motion.requestPermission() : 'granted';
      if (permission !== 'granted') {
        updateStatus('Motion permission was not granted. Touch steering still works.', true);
        return;
      }
      window.addEventListener('deviceorientation', (event) => {
        const gamma = event.gamma ?? 0;
        sendControl(gamma < -12 ? -1 : gamma > 12 ? 1 : 0, true, false);
      });
      updateStatus('Phone tilt is on. Touch steering still works.');
    } catch {
      updateStatus('This browser cannot use motion. Touch steering still works.', true);
    }
  });
}

class RealtimeClient {
  private ws: WebSocket | null = null;
  private closedByUser = false;

  constructor(private readonly onMessage: (message: ServerMessage) => void, private readonly onStatus: (message: string) => void) {}

  connect(onOpen: () => void): void {
    this.closedByUser = false;
    try {
      this.ws = new WebSocket(realtimeUrl());
      this.ws.addEventListener('open', () => {
        this.onStatus('Connected.');
        onOpen();
      });
      this.ws.addEventListener('message', (event) => {
        try { this.onMessage(JSON.parse(String(event.data)) as ServerMessage); } catch { this.onStatus('Could not read the room update. Try again.'); }
      });
      this.ws.addEventListener('error', () => this.onStatus('Could not reach the room service. Check your connection and try again.'));
      this.ws.addEventListener('close', () => {
        if (!this.closedByUser) this.onStatus('Could not keep the room connected. Create or join again.');
      });
    } catch {
      this.onStatus('Could not reach the room service. Check your connection and try again.');
    }
  }

  send(message: ServerMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message));
  }

  close(): void {
    this.closedByUser = true;
    this.ws?.close();
    this.ws = null;
  }
}

class RaceGame {
  private context: CanvasRenderingContext2D;
  private cars: Car[] = [];
  private inputs = new Map<string, { steer: number; throttle: boolean; boost: boolean }>();
  private phase: GamePhase = 'preview';
  private raceSeconds = 0;
  private duration = 90;
  private previous = performance.now();
  private accumulator = 0;
  private animation = 0;
  private autoPilot = false;
  private timeScale = 1;
  private trackSeed = 0;
  private raceSeed = 0;
  private resizeObserver: ResizeObserver;
  private keyboardDown = new Set<string>();
  private audio: AudioContext | null = null;
  private lastBeep = 0;
  private settingState: Settings;

  constructor(canvas: HTMLCanvasElement, settingsValue: Settings, private readonly report: (phase: GamePhase, cars: Car[], seconds: number) => void) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available.');
    this.context = context;
    this.canvas = canvas;
    this.settingState = { ...settingsValue };
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('visibilitychange', this.handleVisibility);
    this.loop(performance.now());
  }

  private canvas: HTMLCanvasElement;

  setSettings(nextSettings: Settings): void { this.settingState = { ...nextSettings, controls: { ...nextSettings.controls } }; }

  preview(): void {
    this.phase = 'preview';
    this.raceSeconds = 0;
    this.duration = 90;
    this.autoPilot = true;
    this.timeScale = 1;
    this.trackSeed = 0;
    this.raceSeed = 0;
    this.cars = sampleDrivers().slice(0, 3).map((driver, index) => ({ ...driver, progress: index * .18, lane: (index - 1) * .22, speed: .032, boost: .4, hitTimer: 0 }));
    this.inputs.clear();
    this.report(this.phase, this.cars, this.duration);
  }

  start(drivers: Driver[], seed: number, duration: number, demoRace: boolean): void {
    this.raceSeed = seed;
    this.trackSeed = seed % 10_000;
    this.phase = 'countdown';
    this.raceSeconds = -1.3;
    this.duration = duration;
    this.autoPilot = demoRace;
    this.timeScale = new URLSearchParams(location.search).get('test-run') === '1' ? 50 : 1;
    this.cars = drivers.map((driver, index) => ({ ...driver, color: driver.color || palette[index % palette.length], progress: index * .014, lane: ((index % 4) - 1.5) * .14, speed: .012, boost: .2, hitTimer: 0 }));
    this.inputs.clear();
    this.beep(360, .06);
    this.report(this.phase, this.cars, this.duration);
  }

  snapshot(): RaceSnapshot | null {
    if (this.phase === 'preview' || this.phase === 'waiting') return null;
    return {
      version: 1,
      seed: this.raceSeed,
      phase: this.phase,
      duration: this.duration,
      raceSeconds: this.raceSeconds,
      cars: this.cars.map((car) => ({ ...car })),
      autoPilot: this.autoPilot
    };
  }

  restore(snapshot: RaceSnapshot): boolean {
    if (!Number.isFinite(snapshot.seed) || !Number.isFinite(snapshot.duration) || !Number.isFinite(snapshot.raceSeconds) || snapshot.duration !== 90 || !snapshot.cars.length || snapshot.cars.length > 8) return false;
    this.raceSeed = snapshot.seed;
    this.trackSeed = snapshot.seed % 10_000;
    this.phase = snapshot.phase === 'finished' ? 'finished' : snapshot.phase === 'paused' ? 'paused' : snapshot.phase === 'countdown' ? 'countdown' : 'racing';
    this.duration = snapshot.duration;
    this.raceSeconds = snapshot.raceSeconds;
    this.autoPilot = snapshot.autoPilot;
    this.timeScale = new URLSearchParams(location.search).get('test-run') === '1' ? 50 : 1;
    this.cars = snapshot.cars.map((car, index) => ({
      id: String(car.id),
      label: String(car.label).slice(0, 30),
      color: typeof car.color === 'string' ? car.color : palette[index % palette.length],
      ready: Boolean(car.ready),
      host: Boolean(car.host),
      progress: Number.isFinite(car.progress) ? car.progress : 0,
      lane: Number.isFinite(car.lane) ? Math.max(-.45, Math.min(.45, car.lane)) : 0,
      speed: Number.isFinite(car.speed) ? car.speed : .012,
      boost: Number.isFinite(car.boost) ? Math.max(0, Math.min(1, car.boost)) : .2,
      hitTimer: Number.isFinite(car.hitTimer) ? Math.max(0, car.hitTimer) : 0
    }));
    this.inputs.clear();
    this.previous = performance.now();
    this.accumulator = 0;
    this.report(this.phase, this.cars, Math.max(0, this.duration - this.raceSeconds));
    return true;
  }

  resume(): void {
    if (this.phase === 'paused' || this.phase === 'waiting') {
      this.phase = 'racing';
      this.previous = performance.now();
      this.report(this.phase, this.cars, this.duration - this.raceSeconds);
    }
  }

  setRemoteInput(id: string, steer: number, throttle: boolean, boost: boolean): void {
    this.inputs.set(id, { steer: Math.max(-1, Math.min(1, steer)), throttle, boost });
  }

  destroy(): void {
    cancelAnimationFrame(this.animation);
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.audio?.close().catch(() => undefined);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const controls = this.settingState.controls;
    const drivingKeys = [controls.left, controls.right, controls.drive, 'Escape'];
    if (drivingKeys.includes(event.key) && (this.phase === 'racing' || this.phase === 'countdown')) event.preventDefault();
    if (event.key === 'Escape' && this.phase === 'racing') {
      this.phase = 'paused';
      this.report(this.phase, this.cars, this.duration - this.raceSeconds);
      return;
    }
    this.keyboardDown.add(event.key);
    if ([controls.left, controls.right, controls.drive].includes(event.key) && (this.phase === 'racing' || this.phase === 'countdown')) {
      const status = document.querySelector<HTMLElement>('#game-input-status');
      if (status) status.textContent = 'Keyboard steering is active.';
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => { this.keyboardDown.delete(event.key); };

  private handleVisibility = (): void => {
    if (document.hidden && (this.phase === 'racing' || this.phase === 'countdown')) {
      this.phase = 'paused';
      this.report(this.phase, this.cars, this.duration - this.raceSeconds);
    }
  };

  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
    this.canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  private loop = (now: number): void => {
    const elapsed = Math.min(.1, (now - this.previous) / 1000);
    this.previous = now;
    this.accumulator += elapsed;
    while (this.accumulator >= 1 / 60) {
      this.step((1 / 60) * (this.phase === 'racing' ? this.timeScale : 1));
      this.accumulator -= 1 / 60;
    }
    this.draw();
    this.animation = requestAnimationFrame(this.loop);
  };

  private step(dt: number): void {
    if (this.phase === 'preview') {
      this.raceSeconds += dt;
      this.cars.forEach((car, index) => { car.progress = (car.progress + (.028 + index * .001) * dt) % 1; car.lane = Math.sin(this.raceSeconds + index) * .19; });
      return;
    }
    if (this.phase === 'countdown') {
      this.raceSeconds += dt;
      if (this.raceSeconds >= 0) {
        this.phase = 'racing';
        this.beep(600, .08);
        this.report(this.phase, this.cars, this.duration);
      }
      return;
    }
    if (this.phase !== 'racing') return;
    this.raceSeconds += dt;
    for (let index = 0; index < this.cars.length; index += 1) this.updateCar(this.cars[index], index, dt);
    if (this.raceSeconds >= this.duration) {
      this.phase = 'finished';
      this.beep(760, .13);
      this.report(this.phase, this.cars, 0);
    } else if (Math.floor((this.raceSeconds - dt) * 2) !== Math.floor(this.raceSeconds * 2)) {
      this.report(this.phase, this.cars, this.duration - this.raceSeconds);
    }
  }

  private updateCar(car: Car, index: number, dt: number): void {
    let input = this.inputs.get(car.id);
    if (car.host && !this.autoPilot) {
      const controls = this.settingState.controls;
      input = {
        steer: (this.keyboardDown.has(controls.left) ? -1 : 0) + (this.keyboardDown.has(controls.right) ? 1 : 0),
        throttle: this.keyboardDown.has(controls.drive),
        boost: this.keyboardDown.has(controls.drive)
      };
    }
    if (this.autoPilot) input = { steer: Math.sin(this.raceSeconds * 1.9 + index * 2.1 + this.trackSeed) > .36 ? 1 : Math.sin(this.raceSeconds * 1.9 + index * 2.1 + this.trackSeed) < -.36 ? -1 : 0, throttle: true, boost: Math.sin(this.raceSeconds * .7 + index + this.trackSeed) > .86 };
    const steer = input?.steer ?? 0;
    const throttle = input?.throttle ?? false;
    const draft = this.cars.some((other) => other !== car && other.progress > car.progress && other.progress - car.progress < .026 && Math.abs(other.lane - car.lane) < .18);
    car.boost = Math.min(1, car.boost + (draft ? .18 : .035) * dt);
    const boost = Boolean(input?.boost) && car.boost > .16;
    if (boost) car.boost -= .38 * dt;
    const base = throttle ? .041 : .018;
    const target = base + (boost ? .026 : 0);
    car.speed += (target - car.speed) * Math.min(1, dt * 4.5);
    const laneSpeed = this.settingState.assist ? .38 : .52;
    car.lane = Math.max(-.45, Math.min(.45, car.lane + steer * laneSpeed * dt));
    car.hitTimer = Math.max(0, car.hitTimer - dt);
    const hazard = this.hazardAt(car.progress);
    if (hazard && Math.abs(car.lane - hazard.lane) < .13 && car.hitTimer <= 0) {
      car.speed *= .48;
      car.hitTimer = .8;
      this.beep(130, .04);
    }
    car.progress += car.speed * dt;
  }

  private hazardAt(progress: number): { lane: number } | null {
    const hazards = [.15, .38, .63, .87];
    const active = hazards.find((point) => Math.abs(((progress % 1) + 1) % 1 - ((point + Math.sin(this.raceSeconds * .42 + point * 7 + this.trackSeed) * .018))) < .013);
    if (active === undefined) return null;
    return { lane: Math.sin(active * 21 + this.raceSeconds * .2 + this.trackSeed) * .25 };
  }

  private draw(): void {
    const bounds = this.canvas.getBoundingClientRect();
    const width = bounds.width;
    const height = bounds.height;
    const context = this.context;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#0b161f';
    context.fillRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const rx = width * .36;
    const ry = height * .31;
    context.fillStyle = '#1f513f';
    context.beginPath();
    context.ellipse(cx, cy, rx * 1.36, ry * 1.48, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#d8e7d5';
    context.lineWidth = Math.max(28, Math.min(width, height) * .14);
    context.beginPath();
    context.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = '#253640';
    context.lineWidth = Math.max(20, Math.min(width, height) * .105);
    context.stroke();
    context.setLineDash([10, 11]);
    context.strokeStyle = '#ecf1e5';
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    this.drawStartLine(cx, cy, rx, context);
    this.drawHazards(cx, cy, rx, ry, context);
    this.cars.forEach((car) => this.drawCar(car, cx, cy, rx, ry, context));
    context.fillStyle = '#f8f4e8';
    context.font = '700 13px ui-rounded, system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText(this.phase === 'finished' ? 'FINISH' : 'PIT LANE', cx, cy + 5);
  }

  private drawStartLine(cx: number, cy: number, rx: number, context: CanvasRenderingContext2D): void {
    const x = cx + rx;
    const y = cy;
    for (let row = 0; row < 4; row += 1) for (let column = 0; column < 2; column += 1) {
      context.fillStyle = (row + column) % 2 ? '#0d1720' : '#f8f4e8';
      context.fillRect(x - 8 + column * 8, y - 18 + row * 9, 8, 9);
    }
  }

  private drawHazards(cx: number, cy: number, rx: number, ry: number, context: CanvasRenderingContext2D): void {
    [.15, .38, .63, .87].forEach((point) => {
      const current = point + Math.sin(this.raceSeconds * .42 + point * 7 + this.trackSeed) * .018;
      const angle = current * Math.PI * 2;
      const lane = Math.sin(point * 21 + this.raceSeconds * .2 + this.trackSeed) * .25;
      const x = cx + Math.cos(angle) * (rx + lane * 58);
      const y = cy + Math.sin(angle) * (ry + lane * 42);
      context.save();
      context.translate(x, y);
      context.rotate(angle + Math.PI / 2);
      context.fillStyle = '#ffc95e';
      context.beginPath();
      context.moveTo(0, -8); context.lineTo(7, 8); context.lineTo(-7, 8); context.closePath(); context.fill();
      context.strokeStyle = '#5d3600'; context.lineWidth = 2; context.stroke();
      context.restore();
    });
  }

  private drawCar(car: Car, cx: number, cy: number, rx: number, ry: number, context: CanvasRenderingContext2D): void {
    const progress = ((car.progress % 1) + 1) % 1;
    const angle = progress * Math.PI * 2;
    const x = cx + Math.cos(angle) * (rx + car.lane * 58);
    const y = cy + Math.sin(angle) * (ry + car.lane * 42);
    context.save();
    context.translate(x, y);
    context.rotate(angle + Math.PI / 2);
    if (car.hitTimer > 0) context.globalAlpha = .5 + Math.sin(car.hitTimer * 25) * .25;
    context.fillStyle = '#071018';
    context.fillRect(-9, -15, 18, 30);
    context.fillStyle = car.color;
    context.fillRect(-7, -13, 14, 26);
    context.fillStyle = '#f8f4e8';
    context.fillRect(-4, -9, 8, 6);
    context.fillStyle = '#0e202b';
    context.fillRect(-5, 3, 10, 6);
    context.restore();
    context.fillStyle = '#071018';
    context.fillRect(x - 16, y + 18, 32, 5);
    context.fillStyle = car.boost >= .16 ? '#d9f36c' : '#ffc95e';
    context.fillRect(x - 15, y + 19, 30 * Math.max(0, Math.min(1, car.boost)), 3);
    context.fillStyle = '#f8f4e8';
    context.font = '700 11px ui-rounded, system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText(car.label, x, y - 23);
  }

  private beep(frequency: number, duration: number): void {
    if (!this.settingState.sound || performance.now() - this.lastBeep < 55) return;
    this.lastBeep = performance.now();
    try {
      this.audio ??= new AudioContext();
      const oscillator = this.audio.createOscillator();
      const gain = this.audio.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.035, this.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, this.audio.currentTime + duration);
      oscillator.connect(gain).connect(this.audio.destination);
      oscillator.start();
      oscillator.stop(this.audio.currentTime + duration);
    } catch { /* Audio is optional. */ }
  }
}

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').then(async (registration) => {
    const active = registration.active ?? registration.waiting ?? registration.installing;
    const assets = performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => name.startsWith(location.origin));
    assets.push(location.href, `${location.origin}/`, `${location.origin}/demo`);
    active?.postMessage({ type: 'CACHE_URLS', urls: assets });
  }).catch(() => undefined);
}

render();

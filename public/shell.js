const $ = id => document.getElementById(id);
const PROFILE_KEY = 'casino-character-v1';
const SETTINGS_KEY = 'casino-settings-v1';
function stored(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function remember(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* The current session remains usable when storage is unavailable. */ } }

export function createShell({ getRoom, onLeave, onSound, onError }) {
  const saved = stored(PROFILE_KEY);
  let profile = typeof saved?.name === 'string' && saved.name.trim() ? { name: saved.name.trim().slice(0, 24) } : null;
  const preferences = stored(SETTINGS_KEY) || {};
  let pendingDestination = 'home';
  let lobbyOpen = false;
  const features = {
    bank: ['Bank', 'Borrow and repay play money. Only one loan may be outstanding at a time. Your debt stays until it is repaid. The persistent wallet and bank are not implemented yet.'],
    jobs: ['Minigames', 'Earn small amounts of play money outside casino tables. Minigames are not implemented yet.'],
    casino: ['Singleplayer', 'Play Hold’em against NPCs with your own character. Blackjack, roulette and slots will follow. NPC tables and persistent character funds are not implemented yet.']
  };

  function updateProfile() {
    $('menu-character').textContent = profile ? 'Character profile · Preview' : 'Create a character to play';
    $('home-name').textContent = profile?.name || '';
    $('home-greeting').textContent = profile?.name || 'Casino Royale';
    $('name').value = profile?.name || '';
  }
  function showScreen(screen) {
    document.body.dataset.screen = screen;
    for (const [id, value] of [['home', 'home'], ['table', 'table']]) $(id).classList.toggle('hidden', screen !== value);
    document.querySelector('main').classList.toggle('in-room', screen === 'table');
    $('lobby-toggle').classList.toggle('hidden', screen !== 'table');
    $('menu-button').classList.toggle('hidden', screen !== 'table');
    $('settings-button').classList.toggle('hidden', screen !== 'table');
    $('location').textContent = screen === 'table' ? 'THE BASEMENT' : '';
    if (screen !== 'table') { $('lobby').classList.add('hidden'); setLobby(false); }
  }
  function setLobby(open) {
    lobbyOpen = Boolean(open);
    document.body.classList.toggle('lobby-collapsed', !lobbyOpen);
    $('lobby-toggle').setAttribute('aria-expanded', String(lobbyOpen));
    $('lobby').inert = !lobbyOpen;
    if (!open && $('lobby').contains(document.activeElement)) $('lobby-toggle').focus();
  }
  function openEntry() { updateProfile(); $('entry').showModal(); }
  function navigate(destination) {
    if (destination === 'entry') openEntry();
    else if (destination === 'casino') openFeature('casino');
    else showScreen('home');
  }
  function ensureProfile(destination) {
    if (profile) { navigate(destination); return; }
    pendingDestination = destination;
    $('character-name').value = '';
    $('character-modal').showModal();
  }
  function openSettings() {
    $('setting-sound').checked = $('sound').getAttribute('aria-pressed') === 'true';
    $('setting-motion').checked = Boolean(preferences.motion);
    $('setting-effects').checked = preferences.effects !== false;
    $('settings').showModal();
  }
  function openMenu() {
    if (!getRoom()) { showScreen('home'); return; }
    $('pause-leave').disabled = $('leave').disabled;
    $('pause-help').textContent = $('leave').disabled ? 'Return home when your hand is over. The turn timer continues.' : 'Table chips remain in this lobby when you leave.';
    $('pause-menu').showModal();
  }
  function openFeature(key) {
    const [title, description] = features[key];
    $('feature-title').textContent = title; $('feature-description').textContent = description; $('feature-info').showModal();
  }
  $('singleplayer').onclick = () => ensureProfile('casino');
  $('multiplayer').onclick = () => ensureProfile('entry');
  $('character-button').onclick = () => { pendingDestination = 'home'; $('character-name').value = profile?.name || ''; $('character-modal').showModal(); };
  $('character-name').oninput = () => $('character-name').setCustomValidity('');
  $('character-form').onsubmit = event => {
    event.preventDefault();
    const name = $('character-name').value.trim();
    if (!name) { $('character-name').setCustomValidity('Enter a character name.'); $('character-name').reportValidity(); return; }
    profile = { name }; remember(PROFILE_KEY, profile); updateProfile(); $('character-modal').close(); navigate(pendingDestination);
  };
  document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => $(button.dataset.close).close());
  document.querySelectorAll('[data-feature]').forEach(button => button.onclick = () => openFeature(button.dataset.feature));
  $('settings-button').onclick = openSettings;
  $('home-settings').onclick = openSettings;
  $('menu-button').onclick = openMenu;
  document.querySelector('.brand').onclick = event => { event.preventDefault(); openMenu(); };
  $('pause-settings').onclick = () => { $('pause-menu').close(); openSettings(); };
  $('pause-leave').onclick = () => { $('pause-menu').close(); onLeave(); };
  $('lobby-toggle').onclick = () => setLobby(!lobbyOpen);
  $('lobby-close').onclick = () => setLobby(false);
  $('quick-ready').onclick = () => $('ready').click();
  $('quick-start').onclick = () => $('start').click();
  $('setting-sound').onchange = async () => { await onSound($('setting-sound').checked); };
  function applyGraphics() {
    document.body.classList.toggle('reduce-motion', Boolean(preferences.motion));
    document.body.classList.toggle('no-effects', preferences.effects === false);
  }
  $('setting-motion').onchange = () => { preferences.motion = $('setting-motion').checked; remember(SETTINGS_KEY, preferences); applyGraphics(); };
  $('setting-effects').onchange = () => { preferences.effects = $('setting-effects').checked; remember(SETTINGS_KEY, preferences); applyGraphics(); };
  $('fullscreen').onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen();
    } catch { onError('Fullscreen is unavailable. You can also use your browser’s F11 shortcut.'); }
  };
  document.addEventListener('fullscreenchange', () => $('fullscreen').textContent = document.fullscreenElement ? 'Exit fullscreen ↙' : 'Enter fullscreen ↗');
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
    if (getRoom() && lobbyOpen) { setLobby(false); event.preventDefault(); }
    else if (getRoom()) { openMenu(); event.preventDefault(); }
  });
  updateProfile(); applyGraphics(); setLobby(false); showScreen('home');
  // AudioContext is resumed through the first real user gesture, never on page load.
  document.addEventListener('pointerdown', () => { if (preferences.sound) void onSound(true); }, { once: true });
  return {
    preferences,
    ensureProfile,
    openEntry,
    saveName(name) { profile = { name: name.trim().slice(0, 24) }; remember(PROFILE_KEY, profile); updateProfile(); },
    saveSound(value) { preferences.sound = value; remember(SETTINGS_KEY, preferences); $('setting-sound').checked = value; },
    syncRoom(room, previous) {
      $('entry').close(); showScreen('table'); $('lobby').classList.remove('hidden');
      if (previous?.code !== room.code) setLobby(!room.hand || room.hand.stage === 'finished');
      else if (room.hand && room.hand.stage !== 'finished' && (!previous.hand || previous.hand.stage === 'finished')) setLobby(false);
      $('room-summary').textContent = `${room.code} · ${room.players.length}/6`;
      for (const [id, source] of [['quick-ready', 'ready'], ['quick-start', 'start']]) {
        $(id).textContent = $(source).textContent; $(id).disabled = $(source).disabled; $(id).classList.toggle('hidden', $(source).classList.contains('hidden'));
      }
      const playing = room.hand && room.hand.stage !== 'finished';
      $('quick-lobby-actions').classList.toggle('hidden', Boolean(playing));
      $('pause-leave').disabled = $('leave').disabled;
    },
    returnHome() {
      for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
      showScreen('home');
    }
  };
}

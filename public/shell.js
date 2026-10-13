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
    wardrobe: ['Vaatekaappi', 'Tähän tulee hahmon muokkaus: vaatteet, hiustyylit ja muut kosmetiikat. Ne ostetaan samalla pelirahalla, jolla pelaat pöydissä. Tässä versiossa voit vasta antaa hahmollesi nimen.'],
    bank: ['Pankki & talous', 'Tähän tulevat hahmosi lompakko, lainat ja takaisinmaksu sekä pelimaailman keksitty osakemarkkina. Velka säilyy mukana, vaikka pelimerkit loppuisivat. Talous ei ole vielä käytössä.'],
    jobs: ['Pienet keikat', 'Kodin ilmoitustaululta löydät myöhemmin sivutehtäviä ja minipelejä. Niistä voi tienata vähän pelirahaa seuraavaa pöytäiltaa varten.'],
    casino: ['Oma casino-ilta', 'Kodin ovelta lähdet myöhemmin pelaamaan NPC-pelaajia vastaan. Ensimmäinen paikka on kellari; eteneminen avaa parempia ympäristöjä, suurempia pöytiä ja vaikeampia vastustajia. NPC-pöydät eivät vielä ole pelattavissa. Kaveripöytiin pääset jo moninpelistä.']
  };

  function updateProfile() {
    $('menu-character').textContent = profile?.name || 'Anna tarinalle nimi';
    $('home-name').textContent = profile?.name || '';
    $('home-greeting').textContent = profile ? `Tervetuloa kotiin, ${profile.name}.` : '';
    $('name').value = profile?.name || '';
  }
  function showScreen(screen) {
    document.body.dataset.screen = screen;
    for (const [id, value] of [['main-menu', 'menu'], ['home', 'home'], ['table', 'table']]) $(id).classList.toggle('hidden', screen !== value);
    document.querySelector('main').classList.toggle('in-room', screen === 'table');
    $('lobby-toggle').classList.toggle('hidden', screen !== 'table');
    $('menu-button').classList.toggle('hidden', screen === 'menu');
    $('location').textContent = screen === 'table' ? 'THE BASEMENT · KAVERI-ILTA' : screen === 'home' ? 'VUOKRAHUONE 04 · OMA KOTI' : 'OMA TARINA · OMA PORUKKA';
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
    else if (destination === 'home') showScreen('home');
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
    if (!getRoom()) { showScreen('menu'); return; }
    $('pause-leave').disabled = $('leave').disabled;
    $('pause-help').textContent = $('leave').disabled ? 'Palaa kotiin jaon päätyttyä. Valikko ei pysäytä vuoroaikaa.' : 'Voit palata kotiin. Pöydän pelimerkit jäävät tähän lobbyyn.';
    $('pause-menu').showModal();
  }
  $('singleplayer').onclick = () => ensureProfile('home');
  $('multiplayer').onclick = () => ensureProfile('entry');
  $('home-multiplayer').onclick = openEntry;
  $('character-button').onclick = () => { pendingDestination = 'menu'; $('character-name').value = profile?.name || ''; $('character-modal').showModal(); };
  $('character-name').oninput = () => $('character-name').setCustomValidity('');
  $('character-form').onsubmit = event => {
    event.preventDefault();
    const name = $('character-name').value.trim();
    if (!name) { $('character-name').setCustomValidity('Anna hahmolle nimi.'); $('character-name').reportValidity(); return; }
    profile = { name }; remember(PROFILE_KEY, profile); updateProfile(); $('character-modal').close(); navigate(pendingDestination);
  };
  document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => $(button.dataset.close).close());
  document.querySelectorAll('[data-feature]').forEach(button => button.onclick = () => {
    const [title, description] = features[button.dataset.feature];
    $('feature-title').textContent = title; $('feature-description').textContent = description; $('feature-info').showModal();
  });
  $('settings-button').onclick = openSettings;
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
    } catch { onError('Selain ei sallinut koko näytön tilaa. Voit käyttää myös selaimen F11-toimintoa.'); }
  };
  document.addEventListener('fullscreenchange', () => $('fullscreen').textContent = document.fullscreenElement ? 'Poistu koko näytön tilasta ↙' : 'Koko näytön tila ↗');
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
    if (getRoom() && lobbyOpen) { setLobby(false); event.preventDefault(); }
    else if (document.body.dataset.screen !== 'menu') { openMenu(); event.preventDefault(); }
  });
  updateProfile(); applyGraphics(); setLobby(false); showScreen('menu');
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
      showScreen(profile ? 'home' : 'menu');
    }
  };
}

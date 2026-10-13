const $ = id => document.getElementById(id);
const SETTINGS_KEY = 'casino-settings-v1';
function stored(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function remember(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* The current session remains usable when storage is unavailable. */ } }

export function createShell({ getRoom, onLeave, onSound, onError, onSingleplayer }) {
  let profile = null;
  const preferences = stored(SETTINGS_KEY) || {};
  let lobbyOpen = false;

  function updateProfile() {
    $('menu-character').textContent = profile ? `${profile.hands} ${profile.hands===1?'hand':'hands'} · ${profile.wins} ${profile.wins===1?'win':'wins'}` : 'Create a character to play';
    $('home-name').textContent = profile?.name || '';
    $('home-greeting').textContent = profile?.name || 'Casino Royale';
    $('name').value = profile?.name || '';
    $('name').readOnly = Boolean(profile);
    for(const id of ['home-wallet','home-progression'])$(id).classList.toggle('hidden',!profile);
    if(profile){
      $('home-cash').textContent=`$${profile.cash.toLocaleString('en-US')}`;$('home-debt').textContent=`$${profile.debt.toLocaleString('en-US')}`;
      $('home-level').textContent=`Level ${profile.level}`;$('home-xp').textContent=`${profile.xpInLevel} / 100 XP`;$('xp-progress').value=profile.xpInLevel;
      $('next-home').textContent=profile.nextHome?`Next home: ${profile.nextHome.name} · Level ${profile.nextHome.level} · $${profile.nextHome.wealth.toLocaleString('en-US')} net worth`:'';
      $('home-location').textContent=profile.home.name.toUpperCase();$('home-scene').src=`/assets/${profile.home.asset}`;
      $('home-scene').alt=`${profile.home.name}, your character’s home.`;
      character.portrait($('home-avatar'));document.body.dataset.home=profile.home.id;
    }else{$('home-location').textContent='UNDER THE BRIDGE';$('home-scene').src='/assets/bridge.svg';$('home-avatar').querySelector('use').setAttribute('href','/assets/characters.svg#hoodie');$('home-avatar').style.color='#5c7e96';document.body.dataset.home='bridge';}
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
    else if (destination === 'casino') character.open('singleplayer');
    else showScreen('home');
  }
  function ensureProfile(destination) {
    void character.ensure(()=>navigate(destination));
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
    $('pause-help').textContent = $('leave').disabled ? 'Return home when your hand is over. The turn timer continues.' : 'Your remaining chips return to your wallet when you leave.';
    $('pause-menu').showModal();
  }
  $('singleplayer').onclick = () => ensureProfile('casino');
  $('multiplayer').onclick = () => ensureProfile('entry');
  $('character-button').onclick = () => character.open('character');
  document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => $(button.dataset.close).close());
  document.querySelectorAll('[data-feature]').forEach(button => button.onclick = () => character.open(button.dataset.feature));
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
  const character=createCharacterManager({onChange:c=>{profile=c;updateProfile();},onError,onSingleplayer});
  updateProfile(); applyGraphics(); setLobby(false); showScreen('home');
  // AudioContext is resumed through the first real user gesture, never on page load.
  document.addEventListener('pointerdown', () => { if (preferences.sound) void onSound(true); }, { once: true });
  return {
    character,
    preferences,
    ensureProfile,
    openEntry,
    saveSound(value) { preferences.sound = value; remember(SETTINGS_KEY, preferences); $('setting-sound').checked = value; },
    syncRoom(room, previous) {
      $('entry').close(); showScreen('table'); $('lobby').classList.remove('hidden');
      const environment=['bridge','rental','loft','mansion'].includes(room.environment)?room.environment:'bridge';
      const asset=environment==='rental'?'home':environment;
      $('table-scene').src=`/assets/table-${asset}.svg`;
      const location={bridge:'Under the bridge',rental:'Rental apartment',loft:'City loft',mansion:'Hillside residence'}[environment];
      $('room-location').textContent=location;$('table-location').textContent=`${location.toUpperCase()} · ${room.singleplayer?'NPC':'ONLINE'} HOLD’EM · $5 / $10`;
      $('location').textContent=room.singleplayer?'SINGLEPLAYER':'MULTIPLAYER';
      $('lobby-kind').textContent=room.singleplayer?'NPC TABLE':'PRIVATE LOBBY';$('lobby-code').classList.toggle('hidden',Boolean(room.singleplayer));
      $('invite').classList.toggle('hidden',Boolean(room.singleplayer));$('copy').classList.toggle('hidden',Boolean(room.singleplayer));
      $('ready').classList.toggle('hidden',Boolean(room.singleplayer));
      character.update(room.character);
      if (previous?.code !== room.code) setLobby(!room.hand || room.hand.stage === 'finished');
      else if (room.hand && room.hand.stage !== 'finished' && (!previous.hand || previous.hand.stage === 'finished')) setLobby(false);
      $('room-summary').textContent = room.singleplayer ? `NPC table · ${room.players.length} players` : `${room.code} · ${room.players.length}/6`;
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
import { createCharacterManager } from './character.js';

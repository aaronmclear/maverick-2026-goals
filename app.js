const statConfig = {
  batting: [
    { key: 'AVG', label: 'AVG', higherIsBetter: true },
    { key: 'OBP', label: 'OBP', higherIsBetter: true },
    { key: 'SLG', label: 'SLG', higherIsBetter: true },
    { key: 'OPS', label: 'OPS', higherIsBetter: true },
    { key: 'K%', label: 'K%', higherIsBetter: false }
  ],
  pitching: [
    { key: 'ERA', label: 'ERA', higherIsBetter: false },
    { key: 'WHIP', label: 'WHIP', higherIsBetter: false },
    { key: 'K/BB', label: 'K/BB', higherIsBetter: true },
    { key: 'K/BF', label: 'K/BF', higherIsBetter: true },
    { key: 'BB/BF', label: 'BB/BF', higherIsBetter: false },
    { key: 'Strike%', label: 'Strike%', higherIsBetter: true }
  ]
};

const gameFields = [
  { key: 'date', label: 'Game Date', type: 'date' },
  { key: 'opponent', label: 'Opponent', type: 'text' },
  { key: 'team', label: 'Team', type: 'select', options: ['11U', 'Dodgers'] },
  { key: 'AB', label: 'AB', type: 'number' },
  { key: 'H', label: 'H', type: 'number' },
  { key: '2B', label: '2B', type: 'number' },
  { key: '3B', label: '3B', type: 'number' },
  { key: 'HR', label: 'HR', type: 'number' },
  { key: 'R', label: 'Runs', type: 'number' },
  { key: 'RBI', label: 'RBI', type: 'number' },
  { key: 'SB', label: 'SB', type: 'number' },
  { key: 'BB', label: 'BB', type: 'number' },
  { key: 'HBP', label: 'HBP', type: 'number' },
  { key: 'SF', label: 'SF', type: 'number' },
  { key: 'SO', label: 'SO', type: 'number' },
  { key: 'IP', label: 'IP', type: 'text' },
  { key: 'BF', label: 'BF', type: 'number' },
  { key: 'H_allowed', label: 'H Allowed', type: 'number' },
  { key: 'ER', label: 'ER', type: 'number' },
  { key: 'HBP_allowed', label: 'HBP Allowed', type: 'number' },
  { key: 'BB_allowed', label: 'BB Allowed', type: 'number' },
  { key: 'SO_pitched', label: 'SO Pitched', type: 'number' },
  { key: 'pitches', label: 'Total Pitches', type: 'number' },
  { key: 'balls', label: 'Balls Thrown', type: 'number' },
  { key: 'strikes', label: 'Strikes Thrown', type: 'number' }
];

const state = {
  data: null,
  teamFilter: 'All',
  editingGameIndex: null,
  loadedFromFallback: false,
  loadedFromLocalBackup: false
};

const battingTableBody = document.querySelector('#battingTable tbody');
const pitchingTableBody = document.querySelector('#pitchingTable tbody');
const goalsForm = document.getElementById('goalsForm');
const updatedAtEl = document.getElementById('updatedAt');
const goalsStatus = document.getElementById('goalsStatus');
const goalsContent = document.getElementById('goalsContent');
const goalsLock = document.getElementById('goalsLock');
const unlockGoals = document.getElementById('unlockGoals');
const goalsPassword = document.getElementById('goalsPassword');
const goalsLockStatus = document.getElementById('goalsLockStatus');
const gameStatus = document.getElementById('gameStatus');
const gamesTableBody = document.querySelector('#gamesTable tbody');
const gamesCsv = document.getElementById('gamesCsv');
const gamesCsvStatus = document.getElementById('gamesCsvStatus');
const uploadGamesCsv = document.getElementById('uploadGamesCsv');
const gameForm = document.getElementById('gameForm');
const saveGameButton = document.getElementById('saveGameButton');
const cancelEditButton = document.getElementById('cancelEditButton');
const restorePreviousButton = document.getElementById('restorePreviousButton');
const restoreSeedButton = document.getElementById('restoreSeedButton');
const resetSeasonButton = document.getElementById('resetSeasonButton');
const teamFilter = document.getElementById('teamFilter');
const chartView = document.getElementById('chartView');
const chartStat = document.getElementById('chartStat');
const chartContainer = document.getElementById('chart');

const GOALS_PASSWORD = 'maverickbaseball';
const LOCAL_BACKUP_KEY = 'maverick_2026_data_backup_v1';

function blankCurrentStats() {
  return {
    batting: {
      AVG: null,
      OBP: null,
      SLG: null,
      OPS: null,
      'K%': null
    },
    pitching: {
      ERA: null,
      WHIP: null,
      'K/BB': null,
      'K/BF': null,
      'BB/BF': null,
      'Strike%': null
    }
  };
}

function readLocalBackup() {
  try {
    const raw = localStorage.getItem(LOCAL_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalBackup(data) {
  try {
    localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors.
  }
}

function parseStamp(stamp) {
  if (!stamp) return 0;
  const t = Date.parse(stamp);
  return Number.isFinite(t) ? t : 0;
}

function preferLocalBackup(serverData, localBackup) {
  if (!localBackup) return serverData;
  const serverGames = Array.isArray(serverData.games) ? serverData.games : [];
  const localGames = Array.isArray(localBackup.games) ? localBackup.games : [];
  if (!localGames.length) return serverData;
  if (!serverGames.length) return localBackup;
  const localStamp = parseStamp(localBackup?.meta?.updatedAt);
  const serverStamp = parseStamp(serverData?.meta?.updatedAt);
  return localStamp > serverStamp ? localBackup : serverData;
}

function formatValue(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'n/a';
  }
  const num = Number(value);
  return num.toFixed(3);
}

function statusFor(value, baselineValue, goalValue, higherIsBetter) {
  if ([value, baselineValue, goalValue].some(v => v === null || v === undefined || Number.isNaN(v))) {
    return 'gray';
  }
  if (higherIsBetter) {
    if (value >= goalValue) return 'green';
    if (value >= baselineValue) return 'yellow';
    return 'red';
  }
  if (value <= goalValue) return 'green';
  if (value <= baselineValue) return 'yellow';
  return 'red';
}

function inningsToOuts(ipValue) {
  if (ipValue === null || ipValue === undefined || ipValue === '') return 0;
  const num = Number(ipValue);
  if (Number.isNaN(num)) return 0;
  const whole = Math.floor(num);
  const frac = Number((num - whole).toFixed(1));
  if (frac === 0.1) return whole * 3 + 1;
  if (frac === 0.2) return whole * 3 + 2;
  return Math.round(num * 3);
}

function calculateTotals(games) {
  const totals = {
    batting: {
      AB: 0,
      H: 0,
      '2B': 0,
      '3B': 0,
      HR: 0,
      R: 0,
      RBI: 0,
      SB: 0,
      BB: 0,
      HBP: 0,
      SF: 0,
      SO: 0
    },
    pitching: {
      outs: 0,
      BF: 0,
      H_allowed: 0,
      ER: 0,
      HBP_allowed: 0,
      BB_allowed: 0,
      SO_pitched: 0,
      pitches: 0,
      balls: 0,
      strikes: 0
    }
  };

  games.forEach(game => {
    totals.batting.AB += Number(game.AB || 0);
    totals.batting.H += Number(game.H || 0);
    totals.batting['2B'] += Number(game['2B'] || 0);
    totals.batting['3B'] += Number(game['3B'] || 0);
    totals.batting.HR += Number(game.HR || 0);
    totals.batting.R += Number(game.R || 0);
    totals.batting.RBI += Number(game.RBI || 0);
    totals.batting.SB += Number(game.SB || 0);
    totals.batting.BB += Number(game.BB || 0);
    totals.batting.HBP += Number(game.HBP || 0);
    totals.batting.SF += Number(game.SF || 0);
    totals.batting.SO += Number(game.SO || 0);

    totals.pitching.outs += inningsToOuts(game.IP);
    totals.pitching.BF += Number(game.BF || 0);
    totals.pitching.H_allowed += Number(game.H_allowed || 0);
    totals.pitching.ER += Number(game.ER || 0);
    totals.pitching.HBP_allowed += Number(game.HBP_allowed || 0);
    totals.pitching.BB_allowed += Number(game.BB_allowed || 0);
    totals.pitching.SO_pitched += Number(game.SO_pitched || 0);
    totals.pitching.pitches += Number(game.pitches || 0) || (Number(game.balls || 0) + Number(game.strikes || 0));
    totals.pitching.balls += Number(game.balls || 0);
    totals.pitching.strikes += Number(game.strikes || 0);
  });

  return totals;
}

function calculateRates(totals) {
  const batting = totals.batting;
  const pitching = totals.pitching;
  const pa = batting.AB + batting.BB + batting.HBP + batting.SF;
  const singles = batting.H - batting['2B'] - batting['3B'] - batting.HR;
  const totalBases = singles + batting['2B'] * 2 + batting['3B'] * 3 + batting.HR * 4;
  const innings = pitching.outs / 3;

  const rates = {
    batting: {
      AVG: batting.AB ? batting.H / batting.AB : null,
      OBP: pa ? (batting.H + batting.BB + batting.HBP) / pa : null,
      SLG: batting.AB ? totalBases / batting.AB : null,
      OPS: null,
      'K%': pa ? batting.SO / pa : null
    },
    pitching: {
      ERA: innings ? (pitching.ER * 9) / innings : null,
      WHIP: innings ? (pitching.H_allowed + pitching.BB_allowed) / innings : null,
      'K/BB': pitching.BB_allowed ? pitching.SO_pitched / pitching.BB_allowed : null,
      'K/BF': pitching.BF ? pitching.SO_pitched / pitching.BF : null,
      'BB/BF': pitching.BF ? pitching.BB_allowed / pitching.BF : null,
      'Strike%': (pitching.balls + pitching.strikes) ? pitching.strikes / (pitching.balls + pitching.strikes) : null
    }
  };

  if (rates.batting.OBP !== null && rates.batting.SLG !== null) {
    rates.batting.OPS = rates.batting.OBP + rates.batting.SLG;
  }

  return rates;
}

function getFilteredGames() {
  if (state.teamFilter === 'All') {
    return state.data.games;
  }
  return state.data.games.filter(game => (game.team || '') === state.teamFilter);
}

function getDisplayGames() {
  const filtered = getFilteredGames();
  const mapped = filtered.map(game => ({
    game,
    originalIndex: state.data.games.indexOf(game)
  }));
  mapped.sort((a, b) => {
    const aTime = Date.parse(a.game.date || '');
    const bTime = Date.parse(b.game.date || '');
    const aValid = Number.isFinite(aTime);
    const bValid = Number.isFinite(bTime);
    if (aValid && bValid && aTime !== bTime) return bTime - aTime;
    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;
    return b.originalIndex - a.originalIndex;
  });
  return mapped;
}

function formatHistoryWhole(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return '0';
  return String(Math.round(num));
}

function formatHistoryIP(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return '0.0';
  return num.toFixed(1);
}

function formatHistoryDate(value) {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
  if (match) return `${match[2]}/${match[3]}`;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
}

function applyGameTotals() {
  if (!state.data.games || state.data.games.length === 0) {
    state.data.current = blankCurrentStats();
    return;
  }
  const totals = calculateTotals(getFilteredGames());
  const rates = calculateRates(totals);
  state.data.current.batting = rates.batting;
  state.data.current.pitching = rates.pitching;
}

function renderTable(section, tbody) {
  const baseline = state.data.baseline[section];
  const current = state.data.current[section];
  const goals = state.data.goals[section];

  tbody.innerHTML = '';
  statConfig[section].forEach(stat => {
    const value = current[stat.key];
    const base = baseline[stat.key];
    const goal = goals[stat.key];
    const status = statusFor(value, base, goal, stat.higherIsBetter);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${stat.label}</td>
      <td>${formatValue(base)}</td>
      <td>${formatValue(value)}</td>
      <td>${formatValue(goal)}</td>
      <td><span class="pill ${status}">${status}</span></td>
    `;
    tbody.appendChild(row);
  });
}

function renderTables() {
  renderTable('batting', battingTableBody);
  renderTable('pitching', pitchingTableBody);
}

function buildForm(section, formEl, source) {
  statConfig[section].forEach(stat => {
    const wrapper = document.createElement('label');
    wrapper.className = 'form-field';
    wrapper.textContent = stat.label;

    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.001';
    input.name = `${section}.${stat.key}`;
    const value = source[stat.key];
    input.value = value === null || value === undefined ? '' : Number(value).toFixed(3);
    input.addEventListener('blur', () => {
      if (input.value === '') return;
      const num = Number(input.value);
      if (!Number.isNaN(num)) {
        input.value = num.toFixed(3);
      }
    });

    wrapper.appendChild(input);
    formEl.appendChild(wrapper);
  });
}

function buildForms() {
  goalsForm.innerHTML = '';
  buildForm('batting', goalsForm, state.data.goals.batting);
  buildForm('pitching', goalsForm, state.data.goals.pitching);
}

function buildGameForm() {
  gameForm.innerHTML = '';
  const battingKeys = new Set(['AB', 'H', '2B', '3B', 'HR', 'R', 'RBI', 'SB', 'BB', 'HBP', 'SF', 'SO']);
  const pitchingKeys = new Set(['IP', 'BF', 'H_allowed', 'ER', 'HBP_allowed', 'BB_allowed', 'SO_pitched', 'pitches', 'balls', 'strikes']);

  const makeHeader = label => {
    const header = document.createElement('div');
    header.className = 'form-section';
    header.textContent = label;
    return header;
  };

  const baseFields = gameFields.filter(field => !battingKeys.has(field.key) && !pitchingKeys.has(field.key));
  const battingFields = gameFields.filter(field => battingKeys.has(field.key));
  const pitchingFields = gameFields.filter(field => pitchingKeys.has(field.key));

  const orderedFields = [
    ...baseFields,
    { key: '__batting__', label: 'Batting Stats', type: 'header' },
    ...battingFields,
    { key: '__pitching__', label: 'Pitching Stats', type: 'header' },
    ...pitchingFields
  ];

  orderedFields.forEach(field => {
    if (field.type === 'header') {
      gameForm.appendChild(makeHeader(field.label));
      return;
    }
    const wrapper = document.createElement('label');
    wrapper.className = 'form-field';
    wrapper.textContent = field.label;

    let input;
    if (field.type === 'select') {
      input = document.createElement('select');
      input.name = field.key;
      field.options.forEach(optionValue => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        input.appendChild(option);
      });
    } else {
      input = document.createElement('input');
      input.type = field.type;
      input.name = field.key;
      if (field.type === 'number') {
        input.step = '1';
        input.min = '0';
      }
      if (field.key === 'IP') {
        input.placeholder = 'e.g. 2.1';
      }
      if (field.type === 'number' || field.key === 'IP') {
        input.addEventListener('blur', () => {
          if (input.value === '') return;
          const num = Number(input.value);
          if (!Number.isNaN(num)) {
            input.value = num.toFixed(3);
          }
        });
      }
    }

    wrapper.appendChild(input);
    gameForm.appendChild(wrapper);
  });
}

function setGameFormMode() {
  const isEditing = state.editingGameIndex !== null;
  if (saveGameButton) {
    saveGameButton.textContent = isEditing ? 'Save Game Changes' : 'Add Game';
  }
  if (cancelEditButton) {
    cancelEditButton.classList.toggle('hidden', !isEditing);
  }
}

function populateGameForm(game) {
  gameFields.forEach(field => {
    const input = gameForm.elements[field.key];
    if (!input) return;
    const value = game[field.key];
    if (value === null || value === undefined || value === '') {
      input.value = field.type === 'select' ? field.options[0] : '';
      return;
    }
    if (field.type === 'number' || field.key === 'IP') {
      input.value = Number(value).toFixed(3);
      return;
    }
    input.value = value;
  });
}

function resetGameForm() {
  gameForm.reset();
  state.editingGameIndex = null;
  setGameFormMode();
}

function renderGames() {
  const displayGames = getDisplayGames();
  gamesTableBody.innerHTML = '';

  if (!displayGames.length) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="4">
        <div class="panel__note">No saved games yet for this filter.</div>
      </td>
    `;
    gamesTableBody.appendChild(row);
    return;
  }

  displayGames.forEach(({ game, originalIndex }) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${formatHistoryDate(game.date)}</strong><br>${game.opponent || ''}<br>${game.team || ''}</td>
      <td><strong>Batting</strong><br>AB ${formatHistoryWhole(game.AB)} · H ${formatHistoryWhole(game.H)} · 2B ${formatHistoryWhole(game['2B'])} · 3B ${formatHistoryWhole(game['3B'])} · HR ${formatHistoryWhole(game.HR)} · R ${formatHistoryWhole(game.R)} · RBI ${formatHistoryWhole(game.RBI)} · SB ${formatHistoryWhole(game.SB)} · BB ${formatHistoryWhole(game.BB)} · HBP ${formatHistoryWhole(game.HBP)} · SF ${formatHistoryWhole(game.SF)} · SO ${formatHistoryWhole(game.SO)}</td>
      <td><strong>Pitching</strong><br>IP ${formatHistoryIP(game.IP)} · BF ${formatHistoryWhole(game.BF)} · H ${formatHistoryWhole(game.H_allowed)} · ER ${formatHistoryWhole(game.ER)} · HBP ${formatHistoryWhole(game.HBP_allowed)} · BB ${formatHistoryWhole(game.BB_allowed)} · SO ${formatHistoryWhole(game.SO_pitched)} · P ${formatHistoryWhole(game.pitches || ((game.balls || 0) + (game.strikes || 0)))} · B ${formatHistoryWhole(game.balls)} · S ${formatHistoryWhole(game.strikes)}</td>
      <td>
        <button class="btn btn--ghost" data-action="edit" data-index="${originalIndex}">Edit</button>
        <button class="btn btn--ghost" data-action="remove" data-index="${originalIndex}">Remove</button>
      </td>
    `;
    gamesTableBody.appendChild(row);
  });
}

async function loadData() {
  const isLocalDev =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:';
  const localBackup = readLocalBackup();
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('API unavailable');
    state.loadedFromFallback = false;
    const serverData = await res.json();
    const merged = preferLocalBackup(serverData, localBackup);
    state.loadedFromLocalBackup = merged === localBackup;
    return merged;
  } catch (err) {
    if (localBackup) {
      state.loadedFromFallback = true;
      state.loadedFromLocalBackup = true;
      return localBackup;
    }
    state.loadedFromFallback = true;
    state.loadedFromLocalBackup = false;
    if (isLocalDev) {
      const fallback = await fetch('data.json');
      return await fallback.json();
    }
    return {
      meta: { title: 'Maverick 2026 Baseball Goals', updatedAt: 'Server unavailable' },
      baseline: { batting: {}, pitching: {} },
      goals: { batting: {}, pitching: {} },
      current: blankCurrentStats(),
      games: []
    };
  }
}

async function saveData(data, statusEl) {
  writeLocalBackup(data);
  statusEl.textContent = 'Saving...';
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Save failed');
    statusEl.textContent = 'Saved';
    state.loadedFromFallback = false;
    state.loadedFromLocalBackup = false;
    return true;
  } catch (err) {
    state.loadedFromFallback = true;
    state.loadedFromLocalBackup = true;
    statusEl.textContent = 'Saved locally (server unavailable)';
    return true;
  }
}

async function refreshStateFromServer() {
  const res = await fetch('/api/data', { cache: 'no-store' });
  if (!res.ok) throw new Error('Reload failed');
  const payload = await res.json();
  state.data = preferLocalBackup(payload, readLocalBackup());
  if (!state.data.games) state.data.games = [];
  if (!state.data.meta) state.data.meta = {};
}

async function restorePreviousSave(statusEl) {
  if (state.loadedFromFallback) {
    statusEl.textContent = 'Refresh first before restoring';
    return;
  }
  statusEl.textContent = 'Restoring...';
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restorePrevious' })
    });
    if (!res.ok) throw new Error('Restore failed');
    const payload = await res.json();
    state.data = payload.data;
    if (!state.data.games) state.data.games = [];
    if (!state.data.meta) state.data.meta = {};
    state.editingGameIndex = null;
    applyGameTotals();
    renderTables();
    renderGames();
    buildForms();
    updateUpdatedAt();
    resetGameForm();
    renderChart();
    statusEl.textContent = 'Previous save restored';
  } catch (err) {
    statusEl.textContent = 'No previous save found';
  }
}

async function restoreSeedData(statusEl) {
  if (state.loadedFromFallback) {
    statusEl.textContent = 'Refresh first before restoring';
    return;
  }
  statusEl.textContent = 'Restoring seed data...';
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restoreSeed' })
    });
    if (!res.ok) throw new Error('Restore failed');
    const payload = await res.json();
    state.data = payload.data;
    if (!state.data.games) state.data.games = [];
    if (!state.data.meta) state.data.meta = {};
    state.editingGameIndex = null;
    applyGameTotals();
    renderTables();
    renderGames();
    buildForms();
    updateUpdatedAt();
    resetGameForm();
    renderChart();
    statusEl.textContent = 'Seed data restored';
  } catch (err) {
    statusEl.textContent = 'Seed restore failed';
  }
}

function updateUpdatedAt() {
  const stamp = state.data.meta.updatedAt || 'Just now';
  if (state.loadedFromLocalBackup) {
    updatedAtEl.textContent = `Updated: ${stamp} (local backup mode)`;
    return;
  }
  if (state.loadedFromFallback) {
    updatedAtEl.textContent = `Updated: ${stamp} (storage unavailable)`;
    return;
  }
  updatedAtEl.textContent = `Updated: ${stamp}`;
}

function setGoalsUnlocked(unlocked) {
  if (unlocked) {
    goalsContent.classList.remove('hidden');
    goalsLock.classList.add('hidden');
  } else {
    goalsContent.classList.add('hidden');
    goalsLock.classList.remove('hidden');
  }
}

goalsForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formData = new FormData(goalsForm);
  formData.forEach((value, key) => {
    const [section, stat] = key.split('.');
    const num = value === '' ? null : Number(value);
    state.data.goals[section][stat] = Number.isNaN(num) ? null : num;
  });
  const before = JSON.parse(JSON.stringify(state.data));
  state.data.meta.updatedAt = new Date().toLocaleString();
  renderTables();
  updateUpdatedAt();
  const ok = await saveData(state.data, goalsStatus);
  if (!ok) {
    state.data = before;
    renderTables();
    updateUpdatedAt();
    return;
  }
  try {
    await refreshStateFromServer();
    applyGameTotals();
    renderTables();
    renderGames();
    buildForms();
    updateUpdatedAt();
    renderChart();
  } catch (err) {
    goalsStatus.textContent = 'Saved, but refresh failed';
  }
});

if (unlockGoals) {
  unlockGoals.addEventListener('click', () => {
    if (goalsPassword.value === GOALS_PASSWORD) {
      localStorage.setItem('goalsUnlocked', 'true');
      goalsLockStatus.textContent = 'Unlocked';
      setGoalsUnlocked(true);
    } else {
      goalsLockStatus.textContent = 'Wrong password';
    }
  });
}

gameForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formData = new FormData(gameForm);
  const game = {};
  gameFields.forEach(field => {
    const value = formData.get(field.key);
    if (field.type === 'number') {
      const num = value === '' ? 0 : Number(value);
      game[field.key] = Number.isNaN(num) ? 0 : num;
    } else {
      game[field.key] = value || '';
    }
  });
  const before = JSON.parse(JSON.stringify(state.data));
  if (state.editingGameIndex !== null && state.data.games[state.editingGameIndex]) {
    state.data.games[state.editingGameIndex] = game;
  } else {
    state.data.games.push(game);
  }
  state.data.meta.updatedAt = new Date().toLocaleString();
  applyGameTotals();
  renderTables();
  renderGames();
  buildForms();
  updateUpdatedAt();
  resetGameForm();
  renderChart();
  const ok = await saveData(state.data, gameStatus);
  if (!ok) {
    state.data = before;
    applyGameTotals();
    renderTables();
    renderGames();
    buildForms();
    updateUpdatedAt();
    renderChart();
    return;
  }
  try {
    await refreshStateFromServer();
    applyGameTotals();
    renderTables();
    renderGames();
    buildForms();
    updateUpdatedAt();
    renderChart();
  } catch (err) {
    gameStatus.textContent = 'Saved, but refresh failed';
  }
});

gamesTableBody.addEventListener('click', async event => {
  if (event.target.tagName !== 'BUTTON') return;
  const action = event.target.dataset.action || 'remove';
  const originalIndex = Number(event.target.dataset.index);
  if (Number.isNaN(originalIndex) || originalIndex < 0) return;
  if (!state.data.games[originalIndex]) return;

  if (action === 'edit') {
    state.editingGameIndex = originalIndex;
    populateGameForm(state.data.games[originalIndex]);
    setGameFormMode();
    gameStatus.textContent = 'Editing saved game';
    return;
  }

  const before = JSON.parse(JSON.stringify(state.data));
  state.data.games.splice(originalIndex, 1);
  if (state.editingGameIndex === originalIndex) {
    resetGameForm();
  }
  state.data.meta.updatedAt = new Date().toLocaleString();
  applyGameTotals();
  renderTables();
  renderGames();
  buildForms();
  updateUpdatedAt();
  renderChart();
  const ok = await saveData(state.data, gameStatus);
  if (!ok) {
    state.data = before;
    applyGameTotals();
    renderTables();
    renderGames();
    buildForms();
    updateUpdatedAt();
    renderChart();
    return;
  }
  try {
    await refreshStateFromServer();
    applyGameTotals();
    renderTables();
    renderGames();
    buildForms();
    updateUpdatedAt();
    renderChart();
  } catch (err) {
    gameStatus.textContent = 'Saved, but refresh failed';
  }
});

if (cancelEditButton) {
  cancelEditButton.addEventListener('click', () => {
    gameStatus.textContent = '';
    resetGameForm();
  });
}

if (restorePreviousButton) {
  restorePreviousButton.addEventListener('click', async () => {
    await restorePreviousSave(gameStatus);
  });
}

if (restoreSeedButton) {
  restoreSeedButton.addEventListener('click', async () => {
    await restoreSeedData(gameStatus);
  });
}

if (resetSeasonButton) {
  resetSeasonButton.addEventListener('click', async () => {
    if (state.loadedFromFallback) {
      gameStatus.textContent = 'Refresh first before resetting';
      return;
    }
    state.data.games = [];
    state.data.current = blankCurrentStats();
    state.data.meta.updatedAt = new Date().toLocaleString();
    resetGameForm();
    applyGameTotals();
    renderTables();
    renderGames();
    buildForms();
    updateUpdatedAt();
    renderChart();
    gameStatus.textContent = 'Resetting...';
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clearSeason',
          current: state.data.current,
          meta: state.data.meta
        })
      });
      if (!res.ok) throw new Error('Reset failed');
      const payload = await res.json();
      state.data = payload.data;
      gameStatus.textContent = '2026 season reset';
    } catch (err) {
      gameStatus.textContent = 'Reset failed';
    }
  });
}

teamFilter.addEventListener('change', () => {
  state.teamFilter = teamFilter.value;
  applyGameTotals();
  renderTables();
  renderGames();
  buildForms();
  renderChart();
});

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });
    return row;
  });
}

uploadGamesCsv.addEventListener('click', async () => {
  if (!gamesCsv.files.length) {
    gamesCsvStatus.textContent = 'Pick a CSV file first.';
    return;
  }
  const file = gamesCsv.files[0];
  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length) {
    gamesCsvStatus.textContent = 'Invalid CSV format.';
    return;
  }
  const before = JSON.parse(JSON.stringify(state.data));
  rows.forEach(row => {
    const game = {};
    gameFields.forEach(field => {
      const raw = row[field.key] ?? '';
      if (field.type === 'number') {
        const num = raw === '' ? 0 : Number(raw);
        game[field.key] = Number.isNaN(num) ? 0 : num;
      } else {
        game[field.key] = raw;
      }
    });
    state.data.games.push(game);
  });
  state.data.meta.updatedAt = new Date().toLocaleString();
  applyGameTotals();
  renderTables();
  renderGames();
  buildForms();
  updateUpdatedAt();
  renderChart();
  const ok = await saveData(state.data, gamesCsvStatus);
  if (!ok) {
    state.data = before;
    applyGameTotals();
    renderTables();
    renderGames();
    buildForms();
    updateUpdatedAt();
    renderChart();
    return;
  }
  try {
    await refreshStateFromServer();
    applyGameTotals();
    renderTables();
    renderGames();
    buildForms();
    updateUpdatedAt();
    renderChart();
  } catch (err) {
    gamesCsvStatus.textContent = 'Saved, but refresh failed';
  }
});

function buildChartStatOptions() {
  chartStat.innerHTML = '';
  const options = [];
  if (chartView.value === 'all') {
    statConfig.batting.forEach(stat => options.push({ section: 'batting', key: stat.key, label: `Batting ${stat.label}` }));
    statConfig.pitching.forEach(stat => options.push({ section: 'pitching', key: stat.key, label: `Pitching ${stat.label}` }));
  } else if (chartView.value === 'batting') {
    statConfig.batting.forEach(stat => options.push({ section: 'batting', key: stat.key, label: stat.label }));
  } else {
    statConfig.pitching.forEach(stat => options.push({ section: 'pitching', key: stat.key, label: stat.label }));
  }

  options.forEach(option => {
    const el = document.createElement('option');
    el.value = `${option.section}:${option.key}`;
    el.textContent = option.label;
    chartStat.appendChild(el);
  });
}

function computeSeries() {
  const games = getFilteredGames().slice();
  if (!games.length) {
    return [{
      label: 'Current',
      batting: state.data.current.batting,
      pitching: state.data.current.pitching
    }];
  }

  games.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const series = [];
  let cumulative = [];
  games.forEach(game => {
    cumulative.push(game);
    const totals = calculateTotals(cumulative);
    const rates = calculateRates(totals);
    series.push({
      label: game.date || 'Game',
      batting: rates.batting,
      pitching: rates.pitching
    });
  });

  return series;
}

function renderChart() {
  if (!chartContainer) return;
  const series = computeSeries();
  const [section, stat] = chartStat.value.split(':');
  const values = series.map(point => point[section][stat]).filter(v => v !== null && v !== undefined);
  const currentValue = values.length ? values[values.length - 1] : null;
  const goal = state.data.goals[section][stat];
  const baseline = state.data.baseline[section][stat];
  const baselineGoalValues = [baseline, goal].filter(v => v !== null && v !== undefined);
  const allValues = values.concat(baselineGoalValues);
  const max = allValues.length ? Math.max(...allValues) : 1;
  const min = allValues.length ? Math.min(...allValues) : 0;
  const range = max - min || 1;
  const width = 800;
  const height = 240;
  const padding = 28;

  const points = series.map((point, idx) => {
    const value = point[section][stat];
    if (value === null || value === undefined) return null;
    const x = padding + (idx / Math.max(series.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y, value };
  }).filter(Boolean);

  const line = points.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const firstLabel = series[0]?.label || 'Start';
  const lastLabel = series[series.length - 1]?.label || 'Now';
  const yMaxLabel = max.toFixed(3);
  const yMinLabel = min.toFixed(3);
  const formatLegendValue = value => value === null || value === undefined ? 'n/a' : Number(value).toFixed(3);
  const legendX = width - padding - 205;
  const legendY = padding - 10;

  chartContainer.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#fff" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#efe7ea" />
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#efe7ea" />
      <text x="${padding}" y="${padding - 6}" font-size="10" fill="#5d5d5d">${yMaxLabel}</text>
      <text x="${padding}" y="${height - padding + 12}" font-size="10" fill="#5d5d5d">${yMinLabel}</text>
      <text x="${padding}" y="${height - 6}" font-size="10" fill="#5d5d5d" text-anchor="start">${firstLabel}</text>
      <text x="${width - padding}" y="${height - 6}" font-size="10" fill="#5d5d5d" text-anchor="end">${lastLabel}</text>
      ${baseline !== null && baseline !== undefined ? `<line x1="${padding}" y1="${height - padding - ((baseline - min) / range) * (height - padding * 2)}" x2="${width - padding}" y2="${height - padding - ((baseline - min) / range) * (height - padding * 2)}" stroke="#d49a00" stroke-dasharray="6 6" />` : ''}
      ${goal !== null && goal !== undefined ? `<line x1="${padding}" y1="${height - padding - ((goal - min) / range) * (height - padding * 2)}" x2="${width - padding}" y2="${height - padding - ((goal - min) / range) * (height - padding * 2)}" stroke="#1b7f3f" stroke-dasharray="6 6" />` : ''}
      ${line ? `<path d="${line}" fill="none" stroke="#7a0f2b" stroke-width="3" />` : ''}
      ${points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#7a0f2b" />`).join('')}
      <rect x="${legendX}" y="${legendY}" width="205" height="52" fill="rgba(255,255,255,0.92)" stroke="#efe7ea" rx="8" />
      <line x1="${legendX + 12}" y1="${legendY + 14}" x2="${legendX + 32}" y2="${legendY + 14}" stroke="#7a0f2b" stroke-width="3" />
      <text x="${legendX + 40}" y="${legendY + 17}" font-size="10" fill="#5d5d5d">Current ${formatLegendValue(currentValue)}</text>
      <line x1="${legendX + 12}" y1="${legendY + 28}" x2="${legendX + 32}" y2="${legendY + 28}" stroke="#d49a00" stroke-dasharray="6 6" />
      <text x="${legendX + 40}" y="${legendY + 31}" font-size="10" fill="#5d5d5d">2025 ${formatLegendValue(baseline)}</text>
      <line x1="${legendX + 12}" y1="${legendY + 42}" x2="${legendX + 32}" y2="${legendY + 42}" stroke="#1b7f3f" stroke-dasharray="6 6" />
      <text x="${legendX + 40}" y="${legendY + 45}" font-size="10" fill="#5d5d5d">Goal ${formatLegendValue(goal)}</text>
    </svg>
  `;
}

chartView.addEventListener('change', () => {
  buildChartStatOptions();
  renderChart();
});

chartStat.addEventListener('change', () => {
  renderChart();
});

(async function init() {
  state.data = await loadData();
  if (!state.data.games) state.data.games = [];
  teamFilter.value = state.teamFilter;
  applyGameTotals();
  renderTables();
  buildForms();
  buildGameForm();
  setGameFormMode();
  renderGames();
  updateUpdatedAt();
  buildChartStatOptions();
  renderChart();
  const unlocked = localStorage.getItem('goalsUnlocked') === 'true';
  setGoalsUnlocked(unlocked);
})();

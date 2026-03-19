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
  editingGameId: null,
  loadedFromFallback: false
};

const battingTableBody = document.querySelector('#battingTable tbody');
const pitchingTableBody = document.querySelector('#pitchingTable tbody');
const seasonBattingTableBody = document.querySelector('#seasonBattingTable tbody');
const seasonPitchingTableBody = document.querySelector('#seasonPitchingTable tbody');
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
const teamFilter = document.getElementById('teamFilter');
const chartView = document.getElementById('chartView');
const chartStat = document.getElementById('chartStat');
const chartContainer = document.getElementById('chart');
const installAppButton = document.getElementById('installApp');
const shareAppButton = document.getElementById('shareApp');
const copyLinkButton = document.getElementById('copyLink');
const appActionsStatus = document.getElementById('appActionsStatus');

const GOALS_PASSWORD = 'maverickbaseball';
const LOCAL_BACKUP_KEY = 'maverick_2026_data_backup_v1';
let deferredInstallPrompt = null;

function getShareUrl() {
  const url = new URL(window.location.href);
  url.hash = '';
  return url.toString();
}

function setAppActionStatus(message) {
  if (!appActionsStatus) return;
  appActionsStatus.textContent = message;
}

async function shareAppLink() {
  const shareUrl = getShareUrl();
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Maverick 2026 Baseball Goals',
        text: 'Track Maverick baseball progress and game stats live.',
        url: shareUrl
      });
      setAppActionStatus('Shared');
      return;
    } catch {
      // Fall through to clipboard.
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setAppActionStatus('Link copied');
      return;
    } catch {
      // No-op.
    }
  }

  setAppActionStatus(`Share this URL: ${shareUrl}`);
}

async function copyAppLink() {
  const shareUrl = getShareUrl();
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setAppActionStatus('Link copied');
      return;
    } catch {
      // No-op.
    }
  }
  setAppActionStatus(`Copy this URL: ${shareUrl}`);
}

if (shareAppButton) {
  shareAppButton.addEventListener('click', async () => {
    await shareAppLink();
  });
}

if (copyLinkButton) {
  copyLinkButton.addEventListener('click', async () => {
    await copyAppLink();
  });
}

if (installAppButton) {
  installAppButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      setAppActionStatus('Use your browser menu to install this app');
      return;
    }
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setAppActionStatus('Installed');
    } else {
      setAppActionStatus('Install canceled');
    }
    deferredInstallPrompt = null;
    installAppButton.classList.add('hidden');
  });
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (installAppButton) {
    installAppButton.classList.remove('hidden');
  }
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  if (installAppButton) {
    installAppButton.classList.add('hidden');
  }
  setAppActionStatus('App installed on this device');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch {
      // Ignore service worker registration failures.
    }
  });
}

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

function generateGameId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `game-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildLegacyGameId(game, index) {
  return `legacy-${index}-${gameIdentity(game)}`;
}

function normalizeGame(game, index = 0) {
  const normalized = { ...(game || {}) };
  if (!normalized.id) {
    normalized.id = buildLegacyGameId(normalized, index);
  }
  return normalized;
}

function hydrateData(data) {
  const hydrated = data && typeof data === 'object' ? data : {};
  if (!hydrated.meta) hydrated.meta = {};
  if (!hydrated.baseline) hydrated.baseline = { batting: {}, pitching: {} };
  if (!hydrated.goals) hydrated.goals = { batting: {}, pitching: {} };
  if (!hydrated.current) hydrated.current = blankCurrentStats();
  hydrated.games = Array.isArray(hydrated.games)
    ? hydrated.games.map((game, index) => normalizeGame(game, index))
    : [];
  return hydrated;
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

function gameIdentity(game) {
  return [
    game.date || '',
    game.opponent || '',
    game.team || '',
    game.AB || 0,
    game.H || 0,
    game['2B'] || 0,
    game['3B'] || 0,
    game.HR || 0,
    game.R || 0,
    game.RBI || 0,
    game.SB || 0,
    game.BB || 0,
    game.HBP || 0,
    game.SF || 0,
    game.SO || 0,
    game.IP || 0,
    game.BF || 0,
    game.H_allowed || 0,
    game.ER || 0,
    game.HBP_allowed || 0,
    game.BB_allowed || 0,
    game.SO_pitched || 0
  ].join('|');
}

function formatValue(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'n/a';
  }
  const num = Number(value);
  return num.toFixed(3);
}

function statusFor(statKey, value, baselineValue, goalValue, higherIsBetter) {
  if ([value, baselineValue, goalValue].some(v => v === null || v === undefined || Number.isNaN(v))) {
    return 'gray';
  }
  if (statKey === 'BB/BF') {
    return value <= goalValue ? 'green' : 'red';
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
  const estimatedBF = pitching.outs + pitching.H_allowed + pitching.BB_allowed + pitching.HBP_allowed;
  const bfForRates = pitching.BF > 0 ? pitching.BF : estimatedBF;

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
      'K/BF': bfForRates ? pitching.SO_pitched / bfForRates : null,
      'BB/BF': bfForRates ? pitching.BB_allowed / bfForRates : null,
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
    gameId: game.id
  }));
  mapped.sort((a, b) => {
    const aTime = Date.parse(a.game.date || '');
    const bTime = Date.parse(b.game.date || '');
    const aValid = Number.isFinite(aTime);
    const bValid = Number.isFinite(bTime);
    if (aValid && bValid && aTime !== bTime) return bTime - aTime;
    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;
    return state.data.games.indexOf(b.game) - state.data.games.indexOf(a.game);
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

function outsToDisplayIP(outs) {
  const totalOuts = Number(outs || 0);
  if (Number.isNaN(totalOuts) || totalOuts <= 0) return '0.0';
  const whole = Math.floor(totalOuts / 3);
  const remainder = totalOuts % 3;
  return `${whole}.${remainder}`;
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
    const status = statusFor(stat.key, value, base, goal, stat.higherIsBetter);

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

function renderSeasonTotals() {
  if (!seasonBattingTableBody || !seasonPitchingTableBody) return;

  const teamGroups = {
    Combined: state.data.games || [],
    '11U': (state.data.games || []).filter(game => (game.team || '') === '11U'),
    Dodgers: (state.data.games || []).filter(game => (game.team || '') === 'Dodgers')
  };

  const totalsByTeam = Object.fromEntries(
    Object.entries(teamGroups).map(([team, games]) => [team, calculateTotals(games)])
  );

  const battingRows = [
    ['AB', 'AB'],
    ['H', 'H'],
    ['2B', '2B'],
    ['3B', '3B'],
    ['HR', 'HR'],
    ['R', 'R'],
    ['RBI', 'RBI'],
    ['SB', 'SB'],
    ['BB', 'BB'],
    ['HBP', 'HBP'],
    ['SF', 'SF'],
    ['SO', 'SO']
  ];

  const pitchingRows = [
    ['IP', 'outs'],
    ['BF', 'BF'],
    ['H', 'H_allowed'],
    ['ER', 'ER'],
    ['HBP', 'HBP_allowed'],
    ['BB', 'BB_allowed'],
    ['SO', 'SO_pitched'],
    ['Pitches', 'pitches'],
    ['Balls', 'balls'],
    ['Strikes', 'strikes']
  ];

  seasonBattingTableBody.innerHTML = '';
  battingRows.forEach(([label, key]) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${label}</td>
      <td>${formatHistoryWhole(totalsByTeam.Combined.batting[key])}</td>
      <td>${formatHistoryWhole(totalsByTeam['11U'].batting[key])}</td>
      <td>${formatHistoryWhole(totalsByTeam.Dodgers.batting[key])}</td>
    `;
    seasonBattingTableBody.appendChild(row);
  });

  seasonPitchingTableBody.innerHTML = '';
  pitchingRows.forEach(([label, key]) => {
    const row = document.createElement('tr');
    const combinedValue = key === 'outs'
      ? outsToDisplayIP(totalsByTeam.Combined.pitching.outs)
      : formatHistoryWhole(totalsByTeam.Combined.pitching[key]);
    const elevenUValue = key === 'outs'
      ? outsToDisplayIP(totalsByTeam['11U'].pitching.outs)
      : formatHistoryWhole(totalsByTeam['11U'].pitching[key]);
    const dodgersValue = key === 'outs'
      ? outsToDisplayIP(totalsByTeam.Dodgers.pitching.outs)
      : formatHistoryWhole(totalsByTeam.Dodgers.pitching[key]);
    row.innerHTML = `
      <td>${label}</td>
      <td>${combinedValue}</td>
      <td>${elevenUValue}</td>
      <td>${dodgersValue}</td>
    `;
    seasonPitchingTableBody.appendChild(row);
  });
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
  const isEditing = state.editingGameId !== null;
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
  state.editingGameId = null;
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

  displayGames.forEach(({ game, gameId }) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${formatHistoryDate(game.date)}</strong><br>${game.opponent || ''}<br>${game.team || ''}</td>
      <td><strong>Batting</strong><br>AB ${formatHistoryWhole(game.AB)} · H ${formatHistoryWhole(game.H)} · 2B ${formatHistoryWhole(game['2B'])} · 3B ${formatHistoryWhole(game['3B'])} · HR ${formatHistoryWhole(game.HR)} · R ${formatHistoryWhole(game.R)} · RBI ${formatHistoryWhole(game.RBI)} · SB ${formatHistoryWhole(game.SB)} · BB ${formatHistoryWhole(game.BB)} · HBP ${formatHistoryWhole(game.HBP)} · SF ${formatHistoryWhole(game.SF)} · SO ${formatHistoryWhole(game.SO)}</td>
      <td><strong>Pitching</strong><br>IP ${formatHistoryIP(game.IP)} · BF ${formatHistoryWhole(game.BF)} · H ${formatHistoryWhole(game.H_allowed)} · ER ${formatHistoryWhole(game.ER)} · HBP ${formatHistoryWhole(game.HBP_allowed)} · BB ${formatHistoryWhole(game.BB_allowed)} · SO ${formatHistoryWhole(game.SO_pitched)} · P ${formatHistoryWhole(game.pitches || ((game.balls || 0) + (game.strikes || 0)))} · B ${formatHistoryWhole(game.balls)} · S ${formatHistoryWhole(game.strikes)}</td>
      <td>
        <button class="btn btn--ghost" data-action="edit" data-game-id="${gameId}">Edit</button>
        <button class="btn btn--ghost" data-action="remove" data-game-id="${gameId}">Remove</button>
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
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (!res.ok) throw new Error('API unavailable');
    state.loadedFromFallback = false;
    return hydrateData(await res.json());
  } catch (err) {
    state.loadedFromFallback = true;
    if (isLocalDev) {
      const fallback = await fetch('data.json');
      return hydrateData(await fallback.json());
    }
    return hydrateData({
      meta: { title: 'Maverick 2026 Baseball Goals', updatedAt: 'Server unavailable' },
      baseline: { batting: {}, pitching: {} },
      goals: { batting: {}, pitching: {} },
      current: blankCurrentStats(),
      games: []
    });
  }
}

async function saveData(data, statusEl) {
  if (state.loadedFromFallback) {
    statusEl.textContent = 'Read-only mode: refresh and try again';
    return false;
  }
  statusEl.textContent = 'Saving...';
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Save failed');
    writeLocalBackup(data);
    statusEl.textContent = 'Saved';
    state.loadedFromFallback = false;
    return true;
  } catch (err) {
    statusEl.textContent = 'Save failed (server unavailable)';
    return false;
  }
}

async function refreshStateFromServer() {
  const res = await fetch('/api/data', { cache: 'no-store' });
  if (!res.ok) throw new Error('Reload failed');
  state.data = hydrateData(await res.json());
}

async function syncLatestGames(statusEl) {
  if (state.loadedFromFallback) {
    if (statusEl) statusEl.textContent = 'Read-only mode: refresh and try again';
    return false;
  }
  try {
    await refreshStateFromServer();
    return true;
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Could not load latest saved games';
    return false;
  }
}

function findGameIndexById(gameId) {
  return state.data.games.findIndex(game => game.id === gameId);
}


function updateUpdatedAt() {
  const stamp = state.data.meta.updatedAt || 'Just now';
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
  renderSeasonTotals();
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
    renderSeasonTotals();
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
  const synced = await syncLatestGames(gameStatus);
  if (!synced) return;
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
  game.id = state.editingGameId || generateGameId();
  const before = JSON.parse(JSON.stringify(state.data));
  const existingIndex = state.editingGameId ? findGameIndexById(state.editingGameId) : -1;
  if (existingIndex !== -1) {
    state.data.games[existingIndex] = game;
  } else {
    state.data.games.push(game);
  }
  const submittedGameId = gameIdentity(game);
  state.data.meta.updatedAt = new Date().toLocaleString();
  applyGameTotals();
  renderTables();
  renderGames();
  renderSeasonTotals();
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
    renderSeasonTotals();
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
    renderSeasonTotals();
    buildForms();
    updateUpdatedAt();
    renderChart();
    const persisted = (state.data.games || []).some(saved => gameIdentity(saved) === submittedGameId);
    if (!persisted) {
      gameStatus.textContent = 'Save failed: server did not persist game';
    } else {
      gameStatus.textContent = 'Saved and synced';
    }
  } catch (err) {
    gameStatus.textContent = 'Saved, but refresh failed';
  }
});

gamesTableBody.addEventListener('click', async event => {
  if (event.target.tagName !== 'BUTTON') return;
  const action = event.target.dataset.action || 'remove';
  const gameId = event.target.dataset.gameId;
  if (!gameId) return;

  if (action === 'edit') {
    const originalIndex = findGameIndexById(gameId);
    if (originalIndex === -1) return;
    state.editingGameId = gameId;
    populateGameForm(state.data.games[originalIndex]);
    setGameFormMode();
    gameStatus.textContent = 'Editing saved game';
    return;
  }

  const synced = await syncLatestGames(gameStatus);
  if (!synced) return;
  const originalIndex = findGameIndexById(gameId);
  if (originalIndex === -1) {
    gameStatus.textContent = 'Game no longer exists';
    return;
  }
  const before = JSON.parse(JSON.stringify(state.data));
  state.data.games.splice(originalIndex, 1);
  if (state.editingGameId === gameId) {
    resetGameForm();
  }
  state.data.meta.updatedAt = new Date().toLocaleString();
  applyGameTotals();
  renderTables();
  renderGames();
  renderSeasonTotals();
  buildForms();
  updateUpdatedAt();
  renderChart();
  const ok = await saveData(state.data, gameStatus);
  if (!ok) {
    state.data = before;
    applyGameTotals();
    renderTables();
    renderGames();
    renderSeasonTotals();
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
    renderSeasonTotals();
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

teamFilter.addEventListener('change', () => {
  state.teamFilter = teamFilter.value;
  applyGameTotals();
  renderTables();
  renderGames();
  renderSeasonTotals();
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
  const synced = await syncLatestGames(gamesCsvStatus);
  if (!synced) return;
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
    game.id = generateGameId();
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
    renderSeasonTotals();
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
  renderSeasonTotals();
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
  state.data = hydrateData(await loadData());
  if (!state.loadedFromFallback) {
    writeLocalBackup(state.data);
  }
  teamFilter.value = state.teamFilter;
  applyGameTotals();
  renderTables();
  buildForms();
  buildGameForm();
  setGameFormMode();
  renderGames();
  renderSeasonTotals();
  updateUpdatedAt();
  buildChartStatOptions();
  renderChart();
  const unlocked = localStorage.getItem('goalsUnlocked') === 'true';
  setGoalsUnlocked(unlocked);
})();

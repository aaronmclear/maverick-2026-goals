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
    { key: 'BB/BF', label: 'BB/BF', higherIsBetter: false }
  ]
};

const state = {
  data: null
};

const battingTableBody = document.querySelector('#battingTable tbody');
const pitchingTableBody = document.querySelector('#pitchingTable tbody');
const currentForm = document.getElementById('currentForm');
const goalsForm = document.getElementById('goalsForm');
const updatedAtEl = document.getElementById('updatedAt');
const currentStatus = document.getElementById('currentStatus');
const goalsStatus = document.getElementById('goalsStatus');
const csvStatus = document.getElementById('csvStatus');
const csvFile = document.getElementById('csvFile');
const uploadCsvBtn = document.getElementById('uploadCsv');
const downloadTemplateBtn = document.getElementById('downloadTemplate');

function formatValue(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'n/a';
  }
  const num = Number(value);
  if (Math.abs(num) >= 1) {
    return num.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  }
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
  formEl.innerHTML = '';
  statConfig[section].forEach(stat => {
    const wrapper = document.createElement('label');
    wrapper.className = 'form-field';
    wrapper.textContent = stat.label;

    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.001';
    input.name = `${section}.${stat.key}`;
    const value = source[stat.key];
    input.value = value === null || value === undefined ? '' : value;

    wrapper.appendChild(input);
    formEl.appendChild(wrapper);
  });
}

function buildForms() {
  buildForm('batting', currentForm, state.data.current.batting);
  buildForm('pitching', currentForm, state.data.current.pitching);
  buildForm('batting', goalsForm, state.data.goals.batting);
  buildForm('pitching', goalsForm, state.data.goals.pitching);
}

async function loadData() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('API unavailable');
    return await res.json();
  } catch (err) {
    const fallback = await fetch('data.json');
    return await fallback.json();
  }
}

async function saveData(data, statusEl) {
  statusEl.textContent = 'Saving...';
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Save failed');
    statusEl.textContent = 'Saved';
  } catch (err) {
    statusEl.textContent = 'Save failed (check connection)';
  }
}

function updateUpdatedAt() {
  const stamp = state.data.meta.updatedAt || 'Just now';
  updatedAtEl.textContent = `Updated: ${stamp}`;
}

currentForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formData = new FormData(currentForm);
  formData.forEach((value, key) => {
    const [section, stat] = key.split('.');
    const num = value === '' ? null : Number(value);
    state.data.current[section][stat] = Number.isNaN(num) ? null : num;
  });
  state.data.meta.updatedAt = new Date().toLocaleString();
  renderTables();
  updateUpdatedAt();
  await saveData(state.data, currentStatus);
});

goalsForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formData = new FormData(goalsForm);
  formData.forEach((value, key) => {
    const [section, stat] = key.split('.');
    const num = value === '' ? null : Number(value);
    state.data.goals[section][stat] = Number.isNaN(num) ? null : num;
  });
  state.data.meta.updatedAt = new Date().toLocaleString();
  renderTables();
  updateUpdatedAt();
  await saveData(state.data, goalsStatus);
});

function parseCsv(text) {
  const [headerLine, dataLine] = text.trim().split(/\r?\n/);
  if (!headerLine || !dataLine) return null;
  const headers = headerLine.split(',').map(h => h.trim());
  const values = dataLine.split(',').map(v => v.trim());
  const row = {};
  headers.forEach((header, idx) => {
    row[header] = values[idx] ?? '';
  });
  return row;
}

uploadCsvBtn.addEventListener('click', async () => {
  if (!csvFile.files.length) {
    csvStatus.textContent = 'Pick a CSV file first.';
    return;
  }
  const file = csvFile.files[0];
  const text = await file.text();
  const row = parseCsv(text);
  if (!row) {
    csvStatus.textContent = 'Invalid CSV format.';
    return;
  }
  const mapping = {
    AVG: ['batting', 'AVG'],
    OBP: ['batting', 'OBP'],
    SLG: ['batting', 'SLG'],
    OPS: ['batting', 'OPS'],
    'K%': ['batting', 'K%'],
    ERA: ['pitching', 'ERA'],
    WHIP: ['pitching', 'WHIP'],
    'K/BB': ['pitching', 'K/BB'],
    'K/BF': ['pitching', 'K/BF'],
    'BB/BF': ['pitching', 'BB/BF']
  };

  Object.entries(mapping).forEach(([key, [section, stat]]) => {
    if (row[key] !== undefined && row[key] !== '') {
      const num = Number(row[key]);
      state.data.current[section][stat] = Number.isNaN(num) ? state.data.current[section][stat] : num;
    }
  });

  state.data.meta.updatedAt = new Date().toLocaleString();
  renderTables();
  buildForms();
  updateUpdatedAt();
  await saveData(state.data, csvStatus);
});

downloadTemplateBtn.addEventListener('click', () => {
  const headers = ['AVG','OBP','SLG','OPS','K%','ERA','WHIP','K/BB','K/BF','BB/BF'];
  const values = headers.map(header => {
    const mapping = {
      AVG: state.data.current.batting.AVG,
      OBP: state.data.current.batting.OBP,
      SLG: state.data.current.batting.SLG,
      OPS: state.data.current.batting.OPS,
      'K%': state.data.current.batting['K%'],
      ERA: state.data.current.pitching.ERA,
      WHIP: state.data.current.pitching.WHIP,
      'K/BB': state.data.current.pitching['K/BB'],
      'K/BF': state.data.current.pitching['K/BF'],
      'BB/BF': state.data.current.pitching['BB/BF']
    };
    return mapping[header] ?? '';
  });
  const csv = `${headers.join(',')}\n${values.join(',')}`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'maverick_2026_totals.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

(async function init() {
  state.data = await loadData();
  renderTables();
  buildForms();
  updateUpdatedAt();
})();

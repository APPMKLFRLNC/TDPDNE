const statusEl = document.getElementById('status');
const notConfiguredEl = document.getElementById('not-configured');
const searchSection = document.getElementById('search-section');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const connectSection = document.getElementById('connect-section');
const connectBtn = document.getElementById('connect-btn');
const queueList = document.getElementById('queue-list');
const emptyState = document.getElementById('empty-state');

let musicKitReady = false;
let searchTimer = null;
let searchSeq = 0;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadConfig() {
  const res = await fetch('/api/config');
  const config = await res.json();

  searchSection.classList.toggle('hidden', !config.searchEnabled);
  notConfiguredEl.classList.toggle('hidden', config.searchEnabled);
  connectSection.classList.toggle('hidden', !(config.playlistSyncConfigured && !config.connected));

  statusEl.textContent = config.demoMode
    ? 'Demo mode'
    : config.searchEnabled
      ? 'Ready'
      : 'Apple Music not configured';

  return config;
}

async function setupMusicKit() {
  if (musicKitReady || typeof MusicKit === 'undefined') return;
  try {
    const res = await fetch('/api/apple-music/developer-token');
    if (!res.ok) return;
    const { token } = await res.json();
    await MusicKit.configure({
      developerToken: token,
      app: { name: 'Party Jukebox', build: '1.0.0' },
    });
    musicKitReady = true;
  } catch (err) {
    console.error('Failed to set up MusicKit', err);
  }
}

connectBtn.addEventListener('click', async () => {
  await setupMusicKit();
  if (!musicKitReady) return;
  const music = MusicKit.getInstance();
  try {
    const musicUserToken = await music.authorize();
    await fetch('/api/apple-music/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ musicUserToken }),
    });
    connectSection.classList.add('hidden');
  } catch (err) {
    console.error('Authorization failed', err);
  }
});

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const term = searchInput.value.trim();
  if (!term) {
    searchResults.innerHTML = '';
    return;
  }
  searchTimer = setTimeout(() => runSearch(term), 350);
});

async function runSearch(term) {
  const seq = ++searchSeq;
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
    if (seq !== searchSeq) return; // a newer search superseded this one
    if (!res.ok) {
      searchResults.innerHTML = '<li class="empty">Search failed — try again.</li>';
      return;
    }
    const { results } = await res.json();
    renderResults(results);
  } catch (err) {
    if (seq === searchSeq) {
      searchResults.innerHTML = '<li class="empty">Search failed — try again.</li>';
    }
  }
}

function renderResults(results) {
  searchResults.innerHTML = '';
  if (results.length === 0) {
    searchResults.innerHTML = '<li class="empty">No matches.</li>';
    return;
  }
  for (const song of results) {
    const li = document.createElement('li');
    li.className = 'result-item';
    li.innerHTML = `
      ${song.artworkUrl ? `<img src="${song.artworkUrl}" alt="" class="artwork" />` : '<div class="artwork placeholder"></div>'}
      <div class="queue-item-info">
        <span class="title">${escapeHtml(song.title)}</span>
        <span class="artist">${escapeHtml(song.artist)}</span>
      </div>
      <button class="add-btn"
        data-id="${escapeHtml(song.id)}"
        data-title="${escapeHtml(song.title)}"
        data-artist="${escapeHtml(song.artist)}"
        data-duration="${song.durationSeconds ?? ''}">Add</button>
    `;
    searchResults.appendChild(li);
  }
}

searchResults.addEventListener('click', async (e) => {
  const btn = e.target.closest('.add-btn');
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Added ✓';

  await fetch('/api/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: btn.dataset.id,
      title: btn.dataset.title,
      artist: btn.dataset.artist,
      durationSeconds: btn.dataset.duration ? Number(btn.dataset.duration) : undefined,
    }),
  });

  refreshQueue();
  setTimeout(() => {
    searchInput.value = '';
    searchResults.innerHTML = '';
    searchInput.focus();
  }, 700);
});

async function refreshQueue() {
  const res = await fetch('/api/state');
  const state = await res.json();

  queueList.innerHTML = '';
  emptyState.classList.toggle('hidden', state.queue.length > 0);

  for (const item of state.queue) {
    const li = document.createElement('li');
    li.className = 'queue-item';
    li.innerHTML = `
      <div class="queue-item-info">
        <span class="title">${escapeHtml(item.title)}</span>
        <span class="artist">${escapeHtml(item.artist)}</span>
      </div>
      <span class="badge ${item.matched ? 'matched' : 'unmatched'}">
        ${item.matched ? 'Ready for DJ' : 'Search manually'}
      </span>
    `;
    queueList.appendChild(li);
  }
}

loadConfig();
refreshQueue();
setInterval(refreshQueue, 3000);
setInterval(loadConfig, 15000);

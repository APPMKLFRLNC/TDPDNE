const statusEl = document.getElementById('status');
const joinSection = document.getElementById('join-section');
const joinQr = document.getElementById('join-qr');
const joinLink = document.getElementById('join-link');
const connectSection = document.getElementById('connect-section');
const connectBtn = document.getElementById('connect-btn');
const queueList = document.getElementById('queue-list');
const emptyState = document.getElementById('empty-state');

let musicKitReady = false;

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

async function loadConfig() {
  const res = await fetch('/api/config');
  const config = await res.json();

  if (config.joinUrl) {
    joinSection.classList.remove('hidden');
    joinQr.src = '/api/join-qr.png';
    joinLink.href = config.joinUrl;
    joinLink.textContent = config.joinUrl;
  }

  if (config.configured && !config.connected) {
    connectSection.classList.remove('hidden');
    await setupMusicKit();
  } else {
    connectSection.classList.add('hidden');
  }

  statusEl.textContent = config.demoMode
    ? 'Demo mode'
    : config.connected
      ? 'Connected'
      : config.configured
        ? 'Not connected'
        : 'Apple Music not configured';

  return config;
}

connectBtn.addEventListener('click', async () => {
  await setupMusicKit();
  if (!musicKitReady) {
    statusEl.textContent = 'Connection failed';
    return;
  }
  const music = MusicKit.getInstance();
  try {
    const musicUserToken = await music.authorize();
    await fetch('/api/apple-music/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ musicUserToken }),
    });
    connectSection.classList.add('hidden');
    statusEl.textContent = 'Connected';
  } catch (err) {
    console.error('Authorization failed', err);
    statusEl.textContent = 'Connection failed';
  }
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

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

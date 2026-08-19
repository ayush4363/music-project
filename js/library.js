/* IndexedDB Offline Storage Manager for Offline Music Playback */
const OFFLINE_DB_NAME = 'ayu_music_offline_db';
const OFFLINE_DB_VERSION = 1;
const OFFLINE_STORE_NAME = 'offline_tracks';

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveOfflineTrack(track, blob) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const item = {
      id: track.id,
      title: track.title || 'Unknown Title',
      artist: track.artist || 'Unknown Artist',
      artwork: track.artwork || '',
      duration: track.duration || '0:00',
      downloadedAt: Date.now(),
      blob: blob
    };
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

async function getOfflineTracks() {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(OFFLINE_STORE_NAME, 'readonly');
      const store = tx.objectStore(OFFLINE_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function getOfflineTrackById(id) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(OFFLINE_STORE_NAME, 'readonly');
      const store = tx.objectStore(OFFLINE_STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function deleteOfflineTrack(id) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(OFFLINE_STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

window.getOfflineTracks = getOfflineTracks;
window.getOfflineTrackById = getOfflineTrackById;
window.deleteOfflineTrack = deleteOfflineTrack;

window.downloadTrack = async (track) => {
  if (!track || !track.id) return;

  // 1. REAL-TIME ON-SCREEN PROGRESS TOAST
  let toast = document.getElementById('download-progress-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'download-progress-toast';
    toast.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 10000; background: #141414; border: 1px solid rgba(56, 239, 125, 0.5); padding: 16px 20px; border-radius: 16px; color: #ffffff; box-shadow: 0 12px 40px rgba(0,0,0,0.8); display: flex; align-items: center; gap: 14px; min-width: 320px; max-width: 400px; font-family: system-ui, -apple-system, sans-serif; transition: all 0.3s ease;';
    document.body.appendChild(toast);
  }

  // Initial Toast Content
  toast.innerHTML = `
    <div style="background: rgba(56,239,125,0.15); color: #38ef7d; width: 40px; height: 40px; border-radius: 50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
    </div>
    <div style="flex: 1; min-width: 0; text-align: left;">
      <div style="font-size: 14px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">Downloading ${track.title || 'Song'}</div>
      <div style="font-size: 12px; color: rgba(255,255,255,0.7); font-weight: 500;">Connecting...</div>
      <div style="width: 100%; background: rgba(255,255,255,0.15); height: 5px; border-radius: 3px; margin-top: 6px; overflow: hidden;">
        <div style="width: 10%; background: #38ef7d; height: 100%; transition: width 0.15s ease; border-radius: 3px;"></div>
      </div>
    </div>
  `;

  try {
    let streamUrl = track.audioUrl || track.streamUrl;
    if (!streamUrl && window.musicStreamingApi) {
      streamUrl = await window.musicStreamingApi.getStream(track.id);
    }
    if (!streamUrl) {
      if (toast) toast.remove();
      alert(`Could not fetch audio stream for "${track.title}".`);
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('GET', streamUrl, true);
    xhr.responseType = 'blob';

    xhr.onprogress = (event) => {
      let percent = 15;
      let loadedMB = (event.loaded / (1024 * 1024)).toFixed(1);
      let totalMB = '0.0';

      if (event.lengthComputable && event.total > 0) {
        percent = Math.round((event.loaded / event.total) * 100);
        totalMB = (event.total / (1024 * 1024)).toFixed(1);
      } else {
        percent = Math.min(95, Math.round(15 + (event.loaded / (1024 * 1024)) * 15));
      }

      toast.innerHTML = `
        <div style="background: rgba(56,239,125,0.15); color: #38ef7d; width: 40px; height: 40px; border-radius: 50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        </div>
        <div style="flex: 1; min-width: 0; text-align: left;">
          <div style="font-size: 14px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">Downloading ${track.title || 'Song'}</div>
          <div style="font-size: 12px; color: rgba(255,255,255,0.7); font-weight: 500;">${percent}% ${event.lengthComputable ? `(${loadedMB} / ${totalMB} MB)` : `(${loadedMB} MB downloaded)`}</div>
          <div style="width: 100%; background: rgba(255,255,255,0.15); height: 5px; border-radius: 3px; margin-top: 6px; overflow: hidden;">
            <div style="width: ${percent}%; background: #38ef7d; height: 100%; transition: width 0.15s ease; border-radius: 3px;"></div>
          </div>
        </div>
      `;
    };

    xhr.onload = async () => {
      if (xhr.status === 200 || xhr.status === 0) {
        const blob = xhr.response;
        const cleanFileName = `${track.title} - ${track.artist}`.replace(/[/\\?%*:|"<>]/g, '_');

        // FORCE DIRECT DISK DOWNLOAD VIA BLOB URL (NO NEW TAB!)
        const blobUrl = URL.createObjectURL(blob);
        const saveAnchor = document.createElement('a');
        saveAnchor.href = blobUrl;
        saveAnchor.download = `${cleanFileName}.mp3`;
        document.body.appendChild(saveAnchor);
        saveAnchor.click();
        saveAnchor.remove();

        // OFFLINE INDEXEDDB STORE
        await saveOfflineTrack(track, blob);

        if (toast) {
          toast.style.borderColor = '#38ef7d';
          toast.innerHTML = `
            <div style="background: #38ef7d; color: #000; width: 40px; height: 40px; border-radius: 50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-weight:bold; font-size: 18px;">✓</div>
            <div style="text-align: left;">
              <div style="font-size: 14px; font-weight: 700; color: #ffffff;">Download Complete!</div>
              <div style="font-size: 12px; color: #38ef7d; font-weight: 600;">Saved as MP3 & Offline Ready</div>
            </div>
          `;
          setTimeout(() => toast?.remove(), 3500);
        }

        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

        if (window.location.hash === '#/library') window.renderLibrary();
        if (window.location.hash === '#/downloads') window.renderDownloadsPage();
      }
    };

    xhr.onerror = () => {
      if (toast) toast.remove();
      alert(`Download failed. Please check network connection.`);
    };

    xhr.send();
  } catch (err) {
    console.error('Download error:', err);
    if (toast) toast.remove();
  }
};

window.renderDownloadsPage = async () => {
  const container = document.getElementById('main-viewport');
  if (!container) return;

  const tracks = await getOfflineTracks();

  container.innerHTML = `
    <div class="page animate-fade-up">
      <div class="detail-header" style="display: flex; align-items: center; gap: 32px; margin-bottom: 36px;">
        <div class="detail-artwork" style="width: 180px; height: 180px; background: linear-gradient(135deg, #11998e, #38ef7d); display: flex; align-items: center; justify-content: center; border-radius: 24px; box-shadow: 0 15px 35px rgba(0,0,0,0.5);">
          <i data-lucide="download" style="width: 72px; height: 72px; color: #ffffff;"></i>
        </div>
        <div class="detail-info">
          <span class="detail-type" style="color: #38ef7d; font-weight: 700; letter-spacing: 1px; font-size: 13px;">OFFLINE STORAGE</span>
          <h1 class="detail-title" style="font-size: 42px; margin: 8px 0; font-weight: 800;">Downloads</h1>
          <p class="detail-desc" style="color: var(--text-secondary);">${tracks.length} tracks downloaded & available to play without internet</p>
          <div class="detail-actions" style="margin-top: 24px; display: flex; gap: 16px;">
            ${tracks.length > 0 ? `
              <button class="primary-btn" onclick="playAllOfflineTracks()" style="padding: 12px 32px; border-radius: 30px; font-weight: 700; background: #38ef7d; color: #000; display: flex; align-items: center; gap: 8px; cursor: pointer; border: none; font-size: 15px;">
                <i data-lucide="play" fill="currentColor"></i> Play Offline
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="tracklist-section" style="margin-top: 40px;">
        ${tracks.length === 0 ? `
          <div style="border: 1px dashed var(--border-color); border-radius: 20px; padding: 48px; text-align: center;">
            <i data-lucide="download-cloud" style="width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
            <p style="color: var(--text-secondary); font-size: 16px; margin-bottom: 8px;">No downloaded songs yet.</p>
            <p style="color: var(--text-muted); font-size: 13px;">Click the 3-dots menu on any song and select "Download" to save it to your system and play offline.</p>
          </div>
        ` : `
          <div class="tracklist-header" style="display: grid; grid-template-columns: 48px 1fr 120px 100px; padding: 12px 16px; color: var(--text-muted); font-size: 12px; font-weight: 700; border-bottom: 1px solid var(--border-color);">
            <span>#</span>
            <span>TITLE</span>
            <span>DURATION</span>
            <span>ACTION</span>
          </div>
          <div class="tracklist-body">
            ${tracks.map((t, idx) => `
              <div class="track-row" onclick="playSingleOfflineTrack('${t.id}')" style="display: grid; grid-template-columns: 48px 1fr 120px 100px; align-items: center; padding: 12px 16px; border-radius: 12px; cursor: pointer; transition: background 0.2s;">
                <span style="color: var(--text-muted); font-weight: 600;">${idx + 1}</span>
                <div style="display: flex; align-items: center; gap: 16px; min-width: 0;">
                  <img src="${t.artwork || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop'}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover;" />
                  <div style="min-width: 0;">
                    <div style="font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.title}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.artist} • <span style="color: #38ef7d; font-weight: 600;">Offline Ready</span></div>
                  </div>
                </div>
                <span style="color: var(--text-secondary); font-size: 13px;">${t.duration}</span>
                <div>
                  <button onclick="event.stopPropagation(); removeOfflineTrack('${t.id}')" style="background: rgba(255,51,102,0.15); border: none; color: #ff3366; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer;">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  lucide.createIcons();
};

window.playSingleOfflineTrack = async (id) => {
  const offlineTrack = await getOfflineTrackById(id);
  if (!offlineTrack || !offlineTrack.blob) return;

  const blobUrl = URL.createObjectURL(offlineTrack.blob);
  const playableTrack = {
    id: offlineTrack.id,
    title: offlineTrack.title,
    artist: offlineTrack.artist,
    artwork: offlineTrack.artwork,
    duration: offlineTrack.duration,
    streamUrl: blobUrl
  };

  window.player.playTrack(playableTrack);
};

window.playAllOfflineTracks = async () => {
  const tracks = await getOfflineTracks();
  if (tracks.length === 0) return;

  const playableTracks = tracks.map(t => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    artwork: t.artwork,
    duration: t.duration,
    streamUrl: URL.createObjectURL(t.blob)
  }));

  window.player.playTrack(playableTracks[0], playableTracks);
};

window.removeOfflineTrack = async (id) => {
  if (confirm('Delete this song from your offline downloads?')) {
    await deleteOfflineTrack(id);
    window.renderDownloadsPage();
  }
};

function getLocalPlaylists() {
  try {
    return JSON.parse(localStorage.getItem('user_playlists')) || [];
  } catch {
    return [];
  }
}

async function renderLibrary() {
  const container = document.getElementById('main-viewport');
  if (!container) return;

  const playlists = getLocalPlaylists();
  const offlineTracks = await getOfflineTracks();

  container.innerHTML = `
    <div class="page animate-fade-up">
      <div class="library-section">
        <h1 class="section-title" style="font-size: 32px; letter-spacing: -1px; margin-bottom: 24px;">Your Library</h1>
        
        <!-- Actions Box Grid -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 48px;">
          <!-- Create Playlist Card -->
          <div class="library-box" onclick="triggerCreatePlaylistModal()">
            <div class="library-box-left">
              <span class="library-box-title">Create New Playlist</span>
              <span class="library-box-desc">Add your favorite songs</span>
            </div>
            <button class="library-box-btn">
              <i data-lucide="plus"></i>
            </button>
          </div>

          <!-- Favorites Card -->
          <div class="library-box purple" onclick="navigateTo('#/playlist/favorites')">
            <div class="library-box-left">
              <span class="library-box-title">Favorites</span>
              <span class="library-box-desc">${window.player.liked.length} songs favorited</span>
            </div>
            <button class="library-box-btn" style="background-color: #ff3366; color: white;">
              <i data-lucide="heart" fill="currentColor"></i>
            </button>
          </div>

          <!-- Offline / Downloads Card -->
          <div class="library-box" onclick="navigateTo('#/downloads')">
            <div class="library-box-left">
              <span class="library-box-title">Downloads</span>
              <span class="library-box-desc">${offlineTracks.length} songs offline</span>
            </div>
            <button class="library-box-btn" style="background-color: #38ef7d; color: #000;">
              <i data-lucide="download"></i>
            </button>
          </div>

          <!-- Party Room Card -->
          <div class="library-box blocked-party-room" onclick="triggerPartyRoomComingSoon(event)">
            <div class="library-box-left">
              <span class="library-box-title">Party Room <span class="coming-soon-badge">Soon</span></span>
              <span class="library-box-desc">Host a synced listening session with friends</span>
            </div>
            <button class="library-box-btn party-normal-btn">
              <i data-lucide="arrow-up-right"></i>
            </button>
            <button class="library-box-btn party-blocked-btn">
              <i data-lucide="ban"></i>
            </button>
          </div>
        </div>

        <!-- User Playlists Section -->
        <div>
          <h2 class="section-title" style="margin-bottom: 24px;">Playlists</h2>
          ${playlists.length === 0 ? `
            <div style="border: 1px dashed var(--border-color); border-radius: 16px; padding: 40px; text-align: center;">
              <p style="color: var(--text-secondary); margin-bottom: 16px;">You haven't created any playlists yet.</p>
              <button class="login-btn" onclick="triggerCreatePlaylistModal()">Create Playlist</button>
            </div>
          ` : `
            <div class="user-playlists-grid">
              ${playlists.map(p => `
                <div class="music-card" onclick="navigateTo('#/playlist/${p.id}')">
                  <div class="music-card-artwork" style="background: linear-gradient(135deg, #1f1c2c, #928dab); display:flex; align-items:center; justify-content:center;">
                    <i data-lucide="music-4" style="width: 60px; height: 60px; color: rgba(255,255,255,0.4)"></i>
                  </div>
                  <div class="music-card-meta">
                    <span class="music-card-artist">${p.songs.length} SONGS</span>
                    <span class="music-card-title">${p.title}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();
}

/* PLAYLIST, ALBUM, ARTIST DETAIL PAGE RENDERERS */

async function renderPlaylistDetail(playlistId) {
  const container = document.getElementById('main-viewport');
  if (!container) return;

  let title = '';
  let description = '';
  let artworkUrl = '';
  let songs = [];
  let isLocal = playlistId.startsWith('local_');
  let isFavorites = playlistId === 'favorites';
  let isRecent = playlistId === 'recent';
  let isSpotify = playlistId.startsWith('spotify_');

  if (isFavorites) {
    title = 'Favorites';
    description = 'Your curated favorite tracks';
    artworkUrl = ''; 
    songs = window.player.liked;
  } else if (isRecent) {
    title = 'Recent Plays';
    description = 'Tracks you have listened to recently';
    artworkUrl = '';
    songs = JSON.parse(localStorage.getItem('recent_plays')) || [];
  } else if (isLocal) {
    const playlists = getLocalPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) {
      container.innerHTML = `<h2>Playlist not found</h2>`;
      return;
    }
    title = pl.title;
    description = pl.description || 'Custom playlist created by you';
    artworkUrl = '';
    songs = pl.songs;
  } else {
    // Online API Playlist
    try {
      const pl = await window.musicStreamingApi.getPlaylist(playlistId);
      title = pl.title;
      description = pl.description || 'API Playlist';
      artworkUrl = pl.image;
      songs = pl.songs || [];
    } catch (err) {
      console.error(err);
      container.innerHTML = `<h2>Error loading playlist</h2>`;
      return;
    }
  }

  const hasSongs = songs.length > 0;

  container.innerHTML = `
    <div class="page animate-fade-up">
      <div class="detail-header">
        ${artworkUrl ? `
          <div class="detail-artwork">
            <img src="${artworkUrl}" alt="${title}" />
          </div>
        ` : `
          <div class="detail-artwork" style="background: ${isFavorites ? 'linear-gradient(135deg, #ff3366, #ff8c00)' : isRecent ? 'linear-gradient(135deg, #00f2fe, #4facfe)' : 'linear-gradient(135deg, #4776e6, #8e54e9)'}; display:flex; align-items:center; justify-content:center;">
            <i data-lucide="${isFavorites ? 'heart' : isRecent ? 'history' : 'music-4'}" style="width: 80px; height: 80px; color: white;" ${isFavorites ? 'fill="currentColor"' : ''}></i>
          </div>
        `}
        <div class="detail-info">
          <span class="detail-type">Playlist</span>
          <h1 class="detail-title">${title}</h1>
          <p class="detail-metadata">${songs.length} songs · ${description}</p>
          <div class="detail-actions">
            ${hasSongs ? `
              <button class="hero-cta" onclick="playDetailQueue('${playlistId}')" style="margin-top:0;">
                <i data-lucide="play" fill="currentColor"></i> Play Playlist
              </button>
            ` : ''}
            ${isLocal ? `
              <button class="share-btn" onclick="deleteUserPlaylist('${playlistId}')" title="Delete Playlist" style="padding: 10px; border: 1px solid var(--border-color);">
                <i data-lucide="trash-2"></i>
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Tracks Table -->
      <div style="margin-top: 32px;">
        ${!hasSongs ? `
          <div style="text-align: center; padding: 60px 0; color: var(--text-secondary);">
            <i data-lucide="list-music" style="width: 48px; height: 48px; margin-bottom: 16px; opacity:0.4;"></i>
            <p>No songs inside this playlist yet.</p>
          </div>
        ` : `
          <table class="tracks-list-table">
            <thead>
              <tr>
                <th class="track-row-num">#</th>
                <th>Title</th>
                <th>Album</th>
                <th class="track-row-duration">Duration</th>
                <th class="track-row-actions"></th>
              </tr>
            </thead>
            <tbody>
              ${songs.map((song, index) => `
                <tr onclick="playSongFromDetailTable('${song.id}', '${playlistId}')">
                  <td class="track-row-num">${index + 1}</td>
                  <td>
                    <div class="track-row-info">
                      <img src="${song.artwork || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop'}" class="track-row-art" />
                      <div class="track-row-title-block">
                        <span class="track-row-title">${song.title}</span>
                        <span class="track-row-artist">${song.artist}</span>
                      </div>
                    </div>
                  </td>
                  <td><span class="track-row-album">${song.album || 'Unknown Album'}</span></td>
                  <td><span class="track-row-duration">${song.duration}</span></td>
                  <td class="track-row-actions" onclick="event.stopPropagation()">
                    ${isLocal ? `
                      <button class="track-row-action-btn" onclick="removeSongFromUserPlaylist('${playlistId}', '${song.id}')" title="Remove from playlist">
                        <i data-lucide="x"></i>
                      </button>
                    ` : `
                      <button class="track-row-action-btn" onclick="showTrackMenu(event, '${song.id}')">
                        <i data-lucide="more-vertical"></i>
                      </button>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    </div>
  `;

  lucide.createIcons();
}

async function renderAlbumDetail(albumId) {
  const container = document.getElementById('main-viewport');
  if (!container) return;

  try {
    const album = await window.musicStreamingApi.getAlbum(albumId);
    const hasSongs = album.songs && album.songs.length > 0;

    container.innerHTML = `
      <div class="page animate-fade-up">
        <div class="detail-header">
          <div class="detail-artwork">
            <img src="${album.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop'}" alt="${album.title}" />
          </div>
          <div class="detail-info">
            <span class="detail-type">Album</span>
            <h1 class="detail-title">${album.title}</h1>
            <p class="detail-metadata">${album.meta} · ${album.songs?.length || 0} songs</p>
            <div class="detail-actions">
              ${hasSongs ? `
                <button class="hero-cta" onclick="playAlbumQueue('${albumId}')" style="margin-top:0;">
                  <i data-lucide="play" fill="currentColor"></i> Play Album
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Tracks Table -->
        <div style="margin-top: 32px;">
          <table class="tracks-list-table">
            <thead>
              <tr>
                <th class="track-row-num">#</th>
                <th>Title</th>
                <th>Album</th>
                <th class="track-row-duration">Duration</th>
                <th class="track-row-actions"></th>
              </tr>
            </thead>
            <tbody>
              ${album.songs.map((song, index) => `
                <tr onclick="playSongFromAlbumTable('${song.id}', '${albumId}')">
                  <td class="track-row-num">${index + 1}</td>
                  <td>
                    <div class="track-row-info">
                      <img src="${song.artwork || album.image}" class="track-row-art" />
                      <div class="track-row-title-block">
                        <span class="track-row-title">${song.title}</span>
                        <span class="track-row-artist">${song.artist}</span>
                      </div>
                    </div>
                  </td>
                  <td><span class="track-row-album">${song.album || album.title}</span></td>
                  <td><span class="track-row-duration">${song.duration}</span></td>
                  <td class="track-row-actions" onclick="event.stopPropagation()">
                    <button class="track-row-action-btn" onclick="showTrackMenu(event, '${song.id}')">
                      <i data-lucide="more-vertical"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    lucide.createIcons();
  } catch (error) {
    console.error(error);
    container.innerHTML = `<h2>Error loading album details</h2>`;
  }
}

async function renderArtistDetail(artistId) {
  const container = document.getElementById('main-viewport');
  if (!container) return;

  try {
    const artist = await window.musicStreamingApi.getArtist(artistId);

    // Store songs for playback — both the queue list and id-lookup cache
    window._currentArtistSongs = artist.songs || [];
    window._songCache = window._songCache || {};
    window._currentArtistSongs.forEach(s => { if (s?.id) window._songCache[s.id] = s; });

    const hasSongs = artist.songs && artist.songs.length > 0;

    // Follow/Like artist check
    let followed = [];
    try {
      followed = JSON.parse(localStorage.getItem('liked_artists')) || [];
    } catch {
      followed = [];
    }
    const isLiked = followed.some(a => String(a.id) === String(artistId));

    container.innerHTML = `
      <div class="page animate-fade-up">
        <div class="detail-header">
          <div class="detail-artwork circle">
            <img src="${artist.image || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop'}" alt="${artist.name}" />
          </div>
          <div class="detail-info">
            <span class="detail-type">Artist</span>
            <h1 class="detail-title">${artist.name}</h1>
            <p class="detail-metadata">${artist.followers} followers</p>
            <div class="detail-actions" style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-top:16px;">
              ${hasSongs ? `
                <button class="hero-cta" onclick="playArtistQueue('${artistId}')" style="margin-top:0; margin-bottom:0;">
                  <i data-lucide="play" fill="currentColor"></i> Play Top Songs
                </button>
              ` : ''}
              <button class="artist-like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLikeArtist('${artistId}', '${artist.name.replace(/'/g, "\\'")}', '${artist.image || ''}')" style="display: inline-flex; align-items: center; gap: 8px; background: ${isLiked ? 'rgba(255, 51, 102, 0.15)' : 'rgba(255, 255, 255, 0.08)'}; border: 1px solid ${isLiked ? 'rgba(255, 51, 102, 0.4)' : 'rgba(255, 255, 255, 0.15)'}; color: ${isLiked ? '#ff3366' : '#fff'}; border-radius: 22px; padding: 12px 24px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s ease;">
                <i data-lucide="heart" fill="${isLiked ? '#ff3366' : 'none'}" style="width: 18px; height: 18px; ${isLiked ? 'color: #ff3366;' : ''}"></i>
                <span>${isLiked ? 'Following' : 'Follow'}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Top Songs -->
        <div style="margin-top: 32px;">
          <h2 class="section-title" style="margin-bottom: 24px;">Top Songs</h2>
          <table class="tracks-list-table">
            <thead>
              <tr>
                <th class="track-row-num">#</th>
                <th>Title</th>
                <th>Album</th>
                <th class="track-row-duration">Duration</th>
                <th class="track-row-actions"></th>
              </tr>
            </thead>
            <tbody>
              ${artist.songs.slice(0, 100).map((song, index) => `
                <tr onclick="playSongFromArtistTable('${song.id}', '${artistId}')">
                  <td class="track-row-num">${index + 1}</td>
                  <td>
                    <div class="track-row-info">
                      <img src="${song.artwork || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop'}" class="track-row-art" />
                      <div class="track-row-title-block">
                        <span class="track-row-title">${song.title}</span>
                        <span class="track-row-artist">${song.artist}</span>
                      </div>
                    </div>
                  </td>
                  <td><span class="track-row-album">${song.album || 'Single'}</span></td>
                  <td><span class="track-row-duration">${song.duration}</span></td>
                  <td class="track-row-actions" onclick="event.stopPropagation()">
                    <button class="track-row-action-btn" onclick="showTrackMenu(event, '${song.id}')">
                      <i data-lucide="more-vertical"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    lucide.createIcons();
  } catch (error) {
    console.error(error);
    container.innerHTML = `<h2>Error loading artist details</h2>`;
  }
}

/* PLAYLIST CRUD HELPERS */

window.triggerCreatePlaylistModal = () => {
  const overlay = document.getElementById('playlist-modal-overlay');
  if (overlay) {
    overlay.classList.add('active');
    document.getElementById('playlist-name-input')?.focus();
  }
};

window.closeCreatePlaylistModal = () => {
  const overlay = document.getElementById('playlist-modal-overlay');
  if (overlay) overlay.classList.remove('active');
  const input = document.getElementById('playlist-name-input');
  if (input) input.value = '';
};

window.createUserPlaylist = () => {
  const input = document.getElementById('playlist-name-input');
  const name = input?.value.trim();
  if (!name) return;

  const playlists = getLocalPlaylists();
  const id = 'local_' + Date.now();
  playlists.push({
    id,
    title: name,
    description: 'Custom playlist created by you',
    songs: []
  });

  localStorage.setItem('user_playlists', JSON.stringify(playlists));
  closeCreatePlaylistModal();
  
  if (window.location.hash === '#/library') {
    renderLibrary();
  }
};

window.deleteUserPlaylist = (playlistId) => {
  if (!confirm('Are you sure you want to delete this playlist?')) return;
  let playlists = getLocalPlaylists();
  playlists = playlists.filter(p => p.id !== playlistId);
  localStorage.setItem('user_playlists', JSON.stringify(playlists));
  window.navigateTo('#/library');
};

window.addSongToUserPlaylist = (playlistId, song) => {
  const playlists = getLocalPlaylists();
  const index = playlists.findIndex(p => p.id === playlistId);
  if (index > -1) {
    const pl = playlists[index];
    if (!pl.songs.some(s => s.id === song.id)) {
      pl.songs.push(song);
      localStorage.setItem('user_playlists', JSON.stringify(playlists));
      alert(`Added "${song.title}" to ${pl.title}`);
    } else {
      alert(`Song is already inside ${pl.title}`);
    }
  }
};

window.removeSongFromUserPlaylist = (playlistId, songId) => {
  const playlists = getLocalPlaylists();
  const index = playlists.findIndex(p => p.id === playlistId);
  if (index > -1) {
    const pl = playlists[index];
    pl.songs = pl.songs.filter(s => s.id !== songId);
    localStorage.setItem('user_playlists', JSON.stringify(playlists));
    renderPlaylistDetail(playlistId);
  }
};

/* PLAYBACK CONTROLLERS FOR DETAIL PAGES */

window.playDetailQueue = async (playlistId) => {
  let songs = [];
  if (playlistId === 'favorites') {
    songs = window.player.liked;
  } else if (playlistId === 'recent') {
    songs = JSON.parse(localStorage.getItem('recent_plays')) || [];
  } else if (playlistId.startsWith('local_')) {
    const playlists = getLocalPlaylists();
    songs = playlists.find(p => p.id === playlistId)?.songs || [];
  } else {
    try {
      const pl = await window.musicStreamingApi.getPlaylist(playlistId);
      songs = pl.songs || [];
    } catch {}
  }

  if (songs.length) {
    window.player.playTrack(songs[0], songs);
  }
};

window.playSongFromDetailTable = async (songId, playlistId) => {
  let songs = [];
  if (playlistId === 'favorites') {
    songs = window.player.liked;
  } else if (playlistId === 'recent') {
    songs = JSON.parse(localStorage.getItem('recent_plays')) || [];
  } else if (playlistId.startsWith('local_')) {
    const playlists = getLocalPlaylists();
    songs = playlists.find(p => p.id === playlistId)?.songs || [];
  } else {
    try {
      const pl = await window.musicStreamingApi.getPlaylist(playlistId);
      songs = pl.songs || [];
    } catch {}
  }

  const track = songs.find(s => s.id === songId);
  if (track) {
    window.player.playTrack(track, songs);
  }
};

window.playAlbumQueue = async (albumId) => {
  try {
    const album = await window.musicStreamingApi.getAlbum(albumId);
    if (album && album.songs && album.songs.length) {
      window.player.playTrack(album.songs[0], album.songs);
    }
  } catch {}
};

window.playSongFromAlbumTable = async (songId, albumId) => {
  try {
    const album = await window.musicStreamingApi.getAlbum(albumId);
    const track = album.songs.find(s => s.id === songId);
    if (track) {
      window.player.playTrack(track, album.songs);
    }
  } catch {}
};

window.playArtistQueue = async (artistId) => {
  try {
    const artist = await window.musicStreamingApi.getArtist(artistId);
    if (artist && artist.songs && artist.songs.length) {
      window.player.playTrack(artist.songs[0], artist.songs);
    }
  } catch {}
};

window.playSongFromArtistTable = async (songId, artistId) => {
  try {
    const artist = await window.musicStreamingApi.getArtist(artistId);
    const track = artist.songs.find(s => s.id === songId);
    if (track) {
      window.player.playTrack(track, artist.songs);
    }
  } catch {}
};

// Listen to favorites changes to update favorites detail page in real-time
window.player.on('like-change', () => {
  if (window.location.hash === '#/playlist/favorites') {
    renderPlaylistDetail('favorites');
  }
});

// Bind Modal creation events
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('playlist-modal-overlay');
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeCreatePlaylistModal();
  });
});

window.renderLibrary = renderLibrary;
window.renderPlaylistDetail = renderPlaylistDetail;
window.renderAlbumDetail = renderAlbumDetail;
window.renderArtistDetail = renderArtistDetail;
window.getLocalPlaylists = getLocalPlaylists;

// ─── Artist Page Playback (called from artist detail HTML) ────────────────────

// Store current artist song list for queue
window._currentArtistSongs = [];

window.playSongFromArtistTable = async (songId, artistId) => {
  try {
    // Check song cache first (fastest path)
    let track = window._songCache?.[songId];

    // If not in cache, fetch fresh
    if (!track || !track.audioUrl) {
      track = await window.musicStreamingApi.getSongById(songId);
    }
    if (!track) { console.warn('playSongFromArtistTable: track not found', songId); return; }

    // Use the artist's song list as queue if available
    const queue = window._currentArtistSongs?.length ? window._currentArtistSongs : [track];
    window.player.playTrack(track, queue);
  } catch (err) {
    console.error('playSongFromArtistTable error:', err);
  }
};

window.playArtistQueue = async (artistId) => {
  try {
    // Use already-loaded artist songs from cache
    const queue = window._currentArtistSongs;
    if (queue && queue.length > 0) {
      window.player.playTrack(queue[0], queue);
    } else {
      // Fetch fresh if needed
      const artist = await window.musicStreamingApi.getArtist(artistId);
      if (artist?.songs?.length) {
        window._currentArtistSongs = artist.songs;
        artist.songs.forEach(s => { if (s?.id) (window._songCache = window._songCache || {})[s.id] = s; });
        window.player.playTrack(artist.songs[0], artist.songs);
      }
    }
  } catch (err) {
    console.error('playArtistQueue error:', err);
  }
};

window.toggleLikeArtist = (artistId, artistName, artistImage) => {
  let liked = [];
  try {
    liked = JSON.parse(localStorage.getItem('liked_artists')) || [];
  } catch {
    liked = [];
  }
  
  const index = liked.findIndex(a => String(a.id) === String(artistId));
  if (index > -1) {
    liked.splice(index, 1);
    if (window.showGlowingToast) {
      window.showGlowingToast(`Stopped following ${artistName}`);
    } else {
      alert(`Stopped following ${artistName}`);
    }
  } else {
    const realImg = window.getArtistRealImage ? window.getArtistRealImage(artistName, artistImage) : artistImage;
    liked.push({ id: artistId, name: artistName, image: realImg });
    if (window.showGlowingToast) {
      window.showGlowingToast(`Following ${artistName} 💖`);
    } else {
      alert(`Following ${artistName} 💖`);
    }
  }
  
  localStorage.setItem('liked_artists', JSON.stringify(liked));
  
  // Re-render the artist page to update Follow/Following button
  if (window.location.hash.startsWith('#/artist/')) {
    const curId = decodeURIComponent(window.location.hash.split('/').pop());
    if (curId === artistId || curId === artistName) {
      renderArtistDetail(artistId);
    }
  }
};


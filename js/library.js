/* Library Page and Playlist Details Renderer */

function getLocalPlaylists() {
  try {
    return JSON.parse(localStorage.getItem('user_playlists')) || [];
  } catch {
    return [];
  }
}

function renderLibrary() {
  const container = document.getElementById('main-viewport');
  if (!container) return;

  const playlists = getLocalPlaylists();



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

          <!-- Offline / Downloads Placeholder -->
          <div class="library-box" style="cursor: default;">
            <div class="library-box-left">
              <span class="library-box-title">Downloads</span>
              <span class="library-box-desc">Offline music</span>
            </div>
            <button class="library-box-btn" style="background-color: #252525; color: #7f8797; cursor: default;">
              <i data-lucide="download"></i>
            </button>
          </div>

          <!-- Party Room Card -->
          <div class="library-box" onclick="navigateTo('#/socials')">
            <div class="library-box-left">
              <span class="library-box-title">Party Room</span>
              <span class="library-box-desc">Host a synced listening session with friends</span>
            </div>
            <button class="library-box-btn">
              <i data-lucide="arrow-up-right"></i>
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
    const hasSongs = artist.songs && artist.songs.length > 0;

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
            <div class="detail-actions">
              ${hasSongs ? `
                <button class="hero-cta" onclick="playArtistQueue('${artistId}')" style="margin-top:0;">
                  <i data-lucide="play" fill="currentColor"></i> Play Top Songs
                </button>
              ` : ''}
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

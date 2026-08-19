/* Profile Page Renderer */

async function renderProfile() {
  const container = document.getElementById('main-viewport');
  if (!container) return;

  // Retrieve user playlists and recently played counts
  let playlistsCount = 0;
  try {
    playlistsCount = (JSON.parse(localStorage.getItem('user_playlists')) || []).length;
  } catch {}

  let recentCount = 0;
  let recentSongs = [];
  try {
    recentSongs = JSON.parse(localStorage.getItem('recent_plays')) || [];
    recentCount = recentSongs.length;
  } catch {}

  const minutesListened = recentCount * 3 + 15;

  // Dynamic Favorite Artists calculation from Liked songs & Recent History
  const likedSongs = window.player?.liked || [];
  const artistCounts = {};
  const artistArtworks = {};

  [...likedSongs, ...recentSongs].forEach(track => {
    if (!track || !track.artist) return;
    const primaryArtist = track.artist.split(/[,&]/)[0].trim();
    if (!primaryArtist) return;

    artistCounts[primaryArtist] = (artistCounts[primaryArtist] || 0) + 1;
    if (!artistArtworks[primaryArtist] && (track.artwork || track.image)) {
      artistArtworks[primaryArtist] = track.artwork || track.image;
    }
  });

  let topArtists = Object.keys(artistCounts)
    .sort((a, b) => artistCounts[b] - artistCounts[a])
    .map(name => ({
      name: name,
      count: artistCounts[name],
      artwork: window.getArtistRealImage(name, artistArtworks[name])
    }));

  // Load explicitly followed/liked artists and merge them
  let followedArtists = [];
  try {
    followedArtists = JSON.parse(localStorage.getItem('liked_artists')) || [];
  } catch {
    followedArtists = [];
  }

  followedArtists.forEach(fa => {
    const exists = topArtists.find(a => a.name.toLowerCase() === fa.name.toLowerCase());
    if (!exists) {
      topArtists.unshift({
        name: fa.name,
        count: 1,
        artwork: window.getArtistRealImage(fa.name, fa.image)
      });
    } else {
      // Ensure followed artists use their real image if cached/mapped
      exists.artwork = window.getArtistRealImage(fa.name, fa.image || exists.artwork);
    }
  });

  // Resolve real images for top 5 artists from Saavn API dynamically
  const top5 = topArtists.slice(0, 5);
  await Promise.all(top5.map(async (artist) => {
    try {
      let realImg = window.getArtistRealImage(artist.name, null);
      if (!realImg || realImg.includes('unsplash.com')) {
        const searchResults = await window.musicStreamingApi.searchArtists(artist.name, 0, 1);
        if (searchResults && searchResults.length && searchResults[0].image) {
          realImg = searchResults[0].image;
          // Cache it for detail view loading
          window._artistCache = window._artistCache || {};
          window._artistCache[searchResults[0].id] = searchResults[0];
          window._artistCache[artist.name.toLowerCase()] = searchResults[0];
        }
      }
      if (realImg) {
        artist.artwork = realImg;
      }
    } catch (e) {
      console.error("Error resolving profile artist image:", e);
    }
  }));

  if (topArtists.length === 0) {
    topArtists = [
      { name: 'Arijit Singh', count: 12, artwork: 'https://c.saavncdn.com/artist/Arijit_Singh_002_20230323062147_500x500.jpg' },
      { name: 'Pritam', count: 8, artwork: 'https://c.saavncdn.com/artist/Pritam_003_20230323062147_500x500.jpg' },
      { name: 'AR Rahman', count: 5, artwork: 'https://c.saavncdn.com/artist/A_R_Rahman_002_20230323062147_500x500.jpg' }
    ];
  }

  container.innerHTML = `
    <div class="page animate-fade-up">
      <!-- Profile Header -->
      <div class="profile-hero">
        <div class="profile-avatar">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop" alt="User Avatar" />
        </div>
        <div>
          <span style="font-size:12px; color:var(--text-secondary); font-weight:700; text-transform:uppercase; letter-spacing:1px;">Listener Profile</span>
          <h1 class="profile-username">AYU Listener</h1>
          <p style="color:var(--text-secondary); font-size:14px; margin-top:8px;">Standard Free Account • Active Member Since Aug 2026</p>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="profile-stats-grid">
        <div class="profile-stat-card">
          <div class="profile-stat-val" style="color: #38ef7d;">${recentCount + likedSongs.length}</div>
          <div class="profile-stat-lbl">Songs Liked & Played</div>
        </div>
        <div class="profile-stat-card">
          <div class="profile-stat-val" style="color: #c09bf8;">${playlistsCount}</div>
          <div class="profile-stat-lbl">Playlists Created</div>
        </div>
        <div class="profile-stat-card">
          <div class="profile-stat-val" style="color: #00c6ff;">${minutesListened + 120}</div>
          <div class="profile-stat-lbl">Minutes Listened</div>
        </div>
      </div>

      <!-- Grid of Favorite Artists and Recents -->
      <div style="display:grid; grid-template-columns: 1.2fr 1.8fr; gap:48px;">
        <!-- Favorite Artists -->
        <div>
          <h2 class="section-title" style="margin-bottom:24px; font-size:20px;">Favorite Artists</h2>
          
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${topArtists.slice(0, 5).map(artist => `
              <div class="favorite-artist-item" onclick="navigateTo('#/artist/${encodeURIComponent(artist.name)}')" style="display:flex; align-items:center; gap:14px; cursor:pointer; padding: 10px 14px; border-radius: 14px; background: rgba(255,255,255,0.03); transition: background 0.2s;">
                <img src="${artist.artwork}" style="width:48px; height:48px; border-radius:50%; object-fit:cover; box-shadow: 0 4px 10px rgba(0,0,0,0.4);" />
                <div>
                  <b style="font-size:14px; color:#fff; display:block;">${artist.name}</b>
                  <p style="font-size:12px; color:var(--text-secondary); margin-top:2px;">${artist.count} liked / played tracks</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Recent History -->
        <div>
          <h2 class="section-title" style="margin-bottom:24px; font-size:20px;">Recently Played</h2>
          ${recentSongs.length === 0 ? `
            <p style="color:var(--text-secondary); font-size:14px;">Your recently played tracks will appear here.</p>
          ` : `
            <div style="display:flex; flex-direction:column; gap:12px;">
              ${recentSongs.slice(0, 5).map(track => `
                <div class="suggestion-item" onclick="playSongFromProfile('${track.id}')" style="padding: 6px 12px;">
                  <div class="suggestion-artwork" style="width:40px; height:40px; margin-right:12px;">
                    <img src="${track.artwork || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop'}" />
                  </div>
                  <div class="suggestion-details">
                    <span class="suggestion-title" style="font-size:13px;">${track.title}</span>
                    <span class="suggestion-artist" style="font-size:10px;">${track.artist}</span>
                  </div>
                  <button class="suggestion-menu-btn" onclick="event.stopPropagation(); showTrackMenu(event, '${track.id}')">
                    <i data-lucide="more-vertical" style="width:16px; height:16px;"></i>
                  </button>
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

window.playSongFromProfile = async (trackId) => {
  try {
    const track = await window.musicStreamingApi.getSongById(trackId);
    if (track) {
      let recent = [];
      try {
        recent = JSON.parse(localStorage.getItem('recent_plays')) || [];
      } catch {}
      window.player.playTrack(track, recent);
    }
  } catch (error) {
    console.error(error);
  }
};

window.renderProfile = renderProfile;

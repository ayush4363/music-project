/* Profile Page Renderer */

function renderProfile() {
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

  // Standard metrics
  const minutesListened = recentCount * 3 + Math.floor(Math.random() * 20); // estimate minutes

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
          <div class="profile-stat-val" style="color: #38ef7d;">${recentCount + 42}</div>
          <div class="profile-stat-lbl">Songs Played</div>
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
          
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=100&auto=format&fit=crop" style="width:48px; height:48px; border-radius:50%; object-fit:cover;" />
              <div>
                <b style="font-size:14px;">Arijit Singh</b>
                <p style="font-size:12px; color:var(--text-secondary);">4,200 plays</p>
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:12px;">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop" style="width:48px; height:48px; border-radius:50%; object-fit:cover;" />
              <div>
                <b style="font-size:14px;">Jubin Nautiyal</b>
                <p style="font-size:12px; color:var(--text-secondary);">1,840 plays</p>
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:12px;">
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop" style="width:48px; height:48px; border-radius:50%; object-fit:cover;" />
              <div>
                <b style="font-size:14px;">Neha Kakkar</b>
                <p style="font-size:12px; color:var(--text-secondary);">950 plays</p>
              </div>
            </div>
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

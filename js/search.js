/* Search Page Renderer */

let currentSearchFilter = 'All';
let searchTimeout = null;

async function renderSearch() {
  const container = document.getElementById('main-viewport');
  if (!container) return;

  // Extract initial query from hash parameter if present
  const hash = window.location.hash;
  let initialQuery = '';
  if (hash.includes('?')) {
    const queryPart = hash.split('?')[1];
    const urlParams = new URLSearchParams(queryPart);
    initialQuery = urlParams.get('q') || '';
  }

  container.innerHTML = `
    <div class="page animate-fade-up">
      <div class="search-header-container">
        <h1 class="section-title" style="font-size: 32px; letter-spacing: -1px;">Recommended For You Today</h1>
        
        <div class="search-input-wrapper">
          <i data-lucide="search"></i>
          <input type="text" id="search-input" class="search-bar-input" placeholder="Search" value="${initialQuery}" autocomplete="off" />
        </div>

        <div class="search-filter-pills">
          <button class="pill-btn ${currentSearchFilter === 'All' ? 'active' : ''}" onclick="changeSearchFilter('All')">All</button>
          <button class="pill-btn ${currentSearchFilter === 'Songs' ? 'active' : ''}" onclick="changeSearchFilter('Songs')">Songs</button>
          <button class="pill-btn ${currentSearchFilter === 'Albums' ? 'active' : ''}" onclick="changeSearchFilter('Albums')">Albums</button>
          <button class="pill-btn ${currentSearchFilter === 'Playlists' ? 'active' : ''}" onclick="changeSearchFilter('Playlists')">Playlists</button>
          <button class="pill-btn ${currentSearchFilter === 'Artists' ? 'active' : ''}" onclick="changeSearchFilter('Artists')">Artists</button>
        </div>
      </div>

      <!-- Quick Search Categories Cards -->
      <div id="quick-search-section">
        <h2 class="section-title" style="margin-bottom: 24px;">Quick Search</h2>
        <div class="quick-search-grid">
          <div class="quick-card pink" onclick="quickSearch('Trending Songs')">
            <span class="quick-card-tag">Playlists</span>
            <div class="quick-card-title">Trending Songs</div>
            <span class="quick-card-query">party</span>
          </div>
          <div class="quick-card teal" onclick="quickSearch('Lofi Playlists')">
            <span class="quick-card-tag">Playlists</span>
            <div class="quick-card-title">Lofi Playlists</div>
            <span class="quick-card-query">lofi</span>
          </div>
          <div class="quick-card orange" onclick="quickSearch('Hit Albums')">
            <span class="quick-card-tag">Albums</span>
            <div class="quick-card-title">Hit Albums</div>
            <span class="quick-card-query">bollywood</span>
          </div>
          <div class="quick-card blue" onclick="quickSearch('Top Artists')">
            <span class="quick-card-tag">Artists</span>
            <div class="quick-card-title">Top Artists</div>
            <span class="quick-card-query">shreya</span>
          </div>
        </div>
      </div>

      <!-- Search Results Area -->
      <div id="search-results-area" class="search-results-section" style="display: none;">
        <!-- Will render results dynamically -->
      </div>
    </div>
  `;

  lucide.createIcons();

  // Focus search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.focus();
    // Position cursor at end of input
    const val = searchInput.value;
    searchInput.value = '';
    searchInput.value = val;

    // Listen to changes
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      // Update hash query parameter silently without full reload
      if (query) {
        history.replaceState(null, '', `#/search?q=${encodeURIComponent(query)}`);
      } else {
        history.replaceState(null, '', `#/search`);
      }

      searchTimeout = setTimeout(() => {
        executeSearch(query);
      }, 350);
    });
  }

  // Execute initial search if there was an initialQuery
  if (initialQuery) {
    executeSearch(initialQuery);
  }
}

async function executeSearch(query) {
  const resultsArea = document.getElementById('search-results-area');
  const quickSection = document.getElementById('quick-search-section');
  if (!resultsArea || !quickSection) return;

  if (!query) {
    resultsArea.style.display = 'none';
    quickSection.style.display = 'block';
    return;
  }

  quickSection.style.display = 'none';
  resultsArea.style.display = 'flex';
  
  // Show skeletons
  resultsArea.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <div class="skeleton-shimmer" style="height: 20px; width: 120px; border-radius: 4px;"></div>
      <div class="skeleton-shimmer" style="height: 50px; border-radius: 10px;"></div>
      <div class="skeleton-shimmer" style="height: 50px; border-radius: 10px;"></div>
      <div class="skeleton-shimmer" style="height: 50px; border-radius: 10px;"></div>
    </div>
  `;

  try {
    const data = await window.musicApi.search(query);
    renderSearchResults(data);
  } catch (error) {
    console.error("Search API error:", error);
    resultsArea.innerHTML = `<p style="color:var(--text-secondary);">An error occurred while searching.</p>`;
  }
}

function renderSearchResults(data) {
  const resultsArea = document.getElementById('search-results-area');
  if (!resultsArea) return;

  const { songs, albums, playlists, artists } = data;

  const hasSongs = songs.length > 0;
  const hasAlbums = albums.length > 0;
  const hasPlaylists = playlists.length > 0;
  const hasArtists = artists.length > 0;

  if (!hasSongs && !hasAlbums && !hasPlaylists && !hasArtists) {
    resultsArea.innerHTML = `
      <div style="text-align: center; padding: 40px 0;">
        <i data-lucide="music-4" style="width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
        <h3 style="font-size: 18px; margin-bottom: 8px;">No results found for "${document.getElementById('search-input')?.value || ''}"</h3>
        <p style="color: var(--text-secondary);">Try checking your spelling or search for another term.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  let html = '';

  // Render songs
  if (hasSongs && (currentSearchFilter === 'All' || currentSearchFilter === 'Songs')) {
    html += `
      <div class="section-wrapper">
        <h2 class="section-title" style="margin-bottom: 16px;">Songs</h2>
        <div class="suggestions-grid">
          ${songs.slice(0, 8).map(track => `
            <div class="suggestion-item" onclick="playSearchResultSong('${track.id}')">
              <div class="suggestion-artwork">
                <img src="${track.artwork || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop'}" alt="${track.title}" />
              </div>
              <div class="suggestion-details">
                <div class="suggestion-artist">${track.artist.toUpperCase()}</div>
                <div class="suggestion-title">${track.title}</div>
              </div>
              <button class="suggestion-menu-btn" onclick="event.stopPropagation(); showTrackMenu(event, '${track.id}')">
                <i data-lucide="more-vertical"></i>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Render albums
  if (hasAlbums && (currentSearchFilter === 'All' || currentSearchFilter === 'Albums')) {
    html += `
      <div class="section-wrapper">
        <h2 class="section-title" style="margin-bottom: 16px;">Albums</h2>
        <div class="carousel-row" style="flex-wrap: wrap;">
          ${albums.slice(0, 8).map(album => `
            <div class="music-card" onclick="navigateTo('#/album/${album.id}')">
              <div class="music-card-artwork">
                <img src="${album.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop'}" alt="${album.title}" />
              </div>
              <div class="music-card-meta">
                <span class="music-card-artist">${album.meta.toUpperCase()}</span>
                <span class="music-card-title">${album.title}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Render playlists
  if (hasPlaylists && (currentSearchFilter === 'All' || currentSearchFilter === 'Playlists')) {
    html += `
      <div class="section-wrapper">
        <h2 class="section-title" style="margin-bottom: 16px;">Playlists</h2>
        <div class="carousel-row" style="flex-wrap: wrap;">
          ${playlists.slice(0, 8).map(playlist => `
            <div class="music-card" onclick="navigateTo('#/playlist/${playlist.id}')">
              <div class="music-card-artwork">
                <img src="${playlist.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop'}" alt="${playlist.title}" />
              </div>
              <div class="music-card-meta">
                <span class="music-card-artist">${playlist.meta.toUpperCase()}</span>
                <span class="music-card-title">${playlist.title}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Render artists
  if (hasArtists && (currentSearchFilter === 'All' || currentSearchFilter === 'Artists')) {
    html += `
      <div class="section-wrapper">
        <h2 class="section-title" style="margin-bottom: 16px;">Artists</h2>
        <div class="carousel-row" style="flex-wrap: wrap;">
          ${artists.slice(0, 8).map(artist => `
            <div class="artist-card" onclick="navigateTo('#/artist/${artist.id}')">
              <div class="artist-card-artwork">
                <img src="${artist.image || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop'}" alt="${artist.name}" />
              </div>
              <span class="artist-card-name">${artist.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  resultsArea.innerHTML = html;
  lucide.createIcons();
}

window.changeSearchFilter = (filter) => {
  currentSearchFilter = filter;
  
  // Re-render pills
  const pills = document.querySelectorAll('.search-filter-pills .pill-btn');
  pills.forEach(pill => {
    if (pill.innerText.trim() === filter) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });

  const searchVal = document.getElementById('search-input')?.value.trim();
  if (searchVal) {
    executeSearch(searchVal);
  }
};

window.quickSearch = (val) => {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = val;
    executeSearch(val);
    history.replaceState(null, '', `#/search?q=${encodeURIComponent(val)}`);
  }
};

window.playSearchResultSong = async (trackId) => {
  try {
    const track = await window.musicStreamingApi.getSongById(trackId);
    if (track) {
      // Find suggestion songs in results to set queue
      const searchVal = document.getElementById('search-input')?.value.trim();
      let queue = [track];
      if (searchVal) {
        const results = await window.musicApi.search(searchVal);
        if (results.songs && results.songs.length) queue = results.songs;
      }
      window.player.playTrack(track, queue);
    }
  } catch (error) {
    console.error("Error playing search result song:", error);
  }
};

// Global Cmd+K / Ctrl+K listener
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (window.location.hash !== '#/search') {
      window.navigateTo('#/search');
    } else {
      document.getElementById('search-input')?.focus();
    }
  }
});

window.renderSearch = renderSearch;

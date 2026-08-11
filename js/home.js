/* Home Page Renderer */

let selectedLanguage = localStorage.getItem('selected_language') || 'English';

async function renderHome() {
  const container = document.getElementById('main-viewport');
  if (!container) return;

  // Render language selections, hero and structure
  container.innerHTML = `
    <div class="page animate-fade-up">
      <div class="home-suggestions-bar">
        <div class="suggestions-title">Home Screen Suggestions</div>
        <div class="language-pills">
          <button class="pill-btn ${selectedLanguage === 'English' ? 'active' : ''}" onclick="changeLanguage('English')">English</button>
          <button class="pill-btn ${selectedLanguage === 'Hindi' ? 'active' : ''}" onclick="changeLanguage('Hindi')">Hindi</button>
        </div>
      </div>

      <!-- Hero Section -->
      <div id="home-hero" class="hero-section">
        <!-- Will be filled dynamically -->
      </div>

      <!-- Recent Plays Row -->
      <div id="section-recent" class="section-wrapper" style="display: none;">
        <div class="section-header">
          <h2 class="section-title">Recent Plays</h2>
          <button class="show-more-btn" onclick="showMoreRecent()">Show more <i data-lucide="chevron-right"></i></button>
        </div>
        <div class="carousel-container">
          <button class="carousel-btn left" onclick="scrollCarousel('recent-row', -1)"><i data-lucide="chevron-left"></i></button>
          <div id="recent-row" class="carousel-row"></div>
          <button class="carousel-btn right" onclick="scrollCarousel('recent-row', 1)"><i data-lucide="chevron-right"></i></button>
        </div>
      </div>

      <!-- Suggested for You (2 Columns Grid) -->
      <div class="section-wrapper">
        <div class="section-header">
          <h2 class="section-title">Suggested for You</h2>
          <button class="show-more-btn" onclick="showMoreSuggested()">Show more <i data-lucide="chevron-right"></i></button>
        </div>
        <div class="suggestions-grid" id="suggested-grid">
          <!-- Will be filled dynamically -->
        </div>
      </div>

      <!-- Featured Playlist Row -->
      <div class="section-wrapper">
        <div class="section-header">
          <h2 class="section-title">Featured Playlists</h2>
          <button class="show-more-btn" onclick="showMoreFeaturedPlaylists()">Show more <i data-lucide="chevron-right"></i></button>
        </div>
        <div class="carousel-container">
          <button class="carousel-btn left" onclick="scrollCarousel('featured-row', -1)"><i data-lucide="chevron-left"></i></button>
          <div id="featured-row" class="carousel-row"></div>
          <button class="carousel-btn right" onclick="scrollCarousel('featured-row', 1)"><i data-lucide="chevron-right"></i></button>
        </div>
      </div>

      <!-- Hindi Top Hits Row -->
      <div id="section-hindi-hits" class="section-wrapper" style="display: ${selectedLanguage === 'English' ? 'none' : 'block'};">
        <div class="section-header">
          <h2 class="section-title">Hindi Top Hits</h2>
          <button class="show-more-btn" onclick="showMoreCollection('Hindi Hits')">Show more <i data-lucide="chevron-right"></i></button>
        </div>
        <div class="carousel-container">
          <button class="carousel-btn left" onclick="scrollCarousel('hindi-hits-row', -1)"><i data-lucide="chevron-left"></i></button>
          <div id="hindi-hits-row" class="carousel-row"></div>
          <button class="carousel-btn right" onclick="scrollCarousel('hindi-hits-row', 1)"><i data-lucide="chevron-right"></i></button>
        </div>
      </div>

      <!-- Bollywood Classics Row -->
      <div class="section-wrapper" style="display: ${selectedLanguage === 'English' ? 'none' : 'block'};">
        <div class="section-header">
          <h2 class="section-title">Bollywood Classics</h2>
          <button class="show-more-btn" onclick="showMoreCollection('Bollywood Classics')">Show more <i data-lucide="chevron-right"></i></button>
        </div>
        <div class="carousel-container">
          <button class="carousel-btn left" onclick="scrollCarousel('classics-row', -1)"><i data-lucide="chevron-left"></i></button>
          <div id="classics-row" class="carousel-row"></div>
          <button class="carousel-btn right" onclick="scrollCarousel('classics-row', 1)"><i data-lucide="chevron-right"></i></button>
        </div>
      </div>

      <!-- English Hits Row -->
      <div class="section-wrapper" style="display: ${selectedLanguage === 'Hindi' ? 'none' : 'block'};">
        <div class="section-header">
          <h2 class="section-title">English Hits</h2>
          <button class="show-more-btn" onclick="showMoreCollection('English Hits')">Show more <i data-lucide="chevron-right"></i></button>
        </div>
        <div class="carousel-container">
          <button class="carousel-btn left" onclick="scrollCarousel('english-row', -1)"><i data-lucide="chevron-left"></i></button>
          <div id="english-row" class="carousel-row"></div>
          <button class="carousel-btn right" onclick="scrollCarousel('english-row', 1)"><i data-lucide="chevron-right"></i></button>
        </div>
      </div>

      <!-- Featured Artists -->
      <div class="section-wrapper">
        <div class="section-header">
          <h2 class="section-title">Top Artists</h2>
          <button class="show-more-btn" onclick="showMoreArtists()">Show more <i data-lucide="chevron-right"></i></button>
        </div>
        <div class="carousel-container">
          <button class="carousel-btn left" onclick="scrollCarousel('artists-row', -1)"><i data-lucide="chevron-left"></i></button>
          <div id="artists-row" class="carousel-row"></div>
          <button class="carousel-btn right" onclick="scrollCarousel('artists-row', 1)"><i data-lucide="chevron-right"></i></button>
        </div>
      </div>

      <!-- Trending Songs Row -->
      <div class="section-wrapper" id="section-trending-songs">
        <div class="section-header">
          <h2 class="section-title">Trending Songs</h2>
          <button class="show-more-btn" onclick="showMoreCollection('Trending Songs')">Show more <i data-lucide="chevron-right"></i></button>
        </div>
        <div class="carousel-container">
          <button class="carousel-btn left" onclick="scrollCarousel('trending-songs-row', -1)"><i data-lucide="chevron-left"></i></button>
          <div id="trending-songs-row" class="carousel-row"></div>
          <button class="carousel-btn right" onclick="scrollCarousel('trending-songs-row', 1)"><i data-lucide="chevron-right"></i></button>
        </div>
      </div>

      <!-- Arijit Singh Songs Row -->
      <div class="section-wrapper" id="section-arijit-songs" style="display: ${selectedLanguage === 'English' ? 'none' : 'block'};">
        <div class="section-header">
          <h2 class="section-title">Arijit Singh Songs</h2>
          <button class="show-more-btn" onclick="showMoreCollection('Arijit Singh')">Show more <i data-lucide="chevron-right"></i></button>
        </div>
        <div class="carousel-container">
          <button class="carousel-btn left" onclick="scrollCarousel('arijit-songs-row', -1)"><i data-lucide="chevron-left"></i></button>
          <div id="arijit-songs-row" class="carousel-row"></div>
          <button class="carousel-btn right" onclick="scrollCarousel('arijit-songs-row', 1)"><i data-lucide="chevron-right"></i></button>
        </div>
      </div>

      <!-- Shreya Ghoshal Songs Row -->
      <div class="section-wrapper" id="section-shreya-songs" style="display: ${selectedLanguage === 'English' ? 'none' : 'block'};">
        <div class="section-header">
          <h2 class="section-title">Shreya Ghoshal Songs</h2>
          <button class="show-more-btn" onclick="showMoreCollection('Shreya Ghoshal')">Show more <i data-lucide="chevron-right"></i></button>
        </div>
        <div class="carousel-container">
          <button class="carousel-btn left" onclick="scrollCarousel('shreya-songs-row', -1)"><i data-lucide="chevron-left"></i></button>
          <div id="shreya-songs-row" class="carousel-row"></div>
          <button class="carousel-btn right" onclick="scrollCarousel('shreya-songs-row', 1)"><i data-lucide="chevron-right"></i></button>
        </div>
      </div>

      <!-- Jubin Nautiyal Songs Row -->
      <div class="section-wrapper" id="section-jubin-songs" style="display: ${selectedLanguage === 'English' ? 'none' : 'block'};">
        <div class="section-header">
          <h2 class="section-title">Jubin Nautiyal Songs</h2>
          <button class="show-more-btn" onclick="showMoreCollection('Jubin Nautiyal')">Show more <i data-lucide="chevron-right"></i></button>
        </div>
        <div class="carousel-container">
          <button class="carousel-btn left" onclick="scrollCarousel('jubin-songs-row', -1)"><i data-lucide="chevron-left"></i></button>
          <div id="jubin-songs-row" class="carousel-row"></div>
          <button class="carousel-btn right" onclick="scrollCarousel('jubin-songs-row', 1)"><i data-lucide="chevron-right"></i></button>
      </div>

      <!-- Footer Brand Watermark -->
      <div class="home-footer">
        AYU.music
      </div>
    </div>
  `;

  lucide.createIcons();

  // Load and fill content
  try {
    const data = await window.musicApi.getHome();
    
    // 1. Render Hero Section
    renderHero(data.hero);

    // 2. Render Recent Plays (from LocalStorage)
    let recent = [];
    try {
      recent = JSON.parse(localStorage.getItem('recent_plays')) || [];
    } catch {
      recent = [];
    }
    window.homeRecent = recent;
    renderRecentPlays();

    // 3. Render Suggested for You
    let recommended = [];
    try {
      const query = selectedLanguage === 'Hindi' ? 'Hindi hits' : 'Pop hits';
      recommended = await window.musicStreamingApi.searchSongs(query, 0, 24);
    } catch {
      recommended = data.recommended;
    }
    if (!recommended || !recommended.length) recommended = data.recommended;
    window.homeRecommended = recommended;
    renderSuggested(recommended);

    // 4. Render Playlists (Featured Playlists)
    let playlists = data.playlists;
    window.homePlaylists = playlists;
    renderPlaylists(playlists);

    // 5. Render Hindi Top Hits (using topHits or custom)
    const hindiHits = data.topHits.filter(t => t.language === 'Hindi');
    window.homeHindiHits = hindiHits.length ? hindiHits : data.topHits.slice(0, 12);
    renderHindiHits(window.homeHindiHits);

    // 6. Render Bollywood Classics (custom API fetch)
    loadBollywoodClassics();

    // 7. Render English Hits
    const englishHits = data.topHits.filter(t => t.language === 'English');
    window.homeEnglishHits = englishHits.length ? englishHits : data.topHits.slice(6, 18);
    renderEnglishHits(window.homeEnglishHits);

    // 8. Fetch and Render Real Popular Artists based on selected language
    const isHindi = selectedLanguage === 'Hindi';
    const topNames = isHindi 
      ? ['Arijit Singh', 'Shreya Ghoshal', 'Jubin Nautiyal', 'Neha Kakkar', 'Diljit Dosanjh', 'Atif Aslam', 'Armaan Malik', 'Badshah']
      : ['Taylor Swift', 'Ed Sheeran', 'Billie Eilish', 'Justin Bieber', 'Drake', 'Bruno Mars', 'The Weeknd', 'Dua Lipa'];

    const artistsPromises = topNames.map(async name => {
      try {
        const results = await window.musicStreamingApi.searchArtists(name, 0, 1);
        return results[0] || null;
      } catch {
        return null;
      }
    });
    const realArtists = (await Promise.all(artistsPromises)).filter(Boolean);
    window.homeArtists = realArtists;
    renderArtists(realArtists);

    // 9. Load Trending and Custom Artist carousels
    loadTrendingSongs();
    loadArijitSongs();
    loadShreyaSongs();
    loadJubinSongs();



    // Update icons inside dynamic portions
    lucide.createIcons();
  } catch (error) {
    console.error("Error loading home page content:", error);
  }
}

function renderHero(apiHero) {
  const heroEl = document.getElementById('home-hero');
  if (!heroEl) return;

  const isHindi = selectedLanguage === 'Hindi';
  const labelText = isHindi ? 'TRENDING PLAYLIST' : 'TRENDING PLAYLIST';
  const titleText = isHindi ? 'Hindi Hits' : 'English Hits';
  const descText = isHindi ? 'THE BIGGEST HINDI HITS ALL IN ONE PLAYLIST' : 'KICK BACK TO THE BEST NEW AND RECENT COVER';
  
  // Decide image
  // Check if we can locate hero images locally.
  const imageUrl = isHindi ? 'hero-hindi.png' : 'hero_english.png';

  heroEl.innerHTML = `
    <div class="hero-content">
      <span class="hero-label">${labelText}</span>
      <h1 class="hero-title">${titleText}</h1>
      <p class="hero-desc">${descText}</p>
      <button class="hero-cta" onclick="playCollection('${titleText}')">
        <i data-lucide="play" fill="currentColor"></i> EXPLORE PLAYLIST
      </button>
    </div>
    <div class="hero-image-wrapper">
      <img class="hero-image" src="${imageUrl}" onerror="this.src='${apiHero.image}'" alt="Hero Art" />
      <div class="hero-gradient-overlay"></div>
    </div>
  `;
}

function renderRecentPlays() {
  let recent = window.homeRecent || [];
  if (!recent.length) {
    try {
      recent = JSON.parse(localStorage.getItem('recent_plays')) || [];
    } catch {
      recent = [];
    }
  }

  const row = document.getElementById('recent-row');
  const section = document.getElementById('section-recent');
  if (!row || !section) return;

  if (recent.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  row.innerHTML = recent.map(track => createSongCardHTML(track, recent)).join('');
}

function renderSuggested(tracks) {
  const grid = document.getElementById('suggested-grid');
  if (!grid) return;

  // Limit to 24 items
  const items = tracks.slice(0, 24);
  
  grid.innerHTML = items.map((track, index) => `
    <div class="suggestion-item" onclick="playSongFromTracklist('${track.id}', 'suggested')">
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
  `).join('');
}

function renderPlaylists(playlists) {
  const row = document.getElementById('featured-row');
  if (!row) return;

  row.innerHTML = playlists.map(playlist => `
    <div class="music-card" onclick="navigateTo('#/playlist/${playlist.id}')">
      <div class="music-card-artwork">
        <img src="${playlist.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop'}" alt="${playlist.title}" />
        <div class="card-play-overlay">
          <button class="hover-play-btn" onclick="event.stopPropagation(); playPlaylistDirect('${playlist.id}')">
            <i data-lucide="play"></i>
          </button>
        </div>
      </div>
      <div class="music-card-meta">
        <span class="music-card-artist">${playlist.meta.toUpperCase()}</span>
        <span class="music-card-title">${playlist.title}</span>
      </div>
    </div>
  `).join('');
}

function renderHindiHits(tracks) {
  const row = document.getElementById('hindi-hits-row');
  if (!row) return;
  row.innerHTML = tracks.map(track => createSongCardHTML(track, tracks)).join('');
}

async function loadBollywoodClassics() {
  const row = document.getElementById('classics-row');
  if (!row) return;

  try {
    const tracks = await window.musicStreamingApi.searchSongs("Bollywood Classics", 0, 12);
    if (tracks.length) {
      window.homeClassics = tracks;
      row.innerHTML = tracks.map(track => createSongCardHTML(track, tracks)).join('');
      lucide.createIcons();
    }
  } catch (err) {
    console.error("Error loading classics:", err);
  }
}

async function loadTrendingSongs() {
  const row = document.getElementById('trending-songs-row');
  if (!row) return;

  try {
    const tracks = await window.musicStreamingApi.searchSongs("trending", 0, 12);
    if (tracks.length) {
      row.innerHTML = tracks.map(track => createSongCardHTML(track, tracks)).join('');
      lucide.createIcons();
    }
  } catch (err) {
    console.error("Error loading trending songs:", err);
  }
}

async function loadArijitSongs() {
  const row = document.getElementById('arijit-songs-row');
  if (!row) return;

  try {
    const tracks = await window.musicStreamingApi.searchSongs("Arijit Singh", 0, 12);
    if (tracks.length) {
      row.innerHTML = tracks.map(track => createSongCardHTML(track, tracks)).join('');
      lucide.createIcons();
    }
  } catch (err) {
    console.error("Error loading Arijit songs:", err);
  }
}

async function loadShreyaSongs() {
  const row = document.getElementById('shreya-songs-row');
  if (!row) return;

  try {
    const tracks = await window.musicStreamingApi.searchSongs("Shreya Ghoshal", 0, 12);
    if (tracks.length) {
      row.innerHTML = tracks.map(track => createSongCardHTML(track, tracks)).join('');
      lucide.createIcons();
    }
  } catch (err) {
    console.error("Error loading Shreya songs:", err);
  }
}

async function loadJubinSongs() {
  const row = document.getElementById('jubin-songs-row');
  if (!row) return;

  try {
    const tracks = await window.musicStreamingApi.searchSongs("Jubin Nautiyal", 0, 12);
    if (tracks.length) {
      row.innerHTML = tracks.map(track => createSongCardHTML(track, tracks)).join('');
      lucide.createIcons();
    }
  } catch (err) {
    console.error("Error loading Jubin songs:", err);
  }
}

function renderEnglishHits(tracks) {
  const row = document.getElementById('english-row');
  if (!row) return;
  row.innerHTML = tracks.map(track => createSongCardHTML(track, tracks)).join('');
}

function renderArtists(artists) {
  const row = document.getElementById('artists-row');
  if (!row) return;

  row.innerHTML = artists.map(artist => `
    <div class="artist-card" onclick="navigateTo('#/artist/${artist.id}')">
      <div class="artist-card-artwork">
        <img src="${artist.image || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop'}" alt="${artist.name}" />
      </div>
      <span class="artist-card-name">${artist.name}</span>
    </div>
  `).join('');
}

/* HELPER FUNCTIONS */

function createSongCardHTML(track, playlistContext = []) {
  // Serialize playlistContext safely
  const playlistJson = JSON.stringify(playlistContext).replace(/"/g, '&quot;');
  
  return `
    <div class="music-card" onclick="playSongFromCard('${track.id}')">
      <div class="music-card-artwork">
        <img src="${track.artwork || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop'}" alt="${track.title}" />
        <div class="card-play-overlay">
          <button class="hover-play-btn">
            <i data-lucide="play"></i>
          </button>
        </div>
      </div>
      <div class="music-card-meta">
        <span class="music-card-artist">${track.artist.toUpperCase()}</span>
        <span class="music-card-title">${track.title}</span>
        <button class="music-card-menu-btn" onclick="event.stopPropagation(); showTrackMenu(event, '${track.id}')">
          <i data-lucide="more-vertical"></i>
        </button>
      </div>
    </div>
  `;
}

// Global actions
window.changeLanguage = (lang) => {
  selectedLanguage = lang;
  localStorage.setItem('selected_language', lang);
  renderHome();
};

window.scrollCarousel = (rowId, direction) => {
  const row = document.getElementById(rowId);
  if (!row) return;
  const scrollAmount = row.clientWidth * 0.75 * direction;
  row.scrollBy({ left: scrollAmount, behavior: 'smooth' });
};

window.playSongFromCard = async (trackId) => {
  try {
    const track = await window.musicStreamingApi.getSongById(trackId);
    if (track) {
      // Get home suggestions / parent tracks to play as queue
      const homeData = await window.musicApi.getHome();
      const allSongs = [...homeData.recommended, ...homeData.topHits];
      window.player.playTrack(track, allSongs);
    }
  } catch (error) {
    console.error("Error playing song from card:", error);
  }
};

window.playSongFromTracklist = async (trackId, sectionType) => {
  try {
    const track = await window.musicStreamingApi.getSongById(trackId);
    if (track) {
      let queue = [track];
      // Build a queue based on what section was playing
      const homeData = await window.musicApi.getHome();
      if (sectionType === 'suggested') {
        queue = homeData.recommended;
      }
      window.player.playTrack(track, queue);
    }
  } catch (err) {
    console.error(err);
  }
};

window.playPlaylistDirect = async (playlistId) => {
  try {
    const playlist = await window.musicStreamingApi.getPlaylist(playlistId);
    if (playlist && playlist.songs && playlist.songs.length) {
      window.player.playTrack(playlist.songs[0], playlist.songs);
    }
  } catch (error) {
    console.error("Error playing playlist directly:", error);
  }
};

window.playCollection = async (query) => {
  try {
    const tracks = await window.musicStreamingApi.searchSongs(query, 0, 30);
    if (tracks && tracks.length) {
      window.player.playTrack(tracks[0], tracks);
    }
  } catch (error) {
    console.error(error);
  }
};

window.showMoreCollection = async (query) => {
  try {
    // Fire 4 parallel requests to retrieve 200 total tracks (bypassing backend single-page caps)
    const pages = [0, 1, 2, 3];
    const results = await Promise.all(
      pages.map(page => window.musicStreamingApi.searchSongs(query, page, 50))
    );
    const allSongs = [];
    const seenIds = new Set();
    results.flat().forEach(song => {
      if (song && song.id && !seenIds.has(song.id)) {
        seenIds.add(song.id);
        allSongs.push(song);
      }
    });
    if (allSongs.length) {
      window.openShowMoreModal(query, allSongs, 'songs');
    }
  } catch (err) {
    console.error(err);
  }
};

window.showMoreRecent = () => {
  let recent = [];
  try {
    recent = JSON.parse(localStorage.getItem('recent_plays')) || [];
  } catch {
    recent = [];
  }
  window.openShowMoreModal('Recent Plays', recent, 'songs');
};

window.showMoreSuggested = async () => {
  const lang = selectedLanguage || 'Hindi';
  try {
    // Fire 4 parallel requests to retrieve 200 total tracks
    const pages = [0, 1, 2, 3];
    const results = await Promise.all(
      pages.map(page => window.musicStreamingApi.searchSongs(lang, page, 50))
    );
    const allSongs = [];
    const seenIds = new Set();
    results.flat().forEach(song => {
      if (song && song.id && !seenIds.has(song.id)) {
        seenIds.add(song.id);
        allSongs.push(song);
      }
    });
    window.openShowMoreModal('Suggested for You', allSongs, 'songs');
  } catch (err) {
    console.error(err);
  }
};

window.showMoreFeaturedPlaylists = async () => {
  try {
    // Fire 2 parallel requests to fetch 100 total playlists
    const pages = [0, 1];
    const results = await Promise.all(
      pages.map(page => window.musicStreamingApi.searchPlaylists('popular hits', page, 50))
    );
    const allPlaylists = [];
    const seenIds = new Set();
    results.flat().forEach(pl => {
      if (pl && pl.id && !seenIds.has(pl.id)) {
        seenIds.add(pl.id);
        allPlaylists.push(pl);
      }
    });
    window.openShowMoreModal('Featured Playlists', allPlaylists, 'playlists');
  } catch (err) {
    console.error(err);
  }
};

window.showMoreArtists = async () => {
  const isHindi = selectedLanguage === 'Hindi';
  const topNames = isHindi 
    ? [
        'Arijit Singh', 'Shreya Ghoshal', 'Jubin Nautiyal', 'Neha Kakkar', 
        'Diljit Dosanjh', 'Atif Aslam', 'Armaan Malik', 'Badshah', 
        'Lata Mangeshkar', 'Kishore Kumar', 'Alka Yagnik', 'Sonu Nigam', 
        'Sunidhi Chauhan', 'KK', 'Udit Narayan', 'Kumar Sanu', 
        'Asha Bhosle', 'Mohammed Rafi', 'Mukesh', 'Rahat Fateh Ali Khan',
        'Mohit Chauhan', 'Shaan', 'Amit Trivedi', 'Darshan Raval', 
        'Guru Randhawa', 'Yo Yo Honey Singh', 'Mika Singh', 'Neeti Mohan', 
        'Jonita Gandhi', 'Kanika Kapoor'
      ]
    : [
        'Taylor Swift', 'Ed Sheeran', 'Billie Eilish', 'Justin Bieber', 
        'Drake', 'Bruno Mars', 'The Weeknd', 'Ariana Grande', 
        'Selena Gomez', 'Shawn Mendes', 'Camila Cabello', 'Dua Lipa', 
        'Olivia Rodrigo', 'Harry Styles', 'Post Malone', 'Khalid', 
        'Eminem', 'Beyoncé', 'Rihanna', 'Lady Gaga', 
        'Katy Perry', 'Miley Cyrus', 'Adele', 'Sam Smith', 
        'Sia', 'Coldplay', 'Maroon 5', 'Imagine Dragons', 
        'Justin Timberlake', 'Michael Jackson'
      ];

  try {
    // 1. Fetch specific superstars in parallel
    const specificPromises = topNames.map(async name => {
      try {
        const res = await window.musicStreamingApi.searchArtists(name, 0, 1);
        return res[0] || null;
      } catch {
        return null;
      }
    });
    
    // 2. Fetch generic artists in parallel to pad the list to 100+
    const genericQueries = isHindi ? ['Bollywood', 'Hindi'] : ['pop', 'global'];
    const genericPromises = genericQueries.map(q => 
      window.musicStreamingApi.searchArtists(q, 0, 50)
    );
    
    const [specificResults, ...genericResults] = await Promise.all([
      Promise.all(specificPromises),
      ...genericPromises
    ]);
    
    const allArtists = [];
    const seenIds = new Set();
    
    // Add superstars first
    specificResults.filter(Boolean).forEach(art => {
      if (art && art.id && !seenIds.has(art.id)) {
        seenIds.add(art.id);
        allArtists.push(art);
      }
    });
    
    // Add generic artists next
    genericResults.flat().forEach(art => {
      if (art && art.id && !seenIds.has(art.id)) {
        seenIds.add(art.id);
        allArtists.push(art);
      }
    });
    
    window.openShowMoreModal('Top Artists', allArtists, 'artists');
  } catch (err) {
    console.error(err);
  }
};

// Listen to local storage changes to keep Recent Plays updated
window.player.on('recent-change', () => {
  if (window.location.hash === '#/' || window.location.hash === '') {
    renderRecentPlays();
    lucide.createIcons();
  }
});

window.renderHome = renderHome;

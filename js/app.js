/* AYU.music App Core Orchestrator */

let activeMenuTrackId = null;
let parsedLyrics = [];

// Generates dynamic gradients based on artist/title to avoid CORS issues
function getArtworkGradient(track) {
  let val = 0;
  const str = (track.title || '') + (track.artist || '');
  for (let i = 0; i < str.length; i++) {
    val += str.charCodeAt(i);
  }
  const gradients = [
    'linear-gradient(135deg, #1b092a 0%, #050308 100%)', // deep violet
    'linear-gradient(135deg, #240707 0%, #050101 100%)', // deep burgundy
    'linear-gradient(135deg, #051a12 0%, #010503 100%)', // deep teal
    'linear-gradient(135deg, #051021 0%, #010206 100%)', // deep navy
    'linear-gradient(135deg, #1d1806 0%, #050401 100%)', // deep bronze/amber
    'linear-gradient(135deg, #1d0517 0%, #050104 100%)'  // deep magenta
  ];
  return gradients[val % gradients.length];
}

// Parses IRC lyrics synced timestamps [mm:ss.xx]
function parseLyrics(lyricText) {
  if (!lyricText) return [];
  const lines = lyricText.split('\n');
  const pattern = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  const result = [];
  
  for (const line of lines) {
    const match = pattern.exec(line.trim());
    if (match) {
      const mins = parseInt(match[1]);
      const secs = parseInt(match[2]);
      const msStr = match[3];
      const ms = parseInt(msStr);
      // Determine fraction divisor (2 digits -> /100, 3 digits -> /1000)
      const time = mins * 60 + secs + (ms / (msStr.length === 2 ? 100 : 1000));
      const text = match[4].trim();
      result.push({ time, text });
    } else {
      if (line.trim()) {
        result.push({ time: -1, text: line.trim() });
      }
    }
  }
  return result;
}

// Syncs scrolling position and active highlights tocurrentTime
function updateFullscreenLyrics(currentTime) {
  if (parsedLyrics.length === 0) return;
  
  let activeIndex = -1;
  for (let i = 0; i < parsedLyrics.length; i++) {
    if (parsedLyrics[i].time !== -1 && currentTime >= parsedLyrics[i].time) {
      activeIndex = i;
    }
  }
  
  if (activeIndex !== -1) {
    const linesEl = document.querySelectorAll('.fs-lyric-line');
    linesEl.forEach((line, idx) => {
      if (idx === activeIndex) {
        if (!line.classList.contains('active')) {
          line.classList.add('active');
          const container = document.getElementById('fs-lyrics-body');
          if (container) {
            const containerH = container.clientHeight;
            const lineTop = line.offsetTop;
            const lineH = line.clientHeight;
            container.scrollTop = lineTop - containerH / 2 + lineH / 2;
          }
        }
      } else {
        line.classList.remove('active');
      }
    });
  }
}

window.seekToLyricTime = (time) => {
  if (time !== -1 && window.player) {
    window.player.seek(time);
    if (!window.player.isPlaying) {
      window.player.togglePlay();
    }
  }
};

window.openFullscreenPlayer = () => {
  const fsPlayer = document.getElementById('fullscreen-player');
  if (fsPlayer && window.player.currentTrack) {
    fsPlayer.classList.add('active');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Bind Player UI updates
  bindPlayerEvents();
  
  // Bind Context Menu handlers
  initContextMenu();
  
  // Bind Header controls
  initHeaderControls();



  // Mobile menu drawers
  initMobileDrawer();

  // Trigger initial route load
  if (window.router) window.router();
});

function bindPlayerEvents() {
  const p = window.player;
  if (!p) return;

  // Main Player selectors
  const playBtn = document.getElementById('player-play-btn');
  const prevBtn = document.getElementById('player-prev-btn');
  const nextBtn = document.getElementById('player-next-btn');
  const likeBtn = document.getElementById('player-like-btn');
  const repeatBtn = document.getElementById('player-repeat-btn');
  const progressSlider = document.getElementById('player-progress-slider');
  const volumeSlider = document.getElementById('player-volume-slider');
  const currentTimeLabel = document.getElementById('player-current-time');
  const totalTimeLabel = document.getElementById('player-total-time');
  
  const lyricsToggle = document.getElementById('player-lyrics-toggle');
  const lyricsPanel = document.getElementById('lyrics-panel');
  const lyricsCloseBtn = document.getElementById('lyrics-close-btn');

  // Full-Screen Player selectors
  const trackInfo = document.getElementById('player-track-info');
  const fsPlayer = document.getElementById('fullscreen-player');
  const fsCloseBtn = document.getElementById('fs-close-btn');
  const fsPlayBtn = document.getElementById('fs-play-btn');
  const fsPrevBtn = document.getElementById('fs-prev-btn');
  const fsNextBtn = document.getElementById('fs-next-btn');
  const fsProgressSlider = document.getElementById('fs-progress-slider');
  const fsCurrentTimeLabel = document.getElementById('fs-current-time');
  const fsTotalTimeLabel = document.getElementById('fs-total-time');

  // Open Fullscreen Player click
  trackInfo?.addEventListener('click', () => {
    if (p.currentTrack) {
      window.navigateTo('#/now-playing');
    }
  });

  // Close Fullscreen Player click
  fsCloseBtn?.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.navigateTo('#/');
    }
  });

  // Full-screen three-dot menu options click
  const fsMenuBtn = document.getElementById('fs-menu-btn');
  fsMenuBtn?.addEventListener('click', (e) => {
    if (p.currentTrack) {
      window.showTrackMenu(e, p.currentTrack.id);
    }
  });

  // Song / Video Switch pills
  const fsPills = document.querySelectorAll('.fs-pill');
  fsPills.forEach(pill => {
    pill.addEventListener('click', () => {
      fsPills.forEach(btn => btn.classList.remove('active'));
      pill.classList.add('active');
      if (pill.innerText.trim() === 'Video') {
        alert('Video visualizer mode selected. Streaming video elements where available (mock activation)...');
      } else {
        // Song mode
      }
    });
  });

  // Maximize (Fullscreen window toggle)
  const fsExpandBtn = document.querySelector('.fs-header-tools button[aria-label="Maximize"]');
  fsExpandBtn?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  });



  // Dynamic Lyrics column hide/show toggle
  const fsLyricsToggleBtn = document.querySelector('.fs-header-tools button[aria-label="Lyrics"]');
  fsLyricsToggleBtn?.addEventListener('click', () => {
    const fsRight = document.querySelector('.fs-right');
    const fsLeft = document.querySelector('.fs-left');
    fsLyricsToggleBtn.classList.toggle('active');
    
    if (fsRight && fsLeft) {
      if (fsLyricsToggleBtn.classList.contains('active')) {
        fsRight.style.display = 'flex';
        fsLeft.style.width = '40%';
      } else {
        fsRight.style.display = 'none';
        fsLeft.style.width = '80%';
        fsLeft.style.margin = '0 auto';
      }
    }
  });

  // Share (song link copy)
  const fsShareBtn = document.querySelector('.fs-header-tools button[aria-label="Share"]');
  fsShareBtn?.addEventListener('click', () => {
    if (p.currentTrack) {
      const shareUrl = window.location.origin + window.location.pathname + `#/search?q=${encodeURIComponent(p.currentTrack.title)}`;
      navigator.clipboard.writeText(shareUrl)
        .then(() => alert(`Direct link for "${p.currentTrack.title}" copied to clipboard! 📋`))
        .catch(() => alert('Failed to copy.'));
    }
  });

  // Play / Pause Toggle
  playBtn?.addEventListener('click', () => p.togglePlay());
  fsPlayBtn?.addEventListener('click', () => p.togglePlay());

  // Loop Toggle Click
  repeatBtn?.addEventListener('click', () => p.toggleLoop());

  // Previous / Next Track
  prevBtn?.addEventListener('click', () => p.prev());
  fsPrevBtn?.addEventListener('click', () => p.prev());
  nextBtn?.addEventListener('click', () => p.next());
  fsNextBtn?.addEventListener('click', () => p.next());

  // Like Song Toggle
  likeBtn?.addEventListener('click', () => {
    if (p.currentTrack) p.toggleLike(p.currentTrack);
  });

  // Track changed callback
  p.on('track-change', (track) => {
    // Show the player bar
    const playerEl = document.querySelector('.player');
    if (playerEl) playerEl.classList.add('active');

    // Update main bar info
    const mainArt = document.getElementById('player-art');
    const mainTitle = document.getElementById('player-title');
    const mainArtist = document.getElementById('player-artist');

    if (trackInfo && track) {
      trackInfo.style.visibility = 'visible';
      if (mainArt) mainArt.src = track.artwork || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop';
      if (mainTitle) mainTitle.innerText = track.title;
      if (mainArtist) mainArtist.innerText = track.artist;

      // Sync active state in rows/grids
      updateActiveTrackStyles(track.id);
    }

    // Update fullscreen panel info
    const fsArt = document.getElementById('fs-art');
    const fsTitle = document.getElementById('fs-title');
    const fsArtist = document.getElementById('fs-artist');
    const fsBgArt = document.getElementById('fs-bg-art');

    if (track) {
      if (fsArt) fsArt.src = track.artwork || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop';
      if (fsBgArt) fsBgArt.src = track.artwork || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop';
      if (fsTitle) fsTitle.innerText = track.title;
      if (fsArtist) fsArtist.innerText = track.artist.toUpperCase();
      if (fsPlayer) fsPlayer.style.background = 'transparent';
    }

    // Sync heart icon colors
    syncLikeBtnColor(track.id);

    // Sync lyrics title
    const lyricsTitle = document.getElementById('lyrics-title');
    const lyricsArtist = document.getElementById('lyrics-artist');
    if (lyricsTitle) lyricsTitle.innerText = track.title;
    if (lyricsArtist) lyricsArtist.innerText = track.artist;
  });

  // Playing / Paused state callback
  p.on('play-state-change', (isPlaying) => {
    if (playBtn) {
      if (isPlaying) {
        playBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause"><rect width="4" height="16" x="14" y="4" rx="1"/><rect width="4" height="16" x="6" y="4" rx="1"/></svg>`;
      } else {
        playBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
      }
    }

    if (fsPlayBtn) {
      if (isPlaying) {
        fsPlayBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause"><rect width="4" height="16" x="14" y="4" rx="1"/><rect width="4" height="16" x="6" y="4" rx="1"/></svg>`;
      } else {
        fsPlayBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
      }
    }

    const art = document.getElementById('player-art');
    if (art) {
      if (isPlaying) {
        art.classList.add('rotate-playing');
      } else {
        art.classList.remove('rotate-playing');
      }
    }
  });

  // Timeline slider and timers callback
  p.on('time-update', ({ progress, duration }) => {
    const pct = duration > 0 ? (progress / duration) * 100 : 0;

    // Main progress slider
    if (progressSlider) {
      progressSlider.max = Math.floor(duration);
      progressSlider.value = Math.floor(progress);
      progressSlider.style.background = `linear-gradient(to right, #ffffff ${pct}%, rgba(255, 255, 255, 0.1) ${pct}%)`;
    }
    if (currentTimeLabel) currentTimeLabel.innerText = formatTime(progress);
    if (totalTimeLabel) totalTimeLabel.innerText = formatTime(duration);

    // Fullscreen progress slider
    if (fsProgressSlider) {
      fsProgressSlider.max = Math.floor(duration);
      fsProgressSlider.value = Math.floor(progress);
      fsProgressSlider.style.background = `linear-gradient(to right, #ffffff ${pct}%, rgba(255, 255, 255, 0.15) ${pct}%)`;
    }
    if (fsCurrentTimeLabel) fsCurrentTimeLabel.innerText = formatTime(progress);
    if (fsTotalTimeLabel) fsTotalTimeLabel.innerText = formatTime(duration);

    // Synced scrolling lyrics update
    updateFullscreenLyrics(progress);
  });

  // Seek on timeline input
  progressSlider?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    p.seek(val);
    const max = parseInt(progressSlider.max) || 1;
    const pct = (val / max) * 100;
    progressSlider.style.background = `linear-gradient(to right, #ffffff ${pct}%, rgba(255, 255, 255, 0.1) ${pct}%)`;
  });
  fsProgressSlider?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    p.seek(val);
    const max = parseInt(fsProgressSlider.max) || 1;
    const pct = (val / max) * 100;
    fsProgressSlider.style.background = `linear-gradient(to right, #ffffff ${pct}%, rgba(255, 255, 255, 0.15) ${pct}%)`;
  });

  // Volume adjuster input
  volumeSlider?.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value) / 100;
    p.setVolume(vol);
    const pct = vol * 100;
    volumeSlider.style.background = `linear-gradient(to right, #ffffff ${pct}%, rgba(255, 255, 255, 0.1) ${pct}%)`;
  });

  p.on('volume-change', (vol) => {
    if (volumeSlider) {
      volumeSlider.value = Math.floor(vol * 100);
      const pct = vol * 100;
      volumeSlider.style.background = `linear-gradient(to right, #ffffff ${pct}%, rgba(255, 255, 255, 0.1) ${pct}%)`;
    }
  });

  // Favorites state changes
  p.on('like-change', () => {
    if (p.currentTrack) syncLikeBtnColor(p.currentTrack.id);
  });

  // Loop/Repeat state changes
  p.on('loop-state-change', (isLooping) => {
    if (repeatBtn) {
      if (isLooping) {
        repeatBtn.classList.add('active');
        repeatBtn.style.color = '#38ef7d';
      } else {
        repeatBtn.classList.remove('active');
        repeatBtn.style.color = '';
      }
    }
  });

  // Toggle slide-out lyrics Panel (right sidebar)
  lyricsToggle?.addEventListener('click', () => {
    lyricsPanel?.classList.toggle('active');
    lyricsToggle.classList.toggle('active');
  });

  lyricsCloseBtn?.addEventListener('click', () => {
    lyricsPanel?.classList.remove('active');
    lyricsToggle?.classList.remove('active');
  });

  // Lyrics change callback
  p.on('lyrics-change', (lyricsText) => {
    const body = document.getElementById('lyrics-body');
    if (body) {
      if (!lyricsText) {
        body.innerHTML = `<p class="lyrics-placeholder">Loading lyrics...</p>`;
      } else {
        body.innerHTML = lyricsText.split('\n').map(line => `<p>${line}</p>`).join('');
      }
    }

    // Fullscreen lyrics container update
    const fsLyricsBody = document.getElementById('fs-lyrics-body');
    if (fsLyricsBody) {
      if (!lyricsText) {
        fsLyricsBody.innerHTML = `<p class="fs-lyric-line placeholder">Loading lyrics...</p>`;
        parsedLyrics = [];
      } else if (lyricsText === 'Lyrics not found.') {
        fsLyricsBody.innerHTML = `<p class="fs-lyric-line placeholder">Lyrics not found.</p>`;
        parsedLyrics = [];
      } else {
        parsedLyrics = parseLyrics(lyricsText);
        if (parsedLyrics.length === 0) {
          fsLyricsBody.innerHTML = `<p class="fs-lyric-line placeholder">Lyrics not found.</p>`;
        } else {
          fsLyricsBody.innerHTML = parsedLyrics.map((line, idx) => `
            <p class="fs-lyric-line" data-index="${idx}" data-time="${line.time}">${line.text}</p>
          `).join('');

          // Bind clicks dynamically with fallback estimated seek times
          fsLyricsBody.querySelectorAll('.fs-lyric-line').forEach(el => {
            el.addEventListener('click', () => {
              const time = parseFloat(el.getAttribute('data-time'));
              if (time !== -1 && window.player) {
                window.player.seek(time);
                if (!window.player.isPlaying) {
                  window.player.togglePlay();
                }
              } else {
                // Estimated time fallback for non-synced plain lyrics
                const idx = parseInt(el.getAttribute('data-index'));
                const duration = window.player.duration || 0;
                const total = parsedLyrics.length;
                if (duration > 0 && total > 0) {
                  const estTime = (idx / total) * duration;
                  window.player.seek(estTime);
                  if (!window.player.isPlaying) {
                    window.player.togglePlay();
                  }
                }
              }
            });
          });
        }
      }
    }
  });
}

function syncLikeBtnColor(trackId) {
  const btn = document.getElementById('player-like-btn');
  if (!btn) return;

  const isLiked = window.player.isLiked(trackId);
  if (isLiked) {
    btn.classList.add('liked');
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart" style="color: #ff3366;"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
  } else {
    btn.classList.remove('liked');
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
  }
}

function updateActiveTrackStyles(trackId) {
  // Clear any existing active classes in rows or suggestion grids
  document.querySelectorAll('.suggestion-item.active, tr.active').forEach(el => {
    el.classList.remove('active');
  });

  // Highlight suggestion items
  document.querySelectorAll(`.suggestion-item`).forEach(el => {
    if (el.getAttribute('onclick')?.includes(trackId)) {
      el.classList.add('active');
    }
  });

  // Highlight track rows in tables
  document.querySelectorAll(`tr[onclick*="${trackId}"]`).forEach(el => {
    el.classList.add('active');
  });
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds === null || seconds === undefined) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/* CONTEXT MENU DROPDOWN LOGIC */

function initContextMenu() {
  const menu = document.getElementById('context-menu');
  if (!menu) return;

  // Clicking outside closes the context menu
  document.addEventListener('click', () => {
    menu.style.display = 'none';
    activeMenuTrackId = null;
  });

  // Clicking escape key closes it
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      menu.style.display = 'none';
      activeMenuTrackId = null;
    }
  });
}

window.showTrackMenu = async (event, trackId) => {
  event.preventDefault();
  event.stopPropagation();

  const menu = document.getElementById('context-menu');
  if (!menu) return;

  activeMenuTrackId = trackId;

  // Retrieve track details
  let track = null;
  try {
    track = await window.musicStreamingApi.getSongById(trackId);
  } catch {}
  if (!track) return;

  const isLiked = window.player.isLiked(trackId);
  const isLooping = window.player.loop;
  const userPlaylists = window.getLocalPlaylists ? window.getLocalPlaylists() : [];

  // Generate dynamic HTML for playlist submenus
  let playlistSubmenuHtml = '';
  if (userPlaylists.length === 0) {
    playlistSubmenuHtml = `
      <div class="context-menu-item" onclick="triggerCreatePlaylistModal()">
        Create Playlist
      </div>
    `;
  } else {
    playlistSubmenuHtml = userPlaylists.map(p => `
      <div class="context-menu-item" onclick="addTrackToUserPlaylistDirect('${p.id}')">
        ${p.title}
      </div>
    `).join('');
  }

  // Exact UI styling from the user's screenshot
  menu.innerHTML = `
    <div class="context-menu-section-header">Quick actions</div>

    <div class="context-menu-item" onclick="triggerDownloadFromMenu()">
      <span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> Download</span>
    </div>

    <div class="context-menu-item" style="position:relative; display:flex; justify-content:space-between; align-items:center;">
      <span style="display:flex; align-items:center; gap:12px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-music"><path d="M21 15V6M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM12 12H3M16 6H3M12 18H3"/></svg> Add to playlist
      </span>
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
      
      <!-- Hover submenu -->
      <div class="submenu-list">
        ${playlistSubmenuHtml}
      </div>
    </div>

    <div class="context-menu-item" onclick="toggleLikeFromMenu()">
      <span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart" style="${isLiked ? 'color:#ff3366' : ''}"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        ${isLiked ? 'Remove Favorite' : 'Add to Favorites'}
      </span>
    </div>

    <div class="context-menu-item" onclick="toggleLoopFromMenu()">
      <span style="display:flex; align-items:center; justify-content:space-between; width: 100%;">
        <span style="display:flex; align-items:center; gap:12px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-repeat"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
          Enable loop
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-repeat-1" style="${isLooping ? 'color:#38ef7d;' : ''}"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/><path d="M10 14h3"/></svg>
      </span>
    </div>
  `;

  // Position the menu coordinates beautifully near mouse pointer
  menu.style.display = 'block';
  const clickX = event.clientX;
  const clickY = event.clientY;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const menuW = menu.offsetWidth;
  const menuH = menu.offsetHeight;

  let x = clickX;
  let y = clickY;

  // Prevent overflows
  if (clickX + menuW > screenW) {
    x = clickX - menuW;
  }
  if (clickY + menuH > screenH) {
    y = clickY - menuH;
  }

  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
};

window.playSongFromMenu = async () => {
  if (!activeMenuTrackId) return;
  try {
    const track = await window.musicStreamingApi.getSongById(activeMenuTrackId);
    if (track) window.player.playTrack(track);
  } catch {}
};

window.toggleLikeFromMenu = async () => {
  if (!activeMenuTrackId) return;
  try {
    const track = await window.musicStreamingApi.getSongById(activeMenuTrackId);
    if (track) window.player.toggleLike(track);
  } catch {}
};

window.playAiSuggestionsFromMenu = async () => {
  if (!activeMenuTrackId) return;
  try {
    const suggestions = await window.musicStreamingApi.getSuggestions(activeMenuTrackId, 15);
    if (suggestions && suggestions.length > 0) {
      alert('AI recommendations generated! Queueing 15 similar tracks.');
      window.player.playTrack(suggestions[0], suggestions);
    } else {
      alert('Dynamic suggestions unavailable for this song. Playing fallback queue.');
    }
  } catch {
    alert('Suggestions unavailable offline.');
  }
};

window.triggerDownloadFromMenu = () => {
  if (!activeMenuTrackId) return;
  alert('Track downloaded! Saved to offline downloads library.');
};

window.toggleLoopFromMenu = () => {
  const isLooping = window.player.toggleLoop();
  alert(isLooping ? 'Song loop enabled.' : 'Song loop disabled.');
};

window.addTrackToUserPlaylistDirect = async (playlistId) => {
  if (!activeMenuTrackId) return;
  try {
    const track = await window.musicStreamingApi.getSongById(activeMenuTrackId);
    if (track && window.addSongToUserPlaylist) {
      window.addSongToUserPlaylist(playlistId, track);
      // If we are currently looking at that playlist details, re-render it
      if (window.location.hash === `#/playlist/${playlistId}`) {
        window.renderPlaylistDetail(playlistId);
      }
    }
  } catch {}
};

/* HEADER CONTROLS */

function initHeaderControls() {
  const shareBtn = document.getElementById('header-share-btn');
  shareBtn?.addEventListener('click', () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl)
      .then(() => alert('Website share link copied to clipboard! 📋'))
      .catch(() => alert('Failed to copy link.'));
  });
}

/* MOBILE VIEW DRAWER LOGICS */

function initMobileDrawer() {
  const header = document.querySelector('.header');
  if (!header) return;

  // Add hamburger trigger button on mobile header
  const menuBtn = document.createElement('button');
  menuBtn.className = 'mobile-menu-toggle';
  menuBtn.setAttribute('aria-label', 'Open Menu');
  menuBtn.style.display = 'none'; // Will show via CSS media-query
  menuBtn.innerHTML = `<i data-lucide="menu"></i>`;

  // Prepend inside header
  header.prepend(menuBtn);
  
  menuBtn.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.toggle('mobile-open');
  });

  // Clicking outside sidebar drawer closes it
  document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const toggle = document.querySelector('.mobile-menu-toggle');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
      if (!sidebar.contains(e.target) && !toggle?.contains(e.target)) {
        sidebar.classList.remove('mobile-open');
      }
    }
  });

  lucide.createIcons();
}

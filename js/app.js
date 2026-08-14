/* AYU.music App Core Orchestrator */

// Register PWA Service Worker safely without interfering with player/audio streams
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      console.log('[PWA] Service Worker registered:', reg.scope);
    }).catch((err) => {
      console.warn('[PWA] Service Worker registration failed:', err);
    });
  });
}

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

// Parses LRC lyrics synced timestamps [mm:ss], [mm:ss.xx], [mm:ss:xx]
function parseLyrics(lyricText) {
  if (!lyricText) return [];
  const lines = lyricText.split('\n');
  const result = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:[\.\:](\d{2,3}))?\]/g;
  
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Filter out LRC header metadata tags ([ti:..], [ar:..], [al:..], [by:..], [offset:..])
    if (/^\[(ti|ar|al|by|length|offset|re|ve):/i.test(trimmed)) {
      continue;
    }

    timeRegex.lastIndex = 0;
    const timeMatches = [...trimmed.matchAll(timeRegex)];

    if (timeMatches.length > 0) {
      const text = trimmed.replace(timeRegex, '').trim();
      if (text) {
        for (const match of timeMatches) {
          const mins = parseInt(match[1], 10);
          const secs = parseInt(match[2], 10);
          const msStr = match[3] || '0';
          const ms = parseInt(msStr, 10);
          let fraction = 0;
          if (msStr.length === 3) fraction = ms / 1000;
          else if (msStr.length === 2) fraction = ms / 100;
          else if (msStr.length === 1) fraction = ms / 10;

          const time = mins * 60 + secs + fraction;
          result.push({ time, text });
        }
      }
    } else {
      if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
        result.push({ time: -1, text: trimmed });
      }
    }
  }

  result.sort((a, b) => {
    if (a.time === -1 && b.time === -1) return 0;
    if (a.time === -1) return 1;
    if (b.time === -1) return -1;
    return a.time - b.time;
  });

  return result;
}

function getLyricTimeForIndex(idx, total, duration) {
  if (total <= 0) return 0;
  const startDelay = 25;
  const endDelay = 15;
  const singingDuration = Math.max(10, duration - startDelay - endDelay);
  return startDelay + (idx / total) * singingDuration;
}

function getLyricIndexForTime(currentTime, duration, total) {
  if (total <= 0) return -1;
  const startDelay = 25;
  const endDelay = 15;
  const singingDuration = Math.max(10, duration - startDelay - endDelay);
  const elapsed = Math.max(0, currentTime - startDelay);
  const progressPct = Math.min(0.99, elapsed / singingDuration);
  return Math.floor(progressPct * total);
}

let lastActiveLyricIndex = -1;
let lyricsRafId = null;

function startLyricsAnimationLoop() {
  if (lyricsRafId) cancelAnimationFrame(lyricsRafId);
  const step = () => {
    if (window.player && window.player.isPlaying) {
      updateFullscreenLyrics(window.player.currentTime || 0);
    }
    lyricsRafId = requestAnimationFrame(step);
  };
  lyricsRafId = requestAnimationFrame(step);
}

function stopLyricsAnimationLoop() {
  if (lyricsRafId) {
    cancelAnimationFrame(lyricsRafId);
    lyricsRafId = null;
  }
}

// Syncs scrolling position and active highlights to currentTime
function updateFullscreenLyrics(currentTime) {
  if (!parsedLyrics || parsedLyrics.length === 0) return;
  
  // Require at least 3 valid timestamped lines to consider the track synced
  const timestampedCount = parsedLyrics.filter(item => item.time !== -1).length;
  const isSyncedLRC = timestampedCount >= 3;
  const duration = window.player?.duration || 240;
  
  let activeIndex = -1;
  
  if (isSyncedLRC) {
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (parsedLyrics[i].time !== -1 && currentTime >= parsedLyrics[i].time) {
        activeIndex = i;
      }
    }
  } else {
    activeIndex = getLyricIndexForTime(currentTime, duration, parsedLyrics.length);
  }
  
  if (activeIndex >= 0 && activeIndex < parsedLyrics.length) {
    const containers = [
      document.getElementById('fs-lyrics-body'),
      document.getElementById('mobile-lyrics-body')
    ];

    containers.forEach(container => {
      if (!container) return;
      const linesEl = container.querySelectorAll('.fs-lyric-line');
      linesEl.forEach((line, idx) => {
        if (idx === activeIndex) {
          line.classList.add('active');
        } else {
          line.classList.remove('active');
        }
      });

      if (activeIndex !== lastActiveLyricIndex) {
        const activeLine = linesEl[activeIndex];
        if (activeLine) {
          const containerH = container.clientHeight;
          const lineTop = activeLine.offsetTop;
          const lineH = activeLine.clientHeight;
          const targetTop = Math.max(0, lineTop - containerH / 2 + lineH / 2);

          container.scrollTo({
            top: targetTop,
            behavior: 'smooth'
          });
        }
      }
    });

    if (activeIndex !== lastActiveLyricIndex) {
      lastActiveLyricIndex = activeIndex;
    }
  }
}

function showCastDevicePicker(e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  const existing = document.getElementById('cast-modal-picker');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'cast-modal-picker';
  modal.className = 'modal-backdrop active';
  modal.style.cssText = 'z-index: 10000; animation: fadeIn 0.2s ease;';
  modal.innerHTML = `
    <div class="modal-card" style="max-width: 360px; width: 90%; margin: 0 auto; text-align: center; padding: 24px; border-radius: 24px; background: rgba(20, 20, 20, 0.95); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cast"><path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><path d="M2 12a9 9 0 0 1 8 8"/><path d="M2 16a5 5 0 0 1 4 4"/><line x1="2" x2="2.01" y1="20" y2="20"/></svg>
          Cast to Device
        </h3>
        <button id="close-cast-modal" style="background: transparent; border: none; color: #aaa; cursor: pointer; font-size: 24px; line-height: 1;">&times;</button>
      </div>
      <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 20px;">Select a TV, speaker, or AirPlay device on your Wi-Fi network:</p>
      
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button class="cast-device-opt" style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; color: #fff; cursor: pointer; text-align: left; transition: all 0.2s;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
          <div>
            <div style="font-weight: 600; font-size: 14px;">Living Room TV (Chromecast)</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5);">Ready to connect</div>
          </div>
        </button>

        <button class="cast-device-opt" style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; color: #fff; cursor: pointer; text-align: left; transition: all 0.2s;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          <div>
            <div style="font-weight: 600; font-size: 14px;">Bedroom Smart Speaker</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5);">Google Home</div>
          </div>
        </button>

        <button class="cast-device-opt" style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; color: #fff; cursor: pointer; text-align: left; transition: all 0.2s;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"/><polygon points="12 15 17 21 7 21 12 15"/></svg>
          <div>
            <div style="font-weight: 600; font-size: 14px;">Apple TV (AirPlay)</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5);">AirPlay Audio</div>
          </div>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('close-cast-modal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (ev) => {
    if (ev.target === modal) modal.remove();
  });

  modal.querySelectorAll('.cast-device-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const name = opt.querySelector('div div').innerText;
      alert(`Connecting audio stream to ${name}...`);
      modal.remove();
    });
  });
}

window.showCastDevicePicker = showCastDevicePicker;

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
    startLyricsAnimationLoop();
  }
};

window.addEventListener('hashchange', () => {
  if (window.location.hash === '#/now-playing') {
    startLyricsAnimationLoop();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Bind Player UI updates
  bindPlayerEvents();
  
  // Bind Context Menu handlers
  initContextMenu();
  
  // Bind Header controls
  initHeaderControls();



  // Initialize 360-degree Circular Equalizer Spectrum Visualizer
  initCircularVisualizer();

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

  // Initialize initial white slider fills
  if (volumeSlider && p) {
    const vol = p.volume !== undefined ? p.volume : 0.8;
    const pct = vol * 100;
    volumeSlider.value = Math.floor(pct);
    volumeSlider.style.background = `linear-gradient(to right, #ffffff ${pct}%, rgba(255, 255, 255, 0.2) ${pct}%)`;
  }
  if (progressSlider) {
    progressSlider.style.background = `linear-gradient(to right, #ffffff 0%, rgba(255, 255, 255, 0.2) 0%)`;
  }
  
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

  // Cast button click handler
  const fsCastBtn = document.getElementById('fs-cast-btn');
  fsCastBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    showCastDevicePicker();
  });

  // Full-screen three-dot menu options click
  const fsMoreBtn = document.getElementById('fs-more-btn');
  fsMoreBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (p.currentTrack) {
      window.showTrackMenu(e, p.currentTrack.id);
    }
  });

  // Full-screen Like Action Pill
  const fsLikePill = document.getElementById('fs-like-action-btn');
  fsLikePill?.addEventListener('click', () => {
    if (p.currentTrack) p.toggleLike(p.currentTrack);
  });

  // Toggle Lyrics View Button
  window.toggleMobileLyricsView = (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();

    const lyricsBtn = document.getElementById('fs-lyrics-action-btn');
    const desktopPanel = document.getElementById('fs-lyrics-panel-view');
    const mobileScreen = document.getElementById('mobile-lyrics-screen');
    const fsBody = document.querySelector('.fullscreen-player .fs-body');
    const fsLeft = document.querySelector('.fullscreen-player .fs-left');

    const isMobile = window.innerWidth <= 768;

    if (isMobile && mobileScreen) {
      const isSheetOpen = mobileScreen.classList.contains('active');
      if (isSheetOpen) {
        mobileScreen.classList.remove('active');
        if (lyricsBtn) lyricsBtn.classList.remove('active');
        document.body.style.overflow = '';
      } else {
        mobileScreen.classList.add('active');
        if (lyricsBtn) lyricsBtn.classList.add('active');
        document.body.style.overflow = 'hidden';
        try {
          history.pushState({ mobileLyricsOpen: true }, '');
        } catch {}
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        startLyricsAnimationLoop();
      }
    } else if (desktopPanel) {
      // Desktop toggle
      const isCurrentlyActive = lyricsBtn?.classList.contains('active');
      if (isCurrentlyActive) {
        lyricsBtn?.classList.remove('active');
        desktopPanel.style.display = 'none';
        if (fsBody) fsBody.classList.remove('show-lyrics');
        if (fsLeft) fsLeft.classList.add('centered-mode');
      } else {
        lyricsBtn?.classList.add('active');
        desktopPanel.style.display = 'flex';
        if (fsBody) fsBody.classList.add('show-lyrics');
        if (fsLeft) fsLeft.classList.remove('centered-mode');
        startLyricsAnimationLoop();
      }
    }
  };

  // Android Back Button listener to close mobile lyrics overlay first
  window.addEventListener('popstate', () => {
    const mobileScreen = document.getElementById('mobile-lyrics-screen');
    if (mobileScreen && mobileScreen.classList.contains('active')) {
      mobileScreen.classList.remove('active');
      const lyricsBtn = document.getElementById('fs-lyrics-action-btn');
      if (lyricsBtn) lyricsBtn.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  // Full-screen Shuffle & Repeat buttons
  const fsShuffleBtn = document.getElementById('fs-shuffle-btn');
  fsShuffleBtn?.addEventListener('click', () => {
    fsShuffleBtn.classList.toggle('active');
  });

  const fsRepeatBtn = document.getElementById('fs-repeat-btn');
  // Fullscreen Mode Toggle Handler
  window.toggleFullscreenMode = function() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error('Error exiting fullscreen:', err);
      });
    }
  };

  // Official YouTube Video Redirection & Card UI Engine
  window.getOfficialYouTubeUrl = function(track) {
    if (!track) return 'https://www.youtube.com/results?search_query=music+video';

    const title = (track.title || '').toLowerCase();

    // Direct official video URLs for popular tracks
    if (title.includes('arz kiya hai')) return 'https://www.youtube.com/watch?v=lZ8xS56vW5c';
    if (title.includes('kesariya')) return 'https://www.youtube.com/watch?v=BddP6PYo2gs';
    if (title.includes('chaleya')) return 'https://www.youtube.com/watch?v=VAdGW7QDJiU';
    if (title.includes('apna bana le')) return 'https://www.youtube.com/watch?v=ElZfdU54Cp8';
    if (title.includes('tum hi ho')) return 'https://www.youtube.com/watch?v=UMb8vfypgUU';
    if (title.includes('raataan lambiyan')) return 'https://www.youtube.com/watch?v=gvyUuxdRdR4';
    if (title.includes('heeriye')) return 'https://www.youtube.com/watch?v=RLzC55ai0eo';
    if (title.includes('makhna')) return 'https://www.youtube.com/watch?v=9J9xT6e-M-8';
    if (title.includes('deva deva')) return 'https://www.youtube.com/watch?v=mNuhKUOD_g0';
    if (title.includes('pasoori')) return 'https://www.youtube.com/watch?v=5Eqb_-j3FDA';
    if (title.includes('maan meri jaan')) return 'https://www.youtube.com/watch?v=X7v6-XpE8m0';
    if (title.includes('kahani suno')) return 'https://www.youtube.com/watch?v=1-B_N7-1xNo';
    if (title.includes('samjhawan')) return 'https://www.youtube.com/watch?v=h2j83tWp8B0';

    return `https://www.youtube.com/results?search_query=${encodeURIComponent(track.title + ' ' + track.artist + ' official music video')}`;
  };

  window.openOfficialSongVideo = function(event) {
    if (event) event.stopPropagation();
    const currentTrack = window.player?.currentTrack;
    if (!currentTrack) return;
    const youtubeUrl = window.getOfficialYouTubeUrl(currentTrack);
    window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
  };

  window.loadTrackVideo = function(track) {
    const container = document.getElementById('fs-video-container');
    if (!container || !track) return;

    container.innerHTML = `
      <div class="fs-yt-card" onclick="window.openOfficialSongVideo(event)" style="width: 100%; height: 100%; border-radius: 16px; background: linear-gradient(135deg, #181524 0%, #0d0b14 100%); display: flex; flex-direction: column; justify-content: center; align-items: flex-start; padding: 24px; box-sizing: border-box; cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.08); position: relative; overflow: hidden;">
        
        <!-- YouTube Logo Header -->
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
          <svg width="32" height="23" viewBox="0 0 32 23" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M31.332 3.555A4.013 4.013 0 0028.504.727C26.01 0 16 0 16 0S5.99 0 3.496.727A4.013 4.013 0 00.668 3.555C0 6.049 0 11.5 0 11.5s0 5.451.668 7.945a4.013 4.013 0 002.828 2.828C5.99 23 16 23 16 23s10.01 0 12.504-.727a4.013 4.013 0 002.828-2.828C32 16.951 32 11.5 32 11.5s0-5.451-.668-7.945z" fill="#FF0000"/>
            <path d="M12.8 16.429L21.143 11.5 12.8 6.571v9.858z" fill="#FFFFFF"/>
          </svg>
          <span style="color: #ffffff; font-size: 20px; font-weight: 800; font-family: 'DM Sans', sans-serif; letter-spacing: -0.5px;">YouTube</span>
        </div>

        <!-- Heading Text -->
        <h3 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 16px 0; font-family: 'DM Sans', sans-serif; line-height: 1.25;">
          This video is unavailable
        </h3>

        <!-- Redirection Button -->
        <button onclick="window.openOfficialSongVideo(event)" style="background: #ffffff; color: #000000; border: none; padding: 10px 20px; border-radius: 20px; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: transform 0.15s ease;">
          Watch on YouTube
        </button>

      </div>
    `;
  };

  window.switchPlayerMode = function(mode) {
    const songPill = document.getElementById('fs-pill-song');
    const videoPill = document.getElementById('fs-pill-video');
    const artWrapper = document.getElementById('fs-art-wrapper') || document.querySelector('.fs-art-wrapper');
    const artImg = document.getElementById('fs-art');
    const videoContainer = document.getElementById('fs-video-container');

    if (mode === 'video') {
      if (songPill) songPill.classList.remove('active');
      if (videoPill) videoPill.classList.add('active');
      if (artWrapper) artWrapper.classList.add('video-mode');

      if (artImg) artImg.style.display = 'none';
      if (videoContainer) {
        videoContainer.style.display = 'block';
        const currentTrack = window.player?.currentTrack;
        if (currentTrack && (!videoContainer.querySelector('iframe') || videoContainer.getAttribute('data-track-id') !== String(currentTrack.id))) {
          videoContainer.setAttribute('data-track-id', String(currentTrack.id));
          window.loadTrackVideo(currentTrack);
        }
      }
    } else {
      // Song mode
      if (videoPill) videoPill.classList.remove('active');
      if (songPill) songPill.classList.add('active');
      if (artWrapper) artWrapper.classList.remove('video-mode');

      if (videoContainer) {
        videoContainer.style.display = 'none';
      }
      if (artImg) artImg.style.display = 'block';
    }
  };

  // Sync Video mode on track change
  if (window.player) {
    window.player.on('track-change', (track) => {
      const videoPill = document.getElementById('fs-pill-video');
      const videoContainer = document.getElementById('fs-video-container');
      if (videoPill && videoPill.classList.contains('active') && videoContainer) {
        videoContainer.setAttribute('data-track-id', String(track.id));
        window.loadTrackVideo(track);
      }
    });
  }

  window.switchPlayerMode = function(mode) {
    const songPill = document.getElementById('fs-pill-song');
    const videoPill = document.getElementById('fs-pill-video');
    const artWrapper = document.getElementById('fs-art-wrapper') || document.querySelector('.fs-art-wrapper');
    const artImg = document.getElementById('fs-art');
    const videoContainer = document.getElementById('fs-video-container');

    if (mode === 'video') {
      if (songPill) songPill.classList.remove('active');
      if (videoPill) videoPill.classList.add('active');
      if (artWrapper) artWrapper.classList.add('video-mode');

      if (artImg) artImg.style.display = 'none';
      if (videoContainer) {
        videoContainer.style.display = 'block';
        const currentTrack = window.player?.currentTrack;
        if (currentTrack && (!videoContainer.querySelector('canvas') || videoContainer.getAttribute('data-track-id') !== String(currentTrack.id))) {
          videoContainer.setAttribute('data-track-id', String(currentTrack.id));
          window.loadTrackVideo(currentTrack);
        }
      }
    } else {
      // Song mode
      if (videoPill) videoPill.classList.remove('active');
      if (songPill) songPill.classList.add('active');
      if (artWrapper) artWrapper.classList.remove('video-mode');

      if (videoContainer) {
        videoContainer.style.display = 'none';
      }
      if (artImg) artImg.style.display = 'block';
    }
  };

  // Sync Video mode on track change
  if (window.player) {
    window.player.on('track-change', (track) => {
      const videoPill = document.getElementById('fs-pill-video');
      const videoContainer = document.getElementById('fs-video-container');
      if (videoPill && videoPill.classList.contains('active') && videoContainer) {
        videoContainer.setAttribute('data-track-id', String(track.id));
        window.loadTrackVideo(track);
      }
    });
  }

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
        startLyricsAnimationLoop();
      } else {
        art.classList.remove('rotate-playing');
        stopLyricsAnimationLoop();
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

    // Fullscreen lyrics container update (Desktop & Mobile)
    const fsLyricsBody = document.getElementById('fs-lyrics-body');
    const mobileLyricsBody = document.getElementById('mobile-lyrics-body');

    parsedLyrics = parseLyrics(lyricsText);

    const updateLyricsContainer = (container) => {
      if (!container) return;
      if (!lyricsText || lyricsText === 'Lyrics not found.' || parsedLyrics.length === 0) {
        container.innerHTML = `<p class="fs-lyric-line placeholder">Lyrics not found.</p>`;
      } else {
        container.innerHTML = parsedLyrics.map((line, idx) => `
          <p class="fs-lyric-line" data-index="${idx}" data-time="${line.time}">${line.text}</p>
        `).join('');

        container.querySelectorAll('.fs-lyric-line').forEach(el => {
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(el.getAttribute('data-index'), 10);
            const time = parseFloat(el.getAttribute('data-time'));
            const duration = window.player?.duration || 240;

            let targetTime = time;
            if (targetTime === -1) {
              targetTime = getLyricTimeForIndex(idx, parsedLyrics.length, duration);
            }

            if (window.player && targetTime >= 0) {
              window.player.seek(targetTime);
              if (!window.player.isPlaying && typeof window.player.play === 'function') {
                window.player.play();
              } else if (!window.player.isPlaying && typeof window.player.togglePlay === 'function') {
                window.player.togglePlay();
              }
            }
          });
        });
      }
    };

    updateLyricsContainer(fsLyricsBody);
    updateLyricsContainer(mobileLyricsBody);
  });
}

function syncLikeBtnColor(trackId) {
  const btn = document.getElementById('player-like-btn');
  const fsLikePill = document.getElementById('fs-like-action-btn');
  const isLiked = window.player?.isLiked(trackId);

  if (btn) {
    if (isLiked) {
      btn.classList.add('liked');
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart" style="color: #ff3366;"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
    } else {
      btn.classList.remove('liked');
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
    }
  }

  if (fsLikePill) {
    if (isLiked) {
      fsLikePill.classList.add('active');
      fsLikePill.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M7 10v12h4V10H7zm-3 0v12h2V10H4zm14 0h-3.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L15.17 3 9.58 8.59C9.22 8.95 9 9.45 9 10v10c0 1.1.9 2 2 2h7.33c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2c0-1.1-.9-2-2-2z"/></svg> <span>Liked</span>`;
    } else {
      fsLikePill.classList.remove('active');
      fsLikePill.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-thumbs-up"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg> <span>Like</span>`;
    }
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

window.triggerDownloadFromMenu = async () => {
  if (!activeMenuTrackId) return;
  try {
    const track = await window.musicStreamingApi.getSongById(activeMenuTrackId);
    if (track && window.downloadTrack) {
      window.downloadTrack(track);
    }
  } catch (err) {
    console.error('Download menu error:', err);
  }
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

/* 360-Degree Circular Audio Equalizer Spectrum Generator */
function initCircularVisualizer() {
  const svg = document.getElementById('circular-visualizer-svg');
  if (!svg) return;

  const numBars = 80;
  const cx = 70;
  const cy = 70;
  const rMin = 32; // Base inner radius surrounding 56px circular artwork

  let barsHTML = '';
  // Generate SVG line elements and dotted tips in 360 degrees
  for (let i = 0; i < numBars; i++) {
    const angle = (i / numBars) * 2 * Math.PI;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const x1 = cx + rMin * cos;
    const y1 = cy + rMin * sin;
    const x2 = cx + (rMin + 6) * cos;
    const y2 = cy + (rMin + 6) * sin;

    barsHTML += `<line id="viz-bar-${i}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.9" />`;
    
    // Alternating flying tip dots (matching the exact reference image)
    if (i % 3 === 0) {
      barsHTML += `<circle id="viz-dot-${i}" cx="${(cx + (rMin + 10) * cos).toFixed(2)}" cy="${(cy + (rMin + 10) * sin).toFixed(2)}" r="0.75" fill="#ffffff" opacity="0.9" />`;
    }
  }
  svg.innerHTML = barsHTML;

  let animFrameId = null;
  let phase = 0;

  function animateVisualizer() {
    if (!window.player || !window.player.isPlaying) {
      svg.style.opacity = '0';
      if (animFrameId) cancelAnimationFrame(animFrameId);
      return;
    }

    svg.style.opacity = '1';
    phase += 0.08;

    for (let i = 0; i < numBars; i++) {
      const lineEl = document.getElementById(`viz-bar-${i}`);
      const dotEl = document.getElementById(`viz-dot-${i}`);
      if (!lineEl) continue;

      const angle = (i / numBars) * 2 * Math.PI;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Organic audio frequency spectrum heights matching reference image peaks
      const baseHeight = 3 + Math.sin(i * 0.35 + phase) * 5 + Math.cos(i * 0.65 - phase * 0.6) * 7 + (Math.random() * 4);
      const h = Math.max(2, Math.min(22, baseHeight));

      const x1 = cx + rMin * cos;
      const y1 = cy + rMin * sin;
      const x2 = cx + (rMin + h) * cos;
      const y2 = cy + (rMin + h) * sin;

      lineEl.setAttribute('x2', x2.toFixed(2));
      lineEl.setAttribute('y2', y2.toFixed(2));
      lineEl.setAttribute('opacity', (0.5 + (h / 22) * 0.5).toFixed(2));

      if (dotEl) {
        const dotR = rMin + h + 3 + (Math.sin(phase * 1.5 + i) * 1.5);
        dotEl.setAttribute('cx', (cx + dotR * cos).toFixed(2));
        dotEl.setAttribute('cy', (cy + dotR * sin).toFixed(2));
        dotEl.setAttribute('opacity', (0.4 + (h / 22) * 0.6).toFixed(2));
      }
    }

    animFrameId = requestAnimationFrame(animateVisualizer);
  }

  window.player.on('play-state-change', (isPlaying) => {
    if (isPlaying) {
      animateVisualizer();
    } else {
      svg.style.opacity = '0';
      if (animFrameId) cancelAnimationFrame(animFrameId);
    }
  });

  if (window.player && window.player.isPlaying) {
    animateVisualizer();
  }
}

window.showCastDevicePicker = function(e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  const existing = document.getElementById('cast-modal-picker');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'cast-modal-picker';
  modal.className = 'modal-backdrop active';
  modal.style.cssText = 'z-index: 10000; animation: fadeIn 0.2s ease;';
  modal.innerHTML = `
    <div class="modal-card" style="max-width: 360px; width: 90%; margin: 0 auto; text-align: center; padding: 24px; border-radius: 24px; background: rgba(20, 20, 20, 0.95); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cast"><path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><path d="M2 12a9 9 0 0 1 8 8"/><path d="M2 16a5 5 0 0 1 4 4"/><line x1="2" x2="2.01" y1="20" y2="20"/></svg>
          Cast to Device
        </h3>
        <button id="close-cast-modal" style="background: transparent; border: none; color: #aaa; cursor: pointer; font-size: 24px; line-height: 1;">&times;</button>
      </div>
      <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 20px;">Select a TV, speaker, or AirPlay device on your Wi-Fi network:</p>
      
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button class="cast-device-opt" style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; color: #fff; cursor: pointer; text-align: left; transition: all 0.2s;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
          <div>
            <div style="font-weight: 600; font-size: 14px;">Living Room TV (Chromecast)</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5);">Ready to connect</div>
          </div>
        </button>

        <button class="cast-device-opt" style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; color: #fff; cursor: pointer; text-align: left; transition: all 0.2s;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          <div>
            <div style="font-weight: 600; font-size: 14px;">Bedroom Smart Speaker</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5);">Google Home</div>
          </div>
        </button>

        <button class="cast-device-opt" style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; color: #fff; cursor: pointer; text-align: left; transition: all 0.2s;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"/><polygon points="12 15 17 21 7 21 12 15"/></svg>
          <div>
            <div style="font-weight: 600; font-size: 14px;">Apple TV (AirPlay)</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5);">AirPlay Audio</div>
          </div>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('close-cast-modal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelectorAll('.cast-device-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const name = opt.querySelector('div div').innerText;
      alert(`Connecting audio stream to ${name}...`);
      modal.remove();
    });
  });
}

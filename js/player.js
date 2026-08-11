let audio = new Audio();
let hls = null;
const listeners = {};

// Load liked songs from LocalStorage
let likedSongs = [];
try {
  likedSongs = JSON.parse(localStorage.getItem('liked_songs')) || [];
} catch {
  likedSongs = [];
}

const player = {
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  duration: 0,
  queue: [],
  currentIndex: -1,
  lyrics: null,
  liked: likedSongs,
  loop: false,

  // Pub-sub event emitter
  on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  },

  emit(event, data) {
    if (listeners[event]) {
      listeners[event].forEach(cb => cb(data));
    }
  },

  // Liked tracks toggles
  toggleLike(track) {
    if (!track) return;
    const index = this.liked.findIndex(t => t.id === track.id);
    if (index > -1) {
      this.liked.splice(index, 1);
    } else {
      this.liked.push(track);
    }
    localStorage.setItem('liked_songs', JSON.stringify(this.liked));
    this.emit('like-change', this.liked);
  },

  isLiked(trackId) {
    return this.liked.some(t => t.id === trackId);
  },

  // Audio actions
  async playTrack(track, trackList = []) {
    if (!track) return;

    // Clean up previous HLS instance
    if (hls) {
      hls.destroy();
      hls = null;
    }
    audio.pause();

    this.currentTrack = track;
    if (trackList && trackList.length) {
      this.queue = [...trackList];
      const idx = this.queue.findIndex(t => t.id === track.id);
      if (idx !== -1) {
        this.queue[idx] = trackToPlay;
        this.currentIndex = idx;
      } else {
        this.currentIndex = this.queue.findIndex(t => t.id === trackToPlay.id);
      }
    } else {
      this.queue = [trackToPlay];
      this.currentIndex = 0;
    }

    this.emit('track-change', this.currentTrack);

    let streamUrl = this.currentTrack.audioUrl;
    if (!streamUrl) {
      try {
        streamUrl = await window.musicStreamingApi.getStream(this.currentTrack.id);
      } catch (err) {
        console.error('Error fetching stream URL', err);
        return;
      }
    }

    if (!streamUrl) {
      console.error('No stream URL found for track', track);
      return;
    }

    // Initialize HLS if the stream is an m3u8 playlist
    if (streamUrl.includes('.m3u8')) {
      if (window.Hls && Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(audio);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          audio.volume = this.volume;
          audio.play().catch(console.error);
        });
      } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native support
        audio.src = streamUrl;
        audio.volume = this.volume;
        audio.play().catch(console.error);
      } else {
        alert('HLS streaming is not supported in this browser.');
      }
    } else {
      audio.src = streamUrl;
      audio.volume = this.volume;
      audio.play().catch(console.error);
    }

    this.isPlaying = true;
    this.emit('play-state-change', true);

    // Add to recently played
    this.addToRecent(track);

    // Fetch lyrics in background
    this.loadLyrics(track);
  },

  togglePlay() {
    if (!this.currentTrack) return;
    if (this.isPlaying) {
      audio.pause();
      this.isPlaying = false;
    } else {
      audio.play().catch(console.error);
      this.isPlaying = true;
    }
    this.emit('play-state-change', this.isPlaying);
  },

  next() {
    if (this.queue.length === 0 || this.currentIndex === -1) return;
    const nextIdx = (this.currentIndex + 1) % this.queue.length;
    this.playTrack(this.queue[nextIdx], this.queue);
  },

  prev() {
    if (this.queue.length === 0 || this.currentIndex === -1) return;
    let prevIdx = this.currentIndex - 1;
    if (prevIdx < 0) prevIdx = this.queue.length - 1;
    this.playTrack(this.queue[prevIdx], this.queue);
  },

  seek(seconds) {
    if (!this.currentTrack) return;
    audio.currentTime = seconds;
  },

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    audio.volume = this.volume;
    this.emit('volume-change', this.volume);
  },

  toggleLoop() {
    this.loop = !this.loop;
    this.emit('loop-state-change', this.loop);
    return this.loop;
  },

  addToRecent(track) {
    let recent = [];
    try {
      recent = JSON.parse(localStorage.getItem('recent_plays')) || [];
    } catch {
      recent = [];
    }
    recent = recent.filter(t => t.id !== track.id);
    recent.unshift(track);
    if (recent.length > 200) recent.pop();
    localStorage.setItem('recent_plays', JSON.stringify(recent));
    this.emit('recent-change', recent);
  },

  async loadLyrics(track) {
    this.lyrics = null;
    this.emit('lyrics-change', null);
    try {
      const data = await window.musicApi.getLyrics(track);
      if (this.currentTrack?.id === track.id) {
        this.lyrics = data?.plainLyrics || data?.syncedLyrics || 'Lyrics not found.';
        this.emit('lyrics-change', this.lyrics);
      }
    } catch {
      if (this.currentTrack?.id === track.id) {
        this.lyrics = 'Lyrics not found.';
        this.emit('lyrics-change', this.lyrics);
      }
    }
  }
};

// Bind HTML5 audio element listeners to our state emitter
audio.addEventListener('timeupdate', () => {
  player.progress = audio.currentTime;
  player.duration = audio.duration || 0;
  player.emit('time-update', { progress: player.progress, duration: player.duration });
  
  // Persist current track play time
  if (player.currentTrack) {
    localStorage.setItem('last_time', audio.currentTime.toString());
  }
});

audio.addEventListener('ended', () => {
  if (player.loop) {
    player.playTrack(player.currentTrack, player.queue);
  } else {
    player.next();
  }
});

audio.addEventListener('error', (e) => {
  console.error('Audio element playback error', e);
});

// Persist track-change events
player.on('track-change', (track) => {
  if (track) {
    localStorage.setItem('last_track_id', track.id);
    localStorage.setItem('last_queue', JSON.stringify(player.queue));
  }
});

window.player = player;

// Asynchronous player state recovery on page reloads
async function restorePlayerState() {
  try {
    const lastTrackId = localStorage.getItem('last_track_id');
    const lastQueueJson = localStorage.getItem('last_queue');
    const lastTime = parseFloat(localStorage.getItem('last_time')) || 0;

    if (lastTrackId) {
      const track = await window.musicStreamingApi.getSongById(lastTrackId);
      if (track) {
        let queue = [];
        try {
          queue = JSON.parse(lastQueueJson) || [track];
        } catch {
          queue = [track];
        }
        
        player.currentTrack = track;
        player.queue = queue;
        player.currentIndex = queue.findIndex(t => t.id === track.id);
        
        // Prepare audio element without starting playback
        audio.src = track.audioUrl;
        audio.currentTime = lastTime;
        player.progress = lastTime;
        
        setTimeout(() => {
          player.emit('track-change', track);
          player.emit('time-update', { progress: lastTime, duration: 0 });
          player.loadLyrics(track);
          
          // Re-open full-screen panel immediately on refresh if route matches
          const hash = window.location.hash || '#/';
          if (hash.startsWith('#/now-playing')) {
            window.openFullscreenPlayer();
          }
        }, 200);
      }
    }
  } catch (e) {
    console.error('Error recovering player state:', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', restorePlayerState);
} else {
  restorePlayerState();
}

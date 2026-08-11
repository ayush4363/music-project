/* Extra UI Micro-Interactions & Scroll Bindings */

document.addEventListener('DOMContentLoaded', () => {
  const contentArea = document.querySelector('.content');
  
  if (contentArea) {
    contentArea.addEventListener('scroll', () => {
      const scrollTop = contentArea.scrollTop;
      
      // Target the image wrapper (holds both the artwork image and the fade mask)
      const heroImgWrapper = document.querySelector('.hero-image-wrapper');
      const heroContent = document.querySelector('.hero-content');
      
      if (heroImgWrapper) {
        // Translate and scale the wrapper so the image and its bottom fade mask stay synced
        const imgScale = Math.max(0.7, 1 - scrollTop * 0.0008);
        const imgTranslate = scrollTop * 0.45;
        
        heroImgWrapper.style.transform = `translateY(${imgTranslate}px) scale(${imgScale})`;
        
        // Apply the opacity fade ONLY to the image itself, keeping the gradient mask solid black
        const heroImg = heroImgWrapper.querySelector('.hero-image');
        if (heroImg) {
          heroImg.style.opacity = Math.max(0.05, 1 - scrollTop * 0.0015);
        }
      }
      
      if (heroContent) {
        // Translate DOWN, scale down, and fade out faster to prevent clashing with scrolled cards
        const textScale = Math.max(0.7, 1 - scrollTop * 0.0012);
        const textTranslate = scrollTop * 0.35;
        const textOpacity = Math.max(0, 1 - scrollTop * 0.0035);
        
        heroContent.style.transform = `translateY(${textTranslate}px) scale(${textScale})`;
        heroContent.style.opacity = textOpacity;
        heroContent.style.transformOrigin = 'left center'; // Keeps text aligned left
      }
    });
  }
});

// Show More Full-Screen Modal Controller
window.openShowMoreModal = (title, items, type) => {
  const modal = document.getElementById('show-more-modal');
  const titleEl = document.getElementById('show-more-modal-title');
  const grid = document.getElementById('show-more-modal-content');
  
  if (!modal || !titleEl || !grid) return;
  
  titleEl.innerText = title;
  window.currentModalItems = items;
  
  if (type === 'songs') {
    grid.innerHTML = items.map(song => `
      <div class="music-card" onclick="playSongFromModal('${song.id}')">
        <div class="music-card-artwork">
          <img src="${song.artwork || song.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop'}" alt="${song.title}" />
          <div class="card-play-overlay">
            <button class="hover-play-btn" onclick="event.stopPropagation(); playSongDirectFromModal('${song.id}')">
              <i data-lucide="play"></i>
            </button>
          </div>
        </div>
        <div class="music-card-meta">
          <span class="music-card-artist">${(song.artist || song.meta || 'Unknown Artist').toUpperCase()}</span>
          <span class="music-card-title">${song.title}</span>
        </div>
      </div>
    `).join('');
  } else if (type === 'playlists') {
    grid.innerHTML = items.map(playlist => `
      <div class="music-card" onclick="navigateToModalPlaylist('${playlist.id}')">
        <div class="music-card-artwork">
          <img src="${playlist.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop'}" alt="${playlist.title}" />
          <div class="card-play-overlay">
            <button class="hover-play-btn" onclick="event.stopPropagation(); playPlaylistDirectFromModal('${playlist.id}')">
              <i data-lucide="play"></i>
            </button>
          </div>
        </div>
        <div class="music-card-meta">
          <span class="music-card-artist">${(playlist.meta || 'Featured').toUpperCase()}</span>
          <span class="music-card-title">${playlist.title}</span>
        </div>
      </div>
    `).join('');
  } else if (type === 'artists') {
    grid.innerHTML = items.map(artist => `
      <div class="artist-card" onclick="navigateToModalArtist('${artist.id}')">
        <div class="artist-card-artwork">
          <img src="${artist.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop'}" alt="${artist.name}" />
        </div>
        <span class="artist-card-name">${artist.name}</span>
      </div>
    `).join('');
  }
  
  modal.style.display = 'block';
  // Trigger animation reflow
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);
  
  lucide.createIcons();
};

window.closeShowMoreModal = () => {
  const modal = document.getElementById('show-more-modal');
  if (!modal) return;
  modal.classList.remove('active');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
};

window.playSongFromModal = (songId) => {
  const songs = window.currentModalItems;
  const track = songs.find(s => s.id === songId);
  if (track) {
    window.player.playTrack(track, songs);
  }
};

window.playSongDirectFromModal = (songId) => {
  window.playSongFromModal(songId);
};

window.playPlaylistDirectFromModal = async (playlistId) => {
  try {
    const playlist = await window.musicStreamingApi.getPlaylist(playlistId);
    if (playlist && playlist.songs && playlist.songs.length) {
      window.player.playTrack(playlist.songs[0], playlist.songs);
    }
  } catch (error) {
    console.error("Error playing playlist from modal:", error);
  }
};

window.navigateToModalPlaylist = (playlistId) => {
  window.closeShowMoreModal();
  window.navigateTo(`#/playlist/${playlistId}`);
};

window.navigateToModalArtist = (artistId) => {
  window.closeShowMoreModal();
  window.navigateTo(`#/artist/${artistId}`);
};

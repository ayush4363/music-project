/* SPA Hash Router */

const routes = {
  '': () => window.renderHome && window.renderHome(),
  '/': () => window.renderHome && window.renderHome(),
  '/search': () => window.renderSearch && window.renderSearch(),
  '/library': () => window.renderLibrary && window.renderLibrary(),
  '/downloads': () => window.renderDownloadsPage && window.renderDownloadsPage(),
  '/socials': () => window.renderSocials && window.renderSocials(),
  '/profile': () => window.renderProfile && window.renderProfile(),
  '/playlist': (id) => window.renderPlaylistDetail && window.renderPlaylistDetail(id),
  '/artist': (id) => window.renderArtistDetail && window.renderArtistDetail(id),
  '/album': (id) => window.renderAlbumDetail && window.renderAlbumDetail(id),
  '/now-playing': () => window.openFullscreenPlayer && window.openFullscreenPlayer()
};

function router() {
  const hash = window.location.hash || '#/';
  let path = hash.substring(1); // Remove the '#' symbol
  
  // Strip query parameters for routing lookup (e.g. ?q=Arijit)
  const questionMarkIdx = path.indexOf('?');
  if (questionMarkIdx !== -1) {
    path = path.substring(0, questionMarkIdx);
  }

  // Normalize trailing slash
  if (path.length > 1 && path.endsWith('/')) {
    path = path.substring(0, path.length - 1);
  }

  // Collapse fullscreen player if we route away from /now-playing
  const fsPlayer = document.getElementById('fullscreen-player');
  if (path !== '/now-playing') {
    fsPlayer?.classList.remove('active');
  }
  
  // Update sidebar active link highlights
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  sidebarLinks.forEach(link => {
    const linkHref = link.getAttribute('href');
    if (!linkHref) return;
    const linkPath = linkHref.substring(1);
    
    // Check matching routes
    if (linkPath === '/' && (path === '/' || path === '')) {
      link.classList.add('active');
    } else if (linkPath !== '/' && path.startsWith(linkPath)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Close mobile navigation sidebar when switching route
  document.querySelector('.sidebar')?.classList.remove('mobile-open');

  // Handle parameters (e.g., #/playlist/12345)
  let handler = routes[path];
  let param = null;
  
  if (!handler) {
    const parts = path.split('/');
    if (parts.length > 2) {
      const baseRoute = '/' + parts[1]; // e.g. /playlist
      handler = routes[baseRoute];
      param = parts.slice(2).join('/');
    }
  }

  // Reset scroll position on page transition
  const contentEl = document.querySelector('.content');
  if (contentEl) contentEl.scrollTop = 0;

  // Display skeletons while waiting for data
  const container = document.getElementById('main-viewport');
  if (container) {
    container.innerHTML = `
      <div class="page" style="opacity: 0.8;">
        <div class="skeleton-shimmer" style="height: 300px; border-radius: 20px; margin-bottom: 48px; background: linear-gradient(90deg, #101010 25%, #181818 50%, #101010 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
        <div class="skeleton-shimmer" style="height: 32px; width: 240px; border-radius: 6px; margin-bottom: 24px; background: linear-gradient(90deg, #101010 25%, #181818 50%, #101010 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 24px;">
          ${Array(5).fill(0).map(() => `
            <div style="display:flex; flex-direction:column; gap:12px;">
              <div class="skeleton-shimmer" style="width:100%; aspect-ratio:1/1; border-radius:12px; background: linear-gradient(90deg, #101010 25%, #181818 50%, #101010 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
              <div class="skeleton-shimmer" style="height:12px; width:60%; border-radius:4px; background: linear-gradient(90deg, #101010 25%, #181818 50%, #101010 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
              <div class="skeleton-shimmer" style="height:14px; width:80%; border-radius:4px; background: linear-gradient(90deg, #101010 25%, #181818 50%, #101010 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Execute actual route render
  if (handler) {
    handler(param);
  } else {
    if (container) {
      container.innerHTML = `
        <div class="page" style="text-align: center; padding-top: 80px;">
          <h2 style="font-size: 32px; margin-bottom: 16px;">404 Page Not Found</h2>
          <p style="color: var(--text-secondary); margin-bottom: 32px;">The page you are trying to visit is not available.</p>
          <a href="#/" class="login-btn" style="text-decoration:none; display:inline-block;">Go Back Home</a>
        </div>
      `;
    }
  }
}

// Expose router globally
  window.router = router;

  // Bind router to navigation events
  window.addEventListener('hashchange', router);
  window.addEventListener('DOMContentLoaded', router);

  // Expose navigate function helper
  window.navigateTo = (hashPath) => {
    window.location.hash = hashPath;
  };

/* AYU.music — JioSaavn API with DES stream decryption
 * All requests go via corsproxy.io (required for CORS).
 * Audio stream URLs are decrypted using DES/ECB with key "38346591".
 */

// ─── CORS Proxy ───────────────────────────────────────────────────────────────
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.hostname === '';

const CORS_PROXY = isLocalhost 
  ? 'https://corsproxy.io/?' 
  : '/saavn-api';

const JIOSAAVN_BASE = 'https://www.jiosaavn.com/api.php';
const LRCLIB_BASE   = 'https://lrclib.net/api';

// ─── DES Stream Decryption ────────────────────────────────────────────────────
// JioSaavn encrypts all media URLs with DES/ECB/PKCS7, key = "38346591"
function decryptSaavnUrl(encryptedBase64) {
  if (!encryptedBase64) return '';
  try {
    if (typeof CryptoJS === 'undefined') {
      console.warn('[API] CryptoJS not loaded — cannot decrypt stream URL');
      return '';
    }
    const key       = CryptoJS.enc.Utf8.parse('38346591');
    const cipherObj = { ciphertext: CryptoJS.enc.Base64.parse(encryptedBase64) };
    const decrypted = CryptoJS.DES.decrypt(cipherObj, key, {
      mode:    CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });
    const url = decrypted.toString(CryptoJS.enc.Utf8);
    if (!url || !url.startsWith('http')) return '';
    // Upgrade to 320kbps where possible (JioSaavn CDN supports _96, _160, _320)
    return url
      .replace(/_96\.mp4$/,  '_320.mp4')
      .replace(/_48\.mp4$/,  '_320.mp4')
      .replace(/_160\.mp4$/, '_320.mp4');
  } catch (e) {
    console.error('[API] DES decryption failed:', e.message);
    return '';
  }
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────
async function saavnFetch(callName, extraParams = {}) {
  const params = new URLSearchParams({
    __call: callName,
    _format: 'json',
    _marker: '0',
    api_version: '4',
    ctx: 'web6dot0',
  });
  Object.entries(extraParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });

  // Build final URL depending on proxy strategy
  const finalUrl = isLocalhost 
    ? `${CORS_PROXY}${JIOSAAVN_BASE}?${params.toString()}` 
    : `${CORS_PROXY}?${params.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res  = await fetch(finalUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

// ─── Normalizers ──────────────────────────────────────────────────────────────
function decodeHtml(str) {
  if (!str) return '';
  try { const t = document.createElement('textarea'); t.innerHTML = str; return t.value; } catch { return str; }
}

const upgradeImg = url => url ? url.replace(/\d+x\d+/g, '500x500') : '';

const fmtDuration = s => {
  const n = parseInt(s, 10) || 0;
  return `${Math.floor(n / 60)}:${(n % 60).toString().padStart(2, '0')}`;
};

function normalizeSong(song) {
  if (!song?.id) return null;
  const info     = song.more_info || {};
  const parts    = (song.subtitle || '').split(' - ');
  const artist   = parts[0] || info.music || 'Unknown';
  const album    = parts.slice(1).join(' - ') || info.album || '';
  const audioUrl = decryptSaavnUrl(info.encrypted_media_url);

  return {
    id:       song.id,
    sourceId: song.id,
    title:    decodeHtml(song.title || 'Untitled'),
    artwork:  upgradeImg(song.image) || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop',
    artist:   decodeHtml(artist),
    artistId: '',
    album:    decodeHtml(album),
    albumId:  info.album_id || '',
    duration: fmtDuration(info.duration),
    language: song.language ? song.language[0].toUpperCase() + song.language.slice(1) : '',
    audioUrl,
    encryptedUrl: info.encrypted_media_url || '',
    lyrics:   null,
  };
}

const normalizeArtist  = a => a ? ({ id: a.id || String(Math.random()), name: a.name || a.title || '', image: upgradeImg(a.image), followers: '1M+' }) : null;
const normalizePlaylist = p => p ? ({ id: p.id, title: p.title || '', description: p.subtitle || '', image: upgradeImg(p.image), meta: p.more_info?.song_count ? `${p.more_info.song_count} songs` : 'Playlist', type: 'playlist' }) : null;
const normalizeAlbum    = a => a ? ({ id: a.id, title: a.title || '', description: a.subtitle || '', image: upgradeImg(a.image), meta: a.year ? `Album · ${a.year}` : 'Album', type: 'album' }) : null;

window.getArtistRealImage = (name, fallbackImage) => {
  if (!name) return fallbackImage;
  const key = name.toLowerCase().trim();
  
  // Try matching in cache first
  if (window._artistCache) {
    const cached = Object.values(window._artistCache).find(
      a => a && a.name && a.name.toLowerCase() === key
    );
    if (cached && cached.image) return cached.image;
  }
  
  // High-quality, stable Unsplash fallback portrait maps for common artists when profile calculates them from song list
  const UNSPLASH_ARTISTS = {
    "arijit singh": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
    "shreya ghoshal": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop",
    "sonu nigam": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop",
    "pritam": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
    "mithoon": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop",
    "diljit dosanjh": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=150&auto=format&fit=crop",
    "jubin nautiyal": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&auto=format&fit=crop",
    "neha kakkar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop"
  };
  
  if (UNSPLASH_ARTISTS[key]) {
    return UNSPLASH_ARTISTS[key];
  }
  
  return fallbackImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop';
};

const dedupeKey = (t, a) => `${(t||'').toLowerCase().replace(/[^\w]/g,'')}||${(a||'').toLowerCase().replace(/[^\w]/g,'')}`;

// ─── LRCLIB lyrics ────────────────────────────────────────────────────────────
async function lrclibReq(path, params = {}) {
  try {
    const url = new URL(`${LRCLIB_BASE}${path}`);
    Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, v));
    const res = await fetch(url, { headers: { 'Lrclib-Client': 'ayu-music/1.0' } });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ─── musicStreamingApi ────────────────────────────────────────────────────────
const musicStreamingApi = {

  searchSongs: async (query, page = 0, limit = 20) => {
    try {
      const data = await saavnFetch('search.getResults', { q: query, n: Math.min(limit, 50), p: page + 1 });
      const songs = (data?.results || []).map(normalizeSong).filter(Boolean);
      const seen  = new Set();
      return songs.filter(s => { const k = dedupeKey(s.title, s.artist); return seen.has(k) ? false : (seen.add(k), true); });
    } catch (e) { console.error('[API] searchSongs:', e.message); return []; }
  },

  searchAlbums:   async (q, p = 0, n = 20) => { try { return ((await saavnFetch('search.getAlbumResults',    { q, n, p: p+1 }))?.results || []).map(normalizeAlbum).filter(Boolean); }   catch { return []; } },
  searchArtists:  async (q, p = 0, n = 20) => { try { return ((await saavnFetch('search.getArtistResults',   { q, n, p: p+1 }))?.results || []).map(normalizeArtist).filter(Boolean); }  catch { return []; } },
  searchPlaylists:async (q, p = 0, n = 20) => { try { return ((await saavnFetch('search.getPlaylistResults', { q, n, p: p+1 }))?.results || []).map(normalizePlaylist).filter(Boolean); } catch { return []; } },

  search: async (query) => {
    const [songs, albums, artists, playlists] = await Promise.allSettled([
      musicStreamingApi.searchSongs(query, 0, 10),
      musicStreamingApi.searchAlbums(query, 0, 6),
      musicStreamingApi.searchArtists(query, 0, 6),
      musicStreamingApi.searchPlaylists(query, 0, 6),
    ]);
    return {
      songs:     songs.value     || [],
      albums:    albums.value    || [],
      artists:   artists.value   || [],
      playlists: playlists.value || [],
    };
  },

  getSongById: async (id) => {
    try {
      const data   = await saavnFetch('song.getDetails', { pids: id });
      const rawSong = data?.[id] || Object.values(data || {})[0];
      return rawSong ? normalizeSong(rawSong) : null;
    } catch (e) { console.error('[API] getSongById:', e.message); return null; }
  },

  getStream: async (id) => {
    try {
      const data   = await saavnFetch('song.getDetails', { pids: id });
      const rawSong = data?.[id] || Object.values(data || {})[0];
      const enc    = rawSong?.more_info?.encrypted_media_url;
      return enc ? decryptSaavnUrl(enc) : null;
    } catch { return null; }
  },

  getLyrics:    async (id) => { try { return (await saavnFetch('lyrics.getLyrics', { lyrics_id: id }))?.lyrics || null; } catch { return null; } },
  getSuggestions: async (id, limit = 15) => {
    const song = await musicStreamingApi.getSongById(id).catch(() => null);
    if (!song) return [];
    return musicStreamingApi.searchSongs(song.artist, 0, limit).catch(() => []);
  },

  getPlaylist: async (id) => {
    try {
      const d = await saavnFetch('playlist.getDetails', { listid: id });
      return { id, title: d?.title||'', description: d?.subtitle||'', image: upgradeImg(d?.image||''), meta:`${d?.list_count||0} songs`, type:'playlist', songs:(d?.list||[]).map(normalizeSong).filter(Boolean) };
    } catch { return { id, title:'Playlist', image:'', description:'', songs:[] }; }
  },

  getAlbum: async (id) => {
    try {
      const d = await saavnFetch('content.getAlbumDetails', { albumid: id });
      return { id, title:d?.title||'', description:d?.subtitle||'', image:upgradeImg(d?.image||''), meta:`Album · ${d?.year||''}`, type:'album', songs:(d?.list||[]).map(normalizeSong).filter(Boolean) };
    } catch { return { id, title:'Album', image:'', description:'', songs:[] }; }
  },

  getArtist: async (id) => {
    try {
      const sid = String(id);
      const isNumeric = /^\d+$/.test(sid);

      // ── Step 1: Get artist name & image ───────────────────────────────────────────
      // Check artist cache first by ID, name string, or search name values
      let cached = window._artistCache?.[sid] || window._artistCache?.[sid.toLowerCase()];
      if (!cached && window._artistCache) {
        cached = Object.values(window._artistCache).find(
          a => a && a.name && a.name.toLowerCase() === sid.toLowerCase()
        );
      }
      
      let artistName = cached?.name || cached?._searchName || null;
      let artistImage = cached?.image || '';
      let followers   = cached?.followers || '1M+';

      // For slug/name IDs, convert directly to a readable name
      if (!artistName && !isNumeric) {
        artistName = sid.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }

      // If we don't have a cached image, try to get a high-quality fallback or real image
      if (!artistImage && artistName) {
        artistImage = window.getArtistRealImage(artistName, '');
      }

      // ── Step 2: If still no name, check homeArtists array ────────────────────
      if (!artistName && window.homeArtists) {
        const found = window.homeArtists.find(a => String(a?.id) === sid || a?.name?.toLowerCase() === sid.toLowerCase());
        if (found) {
          artistName  = found.name || found._searchName;
          artistImage = found.image || window.getArtistRealImage(artistName, '');
        }
      }

      // ── Step 3: Search songs using the artist name ────────────────────────────
      if (artistName) {
        const songs = await musicStreamingApi.searchSongs(artistName, 0, 50).catch(() => []);
        songs.forEach(s => { if (s?.id) (window._songCache = window._songCache || {})[s.id] = s; });
        // Use first song's artwork as artist image if we don't have one
        if (!artistImage && songs[0]?.artwork) artistImage = songs[0].artwork;
        return { id, name: artistName, image: artistImage, followers, bio: '', songs, albums: [] };
      }

      // ── Step 4: Numeric ID we can't resolve — search by ID as last resort ─────
      console.warn(`[API] getArtist: no name found for id=${id}, using raw search`);
      const fallbackSongs = await musicStreamingApi.searchSongs(sid, 0, 20).catch(() => []);
      fallbackSongs.forEach(s => { if (s?.id) (window._songCache = window._songCache || {})[s.id] = s; });
      return { id, name: `Artist ${sid}`, image: '', followers: '1M+', bio: '', songs: fallbackSongs, albums: [] };

    } catch (e) {
      console.error('[API] getArtist failed:', e.message);
      return { id, name: String(id), image: '', followers: '0', songs: [], albums: [] };
    }
  },

};

// ─── musicApi ─────────────────────────────────────────────────────────────────
const musicApi = {
  getHome: async (language = 'English') => {
    const safe = fn => fn().catch(() => []);
    try {
      // Determine playlist query based on selected language
      const playlistQuery = language === 'Hindi' ? 'hindi hits' : 'best english playlists';
      
      // Use diverse artist-specific queries so each section has DIFFERENT artwork
      const [
        arijit, sonu, rahman, kishore, shreya,
        taylor, ed, weeknd, billie,
        punjabi, playlists,
      ] = await Promise.all([
        safe(() => musicStreamingApi.searchSongs('Arijit Singh',    0, 12)),
        safe(() => musicStreamingApi.searchSongs('Sonu Nigam',      0, 12)),
        safe(() => musicStreamingApi.searchSongs('A.R. Rahman',     0, 12)),
        safe(() => musicStreamingApi.searchSongs('Kishore Kumar',   0, 12)),
        safe(() => musicStreamingApi.searchSongs('Shreya Ghoshal',  0, 12)),
        safe(() => musicStreamingApi.searchSongs('Taylor Swift',    0, 12)),
        safe(() => musicStreamingApi.searchSongs('Ed Sheeran',      0, 12)),
        safe(() => musicStreamingApi.searchSongs('The Weeknd',      0, 12)),
        safe(() => musicStreamingApi.searchSongs('Billie Eilish',   0, 12)),
        safe(() => musicStreamingApi.searchSongs('Diljit Dosanjh',  0, 12)),
        safe(() => musicStreamingApi.searchPlaylists(playlistQuery,  0, 6)),
      ]);

      const hindi   = [...arijit, ...sonu, ...shreya, ...rahman].slice(0, 20);
      const english = [...taylor, ...ed, ...weeknd, ...billie].slice(0, 20);
      const topHits = [...hindi, ...english, ...punjabi];

      // Build deduplicated recommended list with VARIED artwork
      const seenRec = new Set();
      const recommended = [];
      [arijit, taylor, sonu, ed, shreya, weeknd, rahman, billie]
        .flat()
        .forEach(s => {
          if (recommended.length >= 24) return;
          const k = dedupeKey(s.title, s.artist);
          if (!seenRec.has(k)) { seenRec.add(k); recommended.push(s); }
        });

      const trending    = [...arijit.slice(0,4), ...taylor.slice(0,4), ...sonu.slice(0,4)];
      const newReleases = [...rahman.slice(0,5), ...ed.slice(0,5), ...punjabi.slice(0,5)];

      const firstPl = playlists?.[0];
      const hero = {
        label:       'TRENDING PLAYLIST',
        title:       firstPl?.title || 'Hindi Hits',
        description: firstPl?.description || 'The biggest Bollywood hits.',
        image:       firstPl?.image || arijit[0]?.artwork ||
                     'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
      };

      // Build artist list with different artists
      const artistList = [
        { id: 'arijit-singh',   name: 'Arijit Singh',   image: arijit[0]?.artwork  || '', followers: '30M+' },
        { id: 'sonu-nigam',     name: 'Sonu Nigam',     image: sonu[0]?.artwork    || '', followers: '15M+' },
        { id: 'shreya-ghoshal', name: 'Shreya Ghoshal', image: shreya[0]?.artwork  || '', followers: '20M+' },
        { id: 'a-r-rahman',     name: 'A.R. Rahman',    image: rahman[0]?.artwork  || '', followers: '25M+' },
        { id: 'taylor-swift',   name: 'Taylor Swift',   image: taylor[0]?.artwork  || '', followers: '50M+' },
        { id: 'ed-sheeran',     name: 'Ed Sheeran',     image: ed[0]?.artwork      || '', followers: '45M+' },
        { id: 'the-weeknd',     name: 'The Weeknd',     image: weeknd[0]?.artwork  || '', followers: '40M+' },
        { id: 'diljit-dosanjh', name: 'Diljit Dosanjh', image: punjabi[0]?.artwork || '', followers: '10M+' },
      ];

      console.log(`[Home] rec=${recommended.length}, hindi=${hindi.length}, english=${english.length}, punjabi=${punjabi.length}`);
      return { hero, recommended, trending, topHits, newReleases, hindi, english, artists: artistList, playlists };
    } catch (e) {
      console.error('[Home] getHome error:', e);
      return { hero:{ label:'MUSIC', title:'Top Hits', description:'Listen now.', image:'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop' }, recommended:[], trending:[], topHits:[], newReleases:[], hindi:[], english:[], artists:[], playlists:[] };
    }
  },

  getSongsByLanguage: async (language) => musicStreamingApi.searchSongs(language === 'All' ? 'hits' : `${language} hits`, 0, 30).catch(() => []),
  search:     async (q) => musicStreamingApi.search(q).catch(() => ({ songs:[], artists:[], playlists:[], albums:[] })),
  getArtist:  async (id) => musicStreamingApi.getArtist(id).catch(() => ({ id, name:'Unknown', image:'', followers:'0', songs:[], albums:[] })),
  getPlaylist:async (id) => musicStreamingApi.getPlaylist(id).catch(() => ({ id, title:'Playlist', image:'', description:'', songs:[] })),
  getAlbum:   async (id) => musicStreamingApi.getAlbum(id).catch(() => ({ id, title:'Album', image:'', description:'', songs:[] })),

  getLyrics: async (song) => {
    const title  = (song.title  || '').replace(/\s*[\(\[\{].*?[\)\]\}]/g, '').replace(/\s*-\s*.*$/, '').trim();
    const artist = (song.artist || '').split(/[,&]/)[0].trim();
    try {
      // Query with both title and artist to prevent mismatching lyrics of same-named songs
      const res = await lrclibReq('/search', { q: `${title} ${artist}` });
      if (Array.isArray(res) && res.length) {
        const s = res.find(r => r.syncedLyrics?.length > 30) || res.find(r => r.plainLyrics?.length > 30);
        if (s) return s;
      }
    } catch {}
    try {
      const res = await lrclibReq('/get', { track_name: title, artist_name: artist });
      if (res?.syncedLyrics || res?.plainLyrics) return res;
    } catch {}
    return null;
  },
};

// ─── Expose ───────────────────────────────────────────────────────────────────
window.musicStreamingApi = musicStreamingApi;
window.musicApi          = musicApi;
console.log('[AYU.music] API ready. CryptoJS available:', typeof CryptoJS !== 'undefined');

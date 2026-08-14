function decodeHtmlEntities(str) {
  if (!str) return '';
  if (typeof document === 'undefined') return str;
  const temp = document.createElement('textarea');
  temp.innerHTML = str;
  return temp.value;
}

const getDedupeKey = (title, artist) => {
  const cleanTitle = title
    .toLowerCase()
    .replace(/\s*[\(\[][^)\]]*(from|feat|remix|version|male|female|video|lately|ost|soundtrack)[^)\]]*[\)\]]/gi, '')
    .replace(/\s*-\s*(from|feat|remix|version|male|female|video|ost|soundtrack).*/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  const cleanArtist = artist
    .toLowerCase()
    .split(/[\s,;&~\-]/)
    .filter(w => w && w !== 'and' && w !== 'with')
    .sort()
    .join(' ');
    
  return `${cleanTitle} - ${cleanArtist}`;
};


const BASE_URL = 'https://api.music.vispark.in';
const LRCLIB_BASE_URL = 'https://lrclib.net/api';

async function request(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Music API request failed (${response.status})`);
  const payload = await response.json();
  if (payload.success === false) throw new Error(payload.message || 'Music API request failed');
  return payload.data;
}

async function lrclibRequest(path, params = {}) {
  const url = new URL(`${LRCLIB_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  const response = await fetch(url, { headers: { 'Lrclib-Client': 'resonance/1.0 (music-player)' } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Lyrics request failed (${response.status})`);
  return response.json();
}

const bestImage = images => images?.find(image => image.quality === '500x500')?.url || images?.at(-1)?.url || '';
const bestAudio = urls => urls?.find(item => item.quality === '320kbps')?.url || urls?.at(-1)?.url || '';

const formatArtist = artists => {
  if (typeof artists === 'string') return artists;
  if (Array.isArray(artists)) return artists.map(a => a.name || a).join(', ');
  return artists?.primary?.map(artist => artist.name).join(', ') || '';
};

const formatDuration = seconds => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const normalizeTrack = track => {
  const artistName = formatArtist(track.artists) || track.primaryArtists || track.singers || 'Unknown artist';
  const artistId = track.artists?.primary?.[0]?.id || '';
  const albumName = typeof track.album === 'object' ? track.album?.name : track.album;
  const albumId = typeof track.album === 'object' ? track.album?.id : '';
  return {
    id: track.id,
    sourceId: track.id,
    title: decodeHtmlEntities(track.name || track.title || 'Untitled'),
    artwork: bestImage(track.image),
    artist: decodeHtmlEntities(artistName),
    artistId,
    album: decodeHtmlEntities(albumName || ''),
    albumId,
    duration: formatDuration(track.duration),
    language: track.language ? track.language.charAt(0).toUpperCase() + track.language.slice(1).toLowerCase() : '',
    audioUrl: bestAudio(track.downloadUrl),
    lyrics: null,
  };
};

const normalizeArtist = artist => ({
  id: artist.id,
  name: artist.name || artist.title || '',
  image: bestImage(artist.image),
  followers: artist.followerCount || artist.fanCount || '1.2M',
});

const normalizePlaylist = playlist => ({
  id: playlist.id,
  title: playlist.name || playlist.title || '',
  description: playlist.description || '',
  image: bestImage(playlist.image),
  meta: playlist.songCount ? `${playlist.songCount} songs` : playlist.description || 'Playlist',
  type: 'playlist',
});

const normalizeAlbum = album => ({
  id: album.id,
  title: album.name || album.title || '',
  description: album.description || '',
  image: bestImage(album.image),
  meta: album.year ? `Album · ${album.year}` : 'Album',
  type: 'album',
});

const musicStreamingApi = {
  search: async query => {
    const data = await request('/api/search', { query });
    return {
      songs: data.songs?.results?.map(normalizeTrack) || [],
      albums: data.albums?.results?.map(normalizeAlbum) || [],
      artists: data.artists?.results?.map(normalizeArtist) || [],
      playlists: data.playlists?.results?.map(normalizePlaylist) || [],
    };
  },
  
  searchSongs: async (query, page = 0, limit = 20) => {
    const results = (await request('/api/search/songs', { query, page, limit }))?.results?.map(normalizeTrack) || [];
    const seen = new Set();
    return results.filter(song => {
      const key = getDedupeKey(song.title, song.artist);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },
  searchAlbums: async (query, page = 0, limit = 20) => (await request('/api/search/albums', { query, page, limit }))?.results?.map(normalizeAlbum) || [],
  searchArtists: async (query, page = 0, limit = 20) => (await request('/api/search/artists', { query, page, limit }))?.results?.map(normalizeArtist) || [],
  searchPlaylists: async (query, page = 0, limit = 20) => (await request('/api/search/playlists', { query, page, limit }))?.results?.map(normalizePlaylist) || [],

  getSongById: async id => (await request(`/api/songs/${id}`))?.map(normalizeTrack)?.[0] || null,
  getStream: async id => bestAudio((await request(`/api/songs/${id}`))?.[0]?.downloadUrl),
  getLyrics: async id => {
    try {
      const data = await request(`/api/songs/${id}/lyrics`);
      return data?.lyrics || null;
    } catch {
      return null;
    }
  },
  getSuggestions: async (id, limit = 15) => (await request(`/api/songs/${id}/suggestions`, { id, limit }))?.map(normalizeTrack) || [],

  getPlaylist: async id => {
    const data = await request('/api/playlists', { id });
    return {
      ...normalizePlaylist(data),
      songs: data.songs?.map(normalizeTrack) || [],
    };
  },
  getAlbum: async id => {
    const data = await request('/api/albums', { id });
    return {
      ...normalizeAlbum(data),
      songs: data.songs?.map(normalizeTrack) || [],
    };
  },
  getArtist: async id => {
    const data = await request(`/api/artists/${id}`);
    const normArtist = normalizeArtist(data);
    let songs = data.topSongs?.map(normalizeTrack) || [];
    try {
      // Query 6 pages in parallel (limit 50 each) to build a massive pool of 300 tracks, 
      // which deduplicates into 100+ unique tracks!
      const pages = [0, 1, 2, 3, 4, 5];
      const results = await Promise.all(
        pages.map(page => musicStreamingApi.searchSongs(normArtist.name, page, 50))
      );
      const searchRes = results.flat();
      if (searchRes && searchRes.length) {
        const seenKeys = new Set(songs.map(s => getDedupeKey(s.title, s.artist)));
        searchRes.forEach(s => {
          const key = getDedupeKey(s.title, s.artist);
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            songs.push(s);
          }
        });
      }
    } catch (err) {
      console.error("Error fetching all artist songs:", err);
    }
    return {
      ...normArtist,
      bio: data.bio?.[0]?.text || '',
      songs: songs,
      albums: data.topAlbums?.map(normalizeAlbum) || [],
    };
  },
};

const musicApi = {
  getHome: async () => {
    const safeFetchSongs = (q, limit = 12) => musicStreamingApi.searchSongs(q, 0, limit).catch(() => []);
    const safeFetchArtists = (q, limit = 8) => musicStreamingApi.searchArtists(q, 0, limit).catch(() => []);
    const safeFetchPlaylists = (q, limit = 6) => musicStreamingApi.searchPlaylists(q, 0, limit).catch(() => []);

    try {
      const [rec, trend, hindi, english, punjabi, artistsRes, playlistsRes] = await Promise.all([
        safeFetchSongs("chill vibes", 8),
        safeFetchSongs("trending", 12),
        safeFetchSongs("Hindi hits", 12),
        safeFetchSongs("English hits", 12),
        safeFetchSongs("Punjabi hits", 12),
        safeFetchArtists("top singers", 8),
        safeFetchPlaylists("popular hits", 6)
      ]);

      const topHits = [...hindi, ...english, ...punjabi];
      const recommended = rec.length ? rec : (topHits.length ? topHits.slice(0, 8) : []);
      const trending = trend.length ? trend : (topHits.length ? topHits.slice(4, 12) : []);
      const newReleases = [...hindi.slice(3, 8), ...english.slice(3, 8), ...punjabi.slice(3, 8)];

      const firstPlaylist = playlistsRes?.[0] || { title: 'Bollywood Hits', description: 'Trending Indian and global sounds.', image: '' };
      const hero = {
        label: 'TRENDING PLAYLIST',
        title: firstPlaylist.title,
        description: firstPlaylist.description || 'The biggest new sounds, all in one place.',
        image: firstPlaylist.image || (topHits[0]?.artwork) || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
      };

      return {
        hero,
        recommended,
        trending,
        topHits,
        newReleases,
        artists: artistsRes,
        playlists: playlistsRes,
      };
    } catch (e) {
      console.error('getHome error', e);
      // Fail-safe fallback data so page always renders content
      const fallbackSongs = [
        { id: 'fb1', title: 'Kesariya', artist: 'Pritam, Arijit Singh', artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop', audioUrl: '' },
        { id: 'fb2', title: 'Apna Bana Le', artist: 'Arijit Singh, Sachin-Jigar', artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop', audioUrl: '' },
        { id: 'fb3', title: 'Tum Hi Ho', artist: 'Arijit Singh, Mithoon', artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop', audioUrl: '' }
      ];
      return {
        hero: { label: 'TRENDING MUSIC', title: 'Top Hits', description: 'Listen to the biggest hits.', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop' },
        recommended: fallbackSongs,
        trending: fallbackSongs,
        topHits: fallbackSongs,
        newReleases: fallbackSongs,
        artists: [],
        playlists: [],
      };
    }
  },

  getSongsByLanguage: async (language) => {
    try {
      const query = language === 'All' ? 'hits' : `${language} hits`;
      return await musicStreamingApi.searchSongs(query, 0, 30);
    } catch {
      return [];
    }
  },

  search: async (query) => {
    try {
      const results = await musicStreamingApi.search(query);
      return {
        songs: results.songs || [],
        artists: results.artists || [],
        playlists: results.playlists || [],
        albums: results.albums || []
      };
    } catch {
      return { songs: [], artists: [], playlists: [], albums: [] };
    }
  },

  getArtist: async (id) => {
    try {
      return await musicStreamingApi.getArtist(id);
    } catch (e) {
      console.error(e);
      return { id, name: 'Unknown Artist', image: '', followers: '0', songs: [], albums: [] };
    }
  },

  getPlaylist: async (id) => {
    try {
      return await musicStreamingApi.getPlaylist(id);
    } catch (e) {
      console.error(e);
      return { id, title: 'Unknown Playlist', image: '', description: '', songs: [] };
    }
  },

  getAlbum: async (id) => {
    try {
      return await musicStreamingApi.getAlbum(id);
    } catch (e) {
      console.error(e);
      return { id, title: 'Unknown Album', image: '', description: '', songs: [] };
    }
  },

  getLyrics: async (song) => {
    const duration = typeof song.duration === 'string' 
      ? song.duration.split(':').reduce((acc, time) => (60 * acc) + parseInt(time, 10), 0)
      : typeof song.duration === 'number' ? song.duration : undefined;

    const cleanTitle = (song.title || '')
      .replace(/\s*[\(\[\{].*?[\)\]\}]/g, '')
      .replace(/\s*-\s*.*$/, '')
      .trim();

    const artistsList = (song.artist || '')
      .split(/[,&]/)
      .map(s => s.replace(/\s*-\s*.*$/, '').trim())
      .filter(Boolean);

    const mainArtist = artistsList[0] || '';
    const secondArtist = artistsList[1] || '';

    // 1. Try search LRCLIB with cleanTitle first for guaranteed synced lyrics
    try {
      const searchRes = await lrclibRequest('/search', { q: cleanTitle });
      if (Array.isArray(searchRes) && searchRes.length > 0) {
        const syncedMatch = searchRes.find(item => item.syncedLyrics && item.syncedLyrics.trim().length > 30);
        if (syncedMatch) return syncedMatch;
      }
    } catch {}

    // 2. Try search LRCLIB with cleanTitle + each artist variant
    for (const artistItem of artistsList) {
      if (!artistItem) continue;
      try {
        const searchRes = await lrclibRequest('/search', { q: `${cleanTitle} ${artistItem}`.trim() });
        if (Array.isArray(searchRes) && searchRes.length > 0) {
          const syncedMatch = searchRes.find(item => item.syncedLyrics && item.syncedLyrics.trim().length > 30);
          if (syncedMatch) return syncedMatch;
        }
      } catch {}
    }

    // 3. Try exact /get variants
    const queryVariants = [
      { track_name: cleanTitle, artist_name: mainArtist },
      { track_name: cleanTitle, artist_name: secondArtist },
      { track_name: cleanTitle }
    ];

    for (const params of queryVariants) {
      if (!params.track_name) continue;
      try {
        const query = { ...params };
        if (duration) query.duration = duration;
        const res = await lrclibRequest('/get', query);
        if (res && (res.syncedLyrics || res.plainLyrics)) {
          return res;
        }
      } catch {}
    }

    // 4. Fallback to Saavn plain lyrics
    if (song.id) {
      const lyrics = await musicStreamingApi.getLyrics(song.id).catch(() => null);
      if (lyrics) {
        return { plainLyrics: lyrics };
      }
    }

    return null;
  },
};

window.musicStreamingApi = musicStreamingApi;
window.musicApi = musicApi;

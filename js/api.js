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


// Robust Cache Engine with localStorage/sessionStorage persistence and memory backup
const apiCache = {
  memory: new Map(),
  
  get(key) {
    // 1. Try LocalStorage (persists across sessions)
    try {
      const dataStr = localStorage.getItem(key);
      if (dataStr) {
        const { value, expiry } = JSON.parse(dataStr);
        if (Date.now() < expiry) return value;
      }
    } catch (e) {}

    // 2. Try SessionStorage
    try {
      const dataStr = sessionStorage.getItem(key);
      if (dataStr) {
        const { value, expiry } = JSON.parse(dataStr);
        if (Date.now() < expiry) return value;
      }
    } catch (e) {}

    // 3. Memory fallback
    const memItem = this.memory.get(key);
    if (memItem) {
      if (Date.now() < memItem.expiry) return memItem.value;
    }
    return null;
  },

  // Returns expired cached data if we are offline or api fails
  getFallback(key) {
    try {
      const dataStr = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (dataStr) {
        const { value } = JSON.parse(dataStr);
        return value;
      }
    } catch (e) {}
    
    const memItem = this.memory.get(key);
    return memItem ? memItem.value : null;
  },

  set(key, value, ttlMinutes = 20) {
    const ttlMs = ttlMinutes * 60 * 1000;
    const expiry = Date.now() + ttlMs;
    const cacheObj = { value, expiry };
    
    // Save in Memory
    this.memory.set(key, cacheObj);

    // Save in SessionStorage
    try {
      sessionStorage.setItem(key, JSON.stringify(cacheObj));
    } catch (e) {}

    // Save in LocalStorage
    try {
      localStorage.setItem(key, JSON.stringify(cacheObj));
    } catch (e) {}
  }
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

  const cacheKey = `music_cache_${url.toString()}`;
  
  // 1. Try Cache
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. Fetch from API with 2 retries
  let retries = 2;
  let lastError = null;
  
  while (retries >= 0) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status}`);
      }
      const payload = await response.json();
      if (payload.success === false) {
        throw new Error(payload.message || 'API responded with success: false');
      }
      
      // Store in cache (cache for 20 minutes)
      apiCache.set(cacheKey, payload.data, 20);
      return payload.data;
    } catch (error) {
      lastError = error;
      console.warn(`API request failed for ${path}. Retries left: ${retries}. Error:`, error);
      retries--;
      if (retries >= 0) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
  }

  // 3. Stale cache fallback
  const staleData = apiCache.getFallback(cacheKey);
  if (staleData) {
    console.warn(`Serving stale fallback data for: ${path}`);
    return staleData;
  }

  throw lastError;
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

// Proxy all JioSaavn CDN images through images.weserv.nl to bypass hotlink 403
const proxyImg = url => {
  if (!url) return '';
  if (url.includes('saavncdn.com') && !url.includes('weserv.nl')) {
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=500&h=500&fit=cover`;
  }
  return url;
};

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
    artwork: proxyImg(bestImage(track.image)),
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
  image: proxyImg(bestImage(artist.image)),
  followers: artist.followerCount || artist.fanCount || '1.2M',
});

const normalizePlaylist = playlist => ({
  id: playlist.id,
  title: playlist.name || playlist.title || '',
  description: playlist.description || '',
  image: proxyImg(bestImage(playlist.image)),
  meta: playlist.songCount ? `${playlist.songCount} songs` : playlist.description || 'Playlist',
  type: 'playlist',
});

const normalizeAlbum = album => ({
  id: album.id,
  title: album.name || album.title || '',
  description: album.description || '',
  image: proxyImg(bestImage(album.image)),
  meta: album.year ? `Album · ${album.year}` : 'Album',
  type: 'album',
});

const P = url => url ? `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=500&h=500&fit=cover` : '';

const fallbackSongDatabase = {
  'fb-kesariya': {
    id: 'fb-kesariya',
    title: 'Kesariya',
    artist: 'Pritam, Arijit Singh, Amitabh Bhattacharya',
    artwork: P('https://c.saavncdn.com/191/Kesariya-From-Brahmastra-Hindi-2022-20220717092820-500x500.jpg'),
    album: 'Brahmastra',
    duration: '4:28',
    audioUrl: 'https://aac.saavncdn.com/191/89c44565b9bd6082dd93b82772023b8f_320.mp4'
  },
  'fb-apnabanale': {
    id: 'fb-apnabanale',
    title: 'Apna Bana Le',
    artist: 'Arijit Singh, Sachin-Jigar',
    artwork: P('https://c.saavncdn.com/816/Apna-Bana-Le-From-Bhediya-Hindi-2022-20221105193910-500x500.jpg'),
    album: 'Bhediya',
    duration: '4:21',
    audioUrl: 'https://aac.saavncdn.com/816/61cb8c20539c368d4a991444983057e9_320.mp4'
  },
  'fb-tumhiho': {
    id: 'fb-tumhiho',
    title: 'Tum Hi Ho',
    artist: 'Arijit Singh, Mithoon',
    artwork: P('https://c.saavncdn.com/902/Aashiqui-2-Hindi-2013-500x500.jpg'),
    album: 'Aashiqui 2',
    duration: '4:22',
    audioUrl: 'https://aac.saavncdn.com/902/f1b8c2c8f61543bb042c1618de46a782_320.mp4'
  },
  'fb-chaleya': {
    id: 'fb-chaleya',
    title: 'Chaleya',
    artist: 'Anirudh Ravichander, Arijit Singh',
    artwork: P('https://c.saavncdn.com/022/Chaleya-From-Jawan-Hindi-2023-20230814114321-500x500.jpg'),
    album: 'Jawan',
    duration: '3:08',
    audioUrl: 'https://aac.saavncdn.com/022/b61c9447385a069dfb40a6b297ee45a8_320.mp4'
  },
  'fb-devadeva': {
    id: 'fb-devadeva',
    title: 'Deva Deva',
    artist: 'Pritam, Arijit Singh, Jonita Gandhi',
    artwork: P('https://c.saavncdn.com/191/Kesariya-From-Brahmastra-Hindi-2022-20220717092820-500x500.jpg'),
    album: 'Brahmastra',
    duration: '4:39',
    audioUrl: 'https://aac.saavncdn.com/191/3d843ff45be31b017b2b00e309cb9f3f_320.mp4'
  },
  'fb-heeriye': {
    id: 'fb-heeriye',
    title: 'Heeriye',
    artist: 'Jasleen Royal, Arijit Singh',
    artwork: P('https://c.saavncdn.com/044/Heeriye-feat-Arijit-Singh-Hindi-2023-20230725062627-500x500.jpg'),
    album: 'Heeriye',
    duration: '3:14',
    audioUrl: 'https://aac.saavncdn.com/044/f91bd84aa179eb9559c5d140e69b0fa6_320.mp4'
  },
  'fb-maanmerijaan': {
    id: 'fb-maanmerijaan',
    title: 'Maan Meri Jaan',
    artist: 'King',
    artwork: P('https://c.saavncdn.com/734/Champagne-Talk-Hindi-2022-20221012061214-500x500.jpg'),
    album: 'Champagne Talk',
    duration: '3:14',
    audioUrl: 'https://aac.saavncdn.com/734/23d726b216ec7e37e584f728fa8e2028_320.mp4'
  },
  'fb-tujhedekha': {
    id: 'fb-tujhedekha',
    title: 'Tujhe Dekha To Yeh Jaana Sanam',
    artist: 'Kumar Sanu, Lata Mangeshkar',
    artwork: P('https://c.saavncdn.com/129/Dilwale-Dulhania-Le-Jayenge-Hindi-1995-20200813134005-500x500.jpg'),
    album: 'DDLJ',
    duration: '5:02',
    audioUrl: 'https://aac.saavncdn.com/129/71a6e709a3eb64f664a78cb3cbbf851a_320.mp4'
  },
  'fb-churakedilmera': {
    id: 'fb-churakedilmera',
    title: 'Chura Ke Dil Mera',
    artist: 'Kumar Sanu, Alka Yagnik',
    artwork: P('https://c.saavncdn.com/985/Main-Khiladi-Tu-Anari-Hindi-1994-20220917173256-500x500.jpg'),
    album: 'Main Khiladi Tu Anari',
    duration: '5:49',
    audioUrl: 'https://aac.saavncdn.com/985/cd8c5de6981cf0ec70c2cb40f905fbab_320.mp4'
  },
  'fb-kalhonaaho': {
    id: 'fb-kalhonaaho',
    title: 'Kal Ho Naa Ho',
    artist: 'Sonu Nigam, Shankar-Ehsaan-Loy',
    artwork: P('https://c.saavncdn.com/264/Kal-Ho-Naa-Ho-Hindi-2003-20221021200115-500x500.jpg'),
    album: 'Kal Ho Naa Ho',
    duration: '5:21',
    audioUrl: 'https://aac.saavncdn.com/264/d344d5db06e9b46fbb10186715f3f0fb_320.mp4'
  },
  'fb-lagjagale': {
    id: 'fb-lagjagale',
    title: 'Lag Ja Gale Ke Phir',
    artist: 'Lata Mangeshkar, Madan Mohan',
    artwork: P('https://c.saavncdn.com/530/Woh-Kaun-Thi-Hindi-1964-20190603134300-500x500.jpg'),
    album: 'Woh Kaun Thi',
    duration: '4:17',
    audioUrl: 'https://aac.saavncdn.com/530/23df7a6a4220b30ef2a2c7cc192abfae_320.mp4'
  },
  'fb-tujhmeinrab': {
    id: 'fb-tujhmeinrab',
    title: 'Tujh Mein Rab Dikhta Hai',
    artist: 'Roopkumar Rathod, Salim-Sulaiman',
    artwork: P('https://c.saavncdn.com/231/Rab-Ne-Bana-Di-Jodi-Hindi-2008-20221122174312-500x500.jpg'),
    album: 'Rab Ne Bana Di Jodi',
    duration: '4:44',
    audioUrl: 'https://aac.saavncdn.com/231/4cdfb465352c6f1406e232efdcfd2024_320.mp4'
  },
  'fb-pasoori': {
    id: 'fb-pasoori',
    title: 'Pasoori',
    artist: 'Ali Sethi, Shae Gill',
    artwork: P('https://c.saavncdn.com/259/Pasoori-Punjabi-2022-20220203181822-500x500.jpg'),
    album: 'Pasoori',
    duration: '3:44',
    audioUrl: 'https://aac.saavncdn.com/259/f35ad463690d54020a16e885d564177d_320.mp4'
  },
  'fb-makhna': {
    id: 'fb-makhna',
    title: 'Makhna',
    artist: 'Tanishk Bagchi, Yasser Desai',
    artwork: P('https://c.saavncdn.com/007/Drive-Hindi-2019-20191101075001-500x500.jpg'),
    album: 'Drive',
    duration: '3:03',
    audioUrl: 'https://aac.saavncdn.com/007/905b6300f8623b0368146747d79b90c0_320.mp4'
  },
  'fb-kahanisuno': {
    id: 'fb-kahanisuno',
    title: 'Kahani Suno 2.0',
    artist: 'Kaifi Khalil',
    artwork: P('https://c.saavncdn.com/327/Kahani-Suno-2-0-Urdu-2022-20220614163901-500x500.jpg'),
    album: 'Kahani Suno',
    duration: '2:53',
    audioUrl: 'https://aac.saavncdn.com/327/989ccf83652f1efbc44806a6c4a86776_320.mp4'
  },
  'fb-shayad': {
    id: 'fb-shayad',
    title: 'Shayad',
    artist: 'Pritam, Arijit Singh',
    artwork: P('https://c.saavncdn.com/262/Love-Aaj-Kal-Hindi-2020-20200214152504-500x500.jpg'),
    album: 'Love Aaj Kal',
    duration: '4:07',
    audioUrl: 'https://aac.saavncdn.com/262/a927d7f7663e803d35ee41fa34c1bdf7_320.mp4'
  },
  'fb-deewanimastani': {
    id: 'fb-deewanimastani',
    title: 'Deewani Mastani',
    artist: 'Shreya Ghoshal, Sanjay Leela Bhansali',
    artwork: P('https://c.saavncdn.com/070/Bajirao-Mastani-Hindi-2015-20221213031021-500x500.jpg'),
    album: 'Bajirao Mastani',
    duration: '5:40',
    audioUrl: 'https://aac.saavncdn.com/070/f70d740c03478d10787d5e4b6d4bbda8_320.mp4'
  },
  'fb-teriore': {
    id: 'fb-teriore',
    title: 'Teri Ore',
    artist: 'Pritam, Shreya Ghoshal, Rahat Fateh Ali Khan',
    artwork: P('https://c.saavncdn.com/131/Singh-Is-Kinng-Hindi-2008-20221122143003-500x500.jpg'),
    album: 'Singh Is Kinng',
    duration: '5:39',
    audioUrl: 'https://aac.saavncdn.com/131/a084ef7557d34c0e62de9cb7d4efb79f_320.mp4'
  },
  'fb-ghoomar': {
    id: 'fb-ghoomar',
    title: 'Ghoomar',
    artist: 'Shreya Ghoshal, Swaroop Khan',
    artwork: P('https://c.saavncdn.com/712/Padmaavat-Hindi-2018-20180125164923-500x500.jpg'),
    album: 'Padmaavat',
    duration: '4:42',
    audioUrl: 'https://aac.saavncdn.com/712/86dfa539eb87e8340d04c1f516e8a04a_320.mp4'
  },
  'fb-manwalaage': {
    id: 'fb-manwalaage',
    title: 'Manwa Laage',
    artist: 'Shreya Ghoshal, Arijit Singh, Vishal-Shekhar',
    artwork: P('https://c.saavncdn.com/830/Happy-New-Year-Hindi-2014-20221122041235-500x500.jpg'),
    album: 'Happy New Year',
    duration: '4:31',
    audioUrl: 'https://aac.saavncdn.com/830/62d85600c283ebcfd1264c1da0253457_320.mp4'
  },
  'fb-saans': {
    id: 'fb-saans',
    title: 'Saans',
    artist: 'Shreya Ghoshal, Mohit Chauhan, A.R. Rahman',
    artwork: P('https://c.saavncdn.com/791/Jab-Tak-Hai-Jaan-Hindi-2012-20221208031034-500x500.jpg'),
    album: 'Jab Tak Hai Jaan',
    duration: '5:28',
    audioUrl: 'https://aac.saavncdn.com/791/d559e198b1bdf69a6886e927514a42b1_320.mp4'
  },
  'fb-raataanlambiyan': {
    id: 'fb-raataanlambiyan',
    title: 'Raataan Lambiyan',
    artist: 'Tanishk Bagchi, Jubin Nautiyal, Asees Kaur',
    artwork: P('https://c.saavncdn.com/238/Shershaah-Hindi-2021-20210815124617-500x500.jpg'),
    album: 'Shershaah',
    duration: '3:50',
    audioUrl: 'https://aac.saavncdn.com/238/e7db3a137885b3bc82dbb3df16e917d2_320.mp4'
  },
  'fb-tumhiaana': {
    id: 'fb-tumhiaana',
    title: 'Tum Hi Aana',
    artist: 'Payal Dev, Jubin Nautiyal',
    artwork: P('https://c.saavncdn.com/620/Marjaavaan-Hindi-2019-20200814120300-500x500.jpg'),
    album: 'Marjaavaan',
    duration: '4:09',
    audioUrl: 'https://aac.saavncdn.com/620/b382cfc7a72d38be4019bf45efbc20f8_320.mp4'
  },
  'fb-lutgaye': {
    id: 'fb-lutgaye',
    title: 'Lut Gaye',
    artist: 'Tanishk Bagchi, Jubin Nautiyal',
    artwork: P('https://c.saavncdn.com/279/Lut-Gaye-Hindi-2021-20210217150148-500x500.jpg'),
    album: 'Lut Gaye',
    duration: '3:48',
    audioUrl: 'https://aac.saavncdn.com/279/11b6ffc3065d6cfa92a8597371c66743_320.mp4'
  },
  'fb-humnavamere': {
    id: 'fb-humnavamere',
    title: 'Humnava Mere',
    artist: 'Rocky-Shiv, Jubin Nautiyal',
    artwork: P('https://c.saavncdn.com/023/Humnava-Mere-Hindi-2018-20180523-500x500.jpg'),
    album: 'Humnava Mere',
    duration: '4:43',
    audioUrl: 'https://aac.saavncdn.com/023/1ebca8d7f87a32be150e7f722a49ccdf_320.mp4'
  },
  'fb-kinnasona': {
    id: 'fb-kinnasona',
    title: 'Kinna Sona',
    artist: 'Meet Bros, Jubin Nautiyal',
    artwork: P('https://c.saavncdn.com/620/Marjaavaan-Hindi-2019-20200814120300-500x500.jpg'),
    album: 'Marjaavaan',
    duration: '4:33',
    audioUrl: 'https://aac.saavncdn.com/620/5d4bf597dfc2a8f9446d3e38708c903a_320.mp4'
  }
};

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

  getSongById: async id => {
    if (fallbackSongDatabase[id]) {
      return fallbackSongDatabase[id];
    }
    try {
      const res = await request(`/api/songs/${id}`);
      const track = res?.map(normalizeTrack)?.[0];
      if (track) return track;
    } catch (e) {
      console.warn("getSongById failed, serving fallback song details:", e);
    }
    return fallbackSongDatabase['fb-kesariya'];
  },
  getStream: async id => {
    if (fallbackSongDatabase[id]) {
      return fallbackSongDatabase[id].audioUrl;
    }
    try {
      const res = await request(`/api/songs/${id}`);
      const streamUrl = bestAudio(res?.[0]?.downloadUrl);
      if (streamUrl) return streamUrl;
    } catch (e) {
      console.warn("getStream failed, serving fallback stream URL:", e);
    }
    const keys = Object.keys(fallbackSongDatabase);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return fallbackSongDatabase[randomKey].audioUrl;
  },
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

    const fallbackSongs = [
      { id: 'fb-kesariya', title: 'Kesariya', artist: 'Pritam, Arijit Singh, Amitabh Bhattacharya', artwork: 'https://c.saavncdn.com/191/Kesariya-From-Brahmastra-Hindi-2022-20220717092820-500x500.jpg', album: 'Brahmastra', duration: '4:28', audioUrl: 'https://aac.saavncdn.com/191/89c44565b9bd6082dd93b82772023b8f_320.mp4' },
      { id: 'fb-apnabanale', title: 'Apna Bana Le', artist: 'Arijit Singh, Sachin-Jigar', artwork: 'https://c.saavncdn.com/816/Apna-Bana-Le-From-Bhediya-Hindi-2022-20221105193910-500x500.jpg', album: 'Bhediya', duration: '4:21', audioUrl: 'https://aac.saavncdn.com/816/61cb8c20539c368d4a991444983057e9_320.mp4' },
      { id: 'fb-tumhiho', title: 'Tum Hi Ho', artist: 'Arijit Singh, Mithoon', artwork: 'https://c.saavncdn.com/902/Aashiqui-2-Hindi-2013-500x500.jpg', album: 'Aashiqui 2', duration: '4:22', audioUrl: 'https://aac.saavncdn.com/902/f1b8c2c8f61543bb042c1618de46a782_320.mp4' }
    ];

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
      const recommended = rec.length ? rec : (topHits.length ? topHits.slice(0, 8) : fallbackSongs);
      const trending = trend.length ? trend : (topHits.length ? topHits.slice(4, 12) : fallbackSongs);
      const newReleases = [...hindi.slice(3, 8), ...english.slice(3, 8), ...punjabi.slice(3, 8)];

      // If all queries failed or returned empty (e.g. rate limited), raise error to trigger fallback
      if (!rec.length && !trend.length && !hindi.length) {
        throw new Error("All primary queries returned empty.");
      }

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
        artists: artistsRes.length ? artistsRes : [],
        playlists: playlistsRes.length ? playlistsRes : [],
      };
    } catch (e) {
      console.error('getHome error, serving fail-safe fallback:', e);
      return {
        hero: { label: 'TRENDING MUSIC', title: 'Top Hits', description: 'Listen to the biggest hits.', image: 'https://c.saavncdn.com/191/Kesariya-From-Brahmastra-Hindi-2022-20220717092820-500x500.jpg' },
        recommended: fallbackSongs,
        trending: fallbackSongs,
        topHits: fallbackSongs,
        newReleases: fallbackSongs,
        artists: [
          { id: 'art1', name: 'Arijit Singh', image: 'https://c.saavncdn.com/artist/Arijit_Singh_002_20230323062147_500x500.jpg' },
          { id: 'art2', name: 'Pritam', image: 'https://c.saavncdn.com/artist/Pritam_003_20230323062147_500x500.jpg' }
        ],
        playlists: [
          { id: 'pl1', title: 'Bollywood Hits', description: 'The absolute best Bollywood songs.', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop', meta: '3 songs' }
        ],
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

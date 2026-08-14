let audio = new Audio();
let hls = null;

const listeners = {};

// ============================================================
// LIKED SONGS
// ============================================================

let likedSongs = [];

try {
    likedSongs = JSON.parse(
        localStorage.getItem("liked_songs")
    ) || [];
} catch (error) {
    likedSongs = [];
}


// ============================================================
// PLAYER
// ============================================================

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


    // ========================================================
    // EVENT SYSTEM
    // ========================================================

    on(event, callback) {

        if (!listeners[event]) {
            listeners[event] = [];
        }

        listeners[event].push(callback);
    },


    emit(event, data) {

        if (!listeners[event]) {
            return;
        }

        listeners[event].forEach(callback => {

            try {
                callback(data);
            } catch (error) {
                console.error(
                    `Error in ${event} listener:`,
                    error
                );
            }

        });
    },


    // ========================================================
    // LIKE / UNLIKE
    // ========================================================

    toggleLike(track) {

        if (!track) {
            return;
        }

        const index = this.liked.findIndex(
            t => t.id === track.id
        );

        if (index !== -1) {

            this.liked.splice(index, 1);

        } else {

            this.liked.push(track);

        }

        localStorage.setItem(
            "liked_songs",
            JSON.stringify(this.liked)
        );

        this.emit(
            "like-change",
            this.liked
        );
    },


    isLiked(trackId) {

        return this.liked.some(
            track => track.id === trackId
        );
    },


    // ========================================================
    // CLEAN PREVIOUS AUDIO
    // ========================================================

    cleanupAudio() {

        try {

            audio.pause();

            audio.removeAttribute("src");

            audio.load();

        } catch (error) {

            console.warn(
                "Audio cleanup warning:",
                error
            );
        }


        // Destroy previous HLS instance

        if (hls) {

            try {
                hls.destroy();
            } catch (error) {
                console.warn(
                    "HLS cleanup warning:",
                    error
                );
            }

            hls = null;
        }
    },


    // ========================================================
    // GET STREAM URL
    // ========================================================

    async getStreamUrl(track) {

        // First use existing audioUrl

        if (
            track &&
            track.audioUrl &&
            typeof track.audioUrl === "string"
        ) {

            return track.audioUrl;
        }


        // Otherwise request stream from API

        if (
            window.musicStreamingApi &&
            typeof window.musicStreamingApi.getStream === "function"
        ) {

            try {

                const streamUrl =
                    await window.musicStreamingApi.getStream(
                        track.id
                    );

                return streamUrl;

            } catch (error) {

                console.error(
                    "Failed to get stream URL:",
                    error
                );

                throw error;
            }
        }


        throw new Error(
            "musicStreamingApi.getStream() is not available"
        );
    },


    // ========================================================
    // PLAY TRACK
    // ========================================================

    async playTrack(track, trackList = []) {

        if (!track) {

            console.warn(
                "playTrack called without a track"
            );

            return;
        }


        console.log(
            "▶ Playing track:",
            track
        );


        // ----------------------------------------------------
        // IMPORTANT FIX
        // ----------------------------------------------------
        // Your old code used trackToPlay here.
        //
        // trackToPlay DOES NOT EXIST.
        //
        // We use track instead.
        // ----------------------------------------------------

        const trackToPlay = track;


        // Stop previous playback

        this.cleanupAudio();


        // ----------------------------------------------------
        // CURRENT TRACK
        // ----------------------------------------------------

        this.currentTrack = trackToPlay;


        // ----------------------------------------------------
        // QUEUE
        // ----------------------------------------------------

        if (
            Array.isArray(trackList) &&
            trackList.length > 0
        ) {

            this.queue = [...trackList];

            const index = this.queue.findIndex(
                t => t.id === trackToPlay.id
            );

            if (index !== -1) {

                this.queue[index] = trackToPlay;

                this.currentIndex = index;

            } else {

                this.queue.push(trackToPlay);

                this.currentIndex =
                    this.queue.length - 1;
            }

        } else {

            this.queue = [trackToPlay];

            this.currentIndex = 0;
        }


        // ----------------------------------------------------
        // SAVE TRACK STATE
        // ----------------------------------------------------

        this.emit(
            "track-change",
            this.currentTrack
        );


        // ----------------------------------------------------
        // GET STREAM
        // ----------------------------------------------------

        let streamUrl;

        try {

            streamUrl =
                await this.getStreamUrl(trackToPlay);

        } catch (error) {

            console.error(
                "❌ Error fetching stream URL:",
                error
            );

            this.isPlaying = false;

            this.emit(
                "play-state-change",
                false
            );

            return;
        }


        if (!streamUrl) {

            console.error(
                "❌ No stream URL found:",
                trackToPlay
            );

            this.isPlaying = false;

            this.emit(
                "play-state-change",
                false
            );

            return;
        }


        console.log(
            "🎵 Stream URL:",
            streamUrl
        );


        // ----------------------------------------------------
        // PLAY AUDIO
        // ----------------------------------------------------

        try {

            const isHLS =
                streamUrl.includes(".m3u8");


            // =================================================
            // HLS
            // =================================================

            if (isHLS) {

                // Chrome / Firefox / Edge

                if (
                    window.Hls &&
                    Hls.isSupported()
                ) {

                    console.log(
                        "Using HLS.js"
                    );


                    hls = new Hls({
                        enableWorker: true,

                        // Helps with streams that have
                        // multiple segments

                        maxBufferLength: 30,

                        maxMaxBufferLength: 60
                    });


                    // HLS error listener

                    hls.on(
                        Hls.Events.ERROR,
                        (event, data) => {

                            console.error(
                                "HLS ERROR:",
                                data
                            );


                            if (
                                data.fatal
                            ) {

                                switch (
                                    data.type
                                ) {

                                    case Hls.ErrorTypes.NETWORK_ERROR:

                                        console.warn(
                                            "HLS network error. Retrying..."
                                        );

                                        hls.startLoad();

                                        break;


                                    case Hls.ErrorTypes.MEDIA_ERROR:

                                        console.warn(
                                            "HLS media error. Recovering..."
                                        );

                                        hls.recoverMediaError();

                                        break;


                                    default:

                                        console.error(
                                            "Fatal HLS error"
                                        );

                                        hls.destroy();

                                        hls = null;

                                        this.isPlaying = false;

                                        this.emit(
                                            "play-state-change",
                                            false
                                        );

                                        break;
                                }
                            }
                        }
                    );


                    hls.loadSource(
                        streamUrl
                    );


                    hls.attachMedia(
                        audio
                    );


                    hls.on(
                        Hls.Events.MANIFEST_PARSED,
                        async () => {

                            console.log(
                                "✅ HLS manifest loaded"
                            );


                            audio.volume =
                                this.volume;


                            try {

                                await audio.play();

                                this.isPlaying =
                                    true;

                                this.emit(
                                    "play-state-change",
                                    true
                                );

                            } catch (error) {

                                console.error(
                                    "❌ Audio play failed:",
                                    error
                                );

                                this.isPlaying =
                                    false;

                                this.emit(
                                    "play-state-change",
                                    false
                                );
                            }
                        }
                    );

                }

                // =================================================
                // Safari native HLS
                // =================================================

                else if (
                    audio.canPlayType(
                        "application/vnd.apple.mpegurl"
                    )
                ) {

                    console.log(
                        "Using native HLS"
                    );


                    audio.src =
                        streamUrl;

                    audio.volume =
                        this.volume;


                    try {

                        await audio.play();

                        this.isPlaying =
                            true;

                        this.emit(
                            "play-state-change",
                            true
                        );

                    } catch (error) {

                        console.error(
                            "❌ Native HLS play failed:",
                            error
                        );

                        this.isPlaying =
                            false;

                        this.emit(
                            "play-state-change",
                            false
                        );
                    }
                }

                else {

                    console.error(
                        "❌ HLS is not supported"
                    );

                    this.isPlaying =
                        false;

                    this.emit(
                        "play-state-change",
                        false
                    );

                    return;
                }

            }

            // =================================================
            // NORMAL MP3 / AUDIO
            // =================================================

            else {

                console.log(
                    "Using normal audio"
                );


                audio.src =
                    streamUrl;

                audio.volume =
                    this.volume;


                // Wait until browser can play

                await new Promise(
                    (resolve, reject) => {

                        const onCanPlay = () => {

                            cleanup();

                            resolve();
                        };


                        const onError = (event) => {

                            cleanup();

                            reject(
                                event
                            );
                        };


                        const cleanup = () => {

                            audio.removeEventListener(
                                "canplay",
                                onCanPlay
                            );

                            audio.removeEventListener(
                                "error",
                                onError
                            );
                        };


                        audio.addEventListener(
                            "canplay",
                            onCanPlay,
                            { once: true }
                        );


                        audio.addEventListener(
                            "error",
                            onError,
                            { once: true }
                        );


                        audio.load();
                    }
                );


                await audio.play();


                this.isPlaying =
                    true;


                this.emit(
                    "play-state-change",
                    true
                );
            }


            // ------------------------------------------------
            // RECENTLY PLAYED
            // ------------------------------------------------

            this.addToRecent(
                trackToPlay
            );


            // ------------------------------------------------
            // LYRICS
            // ------------------------------------------------

            this.loadLyrics(
                trackToPlay
            );

        } catch (error) {

            console.error(
                "❌ Playback failed:",
                error
            );

            this.isPlaying =
                false;

            this.emit(
                "play-state-change",
                false
            );
        }
    },


    // ========================================================
    // PLAY / PAUSE
    // ========================================================

    async togglePlay() {

        if (!this.currentTrack) {
            return;
        }


        try {

            if (this.isPlaying) {

                audio.pause();

                this.isPlaying =
                    false;

            } else {

                await audio.play();

                this.isPlaying =
                    true;
            }


            this.emit(
                "play-state-change",
                this.isPlaying
            );

        } catch (error) {

            console.error(
                "Toggle play failed:",
                error
            );

            this.isPlaying =
                false;

            this.emit(
                "play-state-change",
                false
            );
        }
    },


    // ========================================================
    // NEXT
    // ========================================================

    next() {

        if (
            this.queue.length === 0 ||
            this.currentIndex === -1
        ) {
            return;
        }


        const nextIndex =
            (this.currentIndex + 1) %
            this.queue.length;


        this.playTrack(
            this.queue[nextIndex],
            this.queue
        );
    },


    // ========================================================
    // PREVIOUS
    // ========================================================

    prev() {

        if (
            this.queue.length === 0 ||
            this.currentIndex === -1
        ) {
            return;
        }


        let previousIndex =
            this.currentIndex - 1;


        if (previousIndex < 0) {

            previousIndex =
                this.queue.length - 1;
        }


        this.playTrack(
            this.queue[previousIndex],
            this.queue
        );
    },


    // ========================================================
    // SEEK
    // ========================================================

    seek(seconds) {

        if (!this.currentTrack) {
            return;
        }


        if (
            Number.isFinite(seconds) &&
            Number.isFinite(audio.duration)
        ) {

            audio.currentTime =
                Math.max(
                    0,
                    Math.min(
                        seconds,
                        audio.duration
                    )
                );
        }
    },


    // ========================================================
    // VOLUME
    // ========================================================

    setVolume(value) {

        this.volume =
            Math.max(
                0,
                Math.min(
                    1,
                    Number(value)
                )
            );


        audio.volume =
            this.volume;


        this.emit(
            "volume-change",
            this.volume
        );
    },


    // ========================================================
    // LOOP
    // ========================================================

    toggleLoop() {

        this.loop =
            !this.loop;


        this.emit(
            "loop-state-change",
            this.loop
        );


        return this.loop;
    },


    // ========================================================
    // RECENTLY PLAYED
    // ========================================================

    addToRecent(track) {

        if (!track) {
            return;
        }


        let recent = [];


        try {

            recent =
                JSON.parse(
                    localStorage.getItem(
                        "recent_plays"
                    )
                ) || [];

        } catch {

            recent = [];
        }


        recent =
            recent.filter(
                t => t.id !== track.id
            );


        recent.unshift(
            track
        );


        if (recent.length > 200) {

            recent.pop();
        }


        localStorage.setItem(
            "recent_plays",
            JSON.stringify(recent)
        );


        this.emit(
            "recent-change",
            recent
        );
    },


    // ========================================================
    // LYRICS
    // ========================================================

    async loadLyrics(track) {

        this.lyrics = null;

        this.emit(
            "lyrics-change",
            null
        );


        try {

            if (
                !window.musicApi ||
                typeof window.musicApi.getLyrics !== "function"
            ) {

                return;
            }


            const data =
                await window.musicApi.getLyrics(
                    track
                );


            if (
                this.currentTrack &&
                this.currentTrack.id === track.id
            ) {

                this.lyrics =
                    data?.syncedLyrics ||
                    data?.plainLyrics ||
                    "Lyrics not found.";


                this.emit(
                    "lyrics-change",
                    this.lyrics
                );
            }

        } catch (error) {

            console.warn(
                "Lyrics error:",
                error
            );


            if (
                this.currentTrack &&
                this.currentTrack.id === track.id
            ) {

                this.lyrics =
                    "Lyrics not found.";


                this.emit(
                    "lyrics-change",
                    this.lyrics
                );
            }
        }
    }
};


// ============================================================
// AUDIO EVENTS
// ============================================================

audio.addEventListener(
    "timeupdate",
    () => {

        player.progress =
            audio.currentTime || 0;


        player.duration =
            Number.isFinite(audio.duration)
                ? audio.duration
                : 0;


        player.emit(
            "time-update",
            {
                progress:
                    player.progress,

                duration:
                    player.duration
            }
        );


        // Save current position

        if (
            player.currentTrack
        ) {

            localStorage.setItem(
                "last_time",
                String(
                    audio.currentTime || 0
                )
            );
        }
    }
);


// ============================================================
// LOADED METADATA
// ============================================================

audio.addEventListener(
    "loadedmetadata",
    () => {

        player.duration =
            Number.isFinite(audio.duration)
                ? audio.duration
                : 0;


        player.emit(
            "time-update",
            {
                progress:
                    audio.currentTime || 0,

                duration:
                    player.duration
            }
        );
    }
);


// ============================================================
// PLAY EVENT
// ============================================================

audio.addEventListener(
    "play",
    () => {

        player.isPlaying =
            true;


        player.emit(
            "play-state-change",
            true
        );
    }
);


// ============================================================
// PAUSE EVENT
// ============================================================

audio.addEventListener(
    "pause",
    () => {

        player.isPlaying =
            false;


        player.emit(
            "play-state-change",
            false
        );
    }
);


// ============================================================
// ENDED
// ============================================================

audio.addEventListener(
    "ended",
    () => {

        console.log(
            "🎵 Track ended"
        );


        if (player.loop) {

            player.playTrack(
                player.currentTrack,
                player.queue
            );

        } else {

            player.next();
        }
    }
);


// ============================================================
// AUDIO ERROR
// ============================================================

audio.addEventListener(
    "error",
    (event) => {

        console.error(
            "❌ HTML5 Audio Error:",
            event
        );


        if (audio.error) {

            console.error(
                "Audio error code:",
                audio.error.code
            );

            console.error(
                "Audio error message:",
                audio.error.message
            );
        }


        player.isPlaying =
            false;


        player.emit(
            "play-state-change",
            false
        );
    }
);


// ============================================================
// SAVE TRACK STATE
// ============================================================

player.on(
    "track-change",
    (track) => {

        if (!track) {
            return;
        }


        localStorage.setItem(
            "last_track_id",
            track.id
        );


        localStorage.setItem(
            "last_queue",
            JSON.stringify(
                player.queue
            )
        );
    }
);


// ============================================================
// GLOBAL PLAYER
// ============================================================

window.player =
    player;


// ============================================================
// RESTORE PLAYER STATE
// ============================================================

async function restorePlayerState() {

    try {

        const lastTrackId =
            localStorage.getItem(
                "last_track_id"
            );


        const lastQueueJson =
            localStorage.getItem(
                "last_queue"
            );


        const lastTime =
            parseFloat(
                localStorage.getItem(
                    "last_time"
                )
            ) || 0;


        if (!lastTrackId) {
            return;
        }


        if (
            !window.musicStreamingApi ||
            typeof window.musicStreamingApi.getSongById !== "function"
        ) {

            console.warn(
                "musicStreamingApi.getSongById is not available"
            );

            return;
        }


        const track =
            await window.musicStreamingApi.getSongById(
                lastTrackId
            );


        if (!track) {
            return;
        }


        // ----------------------------------------------------
        // RESTORE QUEUE
        // ----------------------------------------------------

        let queue = [];


        try {

            queue =
                JSON.parse(
                    lastQueueJson
                ) || [track];

        } catch {

            queue = [track];
        }


        if (!Array.isArray(queue) || queue.length === 0) {

            queue = [track];
        }


        player.currentTrack =
            track;


        player.queue =
            queue;


        player.currentIndex =
            queue.findIndex(
                t => t.id === track.id
            );


        if (player.currentIndex === -1) {

            player.queue.push(track);

            player.currentIndex =
                player.queue.length - 1;
        }


        // ----------------------------------------------------
        // DO NOT ASSUME audioUrl EXISTS
        // ----------------------------------------------------
        //
        // This was another possible Render problem.
        //
        // We resolve the stream URL through the API.
        // ----------------------------------------------------

        let streamUrl = null;


        try {

            streamUrl =
                await player.getStreamUrl(
                    track
                );

        } catch (error) {

            console.warn(
                "Could not restore stream:",
                error
            );
        }


        if (streamUrl) {

            audio.src =
                streamUrl;


            audio.currentTime =
                lastTime;


            player.progress =
                lastTime;
        }


        // ----------------------------------------------------
        // UI STATE
        // ----------------------------------------------------

        setTimeout(
            () => {

                player.emit(
                    "track-change",
                    track
                );


                player.emit(
                    "time-update",
                    {
                        progress:
                            lastTime,

                        duration:
                            0
                    }
                );


                player.loadLyrics(
                    track
                );


                const hash =
                    window.location.hash ||
                    "#/";


                if (
                    hash.startsWith(
                        "#/now-playing"
                    )
                ) {

                    if (
                        typeof window.openFullscreenPlayer ===
                        "function"
                    ) {

                        window.openFullscreenPlayer();
                    }
                }

            },
            200
        );

    } catch (error) {

        console.error(
            "❌ Error recovering player state:",
            error
        );
    }
}


// ============================================================
// INITIALIZE
// ============================================================

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        restorePlayerState
    );

} else {

    restorePlayerState();
}
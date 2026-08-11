# AYU.music — Premium Music Streaming Web App

A premium, state-of-the-art music streaming web application designed with high-end dark aesthetics, smooth page routing, interactive queues, real-time sync chat visualizers, and customizable playlists. Built using **Pure HTML5, CSS3, and Vanilla JavaScript**.

## 🎵 Live API Integration
AYU.music integrates directly with `https://api.music.vispark.in` for live streaming tracks, artists bios, top hits, and album details. It fetches synchronized lyrics dynamically from `lrclib.net` in the background when tracks are played.

---

## 🚀 How to Run Locally

You can launch the web application **without running any local server or install steps**. 

1. Simply double-click:
   `index.html`
2. It will open instantly in your default web browser (Chrome, Safari, Firefox, Edge).
3. Ensure you are connected to the internet to stream high-quality music and fetch lyrics from the live APIs.

---

## 📂 Project Architecture

```
music/
├── index.html              # Main HTML Skeleton
├── css/
│   ├── style.css           # Design System, Colors, Grid & Flex Layouts
│   ├── responsive.css      # Tablet and mobile drawer configurations
│   └── animations.css      # Skeleton loaders and subtle CD rotations
├── js/
│   ├── data.js             # Configuration variables
│   ├── api.js              # Music API client wrappers
│   ├── player.js           # Audio playback logic & state publisher
│   ├── navigation.js       # SPA Hash routing system
│   ├── home.js             # Home suggestions, banners & carousel loads
│   ├── search.js           # Live search engine & Cmd+K hotkey binds
│   ├── library.js          # LocalStorage playlist creations
│   ├── socials.js          # Interactive live Party Room simulator
│   ├── profile.js          # Listening statistics
│   ├── app.js              # Coordinator linking buttons & sliders
│   └── interactions.js     # Scroll shadows & UI micro-interactions
└── README.md
```

---

## 💎 Premium UI/UX Interactions

1. **Overlay Sidebar**: Sidebar collapses to `72px` (icons only) and expands smoothly to `240px` on hover without shifting the main layout. On mobile devices, it collapses into a slide-out navigation drawer.
2. **Keyboard Shortcut**: Pressing `Cmd + K` (Mac) or `Ctrl + K` (Windows/Linux) instantly navigates to the Search tab and focuses the search input.
3. **Responsive Cards**: All music cards scale cover art slightly on hover and slide up an elegant circular white play button.
4. **Interactive Party Room**: Enter the Party Room to experience a mock synchronous chat interface. Typing messages in the input triggers mock replies from friends.
5. **Dynamic Playlists**: Add any song to your custom playlists via the floating three-dot menu, or favorite them using the heart icons. All data is persisted in `localStorage`.
6. **CD Rotation**: Active playing tracks toggle a slow spinning animation on the bottom player's cover artwork.

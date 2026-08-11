/* Socials and Party Room Page Renderer */

let partyRoomActive = false;
let mockChatInterval = null;
const mockFriendReplies = [
  "This song is a masterpiece! 🔥",
  "Ayu has elite music taste honestly.",
  "Queue up some Arijit next please!",
  "Who is down for some Lofi vibes after this?",
  "Chilling in the office listening to this, so good.",
  "That transition was crazy!"
];

function renderSocials() {
  const container = document.getElementById('main-viewport');
  if (!container) return;

  if (partyRoomActive) {
    renderActivePartyRoom();
    return;
  }

  container.innerHTML = `
    <div class="page animate-fade-up">
      <h1 class="section-title" style="font-size: 32px; letter-spacing: -1px; margin-bottom: 32px;">Social Hub</h1>
      
      <div class="socials-split">
        <!-- Party Room Promo -->
        <div class="party-room-panel">
          <div>
            <span class="party-room-badge">New Feature</span>
            <h2 class="party-room-title">Party Room</h2>
            <p class="party-room-desc">Host a synced listening session with friends in real-time. Listen together, chat, and share the queue.</p>
          </div>
          <button class="party-room-enter" onclick="enterPartyRoom()">
            Enter Room <i data-lucide="arrow-right"></i>
          </button>
        </div>

        <!-- Friends Activity -->
        <div class="friends-activity-panel">
          <h2 class="section-title" style="font-size: 20px;">Friends Activity</h2>
          
          <div style="display:flex; flex-direction:column; gap:20px; margin-top:8px;">
            <div class="friend-item">
              <div class="friend-avatar">
                <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&auto=format&fit=crop" alt="Amit" />
                <span class="friend-status-dot"></span>
              </div>
              <div class="friend-info">
                <span class="friend-name">Amit Kumar</span>
                <span class="friend-listening">listening to <b>Saiyaara</b> • Tanishk Bagchi</span>
              </div>
            </div>

            <div class="friend-item">
              <div class="friend-avatar">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop" alt="Sneha" />
                <span class="friend-status-dot"></span>
              </div>
              <div class="friend-info">
                <span class="friend-name">Sneha Sharma</span>
                <span class="friend-listening">listening to <b>Apna Bana Le</b> • Arijit Singh</span>
              </div>
            </div>

            <div class="friend-item">
              <div class="friend-avatar">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop" alt="Rohan" />
                <span class="friend-status-dot" style="background-color: #7f8797;"></span>
              </div>
              <div class="friend-info">
                <span class="friend-name">Rohan Verma</span>
                <span class="friend-listening">offline • last played <b>Tum Hi Ho</b> • 2h ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();
}

function renderActivePartyRoom() {
  const container = document.getElementById('main-viewport');
  if (!container) return;

  const currentTrack = window.player.currentTrack;
  const isPlaying = window.player.isPlaying;

  container.innerHTML = `
    <div class="page animate-fade-up">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 32px;">
        <h1 class="section-title" style="font-size: 32px; letter-spacing: -1px;">Party Room #104</h1>
        <button class="login-btn" onclick="exitPartyRoom()" style="background-color:#252525; color:white;">Exit Room</button>
      </div>

      <div class="socials-split">
        <!-- Room Screen (Visualizer) -->
        <div style="background-color:var(--bg-surface); border:1px solid var(--border-color); border-radius:20px; padding:32px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:24px; min-height:420px; position:relative;">
          
          <!-- Sync Circle -->
          <div style="position:relative; width: 180px; height: 180px; display:flex; align-items:center; justify-content:center;">
            <div id="party-disc-ring" class="skeleton-shimmer" style="position:absolute; width:190px; height:190px; border-radius:50%; border:2px dashed rgba(138, 75, 235, 0.4); animation: rotateArtwork 20s linear infinite;"></div>
            <img id="party-disc-art" src="${currentTrack?.artwork || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop'}" class="${isPlaying ? 'rotate-playing' : ''}" style="width:160px; height:160px; border-radius:50%; object-fit:cover; border: 4px solid var(--bg-surface-hover); z-index:2;" />
          </div>

          <div style="text-align:center;">
            <h2 id="party-song-title" style="font-size: 20px; font-weight:700;">${currentTrack?.title || 'No Song Playing'}</h2>
            <p id="party-song-artist" style="color:var(--text-secondary); font-size:14px; margin-top:4px;">${currentTrack?.artist || 'Play a track in the player to sync'}</p>
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <div style="display:flex; -webkit-mask-image: linear-gradient(to right, transparent, white 20%);">
              <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=60&auto=format&fit=crop" style="width:28px; height:28px; border-radius:50%; border:2px solid var(--bg-surface); margin-right:-8px;" />
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=60&auto=format&fit=crop" style="width:28px; height:28px; border-radius:50%; border:2px solid var(--bg-surface); margin-right:-8px;" />
              <div style="width:28px; height:28px; border-radius:50%; background-color:#8a4beb; color:white; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; border:2px solid var(--bg-surface);">+3</div>
            </div>
            <span style="font-size:12px; color:var(--text-secondary); font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">5 Listening Together</span>
          </div>
        </div>

        <!-- Room Live Chat -->
        <div style="background-color:var(--bg-surface); border:1px solid var(--border-color); border-radius:20px; display:flex; flex-direction:column; height:420px; overflow:hidden;">
          <div style="padding:16px 24px; border-bottom:1px solid var(--border-color); font-weight:700; font-size:15px;">Room Chat</div>
          
          <!-- Message Body -->
          <div id="party-chat-body" style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:16px;">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <span style="color:#c09bf8; font-size:11px; font-weight:700;">Amit Kumar</span>
              <span style="background-color:rgba(255,255,255,0.03); padding:10px 14px; border-radius:0 12px 12px 12px; font-size:13px; max-width:85%; align-self:flex-start;">Welcome to the room guys! 🎧</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <span style="color:#ffb3ba; font-size:11px; font-weight:700;">Sneha Sharma</span>
              <span style="background-color:rgba(255,255,255,0.03); padding:10px 14px; border-radius:0 12px 12px 12px; font-size:13px; max-width:85%; align-self:flex-start;">Love the sync quality on AYU.music.</span>
            </div>
          </div>

          <!-- Input Block -->
          <div style="padding:16px; border-top:1px solid var(--border-color); display:flex; gap:12px;">
            <input type="text" id="party-chat-input" placeholder="Say something..." style="flex:1; height:40px; background-color:var(--bg-primary); border:1px solid var(--border-color); border-radius:20px; padding:0 16px; color:white; outline:none; font-size:13px;" />
            <button onclick="sendPartyChatMessage()" style="width:40px; height:40px; border-radius:50%; border:none; background-color:white; color:black; display:flex; align-items:center; justify-content:center; cursor:pointer;"><i data-lucide="send" style="width:16px; height:16px;"></i></button>
          </div>
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();

  // Scroll to bottom of chat
  const chatBody = document.getElementById('party-chat-body');
  if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;

  // Bind Enter key to input
  const chatInput = document.getElementById('party-chat-input');
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendPartyChatMessage();
  });
}

window.enterPartyRoom = () => {
  partyRoomActive = true;
  renderSocials();
};

window.exitPartyRoom = () => {
  partyRoomActive = false;
  clearInterval(mockChatInterval);
  renderSocials();
};

window.sendPartyChatMessage = () => {
  const input = document.getElementById('party-chat-input');
  const chatBody = document.getElementById('party-chat-body');
  const text = input?.value.trim();
  if (!text || !chatBody) return;

  // Clear input
  input.value = '';

  // Append user message
  const userMsg = document.createElement('div');
  userMsg.style.display = 'flex';
  userMsg.style.flexDirection = 'column';
  userMsg.style.gap = '4px';
  userMsg.style.alignItems = 'flex-end';
  userMsg.innerHTML = `
    <span style="color:#a8e6cf; font-size:11px; font-weight:700;">You</span>
    <span style="background-color:#c09bf8; color:black; padding:10px 14px; border-radius:12px 0 12px 12px; font-size:13px; max-width:85%; align-self:flex-end;">${text}</span>
  `;
  chatBody.appendChild(userMsg);
  chatBody.scrollTop = chatBody.scrollHeight;

  // Mock a reply in 1-2 seconds
  setTimeout(() => {
    const friendNames = ["Amit Kumar", "Sneha Sharma"];
    const colors = ["#c09bf8", "#ffb3ba"];
    const idx = Math.floor(Math.random() * friendNames.length);
    const replyText = mockFriendReplies[Math.floor(Math.random() * mockFriendReplies.length)];

    const replyMsg = document.createElement('div');
    replyMsg.style.display = 'flex';
    replyMsg.style.flexDirection = 'column';
    replyMsg.style.gap = '4px';
    replyMsg.innerHTML = `
      <span style="color:${colors[idx]}; font-size:11px; font-weight:700;">${friendNames[idx]}</span>
      <span style="background-color:rgba(255,255,255,0.03); padding:10px 14px; border-radius:0 12px 12px 12px; font-size:13px; max-width:85%; align-self:flex-start;">${replyText}</span>
    `;
    chatBody.appendChild(replyMsg);
    chatBody.scrollTop = chatBody.scrollHeight;
  }, 1000 + Math.random() * 1000);
};

// Listen to player events to sync artwork in Party Room
window.player.on('track-change', (track) => {
  if (partyRoomActive && window.location.hash === '#/socials') {
    const title = document.getElementById('party-song-title');
    const artist = document.getElementById('party-song-artist');
    const disc = document.getElementById('party-disc-art');
    
    if (title) title.innerText = track.title;
    if (artist) artist.innerText = track.artist;
    if (disc) disc.src = track.artwork || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop';
  }
});

window.player.on('play-state-change', (isPlaying) => {
  if (partyRoomActive && window.location.hash === '#/socials') {
    const disc = document.getElementById('party-disc-art');
    if (disc) {
      if (isPlaying) {
        disc.classList.add('rotate-playing');
      } else {
        disc.classList.remove('rotate-playing');
      }
    }
  }
});

window.renderSocials = renderSocials;

document.addEventListener('DOMContentLoaded', () => {
  const spotifyLoginBtn = document.getElementById('spotify-login');
  const greetingDiv = document.getElementById('greeting');
  const usernameElem = document.getElementById('username');
  const greetingTimeElem = document.getElementById('greeting-time');
  const statsSection = document.getElementById('stats');
  const statsContainer = document.querySelector('.stats-container');
  const minutesSection = document.getElementById('minutes');
  const minutesContainer = document.querySelector('.minutes-container');
  const currentlyPlayingDiv = document.getElementById('currently-playing');

  const CLIENT_ID = 'd245afe0c0c8488bb51c2c9179b9c67a';
  const REDIRECT_URI = 'https://add2207.github.io/Trackify/';
  const AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${REDIRECT_URI}&scope=user-top-read user-library-read user-read-recently-played user-read-playback-state user-read-currently-playing user-follow-read`;

  // Check for access token in URL
  const accessToken = getAccessTokenFromUrl();
  
  if (accessToken) {
    initializeApp(accessToken);
  } else {
    spotifyLoginBtn.style.display = 'block';
    spotifyLoginBtn.addEventListener('click', () => {
      window.location.href = AUTH_URL;
    });
  }

  function getAccessTokenFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('access_token');
  }

  async function initializeApp(accessToken) {
    try {
      // Fetch user data
      const user = await fetchData('/api/me', accessToken);
      displayGreeting(user.display_name);

      // Fetch and display all data
      await displayTopTracks(accessToken);
      await displayRecentlyPlayed(accessToken);
      await displayCurrentlyPlaying(accessToken);

      // Set up refresh for currently playing track
      setInterval(() => displayCurrentlyPlaying(accessToken), 10000);
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  }

  async function fetchData(endpoint, accessToken) {
    const response = await fetch(`${endpoint}?access_token=${accessToken}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint}`);
    }
    return await response.json();
  }

  function displayGreeting(username) {
    const hours = new Date().getHours();
    let greeting = 'Morning';
    if (hours >= 12 && hours < 18) greeting = 'Afternoon';
    else if (hours >= 18) greeting = 'Evening';
    
    greetingTimeElem.textContent = greeting;
    usernameElem.textContent = username;
    greetingDiv.style.display = 'block';
    spotifyLoginBtn.style.display = 'none';
  }

  async function displayTopTracks(accessToken) {
    try {
      const { items: topTracks } = await fetchData('/api/top-tracks', accessToken);

      statsContainer.innerHTML = ''; 
      topTracks.forEach(track => {
        const trackElement = document.createElement('div');
        trackElement.classList.add('track');
        trackElement.innerHTML = `
          <img src="${track.album.images[0].url}" alt="${track.name} cover art" class="cover-art">
          <p><strong>${track.name}</strong> by ${track.artists.map(artist => artist.name).join(', ')}</p>
        `;
        statsContainer.appendChild(trackElement);
      });

      statsSection.style.display = 'block';
    } catch (error) {
      console.error('Error displaying top tracks:', error);
      statsContainer.innerHTML = '<p>Failed to load top tracks</p>';
    }
  }

  async function displayRecentlyPlayed(accessToken) {
    try {
      const { items } = await fetchData('/api/recently-played', accessToken);
      const totalMinutes = items.reduce((sum, item) => sum + item.track.duration_ms / 60000, 0);
      const lastPlayedSong = items[0];

      minutesContainer.innerHTML = '';
      const minutesElement = document.createElement('div');
      minutesElement.classList.add('minutes');
      minutesElement.innerHTML = `
        <p>Total minutes listened: ${Math.round(totalMinutes)} minutes</p>
        <img src="${lastPlayedSong.track.album.images[0].url}" alt="${lastPlayedSong.track.name} cover art" class="cover-art">
        <p>Last played song: "${lastPlayedSong.track.name}" by ${lastPlayedSong.track.artists.map(artist => artist.name).join(', ')}</p>
      `;
      minutesContainer.appendChild(minutesElement);

      minutesSection.style.display = 'block';
    } catch (error) {
      console.error('Error displaying recently played:', error);
      minutesContainer.innerHTML = '<p>Failed to load listening history</p>';
    }
  }

  async function displayCurrentlyPlaying(accessToken) {
    try {
      const playbackState = await fetchData('/api/currently-playing', accessToken);

      if (!playbackState || !playbackState.is_playing || !playbackState.item) {
        currentlyPlayingDiv.innerHTML = `
          <p>No track is currently playing. Start playing something on Spotify to see details here.</p>
        `;
        return;
      }

      const track = playbackState.item;
      const progressMs = playbackState.progress_ms;
      const durationMs = track.duration_ms;
      const elapsedMinutes = Math.floor(progressMs / 60000);
      const elapsedSeconds = Math.floor((progressMs % 60000) / 1000);
      const formattedProgress = `${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`;

      currentlyPlayingDiv.innerHTML = `
        <div class="d-flex align-items-center">
          <img src="${track.album.images[0].url}" alt="${track.name} cover art" class="cover-art me-3">
          <div class="track-details">
            <p><strong>${track.name}</strong> by ${track.artists.map(artist => artist.name).join(', ')}</p>
            <p>🎧 Playing for: ${formattedProgress} / ${(durationMs / 60000).toFixed(0)} minutes</p>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error displaying currently playing:', error);
      currentlyPlayingDiv.innerHTML = `
        <p>Failed to fetch playback state. Please ensure you are playing something on Spotify.</p>
      `;
    }
  }
});

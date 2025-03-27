const spotifyApi = new SpotifyWebApi();
const spotifyLoginBtn = document.getElementById('spotify-login');
const greetingDiv = document.getElementById('greeting');
const usernameElem = document.getElementById('username');
const greetingTimeElem = document.getElementById('greeting-time');
const statsSection = document.getElementById('stats');
const statsContainer = document.querySelector('.stats-container');
const minutesSection = document.getElementById('minutes');
const minutesContainer = document.querySelector('.minutes-container');

const CLIENT_ID = '26c78bd719744c07afb6233ec0d26c02';
const REDIRECT_URI = 'https://add2207.github.io/Trackify/';
const AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=user-top-read user-library-read user-read-recently-played user-read-playback-state user-read-currently-playing user-follow-read`;

// Token management variables
let accessToken = null;
let refreshToken = null;
let tokenExpiration = 0;

spotifyLoginBtn.addEventListener('click', () => {
    window.location.href = AUTH_URL;
});

// Parse tokens from URL hash
function parseTokensFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    accessToken = params.get('access_token');
    refreshToken = params.get('refresh_token');
    const expiresIn = params.get('expires_in');
    
    if (accessToken && expiresIn) {
        tokenExpiration = Date.now() + (expiresIn * 1000);
        localStorage.setItem('refreshToken', refreshToken);
        spotifyApi.setAccessToken(accessToken);
        return true;
    }
    return false;
}

// Check if token is expired
function isTokenExpired() {
    return Date.now() >= tokenExpiration;
}

// Refresh the access token
async function refreshAccessToken() {
    if (!refreshToken) {
        refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            console.error('No refresh token available');
            return false;
        }
    }

    try {
        const response = await fetch(`/refresh_token?refresh_token=${refreshToken}`);
        const data = await response.json();
        
        if (data.access_token) {
            accessToken = data.access_token;
            tokenExpiration = Date.now() + (data.expires_in * 1000);
            spotifyApi.setAccessToken(accessToken);
            return true;
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
    }
    return false;
}

// Secure API call wrapper with token refresh
async function makeApiCall(apiCall) {
    try {
        // Check if token is expired and refresh if needed
        if (isTokenExpired()) {
            const refreshed = await refreshAccessToken();
            if (!refreshed) {
                console.error('Failed to refresh token');
                return null;
            }
        }
        
        return await apiCall();
    } catch (error) {
        console.error('API call error:', error);
        
        // If unauthorized, try refreshing token once
        if (error.status === 401) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                return await apiCall();
            }
        }
        
        throw error;
    }
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

async function fetchStats() {
    try {
        const response = await makeApiCall(() => spotifyApi.getMyTopTracks({ limit: 5 }));
        if (!response) return;

        const topTracks = response.items;
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
        console.error('Error fetching stats:', error);
    }
}

async function fetchMinutes() {
    try {
        const response = await makeApiCall(() => spotifyApi.getMyRecentlyPlayedTracks({limit:50}));
        if (!response) return;

        const lastPlayedSong = response.items[0];
        const totalMinutes = response.items.reduce((sum,item) => sum + item.track.duration_ms/60000, 0);

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
        console.error('error fetching minutes:', error);
        alert('Failed to fetch minutes listened. Please try again.');
    }
}

async function fetchCurrentlyPlaying() {
    try {
        const response = await makeApiCall(() => spotifyApi.getMyCurrentPlaybackState());
        if (!response) return;

        if (!response.is_playing || !response.item) {
            document.getElementById('currently-playing').innerHTML = '<p>No track is currently playing.</p>';
            return;
        }

        const track = response.item;
        const progressMs = response.progress_ms;
        const durationMs = track.duration_ms;
        const elapsedMinutes = Math.floor(progressMs / 60000);
        const elapsedSeconds = Math.floor((progressMs % 60000) / 1000);
        const formattedProgress = `${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`;

        document.getElementById('currently-playing').innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${track.album.images[0].url}" alt="${track.name} cover art" class="cover-art me-3">
                <div class="track-details">
                    <p><strong>${track.name}</strong> by ${track.artists.map(artist => artist.name).join(', ')}</p>
                    <p>🎧 Playing for: ${formattedProgress} / ${(durationMs / 60000).toFixed(0)} minutes</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error fetching current playback state:', error);
        alert('Failed to fetch playback state. Please try again.');
    }
}

// Initialize the app
async function initApp() {
    if (parseTokensFromUrl()) {
        try {
            // Clear the URL hash after parsing tokens
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Fetch user data and display content
            const user = await makeApiCall(() => spotifyApi.getMe());
            if (user) {
                displayGreeting(user.display_name);
                await Promise.all([
                    fetchStats(),
                    fetchMinutes(),
                    fetchCurrentlyPlaying()
                ]);
                
                // Set up periodic refresh of currently playing track
                setInterval(fetchCurrentlyPlaying, 10000);
            }
        } catch (error) {
            console.error('Initialization error:', error);
        }
    } else {
        // Check for existing refresh token
        const storedRefreshToken = localStorage.getItem('refreshToken');
        if (storedRefreshToken) {
            refreshToken = storedRefreshToken;
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                initApp();
            }
        }
    }
}

// Start the app
initApp();

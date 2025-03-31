const CLIENT_ID = '26c78bd719744c07afb6233ec0d26c02';
const REDIRECT_URI = 'https://add2207.github.io/Trackify/';
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const RESPONSE_TYPE = 'token';

// Get token from URL after login
function getAccessToken() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('access_token');
}

// Redirect to Spotify Login
function login() {
    const authUrl = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=${RESPONSE_TYPE}&scope=user-read-playback-state%20user-read-recently-played%20user-top-read`;
    window.location.href = authUrl;
}

// Extract and store token
const accessToken = getAccessToken();

if (accessToken) {
    document.getElementById('spotify-login').style.display = 'none';
    loadUserData(accessToken);
} else {
    document.getElementById('spotify-login').addEventListener('click', login);
}

// Fetch User Data from Spotify
async function loadUserData(token) {
    try {
        const headers = { Authorization: `Bearer ${token}` };
        
        // Get User Profile
        const userResponse = await axios.get('https://api.spotify.com/v1/me', { headers });
        document.getElementById('username').innerText = userResponse.data.display_name;

        // Get Recently Played Tracks
        const recentResponse = await axios.get('https://api.spotify.com/v1/me/player/recently-played?limit=1', { headers });
        displayCurrentlyPlaying(recentResponse.data.items[0]);

        // Get Top Tracks
        const topTracksResponse = await axios.get('https://api.spotify.com/v1/me/top/tracks?limit=5', { headers });
        displayTopTracks(topTracksResponse.data.items);

        // Get Minutes Listened (Last 50 Tracks)
        const recent50Response = await axios.get('https://api.spotify.com/v1/me/player/recently-played?limit=50', { headers });
        displayMinutesListened(recent50Response.data.items);

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Display Currently Playing
function displayCurrentlyPlaying(track) {
    if (!track) {
        document.getElementById('currently-playing').innerHTML = '<p>No track is currently playing.</p>';
        return;
    }

    const trackInfo = `
        <div class="d-flex align-items-center">
            <img src="${track.track.album.images[0].url}" alt="${track.track.name} cover" class="cover-art me-3">
            <div class="track-details">
                <p><strong>${track.track.name}</strong> by ${track.track.artists.map(a => a.name).join(', ')}</p>
            </div>
        </div>
    `;
    document.getElementById('currently-playing').innerHTML = trackInfo;
}

// Display Top Tracks
function displayTopTracks(tracks) {
    const statsContainer = document.querySelector('#stats .stats-container');
    statsContainer.innerHTML = tracks
        .map(track => `
            <div class="track">
                <strong>${track.name}</strong> by ${track.artists.map(a => a.name).join(', ')}
            </div>
        `)
        .join('');
    document.getElementById('stats').style.display = 'block';
}

// Display Minutes Listened for Last 50 Tracks
function displayMinutesListened(tracks) {
    const totalMinutes = tracks.reduce((sum, track) => sum + track.track.duration_ms, 0) / 60000;
    document.querySelector('#minutes .minutes-container').innerHTML = `
        <p>Total Minutes: <strong>${Math.round(totalMinutes)} minutes</strong></p>
    `;
    document.getElementById('minutes').style.display = 'block';
}

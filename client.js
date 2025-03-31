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
        displayLastPlayed(recentResponse.data.items[0]);

        // Get Top Tracks
        const topTracksResponse = await axios.get('https://api.spotify.com/v1/me/top/tracks?limit=5', { headers });
        displayTopTracks(topTracksResponse.data.items);

        // Get Minutes Listened (Last 50 Tracks)
        const recent50Response = await axios.get('https://api.spotify.com/v1/me/player/recently-played?limit=50', { headers });
        displayMinutesListened(recent50Response.data.items);

        // Get Currently Playing Track
        loadCurrentlyPlaying(headers);
        setInterval(() => loadCurrentlyPlaying(headers), 1000); // Update every second
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Display Last Played Song in Minutes Section
function displayLastPlayed(track) {
    if (!track) {
        document.querySelector('#minutes .minutes-container').innerHTML = `
            <p>No recently played track found.</p>
        `;
        return;
    }

    const lastPlayedInfo = `
        <div class="d-flex align-items-center">
            <img src="${track.track.album.images[0].url}" alt="${track.track.name} cover" class="cover-art me-3">
            <div class="track-details">
                <p><strong>${track.track.name}</strong> by ${track.track.artists.map(a => a.name).join(', ')}</p>
                <p><small>Played at: ${new Date(track.played_at).toLocaleString()}</small></p>
            </div>
        </div>
    `;
    document.querySelector('#minutes .minutes-container').innerHTML = lastPlayedInfo;
    document.getElementById('minutes').style.display = 'block';
}

// Display Currently Playing with Live Counter
async function loadCurrentlyPlaying(headers) {
    try {
        const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', { headers });
        if (!response.data || !response.data.item) {
            document.getElementById('currently-playing').innerHTML = '<p>No track is currently playing.</p>';
            return;
        }

        const track = response.data.item;
        const progressMs = response.data.progress_ms;
        const durationMs = track.duration_ms;

        const elapsedMinutes = Math.floor(progressMs / 60000);
        const elapsedSeconds = Math.floor((progressMs % 60000) / 1000);
        const totalMinutes = Math.floor(durationMs / 60000);
        const totalSeconds = Math.floor((durationMs % 60000) / 1000);

        const progressInfo = `
            <div class="d-flex align-items-center">
                <img src="${track.album.images[0].url}" alt="${track.name} cover" class="cover-art me-3">
                <div class="track-details">
                    <p><strong>${track.name}</strong> by ${track.artists.map(a => a.name).join(', ')}</p>
                    <p><small>Elapsed Time: ${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')} / ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}</small></p>
                </div>
            </div>
        `;
        document.getElementById('currently-playing').innerHTML = progressInfo;
    } catch (error) {
        console.error('Error fetching currently playing data:', error);
    }
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
    document.querySelector('#minutes .minutes-container').innerHTML += `
        <p>Total Minutes Listened: <strong>${Math.round(totalMinutes)} minutes</strong></p>
    `;
    document.getElementById('minutes').style.display = 'block';
}

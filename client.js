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
const AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${REDIRECT_URI}&scope=user-top-read user-library-read user-read-recently-played user-read-playback-state user-read-currently-playing user-follow-read`;

spotifyLoginBtn.addEventListener('click', () => {
    window.location.href = AUTH_URL;
});

function getAccessToken() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('access_token');
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

async function fetchStats(accessToken) {
    spotifyApi.setAccessToken(accessToken);

    try {
        const response = await spotifyApi.getMyTopTracks({ limit: 5 });
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

async function fetchMinutes(accessToken){
    spotifyApi.setAccessToken(accessToken);

    try {
        const response = await spotifyApi.getMyRecentlyPlayedTracks({limit:50});
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

async function fetchCurrentlyPlaying(accessToken) {
    spotifyApi.setAccessToken(accessToken);

    try {
        const response = await spotifyApi.getMyCurrentPlaybackState();

        if (!response || !response.is_playing || !response.item) {
            document.getElementById('currently-playing').innerHTML = `
                <p>No track is currently playing. Start playing something on Spotify to see details here.</p>
            `;
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
        // Log the error and show a fallback message in the UI
        console.error('Error fetching current playback state:', error);
        document.getElementById('currently-playing').innerHTML = `
            <p>Failed to fetch playback state. Please ensure you are logged in and playing something on Spotify.</p>
        `;
    }
}

const accessToken = getAccessToken();
if (accessToken) {
    fetchStats(accessToken);
    fetchMinutes(accessToken);
    fetchCurrentlyPlaying(accessToken);
    setInterval(() => fetchCurrentlyPlaying(accessToken), 10000);
    spotifyApi.getMe().then(user => displayGreeting(user.display_name));
}

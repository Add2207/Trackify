const express = require('express');
const app = express();
const path = require('path');
const axios = require('axios');
const SpotifyWebApi = require('spotify-web-api-node');

const CLIENT_ID = '26c78bd719744c07afb6233ec0d26c02';
const REDIRECT_URI = 'https://add2207.github.io/Trackify/'; // Update this to your GitHub Pages URL
const AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${REDIRECT_URI}&scope=user-top-read user-library-read`;
const spotifyApi = new SpotifyWebApi({
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
});

app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' directory

// Route to serve the login page (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// This will be where the client is redirected after Spotify login
app.get('/callback', (req, res) => {
    const accessToken = req.query.access_token;  // Access token in the URL fragment
    res.redirect(`/?access_token=${accessToken}`);
});

app.get('/playback-data', async (req, res) => {
    const accessToken = req.query.access_token;  // Access token in the URL fragment
    if (!accessToken) {
        return res.status(400).json({ error: 'No access token found' });
    }

    try {
        spotifyApi.setAccessToken(accessToken);
        const response = await spotifyApi.getMyRecentlyPlayedTracks();
        const playbackData = response.body.items;
        res.json({ items: playbackData });
    } catch (error) {
        console.error('Error fetching playback data:', error);
        res.status(500).json({ error: 'Failed to fetch playback data' });
    }
});

// Use process.env.PORT if it's set (GitHub Pages environment variable)
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

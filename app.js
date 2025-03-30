const express = require('express');
const path = require('path');
const SpotifyWebApi = require('spotify-web-api-node');
const axios = require('axios');

const app = express();

// Configuration
const CLIENT_ID = 'd245afe0c0c8488bb51c2c9179b9c67a';
const REDIRECT_URI = 'https://add2207.github.io/Trackify/';
const AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${REDIRECT_URI}&scope=user-top-read user-library-read user-read-recently-played user-read-playback-state user-read-currently-playing user-follow-read`;

// Initialize Spotify API
const spotifyApi = new SpotifyWebApi({
  clientId: CLIENT_ID,
  redirectUri: REDIRECT_URI
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/auth/spotify', (req, res) => {
  res.redirect(AUTH_URL);
});

// API endpoints
app.get('/api/me', async (req, res) => {
  try {
    const accessToken = req.query.access_token;
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    spotifyApi.setAccessToken(accessToken);
    const user = await spotifyApi.getMe();
    res.json(user.body);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

app.get('/api/top-tracks', async (req, res) => {
  try {
    const accessToken = req.query.access_token;
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    spotifyApi.setAccessToken(accessToken);
    const topTracks = await spotifyApi.getMyTopTracks({ limit: 5 });
    res.json(topTracks.body);
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    res.status(500).json({ error: 'Failed to fetch top tracks' });
  }
});

app.get('/api/recently-played', async (req, res) => {
  try {
    const accessToken = req.query.access_token;
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    spotifyApi.setAccessToken(accessToken);
    const recentlyPlayed = await spotifyApi.getMyRecentlyPlayedTracks({ limit: 50 });
    res.json(recentlyPlayed.body);
  } catch (error) {
    console.error('Error fetching recently played tracks:', error);
    res.status(500).json({ error: 'Failed to fetch recently played tracks' });
  }
});

app.get('/api/currently-playing', async (req, res) => {
  try {
    const accessToken = req.query.access_token;
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    spotifyApi.setAccessToken(accessToken);
    const playbackState = await spotifyApi.getMyCurrentPlaybackState();
    res.json(playbackState.body);
  } catch (error) {
    console.error('Error fetching playback state:', error);
    res.status(500).json({ error: 'Failed to fetch playback state' });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

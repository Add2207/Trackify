const express = require('express');
const path = require('path');
const axios = require('axios');
const SpotifyWebApi = require('spotify-web-api-node');
const queryString = require('querystring');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const CLIENT_ID = '26c78bd719744c07afb6233ec0d26c02';
const CLIENT_SECRET = 'ff75563ff54749fd9dadf744093ea064'; // Add your client secret here
const REDIRECT_URI = 'https://add2207.github.io/Trackify/';
const AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=user-top-read user-library-read`;

const spotifyApi = new SpotifyWebApi({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
});

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(cookieParser());

// Route to serve the login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login route - redirects to Spotify auth
app.get('/login', (req, res) => {
    res.redirect(AUTH_URL);
});

// Callback route - exchanges code for tokens
app.get('/callback', async (req, res) => {
    const code = req.query.code || null;
    const error = req.query.error || null;

    if (error) {
        return res.redirect(`/?error=${error}`);
    }

    if (!code) {
        return res.redirect('/?error=no_code');
    }

    try {
        const authOptions = {
            method: 'POST',
            url: 'https://accounts.spotify.com/api/token',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
            },
            data: queryString.stringify({
                code: code,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            })
        };

        const response = await axios(authOptions);
        const { access_token, refresh_token, expires_in } = response.data;

        // Redirect with tokens in URL fragment
        res.redirect(`/#access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`);
    } catch (error) {
        console.error('Error during token exchange:', error);
        res.redirect('/?error=token_exchange_failed');
    }
});

// Refresh token route
app.get('/refresh_token', async (req, res) => {
    const refreshToken = req.query.refresh_token;

    if (!refreshToken) {
        return res.status(400).json({ error: 'No refresh token provided' });
    }

    try {
        const authOptions = {
            method: 'POST',
            url: 'https://accounts.spotify.com/api/token',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
            },
            data: queryString.stringify({
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            })
        };

        const response = await axios(authOptions);
        const { access_token, expires_in } = response.data;

        res.json({
            access_token: access_token,
            expires_in: expires_in
        });
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

// Playback data route
app.get('/playback-data', async (req, res) => {
    const accessToken = req.query.access_token;
    
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
        
        // If token expired, return specific error
        if (error.statusCode === 401) {
            return res.status(401).json({ error: 'token_expired' });
        }
        
        res.status(500).json({ error: 'Failed to fetch playback data' });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

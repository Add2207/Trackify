require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const SpotifyWebApi = require('spotify-web-api-node');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Spotify API setup
const CLIENT_ID = process.env.CLIENT_ID || '26c78bd719744c07afb6233ec0d26c02';
const CLIENT_SECRET = process.env.CLIENT_SECRET; // Ensure this is set
const REDIRECT_URI = 'http://localhost:4000/callback';

const spotifyApi = new SpotifyWebApi({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: REDIRECT_URI,
});

// MongoDB Schema
const userSchema = new mongoose.Schema({
  spotifyId: { type: String, required: true, unique: true },
  displayName: String,
  email: String,
  topTracks: Array,
  recentlyPlayed: Array
});
const User = mongoose.model('User', userSchema);

// Spotify Authentication Route
app.get('/callback', async (req, res) => {
  const accessToken = req.query.access_token;

  if (!accessToken) {
    return res.status(400).json({ error: 'No access token found' });
  }
  
  try {
    spotifyApi.setAccessToken(accessToken);
    const { body: userData } = await spotifyApi.getMe();
    console.log("🎵 User authenticated:", userData.display_name);

    let user = await User.findOne({ spotifyId: userData.id });

    if (!user) {
      console.log("📌 Saving new user to database:", userData.display_name);
      user = new User({
        spotifyId: userData.id,
        displayName: userData.display_name,
        email: userData.email,
        topTracks: [],
        recentlyPlayed: []
      });
      await user.save();
    }

    res.redirect(`/?access_token=${accessToken}`);
  } catch (error) {
    console.error('⚠️ Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Route to fetch and store playback data
app.get('/playback-data', async (req, res) => {
  const { access_token: accessToken, user_id: userId } = req.query;

  if (!accessToken || !userId) {
    return res.status(400).json({ error: 'Missing access token or user ID' });
  }

  try {
    spotifyApi.setAccessToken(accessToken);

    // Fetch user playback data
    const [topTracksRes, recentlyPlayedRes] = await Promise.all([
      spotifyApi.getMyTopTracks({ limit: 5 }),
      spotifyApi.getMyRecentlyPlayedTracks({ limit: 50 })
    ]);

    const topTracks = topTracksRes.body.items;
    const recentlyPlayed = recentlyPlayedRes.body.items;

    // Update the user in MongoDB
    const user = await User.findOneAndUpdate(
      { spotifyId: userId },
      { topTracks, recentlyPlayed },
      { new: true, upsert: true }
    );

    console.log(`🔄 Updated playback data for: ${user.displayName}`);

    res.json({ user });
  } catch (error) {
    console.error('⚠️ Error fetching playback data:', error);
    res.status(500).json({ error: 'Failed to fetch playback data' });
  }
});

// Server Setup
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

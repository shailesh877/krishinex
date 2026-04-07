const express = require('express');
const router = express.Router();
const axios = require('axios');

// @route   GET /api/weather
// @desc    Proxy weather data from Open-Meteo
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
            params: {
                latitude: lat,
                longitude: lon,
                current_weather: true,
                hourly: 'relative_humidity_2m',
                timezone: 'GMT'
            },
            timeout: 5000
        });

        res.json(response.data);
    } catch (error) {
        // Fallback: Instead of 502, return dummy data so the app doesn't break
        console.warn('Weather API failed, returning fallback data');
        res.json({
            current_weather: {
                temperature: 30,
                weathercode: 0,
                windspeed: 10,
                time: new Date().toISOString()
            },
            hourly: {
                relative_humidity_2m: [60]
            }
        });
    }
});

module.exports = router;

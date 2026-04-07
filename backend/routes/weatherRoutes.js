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
        console.error('Weather Proxy Error:', error.message);
        res.status(502).json({ error: 'Failed to fetch weather data from external service' });
    }
});

module.exports = router;

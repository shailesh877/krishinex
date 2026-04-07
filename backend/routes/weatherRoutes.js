const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// @route   GET /api/weather
// @desc    Proxy weather data from Open-Meteo with retry logic
// @access  Public
router.get('/', async (req, res) => {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const maxRetries = 3;
    let attempt = 0;

    const fetchWeatherData = async () => {
        attempt++;
        try {
            const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
                params: {
                    latitude: lat,
                    longitude: lon,
                    current_weather: true,
                    hourly: 'relative_humidity_2m',
                    timezone: 'GMT'
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
                    'Accept-Encoding': 'gzip, deflate, br'
                },
                timeout: 4000 // 4 seconds timeout per attempt
            });
            return response.data;
        } catch (error) {
            const errorLog = `[${new Date().toISOString()}] Attempt ${attempt} failed: ${error.message} - URL: ${error.config?.url}\n`;
            fs.appendFileSync(path.join(__dirname, '../weather_debug.log'), errorLog);
            
            if (attempt < maxRetries) {
                console.log(`Weather fetch attempt ${attempt} failed, retrying...`);
                // Wait 1 second before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
                return fetchWeatherData();
            }
            throw error;
        }
    };

    try {
        const data = await fetchWeatherData();
        res.json(data);
    } catch (finalError) {
        // Fallback: Instead of 502, return dummy data as last resort
        console.warn('All Weather API attempts failed, returning fallback data');
        res.json({
            current_weather: {
                temperature: 28,
                weathercode: 0,
                windspeed: 12,
                time: new Date().toISOString()
            },
            hourly: {
                relative_humidity_2m: [55]
            },
            isFallback: true
        });
    }
});

module.exports = router;

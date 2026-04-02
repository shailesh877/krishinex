const axios = require('axios');

const API_BASE = 'http://localhost:5500/api';
const AUTH_TOKEN = 'PASTE_TOKEN_HERE'; // I need to get a token first

async function testSearch(query) {
    try {
        const res = await axios.post(`${API_BASE}/ksp/search`, 
            { query }, 
            { headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` } }
        );
        console.log('Search Results for:', query);
        console.log(JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('Search failed:', err.response ? err.response.data : err.message);
    }
}

// I can't easily run this without a valid KSP token.
// Maybe I can find a user in the DB and then use their credentials or just look at the DB.

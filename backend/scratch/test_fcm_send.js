try {
    require('dns').setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const User = require('../models/User');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        let rawConfig = process.env.FIREBASE_SERVICE_ACCOUNT.trim();

        // 1. Unescape escaped double quotes if present (e.g. \" or \\" to ")
        if (rawConfig.includes('\\"')) {
            rawConfig = rawConfig.replace(/\\"/g, '"');
        }
        
        // 2. Remove surrounding outer quotes if added by Coolify / Docker env systems
        if (rawConfig.startsWith('"') && rawConfig.endsWith('"')) {
            rawConfig = rawConfig.slice(1, -1);
        }
        if (rawConfig.startsWith("'") && rawConfig.endsWith("'")) {
            rawConfig = rawConfig.slice(1, -1);
        }

        serviceAccount = JSON.parse(rawConfig);
        console.log("✅ Firebase Service Account successfully loaded from Environment Variable!");
    } catch (e) {
        console.error("❌ Error parsing FIREBASE_SERVICE_ACCOUNT Env:", e.message);
        process.exit(1);
    }
} else {
    if (!fs.existsSync(serviceAccountPath)) {
        console.error(`❌ Error: serviceAccountKey.json not found at ${serviceAccountPath} and FIREBASE_SERVICE_ACCOUNT Env is not set.`);
        process.exit(1);
    }
    serviceAccount = require(serviceAccountPath);
    console.log("✅ Firebase Service Account loaded from serviceAccountKey.json");
}

// We will try multiple private key formats to find the exact one accepted by Google
const keyFormats = [
    {
        name: "Ultimate Sanitized Key",
        key: (() => {
            let cleanKey = serviceAccount.private_key.trim();
            cleanKey = cleanKey.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
            cleanKey = cleanKey.replace(/-----BEGIN[ ]+PRIVATE[ ]+KEY-----/, '-----BEGIN PRIVATE KEY-----');
            cleanKey = cleanKey.replace(/-----END[ ]+PRIV[ ]+ATE[ ]+KEY-----/i, '-----END PRIVATE KEY-----');
            cleanKey = cleanKey.replace(/-----END[ ]+PRIVATE[ ]+KEY-----/, '-----END PRIVATE KEY-----');
            const body = cleanKey
                .replace('-----BEGIN PRIVATE KEY-----', '')
                .replace('-----END PRIVATE KEY-----', '')
                .replace(/\s+/g, '');
            const chunks = body.match(/.{1,64}/g);
            return `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----\n`;
        })()
    },
    {
        name: "Standard Parsed Key (split/join)",
        key: serviceAccount.private_key.split('\\n').join('\n').split('\\r').join('\r').trim()
    },
    {
        name: "Raw Key (as-is from JSON)",
        key: serviceAccount.private_key
    },
    {
        name: "Regex Replaced Key (replace \\n with actual newline)",
        key: serviceAccount.private_key.replace(/\\n/g, '\n').trim()
    }
];

let successfulFormat = null;

async function tryFormatsAndSend() {
    for (const format of keyFormats) {
        console.log(`\n--- Testing Key Format: ${format.name} ---`);
        console.log(`[DEBUG] Key String length: ${format.key?.length}`);
        console.log(`[DEBUG] Key starts with: "${format.key?.substring(0, 40)}"`);
        console.log(`[DEBUG] Key ends with: "${format.key?.substring(format.key?.length - 40)}"`);
        console.log(`[DEBUG] Real newlines count: ${format.key?.split('\n').length - 1}`);
        console.log(`[DEBUG] Literal \\n count: ${format.key?.split('\\n').length - 1}`);
        
        try {
            // Delete existing default app if already initialized
            if (admin.apps.length > 0) {
                await Promise.all(admin.apps.map(app => app.delete()));
            }

            const cert = {
                ...serviceAccount,
                private_key: format.key
            };

            admin.initializeApp({
                credential: admin.credential.cert(cert)
            });
            console.log(`✅ Firebase Admin initialized with: ${format.name}`);
            
            // Try fetching a token to verify signature immediately!
            const credential = admin.app().options.credential;
            const accessTokenObj = await credential.getAccessToken();
            console.log(`🚀 SUCCESS! Format "${format.name}" fetched access token successfully!`);
            successfulFormat = format;
            break; // Exit loop on success!
        } catch (authError) {
            console.error(`❌ Format "${format.name}" failed:`, authError.message || authError);
        }
    }

    if (!successfulFormat) {
        console.error("\n❌ All key formatting attempts failed! Google rejected all JWT signatures.");
        process.exit(1);
    }
}


mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB.');

        // Initialize and check credentials format!
        await tryFormatsAndSend();

        // Find the test user Yuvraj Singh (with farmer role who has the active token)
        const user = await User.findOne({ phone: '9648022011', role: 'farmer' });
        if (!user) {
            console.error('❌ User Yuvraj Singh (9648022011) not found in database.');
            mongoose.connection.close();
            return;
        }

        console.log(`User found: ${user.name}`);
        if (!user.fcmToken) {
            console.error('❌ User does not have an FCM Token in the database.');
            mongoose.connection.close();
            return;
        }

        console.log(`FCM Token: ${user.fcmToken}`);

        // Construct message
        const message = {
            token: user.fcmToken,
            notification: {
                title: '⚡ Direct Diagnostics Test',
                body: 'Bhai! Agr ye notification aaya to aapka push system 100% sahi hai! 🎉'
            },
            data: {
                type: 'test',
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'default'
                }
            }
        };

        console.log('Sending message via Firebase...');
        try {
            const response = await admin.messaging().send(message);
            console.log('✅ SUCCESS! Firebase accepted the notification.');
            console.log('Response:', response);
        } catch (fcmError) {
            console.error('❌ Firebase FCM Send Error:', fcmError);
        }

        mongoose.connection.close();
    })
    .catch(err => {
        console.error('MongoDB Error:', err);
        process.exit(1);
    });

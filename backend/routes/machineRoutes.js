const express = require('express');
const router = express.Router();
const { sendNotification } = require('../services/notificationService');
const Machine = require('../models/Machine');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const uploadDir = 'uploads/machines/';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
// Using .any() is safe, but we'll manually pull from 'images' field
const machineUpload = upload.any();

// @route   POST /api/machines
router.post('/', protect, upload.array('images', 20), async (req, res) => {
    try {
        const fs = require('fs');
        const debugStr = `\n--- [DEBUG] POST AT ${new Date().toISOString()} ---\n` +
                         `REQ BODY: ${JSON.stringify(req.body)}\n` +
                         `REQ FILES: ${JSON.stringify((req.files||[]).map(f => f.originalname))}\n` + 
                         `HEADERS: ${JSON.stringify(req.headers)}\n`;
        fs.appendFileSync('debug_post_log.txt', debugStr);

        console.log('--- [DEBUG] POST Machine Request ---');
        console.log('Body:', JSON.stringify(req.body, null, 2));
        console.log('Files Received:', (req.files || []).map(f => f.filename));

        const { machineName, priceDay, priceHour, desc, distanceKm, village, category, latitude, longitude, subMachinery: subMachineryJson, imageConfig: imageConfigJson } = req.body;
        const files = req.files || [];

        let subData = [];
        try {
            if (subMachineryJson) {
                subData = (typeof subMachineryJson === 'string') 
                    ? JSON.parse(subMachineryJson) 
                    : subMachineryJson;
            }
        } catch (err) { console.log('Sub-machinery JSON error:', err); }

        let imageConfig = [];
        try {
            if (imageConfigJson) {
                imageConfig = (typeof imageConfigJson === 'string') 
                    ? JSON.parse(imageConfigJson) 
                    : imageConfigJson;
            }
        } catch (err) { console.log('ImageConfig JSON error:', err); }

        console.log('Parsed ImageConfig:', imageConfig);

        // EXPLICIT MAPPING with Filename Prefix Fallback
        let machineImages = [];
        let subImagesMap = {}; // index -> filename
        let subFileCounter = 0;

        for (const file of files) {
            const index = files.indexOf(file);
            const configType = (imageConfig && imageConfig[index]) ? imageConfig[index] : null;
            const fileNameOriginal = file.originalname || '';
            
            let type = configType;
            if (!type) {
                if (fileNameOriginal.toLowerCase().startsWith('sub_')) {
                    type = 'sub';
                } else {
                    type = 'main';
                }
            }

            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

            if (type === 'main') {
                const fileName = `main-${uniqueSuffix}.jpeg`;
                const filePath = path.join(uploadDir, fileName);
                await sharp(file.buffer)
                    .resize(500, 500)
                    .jpeg({ quality: 90 })
                    .toFile(filePath);
                machineImages.push(`uploads/machines/${fileName}`);
            } else if (type === 'sub') {
                const ext = path.extname(fileNameOriginal) || '.jpg';
                const fileName = `sub-${uniqueSuffix}${ext}`;
                const filePath = path.join(uploadDir, fileName);
                require('fs').writeFileSync(filePath, file.buffer);
                subImagesMap[subFileCounter] = `uploads/machines/${fileName}`;
                subFileCounter++;
            }
        }

        // Match sub-machinery meta with their photos in ORDER
        let subImageFoundIdx = 0;
        const processedSub = subData.map((item) => {
            let imgPath = '';
            if (item.hasImage && subImagesMap[subImageFoundIdx]) {
                imgPath = subImagesMap[subImageFoundIdx];
                subImageFoundIdx++;
            }
            return { 
                name: item.name || 'Attachment', 
                image: imgPath,
                priceDay: (item.priceDay !== undefined && item.priceDay !== null && item.priceDay !== '') ? Number(String(item.priceDay).replace(/[^0-9.]/g, '')) : 0,
                priceKattha: (item.priceKattha !== undefined && item.priceKattha !== null && item.priceKattha !== '') ? Number(String(item.priceKattha).replace(/[^0-9.]/g, '')) : 0
            };
        });

        // HEURISTIC RECOVERY: Link any dangling SUB photos that metadata missed
        while (subImagesMap[subImageFoundIdx]) {
            console.log(`[DEBUG] POST HEURISTIC: Linking dangling SUB photo ${subImagesMap[subImageFoundIdx]}`);
            processedSub.push({
                name: `Attachment ${processedSub.length + 1}`,
                image: subImagesMap[subImageFoundIdx],
                priceDay: 0,
                priceKattha: 0
            });
            subImageFoundIdx++;
        }

        const machine = await Machine.create({
            owner: req.user.id,
            name: machineName,
            priceDay: Number(priceDay) || 0,
            priceHour: Number(priceHour) || 0,
            desc: desc || '',
            distanceKm: Number(distanceKm) || 0,
            village: village || '',
            category: category || 'tractor',
            images: machineImages,
            subMachinery: processedSub,
            location: (latitude && longitude) ? {
                type: 'Point',
                coordinates: [Number(longitude), Number(latitude)]
            } : undefined
        });

        await sendNotification(req.user.id, 'Machine Added', `Machine "${machineName}" added.`, `मशीन "${machineName}" जुड़ गई है।`, 'system', machine._id.toString()).catch(() => { });
        res.status(201).json({ message: 'Machine added successfully', machine });
    } catch (error) {
        console.error('Logic Error:', error);
        res.status(500).json({ error: 'Logic Error: ' + error.message });
    }
});

// @route   PUT /api/machines/:id
router.put('/:id', protect, upload.array('images', 20), async (req, res) => {
    try {
        const debugStr = `\n--- [DEBUG] PUT AT ${new Date().toISOString()} ---\n` +
                         `REQ BODY: ${JSON.stringify(req.body)}\n` +
                         `REQ FILES: ${JSON.stringify((req.files||[]).map(f => f.originalname))}\n`;
        fs.appendFileSync('debug_log.txt', debugStr);

        console.log('--- [DEBUG] ABSOLUTE RAW INSPECTION (PUT) ---');
        console.log('REQ BODY:', JSON.stringify(req.body, null, 2));
        console.log('REQ FILES:', (req.files || []).map(f => ({
            original: f.originalname,
            field: f.fieldname,
            savedAs: f.filename
        })));

        const machine = await Machine.findOne({ _id: req.params.id, owner: req.user.id });
        if (!machine) return res.status(404).json({ error: 'Not found' });

        const { name, priceDay, priceHour, desc, village, distanceKm, latitude, longitude, existingImages, subMachinery: subMachineryJson, imageConfig: imageConfigJson } = req.body;
        const files = req.files || [];

        let imageUrls = [];
        if (existingImages) {
            imageUrls = Array.isArray(existingImages) ? existingImages : [existingImages];
        }

        let subData = [];
        try {
            if (subMachineryJson) {
                subData = (typeof subMachineryJson === 'string') 
                    ? JSON.parse(subMachineryJson) 
                    : subMachineryJson;
            }
        } catch (err) { console.log('SubData JSON Error:', err); }

        let imageConfig = [];
        try {
            if (imageConfigJson) {
                imageConfig = (typeof imageConfigJson === 'string') 
                    ? JSON.parse(imageConfigJson) 
                    : imageConfigJson;
            }
        } catch (err) { console.log('ImageConfig JSON error:', err); }

        console.log('Parsed ImageConfig (Edit):', imageConfig);

        // EXPLICIT MAPPING with Filename Prefix Fallback
        let subImagesMap = {};
        let subFileCounter = 0;

        for (const file of files) {
            const index = files.indexOf(file);
            const configType = (imageConfig && imageConfig[index]) ? imageConfig[index] : null;
            const fileNameOriginal = file.originalname || '';
            
            let type = configType;
            if (!type) {
                if (fileNameOriginal.toLowerCase().startsWith('sub_')) {
                    type = 'sub';
                } else {
                    type = 'main';
                }
            }

            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

            if (type === 'main') {
                const fileName = `main-${uniqueSuffix}.jpeg`;
                const filePath = path.join(uploadDir, fileName);
                await sharp(file.buffer)
                    .resize(500, 500)
                    .jpeg({ quality: 90 })
                    .toFile(filePath);
                imageUrls.push(`uploads/machines/${fileName}`);
            } else if (type === 'sub') {
                const ext = path.extname(fileNameOriginal) || '.jpg';
                const fileName = `sub-${uniqueSuffix}${ext}`;
                const filePath = path.join(uploadDir, fileName);
                require('fs').writeFileSync(filePath, file.buffer);
                subImagesMap[subFileCounter] = `uploads/machines/${fileName}`;
                subFileCounter++;
            }
        }

        let subImageFoundIdx = 0;
        const updatedSubMachinery = subData.map((item) => {
            let imgPath = item.image || ''; // Default to existing
            if (item.isNewImage && subImagesMap[subImageFoundIdx]) {
                imgPath = subImagesMap[subImageFoundIdx];
                subImageFoundIdx++;
            }
            return { 
                name: item.name || 'Attachment', 
                image: imgPath,
                priceDay: (item.priceDay !== undefined && item.priceDay !== null && item.priceDay !== '') ? Number(String(item.priceDay).replace(/[^0-9.]/g, '')) : 0,
                priceKattha: (item.priceKattha !== undefined && item.priceKattha !== null && item.priceKattha !== '') ? Number(String(item.priceKattha).replace(/[^0-9.]/g, '')) : 0
            };
        });

        // HEURISTIC RECOVERY: Link any dangling SUB photos that metadata missed
        while (subImagesMap[subImageFoundIdx]) {
            console.log(`[DEBUG] HEURISTIC RECOVERY: Linking dangling SUB photo ${subImagesMap[subImageFoundIdx]}`);
            updatedSubMachinery.push({
                name: `Attachment ${updatedSubMachinery.length + 1}`,
                image: subImagesMap[subImageFoundIdx],
                priceDay: 0,
                priceKattha: 0
            });
            subImageFoundIdx++;
        }

        const subLog = `\n[DEBUG] Final SubMachinery to Save: ${JSON.stringify(updatedSubMachinery, null, 2)}\n`;
        fs.appendFileSync('debug_log.txt', subLog);
        console.log('[DEBUG] Final SubMachinery to Save:', JSON.stringify(updatedSubMachinery, null, 2));
        console.log('[DEBUG] Name:', name, 'PriceDay:', priceDay, 'PriceHour:', priceHour);

        // Update fields
        machine.name = name || machine.name;
        machine.priceDay = priceDay !== undefined ? Number(priceDay) : machine.priceDay;
        machine.priceHour = priceHour !== undefined ? Number(priceHour) : machine.priceHour;
        machine.desc = desc !== undefined ? desc : machine.desc;
        machine.village = village !== undefined ? village : machine.village;
        machine.distanceKm = distanceKm !== undefined ? Number(distanceKm) : machine.distanceKm;
        machine.images = imageUrls.slice(0, 3);
        machine.subMachinery = updatedSubMachinery;

        if (latitude && longitude) {
            machine.location = { type: 'Point', coordinates: [Number(longitude), Number(latitude)] };
        }

        machine.markModified('subMachinery');
        await machine.save();
        const savedLog = `\n[DEBUG] Machine Saved. ID: ${machine._id} SubMachinery: ${JSON.stringify(machine.subMachinery, null, 2)}\n`;
        fs.appendFileSync('debug_log.txt', savedLog);
        console.log('[DEBUG] Machine Saved. ID:', machine._id, 'SubMachinery:', JSON.stringify(machine.subMachinery, null, 2));
        res.json({ message: 'Machine updated successfully', machine });
    } catch (e) {
        const errLog = `\n[ERROR] Update Failed at ${new Date().toISOString()}: ${e.message}\nSTACK: ${e.stack}\n`;
        fs.appendFileSync('debug_log.txt', errLog);
        console.error('Update Error:', e);
        res.status(500).json({ error: 'Update Failed: ' + e.message });
    }
});

router.get('/my', protect, async (req, res) => {
    try {
        const machines = await Machine.find({ owner: req.user.id }).sort({ createdAt: -1 });
        console.log(`[DEBUG] Fetching My Machines for User ${req.user.id}: Found ${machines.length}`);
        machines.forEach((m, i) => {
            console.log(`[DEBUG] Machine ${i} (${m.name}): SubMachinery Count = ${m.subMachinery?.length || 0}`);
        });
        res.json(machines);
    } catch (e) {
        console.error('Fetch Error:', e);
        res.status(500).json({ error: 'Fetch failed' });
    }
});

router.get('/public', protect, async (req, res) => {
    try {
        console.log('\n--- [DEBUG] GET /api/machines/public ---');
        const { category, search, maxDistance, userLat, userLng } = req.query;
        let q = {};
        if (search) q.name = { $regex: search, $options: 'i' };
        if (category && category !== 'all') q.category = { $regex: category, $options: 'i' };

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const radius = (maxDistance && maxDistance !== 'null') ? Number(maxDistance) : null;
        let results;

        if (radius && !isNaN(radius) && userLat && userLng) {
            results = await Machine.aggregate([
                {
                    $geoNear: {
                        near: {
                            type: 'Point',
                            coordinates: [Number(userLng), Number(userLat)]
                        },
                        distanceField: 'distanceKm',
                        maxDistance: radius * 1000, // Distance in meters
                        query: q,
                        spherical: true,
                        distanceMultiplier: 0.001, // Convert meters to km
                        key: 'location'
                    }
                },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        name: 1,
                        priceDay: 1,
                        priceHour: 1,
                        desc: 1,
                        distanceKm: 1,
                        village: 1,
                        category: 1,
                        images: { $slice: ['$images', 1] }, // Only return the first image (thumbnail)
                        'subMachinery.name': 1,
                        'subMachinery.priceDay': 1,
                        'subMachinery.priceKattha': 1,
                        owner: 1
                    }
                }
            ]);
            results = await Machine.populate(results, { path: 'owner', select: 'name status businessName' });
        } else {
            results = await Machine.find(q)
                .select('name priceDay priceHour desc distanceKm village category images subMachinery owner')
                .populate('owner', 'name status businessName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
            
            // Map to only return first image for lightweight response
            results = results.map(m => {
                const doc = m.toObject();
                if (doc.images && doc.images.length > 0) {
                    doc.images = [doc.images[0]];
                }
                return doc;
            });
        }

        const filtered = results.filter(m => m.owner && m.owner.status === 'approved');
        res.json({
            data: filtered,
            page,
            limit,
            hasMore: filtered.length === limit // Using length before filtering is an approximation
        });
    } catch (e) {
        console.error('Fetch public machines error:', e);
        res.status(500).json({ error: 'Search failed' });
    }
});

// @route   GET /api/machines/:id
// @desc    Get detailed machine profile
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const machine = await Machine.findById(req.params.id).populate('owner', 'name status businessName phone profilePhotoUrl');
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        res.json(machine);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch machine details' });
    }
});

router.delete('/:id', protect, async (req, res) => {
    try {
        await Machine.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: 'Delete failed' }); }
});

module.exports = router;

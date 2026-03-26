import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import dotenv from 'dotenv';
import { connectDB, executeQuery, closeDB } from './config/dbengine.js';
import { verifyTreeImage, calculateDistance, generateTreePlantingResponse } from './utils/treeVerification.js';
import { log } from 'console';
import cors from 'cors'

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const JWT_SECRET = process.env.JWT_SECRET;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log(req.url, req.baseUrl, req.body, req.method);
    next()
})
app.use(cors())


const authenticateToken = (req, res, next) => {

    req.user = { id: 1, email: 'local@test.com' };
    next();
};

// POST /auth/login
app.post('/auth/login', async (req, res) => {
    try {
        const { email } = req.body;
        const token = "dummy_token";
        res.status(200).json({
            success: true,
            token,
            user: {
                id: 1,
                name: 'Local User',
                email: email || 'local@test.com',
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST /auth/register
app.post('/auth/register', async (req, res) => {
    try {
        const { email } = req.body;
        const token = "dummy_token";
        res.status(201).json({
            success: true,
            token,
            user: {
                id: 1,
                name: 'Local User',
                email: email || 'local@test.com',
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// ============ USER PROFILE ENDPOINTS ============

// GET /users/me
app.get('/users/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch user details
        const userQuery = `SELECT id, name, email, bio, created_at FROM users WHERE id = ?`;
        const userRows = await executeQuery(userQuery, [userId]);

        if (userRows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = userRows[0];

        // Fetch user stats
        const statsQuery = `SELECT trees_planted, co2_saved, guilds_active, global_rank, total_score, level
                        FROM user_stats WHERE user_id = ?`;
        const statsRows = await executeQuery(statsQuery, [userId]);

        const stats = statsRows.length > 0 ? statsRows[0] : {};

        // Fetch activities
        const activitiesQuery = `SELECT id, description, created_at, points FROM activities WHERE user_id = ? LIMIT 10`;
        const activities = await executeQuery(activitiesQuery, [userId]);

        // Fetch timeline
        const timelineQuery = `SELECT date, title, description FROM user_timeline WHERE user_id = ? LIMIT 10`;
        const timeline = await executeQuery(timelineQuery, [userId]);

        res.status(200).json({
            success: true,
            data: {
                firstName: user.NAME?.split(' ')[0] || '',
                lastName: user.NAME?.split(' ')[1] || '',
                email: user.EMAIL,
                bio: user.BIO || '',
                memberSince: user.CREATED_AT,
                avatar: user.NAME?.[0] || '',
                stats: {
                    treesPlanted: stats.TREES_PLANTED || 0,
                    co2Saved: stats.CO2_SAVED || 0,
                    guildsActive: stats.GUILDS_ACTIVE || 0,
                    globalRank: stats.GLOBAL_RANK || 0,
                    totalScore: stats.TOTAL_SCORE || 0,
                    level: stats.LEVEL || 'Beginner',
                },
                activities: activities.map(a => ({
                    id: a.ID,
                    desc: a.DESCRIPTION,
                    time: a.CREATED_AT,
                    points: `+${a.POINTS}`,
                })),
                timeline: timeline.map(t => ({
                    date: t.DATE,
                    title: t.TITLE,
                    desc: t.DESCRIPTION,
                })),
            },
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// ============ TREES ENDPOINTS ============

// GET /trees
app.get('/trees', async (req, res) => {

    try {
        const query = `SELECT id, top, left, label FROM trees LIMIT 1000`;
        const trees = await executeQuery(query);

        const totalQuery = `SELECT COUNT(*) as count FROM trees`;
        const totalResult = await executeQuery(totalQuery);
        const totalTrees = totalResult[0]?.COUNT || 0;

        console.log("Worling here");

        res.status(200).json({
            success: true,
            data: trees.map(t => ({
                id: t.ID,
                top: t.TOP,
                left: t.LEFT,
                label: t.LABEL,
            })),
            totalTrees,
        });
    } catch (error) {
        console.error('Error fetching trees:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST /trees
app.post('/trees', authenticateToken, upload.single('image'), async (req, res) => {
    
    try {
        const { type, latitude, longitude, notes } = req.body;
console.log("verifying!!");

        const userId = req.user.id;


        if (!type || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Type, latitude, and longitude required',
            });
        }

        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);

        // Validate coordinates
        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coordinates',
            });
        }

        // Step 1: Verify image using Gemini API
        const imageVerification = await verifyTreeImage(req.file?.buffer);

        if (!imageVerification.verified) {
            return res.status(400).json({
                success: false,
                message: 'Image verification failed',
                verification: imageVerification,
            });
        }

        // Step 2: Check for nearby trees within 1 meter radius
        const nearbyQuery = `SELECT id, user_id, type, latitude, longitude, created_at FROM trees`;
        const allTrees = await executeQuery(nearbyQuery);

        const nearbyTrees = allTrees
            .filter((tree) => {
                const distance = calculateDistance(lat, lon, tree.LATITUDE, tree.LONGITUDE);
                return distance <= 1 && distance > 0; // Within 1 meter, excluding exact same location
            })
            .map((tree) => ({
                ...tree,
                distance: calculateDistance(lat, lon, tree.LATITUDE, tree.LONGITUDE),
            }))
            .sort((a, b) => a.distance - b.distance);

        // Step 3: Check if exact same tree already exists (prevent duplicates)
        const exactDuplicateQuery = `SELECT id FROM trees WHERE latitude = ? AND longitude = ? AND type = ? LIMIT 1`;
        const exactDuplicate = await executeQuery(exactDuplicateQuery, [lat, lon, type]);

        if (exactDuplicate.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'A tree already exists at this exact location',
                surroundings: {
                    radiusChecked: '1m',
                    nearbyTreeCount: nearbyTrees.length,
                    nearbyTrees: nearbyTrees.map((t) => ({
                        id: t.ID,
                        type: t.TYPE,
                        distance: t.distance,
                        location: {
                            latitude: t.LATITUDE,
                            longitude: t.LONGITUDE,
                        },
                    })),
                },
            });
        }

        // Step 4: Insert tree into database
        const insertQuery = `INSERT INTO trees (user_id, type, latitude, longitude, notes, image_data, created_at)
                             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;

        const imageData = req.file ? req.file.buffer.toString('hex') : null;
        await executeQuery(insertQuery, [
            userId,
            type,
            lat,
            lon,
            notes || null,
            imageData,
        ]);

        const fetchInsertedTreeQuery = `SELECT id, user_id, type, latitude, longitude, notes, created_at 
                                        FROM trees 
                                        WHERE user_id = ? AND latitude = ? AND longitude = ? AND type = ? 
                                        ORDER BY created_at DESC LIMIT 1`;
        
        const insertResult = await executeQuery(fetchInsertedTreeQuery, [userId, lat, lon, type]);

        if (insertResult.length === 0) {
            throw new Error('Failed to insert tree');
        }

        const newTree = insertResult[0];

        // Step 5: Update user stats
        const updateStatsQuery = `UPDATE user_stats 
                                  SET trees_planted = trees_planted + 1, 
                                      total_score = total_score + 50,
                                      co2_saved = co2_saved + 25
                                  WHERE user_id = ?`;
        await executeQuery(updateStatsQuery, [userId]);

        // Fetch updated stats
        const statsQuery = `SELECT total_score FROM user_stats WHERE user_id = ?`;
        const statsResult = await executeQuery(statsQuery, [userId]);
        const totalScore = statsResult[0]?.TOTAL_SCORE || 50;

        // Step 6: Generate custom structured response
        const treeWithStats = {
            ...newTree,
            TOTAL_SCORE: totalScore,
        };

        const response = generateTreePlantingResponse(
            treeWithStats,
            imageVerification,
            nearbyTrees
        );

        res.status(201).json(response);
    } catch (error) {
        console.error('Error planting tree:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
});

// ============ GUILDS ENDPOINTS ============

// GET /guilds
app.get('/guilds', async (req, res) => {
    try {
        const query = `SELECT id, name, members_count, target, image_url FROM guilds`;
        const guilds = await executeQuery(query);

        res.status(200).json({
            success: true,
            data: guilds.map(g => ({
                id: g.ID,
                name: g.NAME,
                members: g.MEMBERS_COUNT,
                target: g.TARGET,
                joined: false,
                image: g.IMAGE_URL,
            })),
        });
    } catch (error) {
        console.error('Error fetching guilds:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST /guilds/:id/join
app.post('/guilds/:id/join', authenticateToken, async (req, res) => {
    try {
        const guildId = req.params.id;
        const userId = req.user.id;

        // Check if already member
        const checkQuery = `SELECT * FROM guild_members WHERE guild_id = ? AND user_id = ?`;
        const existing = await executeQuery(checkQuery, [guildId, userId]);

        if (existing.length > 0) {
            // User is already a member, so remove them (leave)
            const deleteQuery = `DELETE FROM guild_members WHERE guild_id = ? AND user_id = ?`;
            await executeQuery(deleteQuery, [guildId, userId]);

            // Update member count
            const updateQuery = `UPDATE guilds SET members_count = members_count - 1 WHERE id = ?`;
            await executeQuery(updateQuery, [guildId]);

            return res.status(200).json({
                success: true,
                message: 'Successfully left the guild.',
            });
        } else {
            // Add user to guild
            const insertQuery = `INSERT INTO guild_members (guild_id, user_id, joined_at)
                           VALUES (?, ?, CURRENT_TIMESTAMP)`;
            await executeQuery(insertQuery, [guildId, userId]);

            // Update member count
            const updateQuery = `UPDATE guilds SET members_count = members_count + 1 WHERE id = ?`;
            await executeQuery(updateQuery, [guildId]);

            return res.status(200).json({
                success: true,
                message: 'Successfully joined the guild.',
            });
        }
    } catch (error) {
        console.error('Error joining guild:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// ============ LEADERBOARD ENDPOINTS ============

// GET /leaderboard
app.get('/leaderboard', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const query = `SELECT u.id, u.name, us.total_score, us.level, u.name as avatar
                   FROM users u
                   LEFT JOIN user_stats us ON u.id = us.user_id
                   ORDER BY us.total_score DESC
                   LIMIT 100`;

        const users = await executeQuery(query);

        const leaderboard = users.map((u, index) => ({
            rank: index + 1,
            name: u.NAME,
            score: u.TOTAL_SCORE || 0,
            level: u.LEVEL || 'Beginner',
            avatar: u.NAME?.[0] || 'U',
            isCurrentUser: u.ID === userId,
        }));

        res.status(200).json({
            success: true,
            data: leaderboard,
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// ============ SERVER INITIALIZATION ============

const PORT = process.env.PORT || 3000;

// Start server and connect to database
(async () => {
    try {
        await connectDB();
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
    await closeDB();
    process.exit(0);
});
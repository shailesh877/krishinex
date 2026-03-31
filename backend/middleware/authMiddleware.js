const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
        } catch (error) {
            // ... handled below
        }
    } else if (req.query && req.query.token) {
        // Fallback for native browser downloads
        token = req.query.token;
    }

    if (token) {
        try {
            const secret = process.env.JWT_SECRET;
            const decoded = jwt.verify(token, secret);

            req.user = decoded; // { id, role, iat, exp }

            next();
        } catch (error) {
            console.error('Not authorized, token failed', error);
            res.status(401).json({ error: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ error: 'Not authorized, no token' });
    }
};

const checkAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Admin only.' });
    }
};

/**
 * checkModule - Granular RBAC Middleware
 * Allows access if user is 'admin' OR an 'employee' with the required module permission.
 */
const User = require('../models/User');
const checkModule = (moduleKey) => async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

        // Super Admin gets full access
        if (req.user.role === 'admin') return next();

        // Fetch fresh user data to check permissions
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User account not found.' });

        // Check if employee has the specific module assigned
        if (user.role === 'employee' && user.employeeModules && user.employeeModules.includes(moduleKey)) {
            return next();
        }

        console.warn(`[RBAC] Access denied for ${user.email} on module: ${moduleKey}`);
        res.status(403).json({ error: `Access denied. ${moduleKey} permission required.` });
    } catch (error) {
        console.error('[RBAC] Error checking permissions:', error);
        res.status(500).json({ error: 'Internal server error during permission check.' });
    }
};

module.exports = { protect, checkAdmin, checkModule };

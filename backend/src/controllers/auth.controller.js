"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = signup;
exports.login = login;
exports.me = me;
exports.activeSessions = activeSessions;
exports.logout = logout;
exports.revokeOthers = revokeOthers;
exports.revokeSession = revokeSession;
const AuthService = __importStar(require("../services/auth.service"));
function safeError(err) {
    if (err instanceof Error)
        return err.message;
    return 'An unexpected error occurred';
}
async function signup(req, res) {
    try {
        const { email, password, deviceName, deviceOS, location, interests } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        const data = await AuthService.signup(email, password, {
            deviceName,
            deviceOS,
            ipAddress: req.ip,
            location,
            interests,
        });
        res.json(data);
    }
    catch (err) {
        console.error("💥 FULL SIGNUP ERROR:", err);
        return res.status(400).json({
            error: err?.message ||
                err?.details ||
                err?.hint ||
                JSON.stringify(err) ||
                'Signup failed'
        });
    }
}
async function login(req, res) {
    try {
        const { email, password, deviceName, deviceOS } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        const data = await AuthService.login(email, password, {
            deviceName,
            deviceOS,
            ipAddress: req.ip,
        });
        res.json(data);
    }
    catch (err) {
        console.error('LOGIN FAILED:', err);
        res.status(401).json({ error: 'Invalid email or password' });
    }
}
async function me(req, res) {
    const user = req.user;
    res.json({ user });
}
async function activeSessions(req, res) {
    try {
        const sessions = await AuthService.getActiveSessions(req.user.id);
        res.json({ sessions });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
}
async function logout(req, res) {
    try {
        await AuthService.logout(req.sessionToken);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Logout failed' });
    }
}
async function revokeOthers(req, res) {
    try {
        await AuthService.revokeOtherSessions(req.user.id, req.sessionToken);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to revoke sessions' });
    }
}
async function revokeSession(req, res) {
    try {
        const { sessionId } = req.body;
        if (!sessionId)
            return res.status(400).json({ error: 'Session ID required' });
        await AuthService.revokeSessionById(req.user.id, sessionId);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to revoke session' });
    }
}

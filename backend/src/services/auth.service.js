"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = signup;
exports.login = login;
exports.validateSession = validateSession;
exports.getActiveSessions = getActiveSessions;
exports.logout = logout;
exports.revokeOtherSessions = revokeOtherSessions;
exports.revokeSessionById = revokeSessionById;
const db_1 = require("../lib/db");
const hash_1 = require("../utils/hash");
const token_1 = require("../utils/token");
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
// ================= SIGNUP =================
async function signup(email, password, device) {
    const existing = await db_1.db.query(`SELECT id FROM app_users WHERE email = $1 LIMIT 1`, [email]);
    if (existing.rows.length > 0) {
        throw new Error('User already exists');
    }
    const passwordHash = await (0, hash_1.hashPassword)(password);
    const userResult = await db_1.db.query(`
    INSERT INTO app_users (email, password_hash, location, is_active, is_email_verified)
    VALUES ($1, $2, $3, true, false)
    RETURNING *
    `, [email, passwordHash, device?.location ?? null]);
    const user = userResult.rows[0];
    await db_1.db.query(`
    INSERT INTO user_profiles (user_id, interests, created_at, updated_at)
    VALUES ($1, $2, NOW(), NOW())
    `, [user.id, device?.interests ?? []]);
    const sessionToken = (0, token_1.generateSessionToken)();
    await db_1.db.query(`
    INSERT INTO sessions (
      user_id, session_token, expires_at,
      device_name, device_os, ip_address
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    `, [
        user.id,
        sessionToken,
        new Date(Date.now() + SESSION_EXPIRY_MS),
        device?.deviceName ?? null,
        device?.deviceOS ?? null,
        device?.ipAddress ?? null,
    ]);
    return {
        user: {
            id: user.id,
            email: user.email,
            phone: user.phone ?? null,
            location: user.location ?? null,
        },
        sessionToken,
    };
}
// ================= LOGIN =================
async function login(email, password, device) {
    const result = await db_1.db.query(`SELECT * FROM app_users WHERE email = $1 AND is_active = true LIMIT 1`, [email]);
    const user = result.rows[0];
    if (!user)
        throw new Error('Invalid credentials');
    const isValid = await (0, hash_1.verifyPassword)(password, user.password_hash);
    if (!isValid)
        throw new Error('Invalid credentials');
    const sessionToken = (0, token_1.generateSessionToken)();
    await db_1.db.query(`
    INSERT INTO sessions (
      user_id, session_token, expires_at,
      device_name, device_os, ip_address
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    `, [
        user.id,
        sessionToken,
        new Date(Date.now() + SESSION_EXPIRY_MS),
        device?.deviceName ?? null,
        device?.deviceOS ?? null,
        device?.ipAddress ?? null,
    ]);
    return {
        user: {
            id: user.id,
            email: user.email,
            phone: user.phone ?? null,
            location: user.location ?? null,
        },
        sessionToken,
    };
}
// ================= VALIDATE SESSION =================
async function validateSession(token) {
    const result = await db_1.db.query(`
    SELECT 
      s.session_token,
      s.expires_at,
      u.*
    FROM sessions s
    JOIN app_users u ON s.user_id = u.id
    WHERE s.session_token = $1
    LIMIT 1
    `, [token.trim()]);
    const session = result.rows[0];
    if (!session)
        throw new Error('Invalid session');
    if (new Date(session.expires_at) < new Date()) {
        await db_1.db.query(`DELETE FROM sessions WHERE session_token = $1`, [token]);
        throw new Error('Session expired');
    }
    return {
        id: session.id,
        email: session.email,
        phone: session.phone,
        location: session.location,
        is_active: session.is_active,
        is_email_verified: session.is_email_verified,
    };
}
// ================= SESSIONS =================
async function getActiveSessions(userId) {
    const result = await db_1.db.query(`
    SELECT id, device_name, device_os, ip_address, created_at, expires_at
    FROM sessions
    WHERE user_id = $1
    ORDER BY created_at DESC
    `, [userId]);
    return result.rows;
}
async function logout(sessionToken) {
    await db_1.db.query(`DELETE FROM sessions WHERE session_token = $1`, [sessionToken.trim()]);
}
async function revokeOtherSessions(userId, currentToken) {
    await db_1.db.query(`
    DELETE FROM sessions
    WHERE user_id = $1 AND session_token != $2
    `, [userId, currentToken.trim()]);
}
async function revokeSessionById(userId, sessionId) {
    await db_1.db.query(`
    DELETE FROM sessions
    WHERE id = $1 AND user_id = $2
    `, [sessionId, userId]);
}

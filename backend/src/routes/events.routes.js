"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const eventsController_1 = require("../controllers/eventsController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const auth = auth_middleware_1.requireAuth;
router.post('/', auth, eventsController_1.logEvent);
exports.default = router;

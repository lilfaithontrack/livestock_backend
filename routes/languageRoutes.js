const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const langController = require('../controllers/languageController');

// Public: list active languages + fetch translations
router.get('/', langController.listLanguages);
router.get('/:code/translations', langController.getTranslations);

// Authenticated: set own preferred language
router.put('/me/language', verifyToken, langController.setPreferredLanguage);

// Admin: manage languages + translations
router.get('/admin/all', verifyToken, requireRole(['Admin']), langController.listAllLanguages);
router.post('/', verifyToken, requireRole(['Admin']), langController.createLanguage);
router.put('/:code', verifyToken, requireRole(['Admin']), langController.updateLanguage);
router.delete('/:code', verifyToken, requireRole(['Admin']), langController.deleteLanguage);
router.put('/:code/translations', verifyToken, requireRole(['Admin']), langController.upsertTranslations);

module.exports = router;

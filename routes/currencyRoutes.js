const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currencyController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

// Public routes
router.get('/', currencyController.getCurrencies);
router.get('/code/:code', currencyController.getCurrencyByCode);
router.get('/:id', currencyController.getCurrencyById);
router.post('/convert', currencyController.convertCurrency);

// Admin routes
router.post(
    '/admin/currencies',
    verifyToken,
    requireRole(['Admin']),
    currencyController.createCurrency
);

router.put(
    '/admin/currencies/:id',
    verifyToken,
    requireRole(['Admin']),
    currencyController.updateCurrency
);

router.delete(
    '/admin/currencies/:id',
    verifyToken,
    requireRole(['Admin']),
    currencyController.deleteCurrency
);

module.exports = router;

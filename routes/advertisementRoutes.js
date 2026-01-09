const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const advertisementController = require('../controllers/advertisementController');
const verifyToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

// Configure multer for advertisement images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'advertisements');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'ad-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

// Public routes (for frontend)
router.get('/active', advertisementController.getActiveAdvertisements);
router.post('/:id/click', advertisementController.trackClick);
router.post('/:id/view', advertisementController.trackView);

// Admin routes
router.get('/', verifyToken, requireRole(['Admin']), advertisementController.getAllAdvertisements);
router.get('/:id', verifyToken, requireRole(['Admin']), advertisementController.getAdvertisementById);
router.post('/', verifyToken, requireRole(['Admin']), upload.single('image'), advertisementController.createAdvertisement);
router.put('/:id', verifyToken, requireRole(['Admin']), upload.single('image'), advertisementController.updateAdvertisement);
router.delete('/:id', verifyToken, requireRole(['Admin']), advertisementController.deleteAdvertisement);
router.patch('/:id/toggle', verifyToken, requireRole(['Admin']), advertisementController.toggleAdvertisementStatus);

module.exports = router;

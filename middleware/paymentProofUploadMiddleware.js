const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const evidenceDir = path.join(uploadDir, 'withdrawal-evidence');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, evidenceDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
        cb(null, `${base}-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimes = new Set([
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf'
    ]);

    if (allowedMimes.has(file.mimetype)) {
        return cb(null, true);
    }

    return cb(new Error('Only image files or PDF are allowed for payment proof.'));
};

const uploadPaymentProof = multer({
    storage,
    limits: {
        // Allow larger proof files (up to 10MB) for PDF uploads.
        fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024
    },
    fileFilter
});

module.exports = uploadPaymentProof;

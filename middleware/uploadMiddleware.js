const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const compressedDir = path.join(uploadDir, 'compressed');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(compressedDir)) {
    fs.mkdirSync(compressedDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: timestamp-randomstring-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, name + '-' + uniqueSuffix + ext);
    }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
    console.log('[Upload] File received:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        fieldname: file.fieldname
    });
    
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const allowedMimeTypes = /image\/(jpeg|jpg|png|gif|webp)/;
    
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const extname = allowedTypes.test(ext);
    const mimetype = allowedMimeTypes.test(file.mimetype);

    console.log('[Upload] Validation:', { ext, extname, mimetype, fileMimetype: file.mimetype });

    // Accept if either extension OR mimetype is valid (more lenient for web uploads)
    if (extname || mimetype) {
        return cb(null, true);
    } else {
        console.error('[Upload] File rejected:', { ext, mimetype: file.mimetype });
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
    },
    fileFilter: fileFilter
});

/**
 * Compress and resize image using sharp
 * @param {string} filePath - Original file path
 * @param {object} options - Resize options
 * @returns {Promise<string>} - Compressed file path
 */
const compressImage = async (filePath, options = {}) => {
    try {
        console.log('compressImage: Starting compression for:', filePath);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error('compressImage: File does not exist:', filePath);
            throw new Error(`File not found: ${filePath}`);
        }

        const {
            width = 800,
            height = 800,
            quality = 80,
            fit = 'inside'
        } = options;

        const filename = path.basename(filePath);
        const compressedPath = path.join(compressedDir, filename);
        
        console.log('compressImage: Compressing to:', compressedPath);

        await sharp(filePath)
            .resize(width, height, { fit, withoutEnlargement: true })
            .jpeg({ quality, progressive: true })
            .toFile(compressedPath);

        console.log('compressImage: Compression successful');

        // Delete original file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('compressImage: Deleted original file');
        }

        const resultUrl = `/uploads/compressed/${filename}`;
        console.log('compressImage: Returning URL:', resultUrl);
        return resultUrl;
    } catch (error) {
        console.error('Image compression error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            filePath: filePath
        });
        // If compression fails, return original path
        const fallbackUrl = `/uploads/${path.basename(filePath)}`;
        console.log('compressImage: Returning fallback URL:', fallbackUrl);
        return fallbackUrl;
    }
};

/**
 * Compress multiple images
 * @param {Array} files - Array of uploaded files
 * @param {object} options - Resize options
 * @returns {Promise<Array>} - Array of compressed file URLs
 */
const compressMultipleImages = async (files, options = {}) => {
    if (!files || files.length === 0) {
        console.log('compressMultipleImages: No files provided');
        return [];
    }

    console.log('compressMultipleImages: Processing', files.length, 'file(s)');
    
    const compressionPromises = files.map((file, index) => {
        console.log(`Processing file ${index + 1}:`, {
            filename: file.filename,
            originalname: file.originalname,
            path: file.path
        });
        
        // Multer stores files with a 'path' property that contains the full path
        // Use file.path if available (multer sets this), otherwise construct from filename
        let filePath = file.path;
        if (!filePath && file.filename) {
            filePath = path.join(uploadDir, file.filename);
        }
        
        if (!filePath) {
            console.error(`File ${index + 1} has no path or filename!`);
            return null;
        }
        
        console.log('File path for compression:', filePath);
        console.log('File exists?', fs.existsSync(filePath));
        
        return compressImage(filePath, options).catch(error => {
            console.error(`Error compressing file ${index + 1}:`, error);
            // Return fallback URL if compression fails
            const fallback = file.filename ? `/uploads/${file.filename}` : null;
            console.log('Returning fallback URL:', fallback);
            return fallback;
        });
    });

    const results = await Promise.all(compressionPromises);
    console.log('compressMultipleImages: Results:', results);
    const filteredResults = results.filter(url => url && url.trim() !== ''); // Filter out any null/undefined/empty values
    console.log('compressMultipleImages: Filtered results:', filteredResults);
    return filteredResults;
};

module.exports = upload;
module.exports.compressImage = compressImage;
module.exports.compressMultipleImages = compressMultipleImages;

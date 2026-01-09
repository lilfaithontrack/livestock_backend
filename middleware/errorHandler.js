const { sendError } = require('../utils/responseHandler');
const multer = require('multer');

/**
 * Global error handler middleware
 * Should be the last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Multer errors (file upload)
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return sendError(res, 400, 'File too large. Maximum size is 5MB.');
        }
        return sendError(res, 400, `Upload error: ${err.message}`);
    }

    // Custom multer file filter error
    if (err.message && err.message.includes('Only image files are allowed')) {
        return sendError(res, 400, err.message);
    }

    // Sequelize validation error
    if (err.name === 'SequelizeValidationError') {
        const errors = err.errors.map(e => ({
            field: e.path,
            message: e.message
        }));
        return sendError(res, 400, 'Validation error', errors);
    }

    // Sequelize unique constraint error
    if (err.name === 'SequelizeUniqueConstraintError') {
        return sendError(res, 400, 'Duplicate entry. Record already exists.');
    }

    // Sequelize foreign key constraint error
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return sendError(res, 400, 'Invalid reference. Related record does not exist.');
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return sendError(res, 401, 'Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
        return sendError(res, 401, 'Token expired');
    }

    // Default server error
    return sendError(
        res,
        err.statusCode || 500,
        err.message || 'Internal server error'
    );
};

module.exports = errorHandler;

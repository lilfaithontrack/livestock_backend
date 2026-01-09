const { User } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { compressImage } = require('../middleware/uploadMiddleware');

/**
 * Get user profile
 * GET /api/v1/users/profile
 */
const getProfile = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.user_id, {
            attributes: { exclude: ['password_hash'] }
        });

        if (!user) {
            return sendError(res, 404, 'User not found');
        }

        return sendSuccess(res, 200, 'Profile retrieved successfully', { user });
    } catch (error) {
        next(error);
    }
};

/**
 * Update user profile
 * PUT /api/v1/users/profile
 */
const updateProfile = async (req, res, next) => {
    try {
        const { address, email, phone } = req.body;
        const user = await User.findByPk(req.user.user_id);

        if (!user) {
            return sendError(res, 404, 'User not found');
        }

        // Update fields
        if (address) user.address = address;
        if (email) user.email = email;
        if (phone) user.phone = phone;

        await user.save();

        return sendSuccess(res, 200, 'Profile updated successfully', {
            user: {
                user_id: user.user_id,
                role: user.role,
                email: user.email,
                phone: user.phone,
                address: user.address
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Upload KYC documents (Seller only)
 * POST /api/v1/users/kyc/documents
 */
const uploadKYCDocuments = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const user_role = req.user.role;

        // Only sellers can upload KYC documents
        if (user_role !== 'Seller') {
            return sendError(res, 403, 'Only sellers can upload KYC documents');
        }

        const user = await User.findByPk(user_id);
        if (!user) {
            return sendError(res, 404, 'User not found');
        }

        const updates = {};
        const uploadedFiles = {};

        // Handle trade license
        if (req.files && req.files['trade_license'] && req.files['trade_license'][0]) {
            const file = req.files['trade_license'][0];
            const compressedUrl = await compressImage(file.path, {
                width: 1200,
                height: 1600,
                quality: 85
            });
            updates.trade_license_url = compressedUrl;
            uploadedFiles.trade_license = compressedUrl;
        }

        // Handle national ID front
        if (req.files && req.files['national_id_front'] && req.files['national_id_front'][0]) {
            const file = req.files['national_id_front'][0];
            const compressedUrl = await compressImage(file.path, {
                width: 1200,
                height: 800,
                quality: 85
            });
            updates.national_id_front_url = compressedUrl;
            uploadedFiles.national_id_front = compressedUrl;
        }

        // Handle national ID back
        if (req.files && req.files['national_id_back'] && req.files['national_id_back'][0]) {
            const file = req.files['national_id_back'][0];
            const compressedUrl = await compressImage(file.path, {
                width: 1200,
                height: 800,
                quality: 85
            });
            updates.national_id_back_url = compressedUrl;
            uploadedFiles.national_id_back = compressedUrl;
        }

        // Check if all required documents are provided
        const hasTradeLicense = updates.trade_license_url || user.trade_license_url;
        const hasIdFront = updates.national_id_front_url || user.national_id_front_url;
        const hasIdBack = updates.national_id_back_url || user.national_id_back_url;

        if (!hasTradeLicense || !hasIdFront || !hasIdBack) {
            return sendError(res, 400, 'All KYC documents are required: trade license, national ID front, and national ID back');
        }

        // Update submission timestamp if this is first submission
        if (!user.kyc_submitted_at) {
            updates.kyc_submitted_at = new Date();
        }

        // Reset KYC status to false when documents are updated (requires re-verification)
        if (Object.keys(updates).length > 0) {
            updates.kyc_status = false;
            updates.kyc_reviewed_at = null;
            updates.kyc_rejection_reason = null;
        }

        // Apply updates
        Object.assign(user, updates);
        await user.save();

        return sendSuccess(res, 200, 'KYC documents uploaded successfully', {
            user_id: user.user_id,
            documents: {
                trade_license: user.trade_license_url,
                national_id_front: user.national_id_front_url,
                national_id_back: user.national_id_back_url
            },
            kyc_status: user.kyc_status,
            kyc_submitted_at: user.kyc_submitted_at,
            message: 'Documents uploaded. Awaiting admin verification.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get KYC documents status (Seller only)
 * GET /api/v1/users/kyc/documents
 */
const getKYCDocumentsStatus = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const user = await User.findByPk(user_id, {
            attributes: [
                'user_id',
                'role',
                'kyc_status',
                'trade_license_url',
                'national_id_front_url',
                'national_id_back_url',
                'kyc_submitted_at',
                'kyc_reviewed_at',
                'kyc_rejection_reason'
            ]
        });

        if (!user) {
            return sendError(res, 404, 'User not found');
        }

        return sendSuccess(res, 200, 'KYC documents status retrieved successfully', {
            user_id: user.user_id,
            kyc_status: user.kyc_status,
            documents: {
                trade_license: user.trade_license_url ? true : false,
                national_id_front: user.national_id_front_url ? true : false,
                national_id_back: user.national_id_back_url ? true : false
            },
            document_urls: {
                trade_license_url: user.trade_license_url,
                national_id_front_url: user.national_id_front_url,
                national_id_back_url: user.national_id_back_url
            },
            kyc_submitted_at: user.kyc_submitted_at,
            kyc_reviewed_at: user.kyc_reviewed_at,
            kyc_rejection_reason: user.kyc_rejection_reason
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update KYC status (Admin only)
 * PUT /api/v1/users/:userId/kyc
 */
const updateKYCStatus = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { kyc_status, rejection_reason } = req.body;

        if (typeof kyc_status !== 'boolean') {
            return sendError(res, 400, 'KYC status must be a boolean value');
        }

        const user = await User.findByPk(userId);

        if (!user) {
            return sendError(res, 404, 'User not found');
        }

        // Check if all required documents are present
        if (kyc_status === true) {
            if (!user.trade_license_url || !user.national_id_front_url || !user.national_id_back_url) {
                return sendError(res, 400, 'Cannot approve KYC: All documents (trade license, national ID front and back) must be uploaded');
            }
        }

        user.kyc_status = kyc_status;
        user.kyc_reviewed_at = new Date();
        
        if (kyc_status === false && rejection_reason) {
            user.kyc_rejection_reason = rejection_reason;
        } else if (kyc_status === true) {
            user.kyc_rejection_reason = null;
        }

        await user.save();

        return sendSuccess(res, 200, 'KYC status updated successfully', {
            user_id: user.user_id,
            kyc_status: user.kyc_status,
            kyc_reviewed_at: user.kyc_reviewed_at,
            kyc_rejection_reason: user.kyc_rejection_reason
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Become a Seller - Change role to Seller and upload KYC documents (Buyer only)
 * POST /api/v1/users/become-seller
 */
const becomeSeller = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const user_role = req.user.role;

        // Only buyers can become sellers
        if (user_role !== 'Buyer') {
            return sendError(res, 403, 'Only buyers can become sellers');
        }

        const user = await User.findByPk(user_id);
        if (!user) {
            return sendError(res, 404, 'User not found');
        }

        const updates = {};
        const uploadedFiles = {};

        // Handle trade license
        if (req.files && req.files['trade_license'] && req.files['trade_license'][0]) {
            const file = req.files['trade_license'][0];
            const compressedUrl = await compressImage(file.path, {
                width: 1200,
                height: 1600,
                quality: 85
            });
            updates.trade_license_url = compressedUrl;
            uploadedFiles.trade_license = compressedUrl;
        }

        // Handle national ID front
        if (req.files && req.files['national_id_front'] && req.files['national_id_front'][0]) {
            const file = req.files['national_id_front'][0];
            const compressedUrl = await compressImage(file.path, {
                width: 1200,
                height: 800,
                quality: 85
            });
            updates.national_id_front_url = compressedUrl;
            uploadedFiles.national_id_front = compressedUrl;
        }

        // Handle national ID back
        if (req.files && req.files['national_id_back'] && req.files['national_id_back'][0]) {
            const file = req.files['national_id_back'][0];
            const compressedUrl = await compressImage(file.path, {
                width: 1200,
                height: 800,
                quality: 85
            });
            updates.national_id_back_url = compressedUrl;
            uploadedFiles.national_id_back = compressedUrl;
        }

        // Check if all required documents are provided
        const hasTradeLicense = updates.trade_license_url || user.trade_license_url;
        const hasIdFront = updates.national_id_front_url || user.national_id_front_url;
        const hasIdBack = updates.national_id_back_url || user.national_id_back_url;

        if (!hasTradeLicense || !hasIdFront || !hasIdBack) {
            return sendError(res, 400, 'All documents are required: trade license, national ID/Kebele ID front, and national ID/Kebele ID back');
        }

        // Change role to Seller
        updates.role = 'Seller';
        
        // Set KYC status to false (pending admin approval)
        updates.kyc_status = false;
        updates.kyc_submitted_at = new Date();
        updates.kyc_reviewed_at = null;
        updates.kyc_rejection_reason = null;

        // Apply updates
        Object.assign(user, updates);
        await user.save();

        return sendSuccess(res, 200, 'Seller application submitted successfully', {
            user_id: user.user_id,
            role: user.role,
            documents: {
                trade_license: user.trade_license_url,
                national_id_front: user.national_id_front_url,
                national_id_back: user.national_id_back_url
            },
            kyc_status: user.kyc_status,
            kyc_submitted_at: user.kyc_submitted_at,
            message: 'Your seller application has been submitted. Please wait for admin verification.'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProfile,
    updateProfile,
    uploadKYCDocuments,
    getKYCDocumentsStatus,
    updateKYCStatus,
    becomeSeller
};

const { User, SellerDocument } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { compressImage } = require('../middleware/uploadMiddleware');

// Map multipart field names to seller_documents.document_type values.
const FIELD_TO_DOC_TYPE = {
    trade_license: 'trade_license',
    tin_vat_document: 'tin_vat',
    national_id_front: 'national_id_front',
    national_id_back: 'national_id_back',
};

// Map document_type to the legacy single-URL column on `users`.
const DOC_TYPE_TO_LEGACY_COLUMN = {
    trade_license: 'trade_license_url',
    tin_vat: 'tin_vat_url',
    national_id_front: 'national_id_front_url',
    national_id_back: 'national_id_back_url',
};

/**
 * Process all files for a given multipart field name:
 *  - compress each image
 *  - insert a row into seller_documents for each file
 *  - keep the legacy single-URL column in sync (first file wins)
 * Returns { urls: string[], legacyUrl: string|null }
 */
const processDocumentField = async (userId, files, fieldName, compressOpts) => {
    const docType = FIELD_TO_DOC_TYPE[fieldName];
    if (!docType) return { urls: [], legacyUrl: null };

    const fieldFiles = files && files[fieldName] ? files[fieldName] : [];
    if (fieldFiles.length === 0) {
        return { urls: [], legacyUrl: null };
    }

    const urls = [];
    let legacyUrl = null;

    for (let i = 0; i < fieldFiles.length; i++) {
        const file = fieldFiles[i];
        const compressedUrl = await compressImage(file.path, compressOpts);
        urls.push(compressedUrl);
        if (i === 0) legacyUrl = compressedUrl;

        await SellerDocument.create({
            user_id: userId,
            document_type: docType,
            file_url: compressedUrl,
            file_name: file.originalname || file.filename || null,
            mime_type: file.mimetype || null,
            file_size: file.size || null,
        });
    }

    return { urls, legacyUrl };
};

/**
 * Gather all seller_documents for a user grouped by document_type.
 * Falls back to the legacy single-URL columns when no rows exist.
 */
const getGroupedDocuments = async (user) => {
    const rows = await SellerDocument.findAll({
        where: { user_id: user.user_id },
        order: [['uploaded_at', 'ASC']],
    });

    const grouped = {
        trade_license: [],
        tin_vat: [],
        national_id_front: [],
        national_id_back: [],
    };

    for (const r of rows) {
        if (grouped[r.document_type]) {
            grouped[r.document_type].push({
                document_id: r.document_id,
                file_url: r.file_url,
                file_name: r.file_name,
                mime_type: r.mime_type,
                uploaded_at: r.uploaded_at,
            });
        }
    }

    // Legacy fallback: if a type has no rows but the user has a legacy URL,
    // surface it as a single-entry array so the UI keeps working.
    const legacy = {
        trade_license: user.trade_license_url,
        tin_vat: user.tin_vat_url,
        national_id_front: user.national_id_front_url,
        national_id_back: user.national_id_back_url,
    };
    for (const type of Object.keys(grouped)) {
        if (grouped[type].length === 0 && legacy[type]) {
            grouped[type].push({ file_url: legacy[type], legacy: true });
        }
    }

    return grouped;
};

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
        const { address, email, phone, full_name, city, region } = req.body;
        const user = await User.findByPk(req.user.user_id);

        if (!user) {
            return sendError(res, 404, 'User not found');
        }

        // Update fields. `address` is treated as a pure street address line —
        // never re-encode the user's name into it (legacy bug source).
        if (address !== undefined) user.address = address || null;
        if (email !== undefined) user.email = email || null;
        if (phone !== undefined) user.phone = phone || null;
        if (full_name !== undefined) user.full_name = full_name || null;
        if (city !== undefined) user.city = city || null;
        if (region !== undefined) user.region = region || null;

        await user.save();

        return sendSuccess(res, 200, 'Profile updated successfully', {
            user: {
                user_id: user.user_id,
                role: user.role,
                email: user.email,
                phone: user.phone,
                full_name: user.full_name,
                address: user.address,
                city: user.city,
                region: user.region
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

        // Process each document type — supports multiple files per type.
        // Each file is stored as a row in seller_documents; the legacy
        // single-URL column is kept in sync (first file wins) for backward
        // compatibility with older clients/admin tooling.
        const tl = await processDocumentField(user_id, req.files, 'trade_license', { width: 1200, height: 1600, quality: 85 });
        if (tl.legacyUrl) { updates.trade_license_url = tl.legacyUrl; uploadedFiles.trade_license = tl.urls; }

        const tv = await processDocumentField(user_id, req.files, 'tin_vat_document', { width: 1200, height: 1600, quality: 85 });
        if (tv.legacyUrl) { updates.tin_vat_url = tv.legacyUrl; uploadedFiles.tin_vat_document = tv.urls; }

        const nf = await processDocumentField(user_id, req.files, 'national_id_front', { width: 1200, height: 800, quality: 85 });
        if (nf.legacyUrl) { updates.national_id_front_url = nf.legacyUrl; uploadedFiles.national_id_front = nf.urls; }

        const nb = await processDocumentField(user_id, req.files, 'national_id_back', { width: 1200, height: 800, quality: 85 });
        if (nb.legacyUrl) { updates.national_id_back_url = nb.legacyUrl; uploadedFiles.national_id_back = nb.urls; }

        // Check if all required documents are provided (new uploads OR existing)
        const docs = await getGroupedDocuments(user);
        const hasTradeLicense = docs.trade_license.length > 0;
        const hasTinVat = docs.tin_vat.length > 0;
        const hasIdFront = docs.national_id_front.length > 0;
        const hasIdBack = docs.national_id_back.length > 0;

        if (!hasTradeLicense || !hasTinVat || !hasIdFront || !hasIdBack) {
            return sendError(res, 400, 'All KYC documents are required: trade license, TIN/VAT document, national ID front, and national ID back');
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

        const finalDocs = await getGroupedDocuments(user);
        return sendSuccess(res, 200, 'KYC documents uploaded successfully', {
            user_id: user.user_id,
            documents: finalDocs,
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
                'tin_vat_url',
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

        const docs = await getGroupedDocuments(user);

        return sendSuccess(res, 200, 'KYC documents status retrieved successfully', {
            user_id: user.user_id,
            kyc_status: user.kyc_status,
            documents: {
                trade_license: docs.trade_license.length > 0,
                tin_vat_document: docs.tin_vat.length > 0,
                national_id_front: docs.national_id_front.length > 0,
                national_id_back: docs.national_id_back.length > 0
            },
            // Multi-file arrays per document type
            document_files: docs,
            // Legacy single-URL map (first file per type) for backward compat
            document_urls: {
                trade_license_url: docs.trade_license[0]?.file_url || null,
                tin_vat_url: docs.tin_vat[0]?.file_url || null,
                national_id_front_url: docs.national_id_front[0]?.file_url || null,
                national_id_back_url: docs.national_id_back[0]?.file_url || null
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

        // Check if all required documents are present (multi-file table OR legacy URLs)
        if (kyc_status === true) {
            const docs = await getGroupedDocuments(user);
            const hasAll = docs.trade_license.length > 0 && docs.tin_vat.length > 0
                && docs.national_id_front.length > 0 && docs.national_id_back.length > 0;
            if (!hasAll) {
                return sendError(res, 400, 'Cannot approve KYC: All documents (trade license, TIN/VAT document, national ID front and back) must be uploaded');
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

        // Allow Buyers to become Sellers and Sellers to resubmit KYC documents
        if (user_role !== 'Buyer' && user_role !== 'Seller') {
            return sendError(res, 403, 'Only buyers can become sellers or sellers can resubmit KYC documents');
        }

        const user = await User.findByPk(user_id);
        if (!user) {
            return sendError(res, 404, 'User not found');
        }

        const updates = {};
        const uploadedFiles = {};

        // Process each document type — supports multiple files per type.
        const tl = await processDocumentField(user_id, req.files, 'trade_license', { width: 1200, height: 1600, quality: 85 });
        if (tl.legacyUrl) { updates.trade_license_url = tl.legacyUrl; uploadedFiles.trade_license = tl.urls; }

        const tv = await processDocumentField(user_id, req.files, 'tin_vat_document', { width: 1200, height: 1600, quality: 85 });
        if (tv.legacyUrl) { updates.tin_vat_url = tv.legacyUrl; uploadedFiles.tin_vat_document = tv.urls; }

        const nf = await processDocumentField(user_id, req.files, 'national_id_front', { width: 1200, height: 800, quality: 85 });
        if (nf.legacyUrl) { updates.national_id_front_url = nf.legacyUrl; uploadedFiles.national_id_front = nf.urls; }

        const nb = await processDocumentField(user_id, req.files, 'national_id_back', { width: 1200, height: 800, quality: 85 });
        if (nb.legacyUrl) { updates.national_id_back_url = nb.legacyUrl; uploadedFiles.national_id_back = nb.urls; }

        // Check if all required documents are provided (new uploads OR existing)
        const docs = await getGroupedDocuments(user);
        const hasTradeLicense = docs.trade_license.length > 0;
        const hasTinVat = docs.tin_vat.length > 0;
        const hasIdFront = docs.national_id_front.length > 0;
        const hasIdBack = docs.national_id_back.length > 0;

        if (!hasTradeLicense || !hasTinVat || !hasIdFront || !hasIdBack) {
            return sendError(res, 400, 'All documents are required: trade license, TIN/VAT document, national ID/Kebele ID front, and national ID/Kebele ID back');
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

        const finalDocs = await getGroupedDocuments(user);
        return sendSuccess(res, 200, 'Seller application submitted successfully', {
            user_id: user.user_id,
            role: user.role,
            documents: finalDocs,
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

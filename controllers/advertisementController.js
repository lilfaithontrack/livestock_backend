const { Advertisement } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Get all advertisements
exports.getAllAdvertisements = async (req, res) => {
    try {
        const { ad_type, is_active } = req.query;
        const where = {};

        if (ad_type) where.ad_type = ad_type;
        if (is_active !== undefined) where.is_active = is_active === 'true';

        const advertisements = await Advertisement.findAll({
            where,
            order: [['priority', 'DESC'], ['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: { advertisements }
        });
    } catch (error) {
        console.error('Get advertisements error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get active advertisements for frontend
exports.getActiveAdvertisements = async (req, res) => {
    try {
        const { ad_type, position, target } = req.query;
        const where = { is_active: true };
        const now = new Date();

        if (ad_type) where.ad_type = ad_type;
        if (position) where.position = position;
        if (target) where.target_audience = { [Op.in]: ['all', target] };

        const advertisements = await Advertisement.findAll({
            where: {
                ...where,
                [Op.or]: [
                    { start_date: null, end_date: null },
                    { start_date: { [Op.lte]: now }, end_date: { [Op.gte]: now } },
                    { start_date: { [Op.lte]: now }, end_date: null },
                    { start_date: null, end_date: { [Op.gte]: now } }
                ]
            },
            order: [['priority', 'DESC']]
        });

        res.json({
            success: true,
            data: { advertisements }
        });
    } catch (error) {
        console.error('Get active advertisements error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single advertisement
exports.getAdvertisementById = async (req, res) => {
    try {
        const advertisement = await Advertisement.findByPk(req.params.id);

        if (!advertisement) {
            return res.status(404).json({ success: false, message: 'Advertisement not found' });
        }

        res.json({
            success: true,
            data: { advertisement }
        });
    } catch (error) {
        console.error('Get advertisement error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create advertisement
exports.createAdvertisement = async (req, res) => {
    try {
        const {
            title, description, ad_type, link_url, text_content,
            position, priority, start_date, end_date, is_active,
            target_audience, background_color, text_color
        } = req.body;

        let image_url = null;
        if (req.file) {
            image_url = `/uploads/advertisements/${req.file.filename}`;
        }

        const advertisement = await Advertisement.create({
            title,
            description,
            ad_type: ad_type || 'banner',
            image_url,
            link_url,
            text_content,
            position: position || 'top',
            priority: priority || 0,
            start_date: start_date || null,
            end_date: end_date || null,
            is_active: is_active !== undefined ? is_active : true,
            target_audience: target_audience || 'all',
            background_color,
            text_color
        });

        res.status(201).json({
            success: true,
            message: 'Advertisement created successfully',
            data: { advertisement }
        });
    } catch (error) {
        console.error('Create advertisement error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update advertisement
exports.updateAdvertisement = async (req, res) => {
    try {
        const advertisement = await Advertisement.findByPk(req.params.id);

        if (!advertisement) {
            return res.status(404).json({ success: false, message: 'Advertisement not found' });
        }

        const updateData = { ...req.body };

        if (req.file) {
            // Delete old image
            if (advertisement.image_url) {
                const oldPath = path.join(__dirname, '..', 'public', advertisement.image_url);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            updateData.image_url = `/uploads/advertisements/${req.file.filename}`;
        }

        await advertisement.update(updateData);

        res.json({
            success: true,
            message: 'Advertisement updated successfully',
            data: { advertisement }
        });
    } catch (error) {
        console.error('Update advertisement error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete advertisement
exports.deleteAdvertisement = async (req, res) => {
    try {
        const advertisement = await Advertisement.findByPk(req.params.id);

        if (!advertisement) {
            return res.status(404).json({ success: false, message: 'Advertisement not found' });
        }

        // Delete image file
        if (advertisement.image_url) {
            const imagePath = path.join(__dirname, '..', 'public', advertisement.image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await advertisement.destroy();

        res.json({
            success: true,
            message: 'Advertisement deleted successfully'
        });
    } catch (error) {
        console.error('Delete advertisement error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle active status
exports.toggleAdvertisementStatus = async (req, res) => {
    try {
        const advertisement = await Advertisement.findByPk(req.params.id);

        if (!advertisement) {
            return res.status(404).json({ success: false, message: 'Advertisement not found' });
        }

        await advertisement.update({ is_active: !advertisement.is_active });

        res.json({
            success: true,
            message: `Advertisement ${advertisement.is_active ? 'activated' : 'deactivated'}`,
            data: { advertisement }
        });
    } catch (error) {
        console.error('Toggle advertisement error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Track click
exports.trackClick = async (req, res) => {
    try {
        const advertisement = await Advertisement.findByPk(req.params.id);

        if (!advertisement) {
            return res.status(404).json({ success: false, message: 'Advertisement not found' });
        }

        await advertisement.increment('click_count');

        res.json({ success: true });
    } catch (error) {
        console.error('Track click error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Track view
exports.trackView = async (req, res) => {
    try {
        const advertisement = await Advertisement.findByPk(req.params.id);

        if (!advertisement) {
            return res.status(404).json({ success: false, message: 'Advertisement not found' });
        }

        await advertisement.increment('view_count');

        res.json({ success: true });
    } catch (error) {
        console.error('Track view error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

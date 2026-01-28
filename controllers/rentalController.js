const { Rental, RentalCategory, User } = require('../models');
const { Op } = require('sequelize');
const { compressMultipleImages } = require('../middleware/uploadMiddleware');

// Get all rental categories
exports.getCategories = async (req, res) => {
    try {
        const categories = await RentalCategory.findAll({
            where: { is_active: true },
            order: [['name', 'ASC']]
        });
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Error fetching rental categories:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
};

// Get all rentals (public - only approved)
exports.getRentals = async (req, res) => {
    try {
        const {
            category_id,
            city,
            min_price,
            max_price,
            search,
            featured,
            page = 1,
            limit = 20
        } = req.query;

        const where = {
            status: 'approved',
            is_available: true
        };

        if (category_id) where.category_id = category_id;
        if (city) where.city = { [Op.iLike]: `%${city}%` };
        if (min_price) where.price = { ...where.price, [Op.gte]: parseFloat(min_price) };
        if (max_price) where.price = { ...where.price, [Op.lte]: parseFloat(max_price) };
        if (featured === 'true') where.featured = true;
        if (search) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { title_am: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } },
                { location: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await Rental.findAndCountAll({
            where,
            include: [
                { model: RentalCategory, as: 'category', attributes: ['category_id', 'name', 'name_am', 'icon'] },
                { model: User, as: 'owner', attributes: ['user_id', 'full_name', 'phone'] }
            ],
            order: [['featured', 'DESC'], ['created_at', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching rentals:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch rentals' });
    }
};

// Get single rental by ID
exports.getRentalById = async (req, res) => {
    try {
        const { id } = req.params;

        const rental = await Rental.findByPk(id, {
            include: [
                { model: RentalCategory, as: 'category' },
                { model: User, as: 'owner', attributes: ['user_id', 'full_name', 'phone'] }
            ]
        });

        if (!rental) {
            return res.status(404).json({ success: false, message: 'Rental not found' });
        }

        // Increment view count
        await rental.increment('view_count');

        res.json({ success: true, data: rental });
    } catch (error) {
        console.error('Error fetching rental:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch rental' });
    }
};

// Track contact/call button click
exports.trackContact = async (req, res) => {
    try {
        const { id } = req.params;

        const rental = await Rental.findByPk(id);
        if (!rental) {
            return res.status(404).json({ success: false, message: 'Rental not found' });
        }

        await rental.increment('contact_count');

        res.json({ success: true, message: 'Contact tracked', phone: rental.contact_phone });
    } catch (error) {
        console.error('Error tracking contact:', error);
        res.status(500).json({ success: false, message: 'Failed to track contact' });
    }
};

// Create a new rental (authenticated user)
exports.createRental = async (req, res) => {
    try {
        const owner_id = req.user.user_id;
        const {
            category_id,
            title,
            title_am,
            description,
            description_am,
            price,
            price_unit,
            currency,
            negotiable,
            contact_phone,
            contact_name,
            whatsapp_available,
            telegram_available,
            location,
            location_am,
            city,
            region,
            latitude,
            longitude,
            video_urls,
            specifications,
            available_from,
            available_until
        } = req.body;

        if (!category_id || !title || !price || !contact_phone) {
            return res.status(400).json({
                success: false,
                message: 'Category, title, price, and contact phone are required'
            });
        }

        // Process uploaded images (up to 5)
        let image_urls = [];
        if (req.files && req.files.length > 0) {
            image_urls = await compressMultipleImages(req.files);
        } else if (req.body.image_urls) {
            // Handle existing image URLs passed in body
            image_urls = Array.isArray(req.body.image_urls) ? req.body.image_urls : JSON.parse(req.body.image_urls || '[]');
        }

        // Parse specifications if it's a string
        let parsedSpecifications = specifications;
        if (typeof specifications === 'string') {
            try {
                parsedSpecifications = JSON.parse(specifications);
            } catch (e) {
                parsedSpecifications = {};
            }
        }

        const rental = await Rental.create({
            owner_id,
            category_id,
            title,
            title_am,
            description,
            description_am,
            price,
            price_unit: price_unit || 'per_day',
            currency: currency || 'ETB',
            negotiable: negotiable === 'true' || negotiable === true,
            contact_phone,
            contact_name,
            whatsapp_available: whatsapp_available === 'true' || whatsapp_available === true,
            telegram_available: telegram_available === 'true' || telegram_available === true,
            location,
            location_am,
            city,
            region,
            latitude,
            longitude,
            image_urls,
            video_urls: video_urls ? (Array.isArray(video_urls) ? video_urls : JSON.parse(video_urls || '[]')) : [],
            specifications: parsedSpecifications || {},
            available_from,
            available_until,
            status: 'pending'
        });

        res.status(201).json({ success: true, data: rental, message: 'Rental created successfully' });
    } catch (error) {
        console.error('Error creating rental:', error);
        res.status(500).json({ success: false, message: 'Failed to create rental' });
    }
};

// Update rental (owner only)
exports.updateRental = async (req, res) => {
    try {
        const { id } = req.params;
        const owner_id = req.user.user_id;

        const rental = await Rental.findByPk(id);
        if (!rental) {
            return res.status(404).json({ success: false, message: 'Rental not found' });
        }

        if (rental.owner_id !== owner_id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const allowedFields = [
            'category_id', 'title', 'title_am', 'description', 'description_am',
            'price', 'price_unit', 'currency', 'negotiable', 'contact_phone',
            'contact_name', 'whatsapp_available', 'telegram_available', 'location',
            'location_am', 'city', 'region', 'latitude', 'longitude',
            'video_urls', 'specifications', 'is_available', 'available_from', 'available_until'
        ];

        const updates = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                let value = req.body[field];
                // Handle boolean fields from FormData
                if (['negotiable', 'whatsapp_available', 'telegram_available', 'is_available'].includes(field)) {
                    value = value === 'true' || value === true;
                }
                // Handle JSON fields from FormData
                if (['specifications', 'video_urls'].includes(field) && typeof value === 'string') {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        value = field === 'specifications' ? {} : [];
                    }
                }
                updates[field] = value;
            }
        });

        // Process uploaded images (up to 5)
        if (req.files && req.files.length > 0) {
            const newImageUrls = await compressMultipleImages(req.files);
            // Get existing images to keep
            let existingImages = [];
            if (req.body.existing_images) {
                existingImages = Array.isArray(req.body.existing_images) 
                    ? req.body.existing_images 
                    : JSON.parse(req.body.existing_images || '[]');
            }
            updates.image_urls = [...existingImages, ...newImageUrls].slice(0, 5);
        } else if (req.body.image_urls) {
            updates.image_urls = Array.isArray(req.body.image_urls) 
                ? req.body.image_urls 
                : JSON.parse(req.body.image_urls || '[]');
        }

        // Reset status to pending if significant changes made
        if (updates.title || updates.description || updates.price) {
            updates.status = 'pending';
        }

        await rental.update(updates);

        res.json({ success: true, data: rental, message: 'Rental updated successfully' });
    } catch (error) {
        console.error('Error updating rental:', error);
        res.status(500).json({ success: false, message: 'Failed to update rental' });
    }
};

// Delete rental (owner only)
exports.deleteRental = async (req, res) => {
    try {
        const { id } = req.params;
        const owner_id = req.user.user_id;

        const rental = await Rental.findByPk(id);
        if (!rental) {
            return res.status(404).json({ success: false, message: 'Rental not found' });
        }

        if (rental.owner_id !== owner_id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await rental.destroy();

        res.json({ success: true, message: 'Rental deleted successfully' });
    } catch (error) {
        console.error('Error deleting rental:', error);
        res.status(500).json({ success: false, message: 'Failed to delete rental' });
    }
};

// Get user's own rentals
exports.getMyRentals = async (req, res) => {
    try {
        const owner_id = req.user.user_id;
        const { status, page = 1, limit = 20 } = req.query;

        const where = { owner_id };
        if (status) where.status = status;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await Rental.findAndCountAll({
            where,
            include: [
                { model: RentalCategory, as: 'category', attributes: ['category_id', 'name', 'name_am', 'icon'] }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching user rentals:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch rentals' });
    }
};

// ============ ADMIN FUNCTIONS ============

// Get all rentals (admin - all statuses)
exports.adminGetRentals = async (req, res) => {
    try {
        const { status, category_id, search, page = 1, limit = 20 } = req.query;

        const where = {};
        if (status) where.status = status;
        if (category_id) where.category_id = category_id;
        if (search) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { contact_phone: { [Op.iLike]: `%${search}%` } },
                { location: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await Rental.findAndCountAll({
            where,
            include: [
                { model: RentalCategory, as: 'category' },
                { model: User, as: 'owner', attributes: ['user_id', 'full_name', 'phone', 'email'] },
                { model: User, as: 'approver', attributes: ['user_id', 'full_name'] }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching rentals (admin):', error);
        res.status(500).json({ success: false, message: 'Failed to fetch rentals' });
    }
};

// Approve rental (admin)
exports.approveRental = async (req, res) => {
    try {
        const { id } = req.params;
        const admin_id = req.user.user_id;

        const rental = await Rental.findByPk(id);
        if (!rental) {
            return res.status(404).json({ success: false, message: 'Rental not found' });
        }

        await rental.update({
            status: 'approved',
            admin_approved_by: admin_id,
            approved_at: new Date(),
            rejection_reason: null
        });

        res.json({ success: true, data: rental, message: 'Rental approved successfully' });
    } catch (error) {
        console.error('Error approving rental:', error);
        res.status(500).json({ success: false, message: 'Failed to approve rental' });
    }
};

// Reject rental (admin)
exports.rejectRental = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejection_reason } = req.body;

        const rental = await Rental.findByPk(id);
        if (!rental) {
            return res.status(404).json({ success: false, message: 'Rental not found' });
        }

        await rental.update({
            status: 'rejected',
            rejection_reason: rejection_reason || 'Rejected by admin'
        });

        res.json({ success: true, data: rental, message: 'Rental rejected' });
    } catch (error) {
        console.error('Error rejecting rental:', error);
        res.status(500).json({ success: false, message: 'Failed to reject rental' });
    }
};

// Toggle featured (admin)
exports.toggleFeatured = async (req, res) => {
    try {
        const { id } = req.params;

        const rental = await Rental.findByPk(id);
        if (!rental) {
            return res.status(404).json({ success: false, message: 'Rental not found' });
        }

        await rental.update({ featured: !rental.featured });

        res.json({ success: true, data: rental, message: `Rental ${rental.featured ? 'featured' : 'unfeatured'}` });
    } catch (error) {
        console.error('Error toggling featured:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle featured' });
    }
};

// Admin create rental
exports.adminCreateRental = async (req, res) => {
    try {
        const {
            owner_id,
            category_id,
            title,
            title_am,
            description,
            description_am,
            price,
            price_unit,
            currency,
            negotiable,
            contact_phone,
            contact_name,
            whatsapp_available,
            telegram_available,
            location,
            location_am,
            city,
            region,
            latitude,
            longitude,
            video_urls,
            specifications,
            available_from,
            available_until,
            status,
            featured
        } = req.body;

        if (!category_id || !title || !price || !contact_phone) {
            return res.status(400).json({
                success: false,
                message: 'Category, title, price, and contact phone are required'
            });
        }

        // Process uploaded images (up to 5)
        let image_urls = [];
        if (req.files && req.files.length > 0) {
            image_urls = await compressMultipleImages(req.files);
        } else if (req.body.image_urls) {
            image_urls = Array.isArray(req.body.image_urls) ? req.body.image_urls : JSON.parse(req.body.image_urls || '[]');
        }

        // Parse specifications if it's a string
        let parsedSpecifications = specifications;
        if (typeof specifications === 'string') {
            try {
                parsedSpecifications = JSON.parse(specifications);
            } catch (e) {
                parsedSpecifications = {};
            }
        }

        const rental = await Rental.create({
            owner_id: owner_id || req.user.user_id,
            category_id,
            title,
            title_am,
            description,
            description_am,
            price,
            price_unit: price_unit || 'per_day',
            currency: currency || 'ETB',
            negotiable: negotiable === 'true' || negotiable === true,
            contact_phone,
            contact_name,
            whatsapp_available: whatsapp_available === 'true' || whatsapp_available === true,
            telegram_available: telegram_available === 'true' || telegram_available === true,
            location,
            location_am,
            city,
            region,
            latitude,
            longitude,
            image_urls,
            video_urls: video_urls ? (Array.isArray(video_urls) ? video_urls : JSON.parse(video_urls || '[]')) : [],
            specifications: parsedSpecifications || {},
            available_from,
            available_until,
            status: status || 'approved',
            featured: featured === 'true' || featured === true,
            admin_approved_by: req.user.user_id,
            approved_at: status === 'approved' || !status ? new Date() : null
        });

        res.status(201).json({ success: true, data: rental, message: 'Rental created successfully' });
    } catch (error) {
        console.error('Error creating rental (admin):', error);
        res.status(500).json({ success: false, message: 'Failed to create rental' });
    }
};

// Admin update rental
exports.adminUpdateRental = async (req, res) => {
    try {
        const { id } = req.params;

        const rental = await Rental.findByPk(id);
        if (!rental) {
            return res.status(404).json({ success: false, message: 'Rental not found' });
        }

        const updates = { ...req.body };

        // Handle boolean fields from FormData
        ['negotiable', 'whatsapp_available', 'telegram_available', 'is_available', 'featured'].forEach(field => {
            if (updates[field] !== undefined) {
                updates[field] = updates[field] === 'true' || updates[field] === true;
            }
        });

        // Handle JSON fields from FormData
        ['specifications', 'video_urls'].forEach(field => {
            if (updates[field] && typeof updates[field] === 'string') {
                try {
                    updates[field] = JSON.parse(updates[field]);
                } catch (e) {
                    updates[field] = field === 'specifications' ? {} : [];
                }
            }
        });

        // Process uploaded images (up to 5)
        if (req.files && req.files.length > 0) {
            const newImageUrls = await compressMultipleImages(req.files);
            // Get existing images to keep
            let existingImages = [];
            if (req.body.existing_images) {
                existingImages = Array.isArray(req.body.existing_images) 
                    ? req.body.existing_images 
                    : JSON.parse(req.body.existing_images || '[]');
            }
            updates.image_urls = [...existingImages, ...newImageUrls].slice(0, 5);
        } else if (req.body.image_urls) {
            updates.image_urls = Array.isArray(req.body.image_urls) 
                ? req.body.image_urls 
                : JSON.parse(req.body.image_urls || '[]');
        }

        // Remove fields that shouldn't be directly updated
        delete updates.existing_images;

        await rental.update(updates);

        res.json({ success: true, data: rental, message: 'Rental updated successfully' });
    } catch (error) {
        console.error('Error updating rental (admin):', error);
        res.status(500).json({ success: false, message: 'Failed to update rental' });
    }
};

// Admin delete rental
exports.adminDeleteRental = async (req, res) => {
    try {
        const { id } = req.params;

        const rental = await Rental.findByPk(id);
        if (!rental) {
            return res.status(404).json({ success: false, message: 'Rental not found' });
        }

        await rental.destroy();

        res.json({ success: true, message: 'Rental deleted successfully' });
    } catch (error) {
        console.error('Error deleting rental (admin):', error);
        res.status(500).json({ success: false, message: 'Failed to delete rental' });
    }
};

// ============ CATEGORY ADMIN FUNCTIONS ============

// Create category (admin)
exports.createCategory = async (req, res) => {
    try {
        const { name, name_am, description, icon } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const category = await RentalCategory.create({
            name,
            name_am,
            description,
            icon
        });

        res.status(201).json({ success: true, data: category, message: 'Category created successfully' });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ success: false, message: 'Failed to create category' });
    }
};

// Update category (admin)
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await RentalCategory.findByPk(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        await category.update(req.body);

        res.json({ success: true, data: category, message: 'Category updated successfully' });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ success: false, message: 'Failed to update category' });
    }
};

// Delete category (admin)
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await RentalCategory.findByPk(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Check if category has rentals
        const rentalCount = await Rental.count({ where: { category_id: id } });
        if (rentalCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category with ${rentalCount} rentals. Please reassign or delete them first.`
            });
        }

        await category.destroy();

        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ success: false, message: 'Failed to delete category' });
    }
};

// Get all categories (admin - including inactive)
exports.adminGetCategories = async (req, res) => {
    try {
        const categories = await RentalCategory.findAll({
            order: [['name', 'ASC']]
        });
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Error fetching categories (admin):', error);
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
};

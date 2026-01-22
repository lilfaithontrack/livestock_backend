const { SellerBankAccount } = require('../models');
const { Op } = require('sequelize');

// Create seller bank account
exports.createBankAccount = async (req, res) => {
    try {
        const seller_id = req.user.user_id;
        const { 
            bank_name, 
            account_name, 
            account_number, 
            account_type,
            is_primary
        } = req.body;

        if (!bank_name || !account_name || !account_number) {
            return res.status(400).json({ 
                error: 'Bank name, account name, and account number are required' 
            });
        }

        // If setting as primary, unset other primaries for this seller
        if (is_primary) {
            await SellerBankAccount.update(
                { is_primary: false },
                { where: { seller_id, is_primary: true } }
            );
        }

        // Check if this is the first account (make it primary by default)
        const existingCount = await SellerBankAccount.count({ where: { seller_id } });
        const shouldBePrimary = is_primary || existingCount === 0;

        const account = await SellerBankAccount.create({
            seller_id,
            bank_name,
            account_name,
            account_number,
            account_type: account_type || 'bank',
            is_primary: shouldBePrimary,
            is_verified: false
        });

        res.status(201).json({
            message: 'Bank account added successfully',
            account
        });
    } catch (error) {
        console.error('Error creating seller bank account:', error);
        res.status(500).json({ error: 'Failed to add bank account' });
    }
};

// Get seller's bank accounts
exports.getMyBankAccounts = async (req, res) => {
    try {
        const seller_id = req.user.user_id;

        const accounts = await SellerBankAccount.findAll({
            where: { seller_id },
            order: [['is_primary', 'DESC'], ['created_at', 'DESC']]
        });

        res.json({ accounts });
    } catch (error) {
        console.error('Error fetching seller bank accounts:', error);
        res.status(500).json({ error: 'Failed to fetch bank accounts' });
    }
};

// Get single bank account
exports.getBankAccountById = async (req, res) => {
    try {
        const seller_id = req.user.user_id;
        const { id } = req.params;

        const account = await SellerBankAccount.findOne({
            where: { account_id: id, seller_id }
        });

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.json({ account });
    } catch (error) {
        console.error('Error fetching bank account:', error);
        res.status(500).json({ error: 'Failed to fetch bank account' });
    }
};

// Update seller bank account
exports.updateBankAccount = async (req, res) => {
    try {
        const seller_id = req.user.user_id;
        const { id } = req.params;
        const updateData = req.body;

        const account = await SellerBankAccount.findOne({
            where: { account_id: id, seller_id }
        });

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Handle primary flag
        if (updateData.is_primary) {
            await SellerBankAccount.update(
                { is_primary: false },
                { where: { seller_id, is_primary: true, account_id: { [Op.ne]: id } } }
            );
        }

        // Don't allow updating is_verified from seller side
        delete updateData.is_verified;

        await account.update(updateData);

        res.json({
            message: 'Bank account updated successfully',
            account
        });
    } catch (error) {
        console.error('Error updating seller bank account:', error);
        res.status(500).json({ error: 'Failed to update bank account' });
    }
};

// Delete seller bank account
exports.deleteBankAccount = async (req, res) => {
    try {
        const seller_id = req.user.user_id;
        const { id } = req.params;

        const account = await SellerBankAccount.findOne({
            where: { account_id: id, seller_id }
        });

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const wasPrimary = account.is_primary;
        await account.destroy();

        // If deleted account was primary, set another one as primary
        if (wasPrimary) {
            const nextAccount = await SellerBankAccount.findOne({
                where: { seller_id },
                order: [['created_at', 'ASC']]
            });
            if (nextAccount) {
                await nextAccount.update({ is_primary: true });
            }
        }

        res.json({ message: 'Bank account deleted successfully' });
    } catch (error) {
        console.error('Error deleting seller bank account:', error);
        res.status(500).json({ error: 'Failed to delete bank account' });
    }
};

// Set account as primary
exports.setPrimaryAccount = async (req, res) => {
    try {
        const seller_id = req.user.user_id;
        const { id } = req.params;

        const account = await SellerBankAccount.findOne({
            where: { account_id: id, seller_id }
        });

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Unset all other primaries for this seller
        await SellerBankAccount.update(
            { is_primary: false },
            { where: { seller_id, is_primary: true } }
        );

        // Set this one as primary
        await account.update({ is_primary: true });

        res.json({
            message: 'Account set as primary successfully',
            account
        });
    } catch (error) {
        console.error('Error setting primary account:', error);
        res.status(500).json({ error: 'Failed to set primary account' });
    }
};

// Admin: Verify seller bank account
exports.verifyBankAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_verified } = req.body;

        const account = await SellerBankAccount.findByPk(id);

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        await account.update({ is_verified: is_verified !== false });

        res.json({
            message: `Account ${account.is_verified ? 'verified' : 'unverified'} successfully`,
            account
        });
    } catch (error) {
        console.error('Error verifying bank account:', error);
        res.status(500).json({ error: 'Failed to verify bank account' });
    }
};

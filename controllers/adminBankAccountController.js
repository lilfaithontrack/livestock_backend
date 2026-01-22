const { AdminBankAccount } = require('../models');
const { Op } = require('sequelize');

// Create bank account
exports.createBankAccount = async (req, res) => {
    try {
        const { 
            bank_name, 
            account_name, 
            account_number, 
            account_type,
            instructions,
            logo_url,
            is_primary,
            display_order
        } = req.body;

        if (!bank_name || !account_name || !account_number) {
            return res.status(400).json({ 
                error: 'Bank name, account name, and account number are required' 
            });
        }

        // If setting as primary, unset other primaries
        if (is_primary) {
            await AdminBankAccount.update(
                { is_primary: false },
                { where: { is_primary: true } }
            );
        }

        const account = await AdminBankAccount.create({
            bank_name,
            account_name,
            account_number,
            account_type: account_type || 'bank',
            instructions,
            logo_url,
            is_primary: is_primary || false,
            is_active: true,
            display_order: display_order || 0
        });

        res.status(201).json({
            message: 'Bank account created successfully',
            account
        });
    } catch (error) {
        console.error('Error creating bank account:', error);
        res.status(500).json({ error: 'Failed to create bank account' });
    }
};

// Get all bank accounts (admin)
exports.getAllBankAccounts = async (req, res) => {
    try {
        const accounts = await AdminBankAccount.findAll({
            order: [['display_order', 'ASC'], ['created_at', 'DESC']]
        });

        res.json({ accounts });
    } catch (error) {
        console.error('Error fetching bank accounts:', error);
        res.status(500).json({ error: 'Failed to fetch bank accounts' });
    }
};

// Get single bank account
exports.getBankAccountById = async (req, res) => {
    try {
        const { id } = req.params;

        const account = await AdminBankAccount.findByPk(id);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.json({ account });
    } catch (error) {
        console.error('Error fetching bank account:', error);
        res.status(500).json({ error: 'Failed to fetch bank account' });
    }
};

// Get active bank accounts (public - for sellers)
exports.getActiveAccounts = async (req, res) => {
    try {
        const accounts = await AdminBankAccount.findAll({
            where: { is_active: true },
            order: [['is_primary', 'DESC'], ['display_order', 'ASC']],
            attributes: ['account_id', 'bank_name', 'account_name', 'account_number', 
                        'account_type', 'instructions', 'logo_url', 'is_primary']
        });

        res.json({ accounts });
    } catch (error) {
        console.error('Error fetching active accounts:', error);
        res.status(500).json({ error: 'Failed to fetch payment accounts' });
    }
};

// Update bank account
exports.updateBankAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const account = await AdminBankAccount.findByPk(id);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Handle primary flag
        if (updateData.is_primary) {
            await AdminBankAccount.update(
                { is_primary: false },
                { where: { is_primary: true, account_id: { [Op.ne]: id } } }
            );
        }

        await account.update(updateData);

        res.json({
            message: 'Bank account updated successfully',
            account
        });
    } catch (error) {
        console.error('Error updating bank account:', error);
        res.status(500).json({ error: 'Failed to update bank account' });
    }
};

// Delete bank account
exports.deleteBankAccount = async (req, res) => {
    try {
        const { id } = req.params;

        const account = await AdminBankAccount.findByPk(id);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        await account.destroy();

        res.json({ message: 'Bank account deleted successfully' });
    } catch (error) {
        console.error('Error deleting bank account:', error);
        res.status(500).json({ error: 'Failed to delete bank account' });
    }
};

// Set account as primary
exports.setPrimaryAccount = async (req, res) => {
    try {
        const { id } = req.params;

        const account = await AdminBankAccount.findByPk(id);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Unset all other primaries
        await AdminBankAccount.update(
            { is_primary: false },
            { where: { is_primary: true } }
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

// Toggle account active status
exports.toggleAccountStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const account = await AdminBankAccount.findByPk(id);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        await account.update({ is_active: !account.is_active });

        res.json({
            message: `Account ${account.is_active ? 'activated' : 'deactivated'} successfully`,
            account
        });
    } catch (error) {
        console.error('Error toggling account status:', error);
        res.status(500).json({ error: 'Failed to toggle account status' });
    }
};

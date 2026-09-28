const { Language, Translation } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * Language / i18n controller.
 * Public read endpoints; admin-only write endpoints.
 */

/**
 * GET /api/v1/languages
 * List all active languages.
 */
const listLanguages = async (req, res, next) => {
    try {
        const langs = await Language.findAll({
            where: { is_active: true },
            order: [['is_default', 'DESC'], ['name', 'ASC']],
            attributes: ['code', 'name', 'native_name', 'direction', 'is_default']
        });
        return sendSuccess(res, 200, 'Languages retrieved', { languages: langs });
    } catch (e) { next(e); }
};

/**
 * GET /api/v1/languages/:code/translations
 * Get all translations for a language, returned as a flat { key: value } map.
 * Optional ?ns=namespace filter (e.g. ?ns=checkout).
 */
const getTranslations = async (req, res, next) => {
    try {
        const { code } = req.params;
        const { ns } = req.query;
        const lang = await Language.findByPk(code);
        if (!lang) return sendError(res, 404, 'Language not found');

        const where = { language_code: code };
        if (ns) {
            // match keys that start with the namespace prefix
            where.translation_key = { [require('sequelize').Op.iLike]: `${ns}%` };
        }
        const rows = await Translation.findAll({ where, attributes: ['translation_key', 'value'] });

        const map = {};
        for (const r of rows) map[r.translation_key] = r.value;
        return sendSuccess(res, 200, 'Translations retrieved', {
            language: code,
            direction: lang.direction,
            translations: map
        });
    } catch (e) { next(e); }
};

/**
 * GET /api/v1/languages/all
 * Admin: list ALL languages (including inactive).
 */
const listAllLanguages = async (req, res, next) => {
    try {
        const langs = await Language.findAll({ order: [['is_default', 'DESC'], ['name', 'ASC']] });
        return sendSuccess(res, 200, 'All languages retrieved', { languages: langs });
    } catch (e) { next(e); }
};

/**
 * POST /api/v1/languages
 * Admin: create a new language.
 */
const createLanguage = async (req, res, next) => {
    try {
        const { code, name, native_name, direction, is_active, is_default } = req.body;
        if (!code || !name || !native_name) {
            return sendError(res, 400, 'code, name and native_name are required');
        }
        const lang = await Language.create({
            code: code.toLowerCase(),
            name, native_name,
            direction: direction || 'ltr',
            is_active: is_active !== false,
            is_default: !!is_default
        });
        // If this is the new default, unset others
        if (lang.is_default) {
            await Language.update({ is_default: false }, { where: { code: { [require('sequelize').Op.ne]: lang.code } } });
        }
        return sendSuccess(res, 201, 'Language created', { language: lang });
    } catch (e) {
        if (e.name === 'SequelizeUniqueConstraintError') return sendError(res, 409, 'Language code already exists');
        next(e);
    }
};

/**
 * PUT /api/v1/languages/:code
 * Admin: update a language.
 */
const updateLanguage = async (req, res, next) => {
    try {
        const { code } = req.params;
        const lang = await Language.findByPk(code);
        if (!lang) return sendError(res, 404, 'Language not found');
        const { name, native_name, direction, is_active, is_default } = req.body;
        if (name !== undefined) lang.name = name;
        if (native_name !== undefined) lang.native_name = native_name;
        if (direction !== undefined) lang.direction = direction;
        if (typeof is_active === 'boolean') lang.is_active = is_active;
        if (typeof is_default === 'boolean') {
            lang.is_default = is_default;
            if (is_default) {
                await Language.update({ is_default: false }, { where: { code: { [require('sequelize').Op.ne]: code } } });
            }
        }
        await lang.save();
        return sendSuccess(res, 200, 'Language updated', { language: lang });
    } catch (e) { next(e); }
};

/**
 * DELETE /api/v1/languages/:code
 * Admin: delete a language (cascades translations). The default language
 * cannot be deleted.
 */
const deleteLanguage = async (req, res, next) => {
    try {
        const { code } = req.params;
        const lang = await Language.findByPk(code);
        if (!lang) return sendError(res, 404, 'Language not found');
        if (lang.is_default) return sendError(res, 400, 'Cannot delete the default language');
        await lang.destroy();
        return sendSuccess(res, 200, 'Language deleted');
    } catch (e) { next(e); }
};

/**
 * PUT /api/v1/languages/:code/translations
 * Admin: upsert many translations at once.
 * Body: { translations: { "key1": "value1", "key2": "value2", ... } }
 */
const upsertTranslations = async (req, res, next) => {
    try {
        const { code } = req.params;
        const { translations } = req.body;
        if (!translations || typeof translations !== 'object') {
            return sendError(res, 400, 'translations object is required');
        }
        const lang = await Language.findByPk(code);
        if (!lang) return sendError(res, 404, 'Language not found');

        const keys = Object.keys(translations);
        for (const key of keys) {
            const value = translations[key];
            if (typeof value !== 'string') continue;
            await Translation.upsert({ language_code: code, translation_key: key, value });
        }
        return sendSuccess(res, 200, `${keys.length} translations upserted`, { count: keys.length });
    } catch (e) { next(e); }
};

/**
 * PUT /api/v1/users/me/language
 * Authenticated: set the current user's preferred language.
 */
const setPreferredLanguage = async (req, res, next) => {
    try {
        const { language_code } = req.body;
        if (!language_code) return sendError(res, 400, 'language_code is required');
        const lang = await Language.findByPk(language_code);
        if (!lang || !lang.is_active) return sendError(res, 400, 'Language not available');

        const { User } = require('../models');
        await User.update({ preferred_language: language_code }, { where: { user_id: req.user.user_id } });
        return sendSuccess(res, 200, 'Preferred language updated', { language_code });
    } catch (e) { next(e); }
};

module.exports = {
    listLanguages,
    getTranslations,
    listAllLanguages,
    createLanguage,
    updateLanguage,
    deleteLanguage,
    upsertTranslations,
    setPreferredLanguage,
};

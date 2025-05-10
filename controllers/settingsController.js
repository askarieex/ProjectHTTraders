const { Settings, Upload, User } = require('../models');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Configure storage for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('Created uploads directory:', uploadDir);
        }

        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueFilename = `${uuidv4()}-${file.originalname.replace(/\s+/g, '_')}`;
        console.log('Generated filename:', uniqueFilename);
        cb(null, uniqueFilename);
    }
});

// Initialize multer upload
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB max file size
    },
    fileFilter: function (req, file, cb) {
        console.log('Processing file upload:', file.originalname, file.mimetype);
        // Accept only image files
        if (!file.mimetype.startsWith('image/')) {
            console.log('Rejected file type:', file.mimetype);
            return cb(new Error('Only image files are allowed'));
        }
        cb(null, true);
    }
});

// Helper to bulk save settings
const saveSettings = async (settings, userId = null) => {
    const promises = [];

    for (const [key, value] of Object.entries(settings)) {
        // Skip file uploads which are handled separately
        if (value instanceof File || key === 'qrCodeImage' || key === 'companyLogo') {
            continue;
        }

        // Check if setting exists and update or create
        const [setting, created] = await Settings.findOrCreate({
            where: {
                category: settings.category || 'general',
                key: key,
                userId: userId
            },
            defaults: {
                value: value
            }
        });

        // If setting exists, update its value
        if (!created) {
            setting.value = value;
            promises.push(setting.save());
        }
    }

    return Promise.all(promises);
};

// Get settings by category
exports.getSettingsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const userId = req.user ? req.user.id : null;

        // Get settings for specified category
        const settings = await Settings.findAll({
            where: {
                category,
                userId
            }
        });

        // Transform settings from array to object
        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.key] = setting.value;
        });

        // Get file uploads if this is a category with uploads
        if (category === 'payment' || category === 'company') {
            const uploads = await Upload.findAll({
                where: {
                    userId,
                    type: category === 'payment' ? 'qrCode' : 'logo'
                }
            });

            if (uploads.length > 0) {
                // Add URLs to files
                uploads.forEach(upload => {
                    const urlPrefix = `${req.protocol}://${req.get('host')}/uploads/`;
                    if (upload.type === 'qrCode') {
                        settingsObj.qrCodeUrl = urlPrefix + upload.fileName;
                    } else if (upload.type === 'logo') {
                        settingsObj.logoUrl = urlPrefix + upload.fileName;
                    }
                });
            }
        }

        res.status(200).json(settingsObj);
    } catch (error) {
        console.error('Error getting settings:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
};

// Save settings for a category
exports.saveSettings = async (req, res) => {
    try {
        const { category } = req.params;
        const userId = req.user ? req.user.id : null;
        const data = req.body;

        // Debug logging
        console.log('Request files:', req.files);
        console.log('Request body:', req.body);

        // Add category to data object
        data.category = category;

        // Save text settings
        await saveSettings(data, userId);

        // Handle file uploads
        if (req.files) {
            try {
                // Handle QR code upload
                if (req.files.qrCodeImage) {
                    console.log('QR code file detected:', req.files.qrCodeImage);
                    // Check if it's an array (multer standard) or a single file object
                    const qrCodeFile = Array.isArray(req.files.qrCodeImage)
                        ? req.files.qrCodeImage[0]
                        : req.files.qrCodeImage;

                    if (qrCodeFile && qrCodeFile.filename) {
                        // Delete any existing QR code uploads for this user
                        await Upload.destroy({
                            where: {
                                userId,
                                type: 'qrCode'
                            }
                        });

                        // Create new upload record
                        await Upload.create({
                            type: 'qrCode',
                            originalName: qrCodeFile.originalname,
                            fileName: qrCodeFile.filename,
                            filePath: qrCodeFile.path,
                            fileSize: qrCodeFile.size,
                            mimeType: qrCodeFile.mimetype,
                            userId
                        });

                        console.log('QR code saved successfully');
                    } else {
                        console.log('Invalid QR code file structure:', qrCodeFile);
                    }
                }

                // Handle logo upload
                if (req.files.companyLogo) {
                    console.log('Logo file detected:', req.files.companyLogo);
                    // Check if it's an array (multer standard) or a single file object
                    const logoFile = Array.isArray(req.files.companyLogo)
                        ? req.files.companyLogo[0]
                        : req.files.companyLogo;

                    if (logoFile && logoFile.filename) {
                        // Delete any existing logo uploads for this user
                        await Upload.destroy({
                            where: {
                                userId,
                                type: 'logo'
                            }
                        });

                        // Create new upload record
                        await Upload.create({
                            type: 'logo',
                            originalName: logoFile.originalname,
                            fileName: logoFile.filename,
                            filePath: logoFile.path,
                            fileSize: logoFile.size,
                            mimeType: logoFile.mimetype,
                            userId
                        });

                        console.log('Logo saved successfully');
                    } else {
                        console.log('Invalid logo file structure:', logoFile);
                    }
                }
            } catch (fileError) {
                console.error('Error processing file uploads:', fileError);
                // Continue with the API response even if file upload fails
                // to at least save the text settings
            }
        }

        res.status(200).json({ message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ error: 'Failed to save settings: ' + error.message });
    }
};

// Handle file upload middleware
exports.uploadFiles = upload.fields([
    { name: 'qrCodeImage', maxCount: 1 },
    { name: 'companyLogo', maxCount: 1 }
]);

// Get all settings
exports.getAllSettings = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;

        const settings = await Settings.findAll({
            where: { userId },
            order: [['category', 'ASC']]
        });

        // Group settings by category
        const groupedSettings = {};
        settings.forEach(setting => {
            if (!groupedSettings[setting.category]) {
                groupedSettings[setting.category] = {};
            }
            groupedSettings[setting.category][setting.key] = setting.value;
        });

        res.status(200).json(groupedSettings);
    } catch (error) {
        console.error('Error getting all settings:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
};

// Delete a setting
exports.deleteSetting = async (req, res) => {
    try {
        const { category, key } = req.params;
        const userId = req.user ? req.user.id : null;

        const setting = await Settings.findOne({
            where: {
                category,
                key,
                userId
            }
        });

        if (!setting) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        await setting.destroy();

        res.status(200).json({ message: 'Setting deleted successfully' });
    } catch (error) {
        console.error('Error deleting setting:', error);
        res.status(500).json({ error: 'Failed to delete setting' });
    }
};

// Reset settings to default values
exports.resetSettings = async (req, res) => {
    try {
        const { category } = req.params;
        const userId = req.user ? req.user.id : null;

        // Delete all settings for this category
        await Settings.destroy({
            where: {
                category,
                userId
            }
        });

        // Delete any associated uploads
        if (category === 'payment' || category === 'company') {
            const uploads = await Upload.findAll({
                where: {
                    userId,
                    type: category === 'payment' ? 'qrCode' : 'logo'
                }
            });

            // Delete the files from storage
            uploads.forEach(upload => {
                try {
                    fs.unlinkSync(upload.filePath);
                } catch (err) {
                    console.error('Error deleting file:', err);
                }
            });

            // Delete the database records
            await Upload.destroy({
                where: {
                    userId,
                    type: category === 'payment' ? 'qrCode' : 'logo'
                }
            });
        }

        res.status(200).json({ message: 'Settings reset to default values' });
    } catch (error) {
        console.error('Error resetting settings:', error);
        res.status(500).json({ error: 'Failed to reset settings' });
    }
}; 
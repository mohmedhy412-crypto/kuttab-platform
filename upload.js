// ===== middleware رفع الملفات =====

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// إنشاء مجلدات التحميل
const createUploadDirs = () => {
    const directories = [
        config.upload.uploadPath,
        path.join(config.upload.uploadPath, config.upload.directories.images),
        path.join(config.upload.uploadPath, config.upload.directories.documents),
        path.join(config.upload.uploadPath, config.upload.directories.avatars),
        path.join(config.upload.uploadPath, config.upload.directories.exports),
        path.join(config.upload.uploadPath, config.upload.directories.temp)
    ];

    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

// إعداد التخزين الديناميكي بناءً على نوع الملف
const getStorage = (category = 'general') => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            createUploadDirs();
            const uploadPath = config.getUploadPath(category);
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const user = req.user;
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 8);
            const extension = path.extname(file.originalname);
            const nameWithoutExt = path.basename(file.originalname, extension);
            const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_');
            
            const fileName = `${category}_${timestamp}_${randomString}_${user?.id || 'anonymous'}_${safeName}${extension}`;
            cb(null, fileName);
        }
    });
};

// فلترة الملفات بناءً على النوع
const fileFilter = (req, file, cb) => {
    const allowedTypes = config.upload.allowedTypes;
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`نوع الملف غير مدعوم. الأنواع المسموحة: ${allowedTypes.join(', ')}`), false);
    }
};

// إنشاء middleware رفع الملفات
const createUploadMiddleware = (category = 'general', maxCount = 1) => {
    const storage = getStorage(category);
    
    const upload = multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: {
            fileSize: config.upload.maxFileSize,
            files: maxCount
        }
    });

    return maxCount > 1 ? upload.array('files', maxCount) : upload.single('file');
};

// middleware للتحقق من حجم الملف
const checkFileSize = (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length']);
    
    if (contentLength > config.upload.maxFileSize) {
        return res.status(413).json({
            success: false,
            message: `حجم الملف كبير جداً. الحد الأقصى: ${config.formatFileSize(config.upload.maxFileSize)}`
        });
    }
    
    next();
};

// middleware للتحقق من نوع الملف
const checkFileType = (allowedTypes = null) => {
    return (req, res, next) => {
        if (!req.file) {
            return next();
        }

        const types = allowedTypes || config.upload.allowedTypes;
        
        if (!types.includes(req.file.mimetype)) {
            // حذف الملف إذا كان النوع غير مسموح
            if (req.file.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            
            return res.status(400).json({
                success: false,
                message: `نوع الملف غير مدعوم. الأنواع المسموحة: ${types.join(', ')}`
            });
        }
        
        next();
    };
};

// middleware لتنظيف الملفات المؤقتة
const cleanupTempFiles = (req, res, next) => {
    // تنظيف الملفات المؤقتة الأقدم من ساعة
    const tempDir = config.getUploadPath('temp');
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    if (fs.existsSync(tempDir)) {
        fs.readdir(tempDir, (err, files) => {
            if (err) return;

            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtimeMs < oneHourAgo) {
                    fs.unlinkSync(filePath);
                }
            });
        });
    }

    next();
};

// معالج أخطاء multer
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        let message = 'حدث خطأ أثناء رفع الملف';
        
        if (error.code === 'LIMIT_FILE_SIZE') {
            message = `حجم الملف كبير جداً. الحد الأقصى: ${config.formatFileSize(config.upload.maxFileSize)}`;
        } else if (error.code === 'LIMIT_FILE_COUNT') {
            message = 'تم تجاوز عدد الملفات المسموح به';
        } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
// ===== إعدادات التطبيق =====

const config = {
    // إعدادات الخادم
    server: {
        port: process.env.PORT || 5000,
        env: process.env.NODE_ENV || 'development',
        baseUrl: process.env.BASE_URL || 'http://localhost:5000'
    },

    // قاعدة البيانات
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kuttab_platform',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // إعدادات إضافية لأداء أفضل
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        }
    },

    // الأمان
    security: {
        jwtSecret: process.env.JWT_SECRET || 'kuttab_default_secret_change_in_production',
        jwtExpire: process.env.JWT_EXPIRE || '30d',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
        
        // CORS
        corsOptions: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: [
                'Content-Type', 
                'Authorization', 
                'X-Requested-With',
                'Accept',
                'Origin'
            ]
        },

        // تحديد المعدل
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 دقيقة
            max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 100 في الإنتاج، 1000 في التطوير
            message: {
                success: false,
                message: 'تم تجاوز عدد الطلبات المسموح بها'
            }
        }
    },

    // رفع الملفات
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
        uploadPath: process.env.UPLOAD_PATH || './backend/uploads',
        allowedTypes: [
            'image/jpeg',
            'image/png', 
            'image/gif',
            'image/webp',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        
        // مجلدات التخزين
        directories: {
            images: 'images',
            documents: 'documents',
            avatars: 'avatars',
            exports: 'exports',
            temp: 'temp'
        }
    },

    // البريد الإلكتروني (اختياري)
    email: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || 'noreply@kuttab.com'
    },

    // التطبيق
    app: {
        name: process.env.APP_NAME || 'كُتّاب',
        version: process.env.APP_VERSION || '1.0.0',
        description: 'منصة مجانية للكتاب والمؤلفين العرب',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@kuttab.com',
        
        // الإعدادات الافتراضية
        defaults: {
            user: {
                role: 'user',
                status: 'active',
                preferences: {
                    theme: 'dark',
                    language: 'ar',
                    notifications: true
                }
            },
            writing: {
                status: 'draft',
                visibility: 'private',
                language: 'ar'
            },
            pagination: {
                limit: 20,
                page: 1
            }
        }
    },

    // الميزات
    features: {
        aiAssistant: true,
        socialFeatures: true,
        gallery: true,
        publishing: true,
        adminPanel: true,
        reporting: true,
        analytics: process.env.NODE_ENV === 'production'
    },

    // التحليلات (اختياري)
    analytics: {
        enabled: process.env.NODE_ENV === 'production',
        // يمكن إضافة إعدادات Google Analytics أو غيرها
    }
};

// التحقق من الإعدادات المطلوبة في الإنتاج
if (process.env.NODE_ENV === 'production') {
    const required = ['JWT_SECRET', 'MONGODB_URI'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('❌ إعدادات بيئة مفقودة في الإنتاج:', missing.join(', '));
        process.exit(1);
    }
}

// وظائف مساعدة
config.getUploadPath = (category = 'general') => {
    const dir = config.upload.directories[category] || 'general';
    return path.join(config.upload.uploadPath, dir);
};

config.isFileTypeAllowed = (mimetype) => {
    return config.upload.allowedTypes.includes(mimetype);
};

config.formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

module.exports = config;
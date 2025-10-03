// ===== الخادم الرئيسي لمنصة كُتّاب =====

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ===== إعدادات الأمان =====

// Helmet لإعدادات الأمان
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false // يمكن تفعيله في الإنتاج
}));

// تحديد معدل الطلبات
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 100, // حد 100 طلب لكل IP
    message: {
        success: false,
        message: 'تم تجاوز عدد الطلبات المسموح بها. يرجى المحاولة لاحقاً.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// ===== middleware الأساسي =====

// CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// تحليل JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// servir الملفات الثابتة
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== الاتصال بقاعدة البيانات =====

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kuttab_platform', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB متصل: ${conn.connection.host}`);
        
        // إعداد فهارس للنماذج
        await setupIndexes();
        
    } catch (error) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error.message);
        process.exit(1);
    }
};

// إعداد الفهارس
const setupIndexes = async () => {
    try {
        // فهارس للمستخدمين
        await mongoose.connection.collection('users').createIndex({ username: 1 }, { unique: true });
        await mongoose.connection.collection('users').createIndex({ email: 1 }, { unique: true });
        
        // فهارس للكتابات
        await mongoose.connection.collection('writings').createIndex({ author: 1, createdAt: -1 });
        await mongoose.connection.collection('writings').createIndex({ category: 1 });
        
        // فهارس للمنشورات
        await mongoose.connection.collection('posts').createIndex({ author: 1, createdAt: -1 });
        await mongoose.connection.collection('posts').createIndex({ 'poll': 1 });
        
        console.log('✅ تم إعداد فهارس قاعدة البيانات');
    } catch (error) {
        console.error('❌ خطأ في إعداد الفهارس:', error);
    }
};

// ===== مسارات API =====

// مسارات المصادقة
app.use('/api/auth', require('./routes/auth'));

// مسارات الكتابات
app.use('/api/writings', require('./routes/writings'));

// مسارات المعرض
app.use('/api/gallery', require('./routes/gallery'));

// مسارات المنشورات
app.use('/api/posts', require('./routes/posts'));

// مسارات الاستفتاءات
app.use('/api/polls', require('./routes/polls'));

// مسارات الإدارة
app.use('/api/admin', require('./routes/admin'));

// مسار رفع الملفات
app.use('/api/upload', require('./routes/upload'));

// ===== servir واجهة المستخدم =====

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===== معالجة الأخطاء =====

// معالج للروابط غير موجودة
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'الرابط غير موجود'
    });
});

// معالج الأخطاء العام
app.use((err, req, res, next) => {
    console.error('🔥 خطأ في الخادم:', err.stack);

    // خطأ في التحقق من الصحة
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        return res.status(400).json({
            success: false,
            message: 'بيانات غير صالحة',
            errors: messages
        });
    }

    // خطأ في تكرار البيانات
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            success: false,
            message: `${field} موجود مسبقاً`
        });
    }

    // خطأ في JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Token غير صالح'
        });
    }

    // خطأ في انتهاء صلاحية JWT
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'انتهت صلاحية Token'
        });
    }

    // الخطأ الافتراضي
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? err.message : 'حدث خطأ في الخادم',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ===== تشغيل الخادم =====

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // الاتصال بقاعدة البيانات أولاً
        await connectDB();
        
        // ثم تشغيل الخادم
        app.listen(PORT, () => {
            console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
            console.log(`🌍 البيئة: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📧 عنوان API: http://localhost:${PORT}/api`);
            console.log(`🎨 واجهة المستخدم: http://localhost:${PORT}`);
            
            // معلومات إضافية في وضع التطوير
            if (process.env.NODE_ENV === 'development') {
                console.log('\n📋 مسارات API المتاحة:');
                console.log('   🔐 /api/auth - المصادقة والمستخدمين');
                console.log('   📝 /api/writings - إدارة الكتابات');
                console.log('   🖼️ /api/gallery - معرض الأعمال');
                console.log('   💬 /api/posts - المنشورات الاجتماعية');
                console.log('   📊 /api/polls - الاستفتاءات');
                console.log('   👑 /api/admin - لوحة الإدارة');
                console.log('   📤 /api/upload - رفع الملفات');
            }
        });
    } catch (error) {
        console.error('❌ فشل في تشغيل الخادم:', error);
        process.exit(1);
    }
};

// معالج لإغلاق الخادم بشكل أنيق
process.on('SIGINT', async () => {
    console.log('\n🔻 يتم إيقاف الخادم...');
    await mongoose.connection.close();
    console.log('✅ تم إغلاق اتصال قاعدة البيانات');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🔻 يتم إيقاف الخادم...');
    await mongoose.connection.close();
    console.log('✅ تم إغلاق اتصال قاعدة البيانات');
    process.exit(0);
});

// بدء الخادم
startServer();

module.exports = app;
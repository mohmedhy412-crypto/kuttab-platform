require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware الأساسي
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// تحديد معدل الطلبات
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'تم تجاوز عدد الطلبات المسموح بها' }
});
app.use(limiter);

// servir الملفات الثابتة - مسار معدل
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// === مسارات API مبسطة ===

// مسار الصحة
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        message: 'الخادم يعمل بشكل صحيح',
        timestamp: new Date().toISOString()
    });
});

// مسارات أساسية
app.get('/api/auth', (req, res) => {
    res.json({ message: 'مسار المصادقة - تحت التطوير' });
});

app.get('/api/writings', (req, res) => {
    res.json({ message: 'مسار الكتابات - تحت التطوير' });
});

// المسار الرئيسي
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'مرحباً بكم في منصة كُتّاب للكتاب والمؤلفين العرب',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            writings: '/api/writings'
        }
    });
});

// معالجة الأخطاء
app.use((err, req, res, next) => {
    console.error('🔥 خطأ في الخادم:', err);
    res.status(500).json({
        success: false,
        message: 'حدث خطأ في الخادم',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'الصفحة غير موجودة'
    });
});

// بدء الخادم
app.listen(PORT, () => {
    console.log(`🚀 خادم كُتّاب يعمل على البورت ${PORT}`);
    console.log(`🌍 البيئة: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
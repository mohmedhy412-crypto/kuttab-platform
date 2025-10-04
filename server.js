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
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// تحديد معدل الطلبات
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { 
        success: false, 
        message: 'تم تجاوز عدد الطلبات المسموح بها. يرجى المحاولة لاحقاً.' 
    }
});
app.use(limiter);

// servir الملفات الثابتة
app.use(express.static(path.join(__dirname, '../frontend')));

// === مسارات API أساسية ===

// مسار الصحة
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        message: '🚀 خادم منصة كُتّاب يعمل بشكل صحيح',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// مسارات تجريبية
app.get('/api/auth/test', (req, res) => {
    res.json({ 
        success: true,
        message: 'مسار المصادقة جاهز للتطوير',
        endpoints: ['/api/auth/login', '/api/auth/register', '/api/auth/profile']
    });
});

app.get('/api/writings/test', (req, res) => {
    res.json({ 
        success: true,
        message: 'مسار الكتابات جاهز للتطوير',
        endpoints: ['/api/writings', '/api/writings/:id', '/api/writings/categories']
    });
});

// المسار الرئيسي
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// جميع المسارات الأخرى تخدم واجهة المستخدم
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// معالجة الأخطاء
app.use((err, req, res, next) => {
    console.error('🔥 خطأ في الخادم:', err);
    res.status(500).json({
        success: false,
        message: 'حدث خطأ في الخادم',
        ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
});

// بدء الخادم
app.listen(PORT, () => {
    console.log(`🚀 خادم كُتّاب يعمل على البورت ${PORT}`);
    console.log(`📁 مجلد الواجهة: ${path.join(__dirname, '../frontend')}`);
    console.log(`🌍 البيئة: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
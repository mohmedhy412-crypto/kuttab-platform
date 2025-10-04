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

// servir الملفات الثابتة من frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// === مسارات API ===
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        message: 'خادم كُتّاب يعمل بشكل صحيح',
        timestamp: new Date().toISOString()
    });
});

// مسارات أساسية
app.get('/api/auth', (req, res) => {
    res.json({ message: 'مسار المصادقة - جاهز للتطوير' });
});

app.get('/api/writings', (req, res) => {
    res.json({ message: 'مسار الكتابات - جاهز للتطوير' });
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
        message: 'حدث خطأ في الخادم'
    });
});

// بدء الخادم
app.listen(PORT, () => {
    console.log(`🚀 خادم كُتّاب يعمل على البورت ${PORT}`);
    console.log(`📁 مجلد الواجهة: ${path.join(__dirname, '../frontend')}`);
});

module.exports = app;
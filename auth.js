// ===== middleware المصادقة =====

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');

// مصادقة المستخدم
const auth = async (req, res, next) => {
    try {
        const token = getTokenFromRequest(req);
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'يجب تسجيل الدخول للوصول إلى هذا المورد'
            });
        }

        const decoded = jwt.verify(token, config.security.jwtSecret);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'الحساب موقوف. يرجى التواصل مع الإدارة'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token غير صالح'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'انتهت صلاحية Token'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'خطأ في المصادقة'
        });
    }
};

// مصادقة المشرف
const adminAuth = async (req, res, next) => {
    try {
        await auth(req, res, () => {});
        
        if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'moderator')) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح - تحتاج صلاحيات مشرف'
            });
        }
        
        next();
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في التحقق من الصلاحيات'
        });
    }
};

// مصادقة المالك
const ownerAuth = async (req, res, next) => {
    try {
        await auth(req, res, () => {});
        
        const resourceId = req.params.id || req.body.id;
        const resourceType = req.baseUrl.split('/').pop(); // الحصول على نوع المورد من المسار
        
        if (!resourceId) {
            return res.status(400).json({
                success: false,
                message: 'معرف المورد مطلوب'
            });
        }
        
        // التحقق من ملكية المورد
        const isOwner = await checkResourceOwnership(resourceType, resourceId, req.user._id);
        
        if (!isOwner && req.user.role !== 'admin' && req.user.role !== 'moderator') {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح - ليس لديك صلاحية للوصول إلى هذا المورد'
            });
        }
        
        next();
    } catch (error) {
        console.error('Owner auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في التحقق من الملكية'
        });
    }
};

// ===== دوال مساعدة =====

// استخراج التوكن من الطلب
const getTokenFromRequest = (req) => {
    let token = null;
    
    // من الرأس
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.substring(7);
    }
    // من query parameter
    else if (req.query.token) {
        token = req.query.token;
    }
    // من cookies
    else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }
    
    return token;
};

// التحقق من ملكية المورد
const checkResourceOwnership = async (resourceType, resourceId, userId) => {
    try {
        let Model;
        let ownerField = 'author';
        
        switch (resourceType) {
            case 'writings':
                Model = require('../models/Writing');
                break;
            case 'gallery':
                Model = require('../models/Gallery');
                break;
            case 'posts':
                Model = require('../models/Post');
                break;
            case 'polls':
                Model = require('../models/Poll');
                ownerField = 'author';
                break;
            case 'users':
                Model = User;
                ownerField = '_id';
                break;
            default:
                return false;
        }
        
        const resource = await Model.findOne({ 
            _id: resourceId,
            [ownerField]: userId 
        });
        
        return !!resource;
    } catch (error) {
        console.error('Resource ownership check error:', error);
        return false;
    }
};

// التحقق من الصلاحيات
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'يجب تسجيل الدخول'
            });
        }
        
        // يمكن توسيع هذا النظام ليشمل صلاحيات أكثر تعقيداً
        const userPermissions = getUserPermissions(req.user.role);
        
        if (!userPermissions.includes(permission)) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح - لا تملك الصلاحية المطلوبة'
            });
        }
        
        next();
    };
};

// الحصول على صلاحيات الدور
const getUserPermissions = (role) => {
    const permissions = {
        user: [
            'read_own_content',
            'write_content',
            'comment',
            'like',
            'follow'
        ],
        moderator: [
            'read_own_content',
            'write_content',
            'comment',
            'like',
            'follow',
            'moderate_content',
            'view_reports',
            'manage_users'
        ],
        admin: [
            'read_own_content',
            'write_content',
            'comment',
            'like',
            'follow',
            'moderate_content',
            'view_reports',
            'manage_users',
            'manage_system',
            'view_analytics'
        ]
    };
    
    return permissions[role] || permissions.user;
};

// تسجيل النشاط
const activityLogger = (action) => {
    return (req, res, next) => {
        const start = Date.now();
        
        // تسجيل بعد اكتمال الطلب
        res.on('finish', () => {
            const duration = Date.now() - start;
            
            console.log(`[${new Date().toISOString()}] ${action} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - User: ${req.user?._id || 'Anonymous'}`);
            
            // يمكن إضافة تسجيل في قاعدة البيانات هنا
            if (req.user && process.env.NODE_ENV === 'production') {
                // تسجيل النشاط في قاعدة البيانات
                logActivity(req.user._id, action, req.method, req.originalUrl, res.statusCode, duration);
            }
        });
        
        next();
    };
};

// تسجيل النشاط في قاعدة البيانات (اختياري)
const logActivity = async (userId, action, method, url, statusCode, duration) => {
    try {
        // يمكن إنشاء نموذج لتسجيل النشاطات إذا لزم الأمر
        console.log(`Activity Log - User: ${userId}, Action: ${action}, Endpoint: ${method} ${url}, Status: ${statusCode}, Duration: ${duration}ms`);
    } catch (error) {
        console.error('Activity logging error:', error);
    }
};

module.exports = {
    auth,
    adminAuth,
    ownerAuth,
    requirePermission,
    activityLogger
};
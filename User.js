// ===== نموذج المستخدم =====

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // المعلومات الأساسية
    username: {
        type: String,
        required: [true, 'اسم المستخدم مطلوب'],
        unique: true,
        trim: true,
        minlength: [3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'],
        maxlength: [30, 'اسم المستخدم يجب أن لا يتجاوز 30 حرف'],
        match: [/^[a-zA-Z0-9_\u0600-\u06FF]+$/, 'اسم المستخدم يمكن أن يحتوي على أحرف وأرقام وشرطة سفلية فقط']
    },
    
    email: {
        type: String,
        required: [true, 'البريد الإلكتروني مطلوب'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'البريد الإلكتروني غير صالح']
    },
    
    password: {
        type: String,
        required: [true, 'كلمة المرور مطلوبة'],
        minlength: [4, 'كلمة المرور يجب أن تكون 4 أحرف على الأقل'],
        select: false // إخفاء في الاستعلامات الافتراضية
    },
    
    fullName: {
        type: String,
        required: [true, 'الاسم الكامل مطلوب'],
        trim: true,
        maxlength: [100, 'الاسم الكامل يجب أن لا يتجاوز 100 حرف']
    },

    // الصلاحيات والحالة
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },
    
    status: {
        type: String,
        enum: ['active', 'suspended', 'banned'],
        default: 'active'
    },

    // الملف الشخصي
    avatar: {
        type: String,
        default: null
    },
    
    bio: {
        type: String,
        maxlength: [500, 'السيرة الذاتية يجب أن لا تتجاوز 500 حرف'],
        default: ''
    },
    
    website: {
        type: String,
        trim: true,
        default: ''
    },
    
    socialLinks: {
        twitter: { type: String, default: '' },
        facebook: { type: String, default: '' },
        instagram: { type: String, default: '' },
        linkedin: { type: String, default: '' }
    },

    // الإحصائيات
    stats: {
        totalWords: { type: Number, default: 0 },
        writingsCount: { type: Number, default: 0 },
        galleryItems: { type: Number, default: 0 },
        postsCount: { type: Number, default: 0 },
        joinedAt: { type: Date, default: Date.now },
        lastActive: { type: Date, default: Date.now }
    },

    // التفضيلات
    preferences: {
        theme: { 
            type: String, 
            enum: ['dark', 'light', 'auto'],
            default: 'dark'
        },
        language: { 
            type: String, 
            enum: ['ar', 'en'],
            default: 'ar'
        },
        notifications: { 
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            social: { type: Boolean, default: true }
        },
        privacy: {
            profile: { 
                type: String, 
                enum: ['public', 'private', 'friends'],
                default: 'public'
            },
            writings: { 
                type: String, 
                enum: ['public', 'private', 'link-only'],
                default: 'private'
            }
        }
    },

    // المراجعة والأمان
    emailVerified: {
        type: Boolean,
        default: false
    },
    
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // المراقبة
    loginAttempts: {
        type: Number,
        default: 0
    },
    
    lockUntil: Date

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ===== الفهارس =====

userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'stats.lastActive': -1 });
userSchema.index({ createdAt: -1 });

// ===== Virtuals =====

// الحصول على الأعمال المنشورة
userSchema.virtual('writings', {
    ref: 'Writing',
    localField: '_id',
    foreignField: 'author'
});

// الحصول على منشورات المستخدم
userSchema.virtual('posts', {
    ref: 'Post',
    localField: '_id',
    foreignField: 'author'
});

// الحصول على أعمال المعرض
userSchema.virtual('gallery', {
    ref: 'Gallery',
    localField: '_id',
    foreignField: 'author'
});

// ===== Middleware =====

// تشفير كلمة المرور قبل الحفظ
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// تحديث lastActive قبل التحديث
userSchema.pre('findOneAndUpdate', function(next) {
    this.set({ 'stats.lastActive': new Date() });
    next();
});

// ===== التوابع =====

// مقارنة كلمة المرور
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

// التحقق من إذا كان الحساب مقفولاً
userSchema.methods.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// زيادة محاولات تسجيل الدخول
userSchema.methods.incrementLoginAttempts = async function() {
    // إذا انتهت مدة القفل، نعيد التعيين
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }
    
    // زيادة المحاولات
    const updates = { $inc: { loginAttempts: 1 } };
    
    // قفل الحساب بعد 5 محاولات فاشلة لمدة ساعة
    if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
        updates.$set = { lockUntil: Date.now() + 60 * 60 * 1000 }; // ساعة واحدة
    }
    
    return this.updateOne(updates);
};

// إعادة تعيين محاولات تسجيل الدخول
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 }
    });
};

// توليد توكن إعادة تعيين كلمة المرور
userSchema.methods.getResetPasswordToken = function() {
    const crypto = require('crypto');
    
    // توليد التوكن
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // تشفير التوكن وحفظه في قاعدة البيانات
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    // تعيين انتهاء الصلاحية لمدة 10 دقائق
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    
    return resetToken;
};

// تحديث الإحصائيات
userSchema.methods.updateStats = async function(field, value = 1) {
    const update = {};
    update[`stats.${field}`] = value;
    
    if (field === 'totalWords') {
        update.$inc = { 'stats.totalWords': value };
    } else {
        update.$inc = { [`stats.${field}`]: value };
    }
    
    return this.updateOne(update);
};

// ===== التوابع الثابتة =====

// البحث عن مستخدم نشط
userSchema.statics.findActiveUsers = function(days = 30) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    return this.find({
        status: 'active',
        'stats.lastActive': { $gte: date }
    }).sort({ 'stats.lastActive': -1 });
};

// إحصائيات المستخدمين
userSchema.statics.getUserStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                activeUsers: { 
                    $sum: { 
                        $cond: [{ $eq: ['$status', 'active'] }, 1, 0] 
                    } 
                },
                adminUsers: { 
                    $sum: { 
                        $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] 
                    } 
                },
                totalWords: { $sum: '$stats.totalWords' },
                avgWordsPerUser: { $avg: '$stats.totalWords' }
            }
        }
    ]);
};

// ===== إخفاء البيانات الحساسة =====

userSchema.methods.toJSON = function() {
    const user = this.toObject();
    
    // إخفاء البيانات الحساسة
    delete user.password;
    delete user.verificationToken;
    delete user.resetPasswordToken;
    delete user.resetPasswordExpire;
    delete user.loginAttempts;
    delete user.lockUntil;
    
    return user;
};

module.exports = mongoose.model('User', userSchema);
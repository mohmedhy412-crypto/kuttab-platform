// ===== نموذج معرض الأعمال =====

const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
    // المعلومات الأساسية
    title: {
        type: String,
        required: [true, 'عنوان العمل مطلوب'],
        trim: true,
        maxlength: [100, 'العنوان يجب أن لا يتجاوز 100 حرف']
    },
    
    description: {
        type: String,
        maxlength: [500, 'الوصف يجب أن لا يتجاوز 500 حرف'],
        default: ''
    },

    // الوسائط
    image: {
        type: String,
        required: [true, 'صورة العمل مطلوبة']
    },
    
    thumbnail: {
        type: String,
        default: function() {
            return this.image; // يمكن إنشاء ثامبنييل من الصورة الأصلية
        }
    },
    
    mediaType: {
        type: String,
        enum: ['image', 'document', 'video', 'audio'],
        default: 'image'
    },

    // المؤلف والملكية
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // التصنيف والوسوم
    category: {
        type: String,
        enum: [
            'artwork',      // أعمال فنية
            'cover',        // أغلفة كتب
            'illustration', // رسوم توضيحية
            'photo',        // صور فوتوغرافية
            'design',       // تصاميم
            'document',     // مستندات
            'other'         // أخرى
        ],
        default: 'artwork'
    },
    
    tags: [{
        type: String,
        trim: true,
        maxlength: [30, 'الوسم يجب أن لا يتجاوز 30 حرف']
    }],

    // الحالة والرؤية
    status: {
        type: String,
        enum: ['draft', 'published', 'archived', 'hidden'],
        default: 'published'
    },
    
    visibility: {
        type: String,
        enum: ['public', 'private', 'link-only'],
        default: 'public'
    },

    // الإحصائيات
    stats: {
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        downloads: { type: Number, default: 0 },
        shares: { type: Number, default: 0 }
    },

    // البيانات الوصفية
    metadata: {
        fileSize: Number,
        dimensions: {
            width: Number,
            height: Number
        },
        format: String,
        colors: [String], // الألوان الرئيسية في الصورة
        aiGenerated: {
            type: Boolean,
            default: false
        }
    },

    // حقوق النشر
    copyright: {
        holder: {
            type: String,
            default: function() {
                return this.author?.fullName || 'مجهول';
            }
        },
        license: {
            type: String,
            enum: [
                'all-rights',
                'cc-by',
                'cc-by-sa', 
                'cc-by-nc',
                'public-domain'
            ],
            default: 'all-rights'
        },
        allowCommercialUse: {
            type: Boolean,
            default: false
        },
        allowModifications: {
            type: Boolean,
            default: false
        }
    },

    // المراجعة والتقييم
    ratings: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            required: true
        },
        comment: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    // متوسط التقييم (محسوب)
    averageRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ===== الفهارس =====

gallerySchema.index({ author: 1, createdAt: -1 });
gallerySchema.index({ category: 1, status: 1 });
gallerySchema.index({ tags: 1 });
gallerySchema.index({ 'stats.views': -1 });
gallerySchema.index({ 'stats.likes': -1 });
gallerySchema.index({ averageRating: -1 });

// ===== Virtuals =====

// الحصول على المؤلف
gallerySchema.virtual('authorInfo', {
    ref: 'User',
    localField: 'author',
    foreignField: '_id',
    justOne: true
});

// الحصول على عدد التقييمات
gallerySchema.virtual('ratingsCount').get(function() {
    return this.ratings.length;
});

// ===== Middleware =====

// تحديث متوسط التقييم قبل الحفظ
gallerySchema.pre('save', function(next) {
    this.updateAverageRating();
    next();
});

// ===== التوابع =====

// تحديث متوسط التقييم
gallerySchema.methods.updateAverageRating = function() {
    if (this.ratings.length === 0) {
        this.averageRating = 0;
        return;
    }
    
    const sum = this.ratings.reduce((total, rating) => total + rating.rating, 0);
    this.averageRating = Math.round((sum / this.ratings.length) * 10) / 10;
};

// زيادة عدد المشاهدات
gallerySchema.methods.incrementViews = function() {
    this.stats.views += 1;
    return this.save();
};

// زيادة الإعجابات
gallerySchema.methods.incrementLikes = function() {
    this.stats.likes += 1;
    return this.save();
};

// زيادة التحميلات
gallerySchema.methods.incrementDownloads = function() {
    this.stats.downloads += 1;
    return this.save();
};

// إضافة تقييم
gallerySchema.methods.addRating = async function(userId, rating, comment = '') {
    // التحقق من إذا كان المستخدم قد قيم من قبل
    const existingRating = this.ratings.find(r => r.user.toString() === userId.toString());
    
    if (existingRating) {
        // تحديث التقييم الموجود
        existingRating.rating = rating;
        existingRating.comment = comment;
        existingRating.createdAt = new Date();
    } else {
        // إضافة تقييم جديد
        this.ratings.push({
            user: userId,
            rating: rating,
            comment: comment
        });
    }
    
    // تحديث متوسط التقييم
    this.updateAverageRating();
    
    return await this.save();
};

// التحقق من إمكانية الوصول
gallerySchema.methods.canAccess = function(user) {
    if (this.status === 'hidden') return false;
    if (this.visibility === 'public') return true;
    if (!user) return false;
    if (this.author.toString() === user._id.toString()) return true;
    return this.visibility === 'link-only';
};

// ===== التوابع الثابتة =====

// البحث في المعرض
gallerySchema.statics.search = function(query, options = {}) {
    const { page = 1, limit = 20, category, author, minRating } = options;
    const skip = (page - 1) * limit;
    
    const searchQuery = {
        status: 'published',
        visibility: 'public',
        $or: [
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { tags: { $in: [new RegExp(query, 'i')] } }
        ]
    };
    
    if (category) searchQuery.category = category;
    if (author) searchQuery.author = author;
    if (minRating) searchQuery.averageRating = { $gte: minRating };
    
    return this.find(searchQuery)
        .populate('author', 'username fullName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// إحصائيات المعرض
gallerySchema.statics.getGalleryStats = function(authorId = null) {
    const matchStage = { status: 'published' };
    if (authorId) matchStage.author = authorId;
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalItems: { $sum: 1 },
                totalViews: { $sum: '$stats.views' },
                totalLikes: { $sum: '$stats.likes' },
                totalDownloads: { $sum: '$stats.downloads' },
                byCategory: {
                    $push: {
                        category: '$category',
                        count: 1
                    }
                },
                byMediaType: {
                    $push: {
                        mediaType: '$mediaType',
                        count: 1
                    }
                }
            }
        },
        {
            $project: {
                totalItems: 1,
                totalViews: 1,
                totalLikes: 1,
                totalDownloads: 1,
                categories: {
                    $arrayToObject: {
                        $map: {
                            input: '$byCategory',
                            as: 'cat',
                            in: {
                                k: '$$cat.category',
                                v: '$$cat.count'
                            }
                        }
                    }
                },
                mediaTypes: {
                    $arrayToObject: {
                        $map: {
                            input: '$byMediaType',
                            as: 'media',
                            in: {
                                k: '$$media.mediaType',
                                v: '$$media.count'
                            }
                        }
                    }
                }
            }
        }
    ]);
};

module.exports = mongoose.model('Gallery', gallerySchema);
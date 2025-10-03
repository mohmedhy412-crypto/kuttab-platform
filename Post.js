// ===== نموذج المنشورات الاجتماعية =====

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    // المحتوى
    content: {
        type: String,
        required: [true, 'محتوى المنشور مطلوب'],
        trim: true,
        maxlength: [5000, 'المحتوى يجب أن لا يتجاوز 5000 حرف'],
        validate: {
            validator: function(content) {
                return content && content.trim().length > 0;
            },
            message: 'المحتوى لا يمكن أن يكون فارغاً'
        }
    },

    // المؤلف
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // الوسائط
    images: [{
        url: String,
        caption: String,
        order: Number
    }],
    
    attachments: [{
        name: String,
        url: String,
        type: String,
        size: Number
    }],

    // الاستفتاء المرتبط
    poll: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Poll',
        default: null
    },
    
    hasPoll: {
        type: Boolean,
        default: false
    },

    // التصنيف
    category: {
        type: String,
        enum: [
            'general',      // عام
            'writing',      // كتابة
            'question',     // سؤال
            'announcement', // إعلان
            'achievement',  // إنجاز
            'inspiration',  // إلهام
            'discussion'    // نقاش
        ],
        default: 'general'
    },
    
    tags: [{
        type: String,
        trim: true,
        maxlength: [30, 'الوسم يجب أن لا يتجاوز 30 حرف']
    }],

    // الإحصائيات
    stats: {
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        views: { type: Number, default: 0 }
    },

    // التفاعل
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    shares: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        sharedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // الحالة
    status: {
        type: String,
        enum: ['active', 'hidden', 'deleted', 'reported'],
        default: 'active'
    },
    
    visibility: {
        type: String,
        enum: ['public', 'private', 'friends'],
        default: 'public'
    },

    // المراجع
    referencedWriting: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Writing'
    },
    
    referencedGallery: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gallery'
    },

    // البيانات الوصفية
    metadata: {
        edited: {
            type: Boolean,
            default: false
        },
        editHistory: [{
            content: String,
            editedAt: {
                type: Date,
                default: Date.now
            },
            reason: String
        }],
        location: {
            type: String,
            default: ''
        },
        aiGenerated: {
            type: Boolean,
            default: false
        }
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ===== الفهارس =====

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ category: 1, status: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ 'stats.likes': -1 });
postSchema.index({ 'stats.comments': -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ poll: 1 });

// ===== Virtuals =====

// الحصول على المؤلف
postSchema.virtual('authorInfo', {
    ref: 'User',
    localField: 'author',
    foreignField: '_id',
    justOne: true
});

// الحصول على التعليقات
postSchema.virtual('comments', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'post'
});

// الحصول على الاستفتاء
postSchema.virtual('pollInfo', {
    ref: 'Poll',
    localField: 'poll',
    foreignField: '_id',
    justOne: true
});

// ===== Middleware =====

// تحديث إحصائيات التعليقات
postSchema.pre('save', function(next) {
    this.updateCommentStats();
    next();
});

// ===== التوابع =====

// تحديث إحصائيات التعليقات
postSchema.methods.updateCommentStats = async function() {
    const Comment = mongoose.model('Comment');
    const commentCount = await Comment.countDocuments({ 
        post: this._id, 
        status: 'active' 
    });
    
    this.stats.comments = commentCount;
    return this;
};

// زيادة عدد المشاهدات
postSchema.methods.incrementViews = function() {
    this.stats.views += 1;
    return this.save();
};

// الإعجاب بالمنشور
postSchema.methods.like = async function(userId) {
    const userIndex = this.likes.indexOf(userId);
    
    if (userIndex === -1) {
        // إضافة إعجاب
        this.likes.push(userId);
        this.stats.likes += 1;
    } else {
        // إزالة إعجاب
        this.likes.splice(userIndex, 1);
        this.stats.likes -= 1;
    }
    
    return await this.save();
};

// التحقق من إذا كان المستخدم معجباً
postSchema.methods.isLikedBy = function(userId) {
    return this.likes.includes(userId);
};

// مشاركة المنشور
postSchema.methods.share = async function(userId) {
    this.shares.push({
        user: userId
    });
    
    this.stats.shares += 1;
    return await this.save();
};

// تعديل المنشور
postSchema.methods.edit = async function(newContent, reason = '') {
    // حفظ النسخة القديمة في السجل
    this.metadata.editHistory.push({
        content: this.content,
        reason: reason
    });
    
    // تحديث المحتوى
    this.content = newContent;
    this.metadata.edited = true;
    
    return await this.save();
};

// إضافة صورة
postSchema.methods.addImage = async function(imageUrl, caption = '') {
    this.images.push({
        url: imageUrl,
        caption: caption,
        order: this.images.length
    });
    
    return await this.save();
};

// التحقق من إمكانية الوصول
postSchema.methods.canAccess = function(user) {
    if (this.status !== 'active') return false;
    if (this.visibility === 'public') return true;
    if (!user) return false;
    if (this.author.toString() === user._id.toString()) return true;
    if (this.visibility === 'friends') {
        // يمكن إضافة منطق الأصدقاء هنا
        return false;
    }
    return false;
};

// ===== التوابع الثابتة =====

// البحث في المنشورات
postSchema.statics.search = function(query, options = {}) {
    const { page = 1, limit = 20, category, author, hasImages } = options;
    const skip = (page - 1) * limit;
    
    const searchQuery = {
        status: 'active',
        visibility: 'public',
        $or: [
            { content: { $regex: query, $options: 'i' } },
            { tags: { $in: [new RegExp(query, 'i')] } }
        ]
    };
    
    if (category) searchQuery.category = category;
    if (author) searchQuery.author = author;
    if (hasImages) searchQuery.images = { $exists: true, $ne: [] };
    
    return this.find(searchQuery)
        .populate('author', 'username fullName avatar')
        .populate('pollInfo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// الحصول على المنشورات الشائعة
postSchema.statics.getPopularPosts = function(days = 7, limit = 10) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    return this.find({
        status: 'active',
        visibility: 'public',
        createdAt: { $gte: date }
    })
    .populate('author', 'username fullName avatar')
    .sort({ 'stats.likes': -1, 'stats.comments': -1 })
    .limit(limit);
};

// إحصائيات المنشورات
postSchema.statics.getPostStats = function(authorId = null) {
    const matchStage = { status: 'active' };
    if (authorId) matchStage.author = authorId;
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalPosts: { $sum: 1 },
                totalLikes: { $sum: '$stats.likes' },
                totalComments: { $sum: '$stats.comments' },
                totalShares: { $sum: '$stats.shares' },
                byCategory: {
                    $push: {
                        category: '$category',
                        count: 1
                    }
                }
            }
        },
        {
            $project: {
                totalPosts: 1,
                totalLikes: 1,
                totalComments: 1,
                totalShares: 1,
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
                }
            }
        }
    ]);
};

module.exports = mongoose.model('Post', postSchema);
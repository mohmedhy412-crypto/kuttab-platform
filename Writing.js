// ===== نموذج الكتابات =====

const mongoose = require('mongoose');

const writingSchema = new mongoose.Schema({
    // المعلومات الأساسية
    title: {
        type: String,
        required: [true, 'عنوان العمل مطلوب'],
        trim: true,
        maxlength: [200, 'العنوان يجب أن لا يتجاوز 200 حرف']
    },
    
    content: {
        type: String,
        required: [true, 'محتوى العمل مطلوب'],
        validate: {
            validator: function(content) {
                return content && content.trim().length > 0;
            },
            message: 'المحتوى لا يمكن أن يكون فارغاً'
        }
    },
    
    excerpt: {
        type: String,
        maxlength: [500, 'الملخص يجب أن لا يتجاوز 500 حرف']
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
            'story',      // قصة
            'poem',       // شعر
            'article',    // مقال
            'novel',      // رواية
            'research',   // بحث
            'script',     // سيناريو
            'other'       // أخرى
        ],
        default: 'other'
    },
    
    tags: [{
        type: String,
        trim: true,
        maxlength: [30, 'الوسم يجب أن لا يتجاوز 30 حرف']
    }],
    
    language: {
        type: String,
        enum: ['ar', 'en'],
        default: 'ar'
    },

    // الحالة والرؤية
    status: {
        type: String,
        enum: ['draft', 'published', 'archived', 'deleted'],
        default: 'draft'
    },
    
    visibility: {
        type: String,
        enum: ['public', 'private', 'link-only', 'friends'],
        default: 'private'
    },

    // الإحصائيات
    stats: {
        wordCount: { type: Number, default: 0 },
        charCount: { type: Number, default: 0 },
        readingTime: { type: Number, default: 0 }, // بالدقائق
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        originalityScore: { type: Number, default: 0 }
    },

    // البيانات الوصفية
    metadata: {
        coverImage: String,
        attachments: [{
            name: String,
            url: String,
            type: String,
            size: Number
        }],
        lastEdited: {
            type: Date,
            default: Date.now
        },
        version: { 
            type: Number, 
            default: 1 
        },
        aiAssisted: {
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
                'all-rights',     // جميع الحقوق محفوظة
                'cc-by',          // Creative Commons Attribution
                'cc-by-sa',       // Creative Commons Attribution-ShareAlike
                'cc-by-nc',       // Creative Commons Attribution-NonCommercial
                'public-domain'   // ملكية عامة
            ],
            default: 'all-rights'
        },
        publishedDate: Date,
        isbn: String
    },

    // المراجعة والتقييم
    review: {
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: 0
        },
        feedback: [{
            reviewer: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            comment: String,
            rating: Number,
            createdAt: {
                type: Date,
                default: Date.now
            }
        }]
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ===== الفهارس =====

writingSchema.index({ author: 1, createdAt: -1 });
writingSchema.index({ category: 1, status: 1 });
writingSchema.index({ tags: 1 });
writingSchema.index({ status: 1, visibility: 1 });
writingSchema.index({ 'stats.views': -1 });
writingSchema.index({ 'stats.likes': -1 });
writingSchema.index({ createdAt: -1 });

// ===== Virtuals =====

// الحصول على المؤلف
writingSchema.virtual('authorInfo', {
    ref: 'User',
    localField: 'author',
    foreignField: '_id',
    justOne: true
});

// الحصول على التعليقات
writingSchema.virtual('comments', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'writing'
});

// ===== Middleware =====

// حساب الإحصائيات قبل الحفظ
writingSchema.pre('save', function(next) {
    this.calculateStats();
    this.updateExcerpt();
    next();
});

// تحديث lastEdited قبل التحديث
writingSchema.pre('findOneAndUpdate', function(next) {
    this.set({ 'metadata.lastEdited': new Date() });
    next();
});

// ===== التوابع =====

// حساب الإحصائيات
writingSchema.methods.calculateStats = function() {
    const words = this.content.split(/\s+/).filter(word => word.length > 0);
    
    this.stats.wordCount = words.length;
    this.stats.charCount = this.content.length;
    this.stats.readingTime = Math.ceil(words.length / 200); // 200 كلمة في الدقيقة
    
    return this;
};

// تحديث الملخص
writingSchema.methods.updateExcerpt = function() {
    if (!this.excerpt && this.content) {
        this.excerpt = this.content.substring(0, 150).trim() + '...';
    }
    return this;
};

// زيادة عدد المشاهدات
writingSchema.methods.incrementViews = function() {
    this.stats.views += 1;
    return this.save();
};

// زيادة الإعجابات
writingSchema.methods.incrementLikes = function() {
    this.stats.likes += 1;
    return this.save();
};

// زيادة المشاركات
writingSchema.methods.incrementShares = function() {
    this.stats.shares += 1;
    return this.save();
};

// التحقق من إمكانية الوصول
writingSchema.methods.canAccess = function(user) {
    if (this.status === 'deleted') return false;
    if (this.visibility === 'public') return true;
    if (!user) return false;
    if (this.author.toString() === user._id.toString()) return true;
    if (this.visibility === 'friends') {
        // يمكن إضافة منطق الأصدقاء هنا
        return false;
    }
    return this.visibility === 'link-only';
};

// إنشاء نسخة جديدة
writingSchema.methods.createNewVersion = async function(newContent) {
    const Writing = mongoose.model('Writing');
    
    const newWriting = new Writing({
        title: this.title + ` (نسخة ${this.metadata.version + 1})`,
        content: newContent,
        author: this.author,
        category: this.category,
        tags: this.tags,
        metadata: {
            version: this.metadata.version + 1,
            parentVersion: this._id
        }
    });
    
    return await newWriting.save();
};

// ===== التوابع الثابتة =====

// البحث في النصوص
writingSchema.statics.search = function(query, options = {}) {
    const { page = 1, limit = 20, category, author, language } = options;
    const skip = (page - 1) * limit;
    
    const searchQuery = {
        status: { $ne: 'deleted' },
        visibility: 'public',
        $or: [
            { title: { $regex: query, $options: 'i' } },
            { content: { $regex: query, $options: 'i' } },
            { tags: { $in: [new RegExp(query, 'i')] } }
        ]
    };
    
    if (category) searchQuery.category = category;
    if (author) searchQuery.author = author;
    if (language) searchQuery.language = language;
    
    return this.find(searchQuery)
        .populate('author', 'username fullName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// إحصائيات الكتابات
writingSchema.statics.getWritingStats = function(authorId = null) {
    const matchStage = { status: { $ne: 'deleted' } };
    if (authorId) matchStage.author = authorId;
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalWritings: { $sum: 1 },
                totalWords: { $sum: '$stats.wordCount' },
                totalViews: { $sum: '$stats.views' },
                totalLikes: { $sum: '$stats.likes' },
                byCategory: {
                    $push: {
                        category: '$category',
                        count: 1,
                        words: '$stats.wordCount'
                    }
                },
                byStatus: {
                    $push: {
                        status: '$status',
                        count: 1
                    }
                }
            }
        },
        {
            $project: {
                totalWritings: 1,
                totalWords: 1,
                totalViews: 1,
                totalLikes: 1,
                categories: {
                    $arrayToObject: {
                        $map: {
                            input: '$byCategory',
                            as: 'cat',
                            in: {
                                k: '$$cat.category',
                                v: {
                                    count: '$$cat.count',
                                    words: '$$cat.words'
                                }
                            }
                        }
                    }
                },
                statuses: {
                    $arrayToObject: {
                        $map: {
                            input: '$byStatus',
                            as: 'stat',
                            in: {
                                k: '$$stat.status',
                                v: '$$stat.count'
                            }
                        }
                    }
                }
            }
        }
    ]);
};

module.exports = mongoose.model('Writing', writingSchema);
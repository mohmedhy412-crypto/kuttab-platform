// ===== نموذج البلاغات =====

const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    // المحتوى المُبلغ عنه
    contentId: {
        type: String,
        required: [true, 'معرف المحتوى مطلوب']
    },
    
    contentType: {
        type: String,
        enum: ['post', 'comment', 'user', 'writing', 'gallery', 'poll'],
        required: [true, 'نوع المحتوى مطلوب']
    },

    // المُبلغ
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // السبب
    reason: {
        type: String,
        required: [true, 'سبب الإبلاغ مطلوب'],
        trim: true,
        maxlength: [1000, 'سبب الإبلاغ يجب أن لا يتجاوز 1000 حرف']
    },
    
    category: {
        type: String,
        enum: [
            'spam',             // رسائل مزعجة
            'harassment',       // تحرش
            'hate_speech',      // خطاب كراهية
            'inappropriate',    // محتوى غير لائق
            'copyright',        // انتهاك حقوق النشر
            'impersonation',    // انتحال شخصية
            'false_info',       // معلومات خاطئة
            'other'             // أخرى
        ],
        required: [true, 'فئة الإبلاغ مطلوبة']
    },

    // الحالة
    status: {
        type: String,
        enum: ['pending', 'under_review', 'resolved', 'dismissed'],
        default: 'pending'
    },

    // المراجع الإضافية
    evidence: [{
        type: String, // روابط أو شروحات إضافية
        description: String
    }],
    
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },

    // المعالجة
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    
    resolution: {
        action: {
            type: String,
            enum: [
                'no_action',        // لا إجراء
                'warning',          // تحذير
                'content_removed',  // إزالة المحتوى
                'user_suspended',   // تعليق المستخدم
                'user_banned',      // حظر المستخدم
                'content_edited'    // تعديل المحتوى
            ],
            default: null
        },
        notes: {
            type: String,
            maxlength: [2000, 'ملاحظات القرار يجب أن لا تتجاوز 2000 حرف']
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        resolvedAt: {
            type: Date,
            default: null
        }
    },

    // الإحصائيات
    stats: {
        similarReports: { type: Number, default: 0 }, // عدد البلاغات المشابهة
        reviewTime: { type: Number, default: 0 } // وقت المراجعة بالدقائق
    },

    // البيانات الوصفية
    metadata: {
        ipAddress: String,
        userAgent: String,
        location: String
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ===== الفهارس =====

reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ contentType: 1, contentId: 1 });
reportSchema.index({ status: 1, priority: 1 });
reportSchema.index({ category: 1 });
reportSchema.index({ assignedTo: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ 'resolution.resolvedAt': -1 });

// ===== Virtuals =====

// الحصول على المُبلغ
reportSchema.virtual('reporterInfo', {
    ref: 'User',
    localField: 'reporter',
    foreignField: '_id',
    justOne: true
});

// الحصول على المُعامل
reportSchema.virtual('assigneeInfo', {
    ref: 'User',
    localField: 'assignedTo',
    foreignField: '_id',
    justOne: true
});

// الحصول على المحتوى المُبلغ عنه
reportSchema.virtual('reportedContent', {
    ref: function() {
        // إرجاع النموذج المناسب بناءً على نوع المحتوى
        switch (this.contentType) {
            case 'post': return 'Post';
            case 'comment': return 'Comment';
            case 'user': return 'User';
            case 'writing': return 'Writing';
            case 'gallery': return 'Gallery';
            case 'poll': return 'Poll';
            default: return null;
        }
    },
    localField: 'contentId',
    foreignField: '_id',
    justOne: true
});

// ===== Middleware =====

// تحديث إحصائيات البلاغات المشابهة قبل الحفظ
reportSchema.pre('save', async function(next) {
    if (this.isNew) {
        await this.updateSimilarReports();
    }
    next();
});

// ===== التوابع =====

// تحديث إحصائيات البلاغات المشابهة
reportSchema.methods.updateSimilarReports = async function() {
    const similarCount = await this.constructor.countDocuments({
        contentType: this.contentType,
        contentId: this.contentId,
        status: { $in: ['pending', 'under_review'] }
    });
    
    this.stats.similarReports = similarCount;
    
    // تحديث الأولوية بناءً على عدد البلاغات المشابهة
    if (similarCount >= 5) {
        this.priority = 'critical';
    } else if (similarCount >= 3) {
        this.priority = 'high';
    } else if (similarCount >= 1) {
        this.priority = 'medium';
    } else {
        this.priority = 'low';
    }
};

// تعيين البلاغ لمشرف
reportSchema.methods.assign = async function(adminId) {
    this.assignedTo = adminId;
    this.status = 'under_review';
    
    return await this.save();
};

// حل البلاغ
reportSchema.methods.resolve = async function(action, notes, resolvedBy) {
    this.status = 'resolved';
    this.resolution = {
        action: action,
        notes: notes,
        resolvedBy: resolvedBy,
        resolvedAt: new Date()
    };
    
    // حساب وقت المراجعة
    const reviewTime = Math.round((new Date() - this.createdAt) / (1000 * 60)); // بالدقائق
    this.stats.reviewTime = reviewTime;
    
    return await this.save();
};

// رفض البلاغ
reportSchema.methods.dismiss = async function(notes, resolvedBy) {
    this.status = 'dismissed';
    this.resolution = {
        action: 'no_action',
        notes: notes,
        resolvedBy: resolvedBy,
        resolvedAt: new Date()
    };
    
    return await this.save();
};

// إعادة فتح البلاغ
reportSchema.methods.reopen = async function() {
    this.status = 'pending';
    this.assignedTo = null;
    this.resolution = {};
    
    return await this.save();
};

// إضافة دليل إضافي
reportSchema.methods.addEvidence = async function(evidenceUrl, description = '') {
    this.evidence.push({
        type: evidenceUrl,
        description: description
    });
    
    return await this.save();
};

// التحقق من إذا كان البلاغ مفتوحاً
reportSchema.methods.isOpen = function() {
    return this.status === 'pending' || this.status === 'under_review';
};

// ===== التوابع الثابتة =====

// البحث في البلاغات
reportSchema.statics.search = function(query, options = {}) {
    const { page = 1, limit = 20, status, category, priority } = options;
    const skip = (page - 1) * limit;
    
    const searchQuery = {
        $or: [
            { reason: { $regex: query, $options: 'i' } },
            { 'resolution.notes': { $regex: query, $options: 'i' } }
        ]
    };
    
    if (status) searchQuery.status = status;
    if (category) searchQuery.category = category;
    if (priority) searchQuery.priority = priority;
    
    return this.find(searchQuery)
        .populate('reporterInfo', 'username fullName avatar')
        .populate('assigneeInfo', 'username fullName')
        .populate('resolution.resolvedBy', 'username fullName')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// إحصائيات البلاغات
reportSchema.statics.getReportStats = function(days = 30) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    return this.aggregate([
        {
            $match: {
                createdAt: { $gte: date }
            }
        },
        {
            $group: {
                _id: null,
                totalReports: { $sum: 1 },
                pendingReports: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                underReviewReports: {
                    $sum: { $cond: [{ $eq: ['$status', 'under_review'] }, 1, 0] }
                },
                resolvedReports: {
                    $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
                },
                byCategory: {
                    $push: {
                        category: '$category',
                        count: 1
                    }
                },
                byContentType: {
                    $push: {
                        contentType: '$contentType',
                        count: 1
                    }
                },
                byPriority: {
                    $push: {
                        priority: '$priority',
                        count: 1
                    }
                },
                avgReviewTime: { $avg: '$stats.reviewTime' }
            }
        },
        {
            $project: {
                totalReports: 1,
                pendingReports: 1,
                underReviewReports: 1,
                resolvedReports: 1,
                avgReviewTime: { $round: ['$avgReviewTime', 2] },
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
                contentTypes: {
                    $arrayToObject: {
                        $map: {
                            input: '$byContentType',
                            as: 'type',
                            in: {
                                k: '$$type.contentType',
                                v: '$$type.count'
                            }
                        }
                    }
                },
                priorities: {
                    $arrayToObject: {
                        $map: {
                            input: '$byPriority',
                            as: 'pri',
                            in: {
                                k: '$$pri.priority',
                                v: '$$pri.count'
                            }
                        }
                    }
                }
            }
        }
    ]);
};

// الحصول على البلاغات الحرجة
reportSchema.statics.getCriticalReports = function(limit = 10) {
    return this.find({
        status: { $in: ['pending', 'under_review'] },
        priority: { $in: ['high', 'critical'] }
    })
    .populate('reporterInfo', 'username fullName avatar')
    .populate('assigneeInfo', 'username fullName')
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit);
};

module.exports = mongoose.model('Report', reportSchema);
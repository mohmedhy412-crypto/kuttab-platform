// ===== نموذج الاستفتاءات =====

const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
    // السؤال
    question: {
        type: String,
        required: [true, 'سؤال الاستفتاء مطلوب'],
        trim: true,
        maxlength: [500, 'السؤال يجب أن لا يتجاوز 500 حرف']
    },

    // الخيارات
    options: [{
        text: {
            type: String,
            required: true,
            trim: true,
            maxlength: [200, 'نص الخيار يجب أن لا يتجاوز 200 حرف']
        },
        votes: {
            type: Number,
            default: 0
        },
        voters: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    }],

    // المؤلف
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // المنشور المرتبط
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },

    // الإعدادات
    settings: {
        multipleChoice: {
            type: Boolean,
            default: false
        },
        showResults: {
            type: Boolean,
            default: true
        },
        allowAddingOptions: {
            type: Boolean,
            default: false
        },
        endDate: {
            type: Date,
            default: null
        },
        maxVotes: {
            type: Number,
            default: 1
        }
    },

    // الإحصائيات
    stats: {
        totalVotes: { type: Number, default: 0 },
        uniqueVoters: { type: Number, default: 0 },
        views: { type: Number, default: 0 }
    },

    // الحالة
    status: {
        type: String,
        enum: ['active', 'closed', 'archived'],
        default: 'active'
    },

    // الفئة
    category: {
        type: String,
        enum: [
            'general',
            'writing',
            'books',
            'community',
            'entertainment',
            'technology'
        ],
        default: 'general'
    },

    // الوسوم
    tags: [{
        type: String,
        trim: true,
        maxlength: [30, 'الوسم يجب أن لا يتجاوز 30 حرف']
    }]

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ===== الفهارس =====

pollSchema.index({ author: 1, createdAt: -1 });
pollSchema.index({ post: 1 });
pollSchema.index({ status: 1 });
pollSchema.index({ 'settings.endDate': 1 });
pollSchema.index({ 'stats.totalVotes': -1 });

// ===== Virtuals =====

// الحصول على المؤلف
pollSchema.virtual('authorInfo', {
    ref: 'User',
    localField: 'author',
    foreignField: '_id',
    justOne: true
});

// الحصول على المنشور
pollSchema.virtual('postInfo', {
    ref: 'Post',
    localField: 'post',
    foreignField: '_id',
    justOne: true
});

// التحقق من إذا كان الاستفتاء منتهياً
pollSchema.virtual('isExpired').get(function() {
    if (!this.settings.endDate) return false;
    return new Date() > this.settings.endDate;
});

// التحقق من إذا كان الاستفتاء نشطاً
pollSchema.virtual('isActive').get(function() {
    return this.status === 'active' && !this.isExpired;
});

// ===== Middleware =====

// تحديث إحصائيات المصوتين قبل الحفظ
pollSchema.pre('save', function(next) {
    this.updateVoterStats();
    next();
});

// ===== التوابع =====

// تحديث إحصائيات المصوتين
pollSchema.methods.updateVoterStats = function() {
    const allVoters = new Set();
    
    this.options.forEach(option => {
        option.voters.forEach(voter => {
            allVoters.add(voter.toString());
        });
    });
    
    this.stats.uniqueVoters = allVoters.size;
    this.stats.totalVotes = this.options.reduce((total, option) => total + option.votes, 0);
};

// التصويت في الاستفتاء
pollSchema.methods.vote = async function(userId, optionIndexes) {
    // التحقق من إذا كان الاستفتاء نشطاً
    if (!this.isActive) {
        throw new Error('الاستفتاء غير نشط أو منتهي');
    }

    // التأكد من أن optionIndexes مصفوفة
    const indexes = Array.isArray(optionIndexes) ? optionIndexes : [optionIndexes];
    
    // التحقق من إذا كان التصويت متعدد الخيارات مسموحاً
    if (!this.settings.multipleChoice && indexes.length > 1) {
        throw new Error('التصويت متعدد الخيارات غير مسموح في هذا الاستفتاء');
    }
    
    // التحقق من عدد الأصوات
    if (indexes.length > this.settings.maxVotes) {
        throw new Error(`يمكنك التصويت لـ ${this.settings.maxVotes} خيارات كحد أقصى`);
    }
    
    // التحقق من إذا كان المستخدم قد صوت مسبقاً
    const hasVoted = this.options.some(option => 
        option.voters.some(voter => voter.toString() === userId.toString())
    );
    
    if (hasVoted && !this.settings.multipleChoice) {
        throw new Error('لقد قمت بالتصويت مسبقاً في هذا الاستفتاء');
    }
    
    // إضافة الأصوات
    indexes.forEach(index => {
        if (index >= 0 && index < this.options.length) {
            // التحقق من إذا كان المستخدم قد صوت لهذا الخيار مسبقاً
            const alreadyVoted = this.options[index].voters.some(
                voter => voter.toString() === userId.toString()
            );
            
            if (!alreadyVoted) {
                this.options[index].votes += 1;
                this.options[index].voters.push(userId);
            }
        }
    });
    
    // تحديث الإحصائيات
    this.updateVoterStats();
    
    return await this.save();
};

// إضافة خيار جديد
pollSchema.methods.addOption = async function(optionText, userId = null) {
    if (!this.settings.allowAddingOptions && userId && userId.toString() !== this.author.toString()) {
        throw new Error('لا يمكن إضافة خيارات جديدة لهذا الاستفتاء');
    }
    
    this.options.push({
        text: optionText,
        votes: 0,
        voters: []
    });
    
    return await this.save();
};

// إغلاق الاستفتاء
pollSchema.methods.close = async function() {
    this.status = 'closed';
    return await this.save();
};

// إعادة فتح الاستفتاء
pollSchema.methods.reopen = async function() {
    this.status = 'active';
    return await this.save();
};

// زيادة عدد المشاهدات
pollSchema.methods.incrementViews = function() {
    this.stats.views += 1;
    return this.save();
};

// الحصول على نتائج الاستفتاء
pollSchema.methods.getResults = function() {
    const totalVotes = this.stats.totalVotes;
    
    return this.options.map(option => ({
        text: option.text,
        votes: option.votes,
        percentage: totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0,
        voters: option.voters.length
    }));
};

// التحقق من إذا كان المستخدم قد صوت
pollSchema.methods.hasUserVoted = function(userId) {
    return this.options.some(option => 
        option.voters.some(voter => voter.toString() === userId.toString())
    );
};

// الحصول على خيارات المستخدم
pollSchema.methods.getUserVotes = function(userId) {
    const userVotes = [];
    
    this.options.forEach((option, index) => {
        if (option.voters.some(voter => voter.toString() === userId.toString())) {
            userVotes.push(index);
        }
    });
    
    return userVotes;
};

// ===== التوابع الثابتة =====

// البحث في الاستفتاءات
pollSchema.statics.search = function(query, options = {}) {
    const { page = 1, limit = 20, category, author, status } = options;
    const skip = (page - 1) * limit;
    
    const searchQuery = {
        $or: [
            { question: { $regex: query, $options: 'i' } },
            { tags: { $in: [new RegExp(query, 'i')] } }
        ]
    };
    
    if (category) searchQuery.category = category;
    if (author) searchQuery.author = author;
    if (status) searchQuery.status = status;
    
    return this.find(searchQuery)
        .populate('author', 'username fullName avatar')
        .populate('postInfo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// الحصول على الاستفتاءات النشطة
pollSchema.statics.getActivePolls = function(limit = 10) {
    return this.find({
        status: 'active',
        $or: [
            { 'settings.endDate': null },
            { 'settings.endDate': { $gt: new Date() } }
        ]
    })
    .populate('author', 'username fullName avatar')
    .populate('postInfo')
    .sort({ 'stats.totalVotes': -1, createdAt: -1 })
    .limit(limit);
};

// إحصائيات الاستفتاءات
pollSchema.statics.getPollStats = function(authorId = null) {
    const matchStage = {};
    if (authorId) matchStage.author = authorId;
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalPolls: { $sum: 1 },
                totalVotes: { $sum: '$stats.totalVotes' },
                totalVoters: { $sum: '$stats.uniqueVoters' },
                byStatus: {
                    $push: {
                        status: '$status',
                        count: 1
                    }
                },
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
                totalPolls: 1,
                totalVotes: 1,
                totalVoters: 1,
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
                },
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

module.exports = mongoose.model('Poll', pollSchema);
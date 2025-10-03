// ===== مسارات إدارة الكتابات =====

const express = require('express');
const Writing = require('../models/Writing');
const { auth, ownerAuth } = require('../middleware/auth');

const router = express.Router();

// الحصول على جميع كتابات المستخدم
router.get('/my-writings', auth, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, category } = req.query;
        const skip = (page - 1) * limit;

        const filter = { author: req.user._id };
        
        if (status) filter.status = status;
        if (category) filter.category = category;

        const writings = await Writing.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Writing.countDocuments(filter);

        res.json({
            success: true,
            writings,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get my writings error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب الكتابات'
        });
    }
});

// إنشاء كتابة جديدة
router.post('/', auth, async (req, res) => {
    try {
        const { title, content, category, tags, visibility } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: 'العنوان والمحتوى مطلوبان'
            });
        }

        const writing = new Writing({
            title,
            content,
            category: category || 'other',
            tags: tags || [],
            visibility: visibility || 'private',
            author: req.user._id
        });

        await writing.save();

        // تحديث إحصائيات المستخدم
        await req.user.updateStats('writingsCount', 1);
        await req.user.updateStats('totalWords', writing.stats.wordCount);

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الكتابة بنجاح',
            writing
        });

    } catch (error) {
        console.error('Create writing error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إنشاء الكتابة',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// الحصول على كتابة محددة
router.get('/:id', async (req, res) => {
    try {
        const writing = await Writing.findById(req.params.id)
            .populate('author', 'username fullName avatar');

        if (!writing) {
            return res.status(404).json({
                success: false,
                message: 'الكتابة غير موجودة'
            });
        }

        // التحقق من إمكانية الوصول
        if (!writing.canAccess(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول إلى هذه الكتابة'
            });
        }

        // زيادة عدد المشاهدات
        await writing.incrementViews();

        res.json({
            success: true,
            writing
        });

    } catch (error) {
        console.error('Get writing error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب الكتابة'
        });
    }
});

// تحديث كتابة
router.put('/:id', auth, ownerAuth, async (req, res) => {
    try {
        const { title, content, category, tags, status, visibility } = req.body;
        const updates = {};

        if (title) updates.title = title;
        if (content) updates.content = content;
        if (category) updates.category = category;
        if (tags) updates.tags = tags;
        if (status) updates.status = status;
        if (visibility) updates.visibility = visibility;

        const writing = await Writing.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!writing) {
            return res.status(404).json({
                success: false,
                message: 'الكتابة غير موجودة'
            });
        }

        // إعادة حساب الإحصائيات
        writing.calculateStats();
        await writing.save();

        res.json({
            success: true,
            message: 'تم تحديث الكتابة بنجاح',
            writing
        });

    } catch (error) {
        console.error('Update writing error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تحديث الكتابة',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// حذف كتابة
router.delete('/:id', auth, ownerAuth, async (req, res) => {
    try {
        const writing = await Writing.findByIdAndUpdate(
            req.params.id,
            { status: 'deleted' },
            { new: true }
        );

        if (!writing) {
            return res.status(404).json({
                success: false,
                message: 'الكتابة غير موجودة'
            });
        }

        res.json({
            success: true,
            message: 'تم حذف الكتابة بنجاح'
        });

    } catch (error) {
        console.error('Delete writing error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء حذف الكتابة'
        });
    }
});

// البحث في الكتابات
router.get('/', async (req, res) => {
    try {
        const { q, page = 1, limit = 20, category, author } = req.query;
        const skip = (page - 1) * limit;

        const filter = {
            status: { $ne: 'deleted' },
            visibility: 'public'
        };

        if (q) {
            filter.$or = [
                { title: { $regex: q, $options: 'i' } },
                { content: { $regex: q, $options: 'i' } },
                { tags: { $in: [new RegExp(q, 'i')] } }
            ];
        }

        if (category) filter.category = category;
        if (author) filter.author = author;

        const writings = await Writing.find(filter)
            .populate('author', 'username fullName avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Writing.countDocuments(filter);

        res.json({
            success: true,
            writings,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Search writings error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء البحث في الكتابات'
        });
    }
});

// الإعجاب بالكتابة
router.post('/:id/like', auth, async (req, res) => {
    try {
        const writing = await Writing.findById(req.params.id);

        if (!writing) {
            return res.status(404).json({
                success: false,
                message: 'الكتابة غير موجودة'
            });
        }

        // التحقق من إمكانية الوصول
        if (!writing.canAccess(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول إلى هذه الكتابة'
            });
        }

        await writing.incrementLikes();

        res.json({
            success: true,
            message: 'تم الإعجاب بالكتابة',
            likes: writing.stats.likes
        });

    } catch (error) {
        console.error('Like writing error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء الإعجاب بالكتابة'
        });
    }
});

// مشاركة الكتابة
router.post('/:id/share', auth, async (req, res) => {
    try {
        const writing = await Writing.findById(req.params.id);

        if (!writing) {
            return res.status(404).json({
                success: false,
                message: 'الكتابة غير موجودة'
            });
        }

        // التحقق من إمكانية الوصول
        if (!writing.canAccess(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول إلى هذه الكتابة'
            });
        }

        await writing.incrementShares();

        res.json({
            success: true,
            message: 'تم مشاركة الكتابة',
            shares: writing.stats.shares
        });

    } catch (error) {
        console.error('Share writing error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء مشاركة الكتابة'
        });
    }
});

module.exports = router;
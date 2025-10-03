// ===== مسارات معرض الأعمال =====

const express = require('express');
const Gallery = require('../models/Gallery');
const { auth, ownerAuth } = require('../middleware/auth');

const router = express.Router();

// الحصول على جميع أعمال المعرض
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, category, author } = req.query;
        const skip = (page - 1) * limit;

        const filter = {
            status: 'published',
            visibility: 'public'
        };

        if (category) filter.category = category;
        if (author) filter.author = author;

        const works = await Gallery.find(filter)
            .populate('author', 'username fullName avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Gallery.countDocuments(filter);

        res.json({
            success: true,
            works,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get gallery works error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب أعمال المعرض'
        });
    }
});

// الحصول على أعمال مستخدم معين
router.get('/user/:userId', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const filter = {
            author: req.params.userId,
            status: 'published'
        };

        // إذا كان المستخدم يطلب أعماله الخاصة، يظهر جميع الأعمال
        if (req.user && req.user._id.toString() === req.params.userId) {
            delete filter.status;
        }

        const works = await Gallery.find(filter)
            .populate('author', 'username fullName avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Gallery.countDocuments(filter);

        res.json({
            success: true,
            works,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get user gallery error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب أعمال المستخدم'
        });
    }
});

// إضافة عمل جديد للمعرض
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, image, category, tags } = req.body;

        if (!title || !image) {
            return res.status(400).json({
                success: false,
                message: 'العنوان والصورة مطلوبان'
            });
        }

        const work = new Gallery({
            title,
            description: description || '',
            image,
            category: category || 'artwork',
            tags: tags || [],
            author: req.user._id
        });

        await work.save();

        // تحديث إحصائيات المستخدم
        await req.user.updateStats('galleryItems', 1);

        res.status(201).json({
            success: true,
            message: 'تم إضافة العمل للمعرض بنجاح',
            work
        });

    } catch (error) {
        console.error('Add gallery work error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إضافة العمل للمعرض',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// الحصول على عمل محدد
router.get('/:id', async (req, res) => {
    try {
        const work = await Gallery.findById(req.params.id)
            .populate('author', 'username fullName avatar');

        if (!work) {
            return res.status(404).json({
                success: false,
                message: 'العمل غير موجود'
            });
        }

        // التحقق من إمكانية الوصول
        if (!work.canAccess(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول إلى هذا العمل'
            });
        }

        // زيادة عدد المشاهدات
        await work.incrementViews();

        res.json({
            success: true,
            work
        });

    } catch (error) {
        console.error('Get gallery work error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب العمل'
        });
    }
});

// تحديث عمل
router.put('/:id', auth, ownerAuth, async (req, res) => {
    try {
        const { title, description, category, tags, status, visibility } = req.body;
        const updates = {};

        if (title) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (category) updates.category = category;
        if (tags) updates.tags = tags;
        if (status) updates.status = status;
        if (visibility) updates.visibility = visibility;

        const work = await Gallery.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!work) {
            return res.status(404).json({
                success: false,
                message: 'العمل غير موجود'
            });
        }

        res.json({
            success: true,
            message: 'تم تحديث العمل بنجاح',
            work
        });

    } catch (error) {
        console.error('Update gallery work error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تحديث العمل',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// حذف عمل
router.delete('/:id', auth, ownerAuth, async (req, res) => {
    try {
        const work = await Gallery.findByIdAndUpdate(
            req.params.id,
            { status: 'hidden' },
            { new: true }
        );

        if (!work) {
            return res.status(404).json({
                success: false,
                message: 'العمل غير موجود'
            });
        }

        res.json({
            success: true,
            message: 'تم حذف العمل بنجاح'
        });

    } catch (error) {
        console.error('Delete gallery work error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء حذف العمل'
        });
    }
});

// الإعجاب بالعمل
router.post('/:id/like', auth, async (req, res) => {
    try {
        const work = await Gallery.findById(req.params.id);

        if (!work) {
            return res.status(404).json({
                success: false,
                message: 'العمل غير موجود'
            });
        }

        // التحقق من إمكانية الوصول
        if (!work.canAccess(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول إلى هذا العمل'
            });
        }

        await work.incrementLikes();

        res.json({
            success: true,
            message: 'تم الإعجاب بالعمل',
            likes: work.stats.likes
        });

    } catch (error) {
        console.error('Like gallery work error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء الإعجاب بالعمل'
        });
    }
});

// إضافة تقييم
router.post('/:id/rate', auth, async (req, res) => {
    try {
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'التقييم يجب أن يكون بين 1 و 5'
            });
        }

        const work = await Gallery.findById(req.params.id);

        if (!work) {
            return res.status(404).json({
                success: false,
                message: 'العمل غير موجود'
            });
        }

        // التحقق من إمكانية الوصول
        if (!work.canAccess(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول إلى هذا العمل'
            });
        }

        await work.addRating(req.user._id, rating, comment);

        res.json({
            success: true,
            message: 'تم إضافة التقييم بنجاح',
            averageRating: work.averageRating,
            ratingsCount: work.ratings.length
        });

    } catch (error) {
        console.error('Rate gallery work error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إضافة التقييم'
        });
    }
});

// البحث في المعرض
router.get('/search', async (req, res) => {
    try {
        const { q, page = 1, limit = 20, category, minRating } = req.query;
        const skip = (page - 1) * limit;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'بحث مطلوب'
            });
        }

        const works = await Gallery.search(q, {
            page: parseInt(page),
            limit: parseInt(limit),
            category,
            minRating: minRating ? parseFloat(minRating) : undefined
        });

        res.json({
            success: true,
            works
        });

    } catch (error) {
        console.error('Search gallery error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء البحث في المعرض'
        });
    }
});

module.exports = router;
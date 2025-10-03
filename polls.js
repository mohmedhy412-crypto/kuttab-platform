// ===== مسارات الاستفتاءات =====

const express = require('express');
const Poll = require('../models/Poll');
const Post = require('../models/Post');
const { auth } = require('../middleware/auth');

const router = express.Router();

// الحصول على الاستفتاءات
router.get('/', auth, async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const skip = (page - 1) * limit;

        const filter = {};

        if (status) filter.status = status;

        const polls = await Poll.find(filter)
            .populate('author', 'username fullName avatar')
            .populate('postInfo')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Poll.countDocuments(filter);

        res.json({
            success: true,
            polls,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get polls error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب الاستفتاءات'
        });
    }
});

// إنشاء استفتاء جديد
router.post('/', auth, async (req, res) => {
    try {
        const { question, options, settings, category, tags } = req.body;

        if (!question || !options || options.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'سؤال الاستفتاء وخيارين على الأقل مطلوبان'
            });
        }

        // إنشاء منشور للاستفتاء أولاً
        const post = new Post({
            content: question,
            author: req.user._id,
            category: 'question',
            hasPoll: true
        });

        await post.save();

        // إنشاء الاستفتاء
        const poll = new Poll({
            question,
            options: options.map(opt => ({ text: opt })),
            settings: settings || {},
            category: category || 'general',
            tags: tags || [],
            author: req.user._id,
            post: post._id
        });

        await poll.save();

        // ربط الاستفتاء بالمنشور
        post.poll = poll._id;
        await post.save();

        // جلب الاستفتاء مع المعلومات المطلوبة
        const populatedPoll = await Poll.findById(poll._id)
            .populate('author', 'username fullName avatar')
            .populate('postInfo');

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الاستفتاء بنجاح',
            poll: populatedPoll
        });

    } catch (error) {
        console.error('Create poll error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إنشاء الاستفتاء',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// التصويت في استفتاء
router.post('/:id/vote', auth, async (req, res) => {
    try {
        const { optionIndex } = req.body;

        if (optionIndex === undefined || optionIndex === null) {
            return res.status(400).json({
                success: false,
                message: 'رقم الخيار مطلوب'
            });
        }

        const poll = await Poll.findById(req.params.id);

        if (!poll) {
            return res.status(404).json({
                success: false,
                message: 'الاستفتاء غير موجود'
            });
        }

        await poll.vote(req.user._id, optionIndex);

        // جلب الاستفتاء المحدث
        const updatedPoll = await Poll.findById(req.params.id)
            .populate('author', 'username fullName avatar')
            .populate('postInfo');

        res.json({
            success: true,
            message: 'تم التصويت بنجاح',
            poll: updatedPoll
        });

    } catch (error) {
        console.error('Vote error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'حدث خطأ أثناء التصويت'
        });
    }
});

// الحصول على استفتاء محدد
router.get('/:id', auth, async (req, res) => {
    try {
        const poll = await Poll.findById(req.params.id)
            .populate('author', 'username fullName avatar')
            .populate('postInfo');

        if (!poll) {
            return res.status(404).json({
                success: false,
                message: 'الاستفتاء غير موجود'
            });
        }

        // زيادة عدد المشاهدات
        await poll.incrementViews();

        res.json({
            success: true,
            poll
        });

    } catch (error) {
        console.error('Get poll error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب الاستفتاء'
        });
    }
});

// إغلاق استفتاء
router.post('/:id/close', auth, async (req, res) => {
    try {
        const poll = await Poll.findById(req.params.id);

        if (!poll) {
            return res.status(404).json({
                success: false,
                message: 'الاستفتاء غير موجود'
            });
        }

        // التحقق من الملكية أو صلاحيات المشرف
        const isOwner = poll.author.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin' || req.user.role === 'moderator';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بإغلاق هذا الاستفتاء'
            });
        }

        await poll.close();

        res.json({
            success: true,
            message: 'تم إغلاق الاستفتاء بنجاح',
            poll
        });

    } catch (error) {
        console.error('Close poll error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إغلاق الاستفتاء'
        });
    }
});

// إضافة خيار جديد
router.post('/:id/options', auth, async (req, res) => {
    try {
        const { optionText } = req.body;

        if (!optionText) {
            return res.status(400).json({
                success: false,
                message: 'نص الخيار مطلوب'
            });
        }

        const poll = await Poll.findById(req.params.id);

        if (!poll) {
            return res.status(404).json({
                success: false,
                message: 'الاستفتاء غير موجود'
            });
        }

        await poll.addOption(optionText, req.user._id);

        res.json({
            success: true,
            message: 'تم إضافة الخيار بنجاح',
            poll
        });

    } catch (error) {
        console.error('Add option error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'حدث خطأ أثناء إضافة الخيار'
        });
    }
});

// البحث في الاستفتاءات
router.get('/search', auth, async (req, res) => {
    try {
        const { q, page = 1, limit = 20, category } = req.query;
        const skip = (page - 1) * limit;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'بحث مطلوب'
            });
        }

        const polls = await Poll.search(q, {
            page: parseInt(page),
            limit: parseInt(limit),
            category
        });

        res.json({
            success: true,
            polls
        });

    } catch (error) {
        console.error('Search polls error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء البحث في الاستفتاءات'
        });
    }
});

module.exports = router;
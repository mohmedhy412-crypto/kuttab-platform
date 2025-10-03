// ===== مسارات المنشورات الاجتماعية =====

const express = require('express');
const Post = require('../models/Post');
const Poll = require('../models/Poll');
const { auth } = require('../middleware/auth');

const router = express.Router();

// الحصول على المنشورات
router.get('/', auth, async (req, res) => {
    try {
        const { page = 1, limit = 20, category } = req.query;
        const skip = (page - 1) * limit;

        const filter = {
            status: 'active',
            $or: [
                { visibility: 'public' },
                { author: req.user._id }
            ]
        };

        if (category) filter.category = category;

        const posts = await Post.find(filter)
            .populate('author', 'username fullName avatar')
            .populate('pollInfo')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Post.countDocuments(filter);

        res.json({
            success: true,
            posts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب المنشورات'
        });
    }
});

// إنشاء منشور جديد
router.post('/', auth, async (req, res) => {
    try {
        const { content, images, category, tags } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'محتوى المنشور مطلوب'
            });
        }

        const post = new Post({
            content,
            images: images || [],
            category: category || 'general',
            tags: tags || [],
            author: req.user._id
        });

        await post.save();

        // تحديث إحصائيات المستخدم
        await req.user.updateStats('postsCount', 1);

        // جلب المنشور مع معلومات المؤلف
        const populatedPost = await Post.findById(post._id)
            .populate('author', 'username fullName avatar');

        res.status(201).json({
            success: true,
            message: 'تم نشر المنشور بنجاح',
            post: populatedPost
        });

    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إنشاء المنشور',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// الحصول على منشور محدد
router.get('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'username fullName avatar')
            .populate('pollInfo');

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'المنشور غير موجود'
            });
        }

        // التحقق من إمكانية الوصول
        if (!post.canAccess(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول إلى هذا المنشور'
            });
        }

        // زيادة عدد المشاهدات
        await post.incrementViews();

        res.json({
            success: true,
            post
        });

    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب المنشور'
        });
    }
});

// تحديث منشور
router.put('/:id', auth, async (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'محتوى المنشور مطلوب'
            });
        }

        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'المنشور غير موجود'
            });
        }

        // التحقق من الملكية
        if (post.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بتعديل هذا المنشور'
            });
        }

        await post.edit(content, 'تعديل من قبل المستخدم');

        res.json({
            success: true,
            message: 'تم تحديث المنشور بنجاح',
            post
        });

    } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تحديث المنشور'
        });
    }
});

// حذف منشور
router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'المنشور غير موجود'
            });
        }

        // التحقق من الملكية أو صلاحيات المشرف
        const isOwner = post.author.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin' || req.user.role === 'moderator';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بحذف هذا المنشور'
            });
        }

        post.status = 'deleted';
        await post.save();

        res.json({
            success: true,
            message: 'تم حذف المنشور بنجاح'
        });

    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء حذف المنشور'
        });
    }
});

// الإعجاب بالمنشور
router.post('/:id/like', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'المنشور غير موجود'
            });
        }

        // التحقق من إمكانية الوصول
        if (!post.canAccess(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول إلى هذا المنشور'
            });
        }

        await post.like(req.user._id);

        res.json({
            success: true,
            message: post.isLikedBy(req.user._id) ? 'تم الإعجاب بالمنشور' : 'تم إلغاء الإعجاب بالمنشور',
            likes: post.stats.likes,
            isLiked: post.isLikedBy(req.user._id)
        });

    } catch (error) {
        console.error('Like post error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء الإعجاب بالمنشور'
        });
    }
});

// إضافة تعليق
router.post('/:id/comments', auth, async (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'محتوى التعليق مطلوب'
            });
        }

        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'المنشور غير موجود'
            });
        }

        // التحقق من إمكانية الوصول
        if (!post.canAccess(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول إلى هذا المنشور'
            });
        }

        // في التطبيق الحقيقي، سيتم إنشاء تعليق جديد
        // هنا نستخدم تحديث بسيط للإحصائيات
        post.stats.comments += 1;
        await post.save();

        res.json({
            success: true,
            message: 'تم إضافة التعليق بنجاح',
            commentsCount: post.stats.comments
        });

    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إضافة التعليق'
        });
    }
});

// البحث في المنشورات
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

        const posts = await Post.search(q, {
            page: parseInt(page),
            limit: parseInt(limit),
            category
        });

        res.json({
            success: true,
            posts
        });

    } catch (error) {
        console.error('Search posts error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء البحث في المنشورات'
        });
    }
});

module.exports = router;
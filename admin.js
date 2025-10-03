// ===== مسارات لوحة الإدارة =====

const express = require('express');
const User = require('../models/User');
const Writing = require('../models/Writing');
const Post = require('../models/Post');
const Gallery = require('../models/Gallery');
const Poll = require('../models/Poll');
const Report = require('../models/Report');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// إحصائيات الموقع
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const [
            userStats,
            writingStats,
            postStats,
            galleryStats,
            pollStats,
            reportStats
        ] = await Promise.all([
            User.getUserStats(),
            Writing.getWritingStats(),
            Post.getPostStats(),
            Gallery.getGalleryStats(),
            Poll.getPollStats(),
            Report.getReportStats(30) // آخر 30 يوم
        ]);

        res.json({
            success: true,
            stats: {
                users: userStats[0] || {},
                writings: writingStats[0] || {},
                posts: postStats[0] || {},
                gallery: galleryStats[0] || {},
                polls: pollStats[0] || {},
                reports: reportStats[0] || {}
            }
        });

    } catch (error) {
        console.error('Get admin stats error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب إحصائيات الموقع'
        });
    }
});

// إدارة المستخدمين
router.get('/users', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, role } = req.query;
        const skip = (page - 1) * limit;

        const filter = {};

        if (status) filter.status = status;
        if (role) filter.role = role;

        const users = await User.find(filter)
            .select('-password -verificationToken -resetPasswordToken')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await User.countDocuments(filter);

        res.json({
            success: true,
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get admin users error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب المستخدمين'
        });
    }
});

// تحديث حالة مستخدم
router.put('/users/:id/status', adminAuth, async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'الحالة مطلوبة'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).select('-password -verificationToken -resetPasswordToken');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        res.json({
            success: true,
            message: `تم ${status === 'active' ? 'تفعيل' : 'تعليق'} الحساب بنجاح`,
            user
        });

    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تحديث حالة المستخدم'
        });
    }
});

// تحديث صلاحيات مستخدم
router.put('/users/:id/role', adminAuth, async (req, res) => {
    try {
        const { role } = req.body;

        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'الدور مطلوب'
            });
        }

        // منع المستخدم من تغيير دوره الخاص
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن تغيير دورك الخاص'
            });
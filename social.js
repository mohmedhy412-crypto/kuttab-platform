// ===== إدارة التواصل الاجتماعي والمنشورات =====

class SocialManager {
    constructor() {
        this.posts = [];
        this.polls = [];
    }

    // إنشاء منشور جديد
    async createPost(content, images = []) {
        try {
            const user = authManager.getUser();
            if (!user) {
                throw new Error('يجب تسجيل الدخول لإنشاء منشور');
            }

            const postData = {
                content: content.trim(),
                author: user.id,
                images: images,
                hasPoll: false
            };

            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authManager.getToken()}`
                },
                body: JSON.stringify(postData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'فشل إنشاء المنشور');
            }

            return { success: true, post: data.post, message: 'تم نشر المنشور بنجاح' };
        } catch (error) {
            console.error('Create post error:', error);
            return { 
                success: false, 
                error: error.message || 'حدث خطأ أثناء إنشاء المنشور' 
            };
        }
    }

    // جلب المنشورات
    async getPosts(limit = 20, page = 1) {
        try {
            const response = await fetch(`/api/posts?limit=${limit}&page=${page}`, {
                headers: {
                    'Authorization': `Bearer ${authManager.getToken()}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'فشل جلب المنشورات');
            }

            this.posts = data.posts;
            return { success: true, posts: data.posts, total: data.total };
        } catch (error) {
            console.error('Get posts error:', error);
            return { 
                success: false, 
                error: error.message || 'حدث خطأ أثناء جلب المنشورات' 
            };
        }
    }

    // إنشاء استفتاء
    async createPoll(question, options) {
        try {
            const user = authManager.getUser();
            if (!user) {
                throw new Error('يجب تسجيل الدخول لإنشاء استفتاء');
            }

            if (!question || question.trim().length < 5) {
                throw new Error('سؤال الاستفتاء يجب أن يكون على الأقل 5 أحرف');
            }

            if (!options || options.length < 2) {
                throw new Error('يجب إضافة خيارين على الأقل للاستفتاء');
            }

            const pollData = {
                question: question.trim(),
                options: options.map(opt => ({ text: opt.trim() })),
                author: user.id
            };

            const response = await fetch('/api/polls', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authManager.getToken()}`
                },
                body: JSON.stringify(pollData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'فشل إنشاء الاستفتاء');
            }

            return { success: true, poll: data.poll, message: 'تم إنشاء الاستفتاء بنجاح' };
        } catch (error) {
            console.error('Create poll error:', error);
            return { 
                success: false, 
                error: error.message || 'حدث خطأ أثناء إنشاء الاستفتاء' 
            };
        }
    }

    // التصويت في استفتاء
    async voteInPoll(pollId, optionIndex) {
        try {
            const user = authManager.getUser();
            if (!user) {
                throw new Error('يجب تسجيل الدخول للتصويت');
            }

            const response = await fetch(`/api/polls/${pollId}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authManager.getToken()}`
                },
                body: JSON.stringify({ optionIndex })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'فشل التصويت');
            }

            return { success: true, poll: data.poll, message: 'تم التصويت بنجاح' };
        } catch (error) {
            console.error('Vote error:', error);
            return { 
                success: false, 
                error: error.message || 'حدث خطأ أثناء التصويت' 
            };
        }
    }

    // الإعجاب بالمنشور
    async likePost(postId) {
        try {
            const response = await fetch(`/api/posts/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authManager.getToken()}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'فشل الإعجاب بالمنشور');
            }

            return { success: true, post: data.post, message: 'تم الإعجاب بالمنشور' };
        } catch (error) {
            console.error('Like post error:', error);
            return { 
                success: false, 
                error: error.message || 'حدث خطأ أثناء الإعجاب بالمنشور' 
            };
        }
    }

    // إضافة تعليق
    async addComment(postId, content) {
        try {
            if (!content || content.trim().length < 1) {
                throw new Error('يجب كتابة تعليق');
            }

            const response = await fetch(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authManager.getToken()}`
                },
                body: JSON.stringify({ content: content.trim() })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'فشل إضافة التعليق');
            }

            return { success: true, comment: data.comment, message: 'تم إضافة التعليق بنجاح' };
        } catch (error) {
            console.error('Add comment error:', error);
            return { 
                success: false, 
                error: error.message || 'حدث خطأ أثناء إضافة التعليق' 
            };
        }
    }

    // الإبلاغ عن محتوى
    async reportContent(contentId, contentType, reason) {
        try {
            if (!reason || reason.trim().length < 10) {
                throw new Error('يجب كتابة سبب الإبلاغ (10 أحرف على الأقل)');
            }

            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authManager.getToken()}`
                },
                body: JSON.stringify({
                    contentId,
                    contentType,
                    reason: reason.trim()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'فشل الإبلاغ عن المحتوى');
            }

            return { success: true, message: 'تم الإبلاغ عن المحتوى بنجاح' };
        } catch (error) {
            console.error('Report content error:', error);
            return { 
                success: false, 
                error: error.message || 'حدث خطأ أثناء الإبلاغ عن المحتوى' 
            };
        }
    }

    // مشاركة المنشور
    async sharePost(postId, platform = 'internal') {
        try {
            const post = this.posts.find(p => p.id === postId);
            if (!post) {
                throw new Error('المنشور غير موجود');
            }

            let shareUrl = '';
            const text = encodeURIComponent(`اطلع على هذا المنشور في منصة كُتّاب: ${post.content.substring(0, 100)}...`);

            switch (platform) {
                case 'twitter':
                    shareUrl = `https://twitter.com/intent/tweet?text=${text}`;
                    break;
                case 'facebook':
                    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${text}`;
                    break;
                case 'whatsapp':
                    shareUrl = `https://wa.me/?text=${text}`;
                    break;
                case 'internal':
                    // نسخ الرابط للحافظة
                    await storageManager.copyToClipboard(window.location.href + `?post=${postId}`);
                    return { success: true, message: 'تم نسخ رابط المنشور' };
                default:
                    throw new Error('منصة المشاركة غير مدعومة');
            }

            window.open(shareUrl, '_blank', 'width=600,height=400');
            return { success: true, message: `تم فتح ${platform} للمشاركة` };
        } catch (error) {
            console.error('Share post error:', error);
            return { 
                success: false, 
                error: error.message || 'حدث خطأ أثناء مشاركة المنشور' 
            };
        }
    }

    // تنسيق الوقت النسبي
    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return 'الآن';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `منذ ${minutes} دقيقة`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `منذ ${hours} ساعة`;
        } else if (diffInSeconds < 2592000) {
            const days = Math.floor(diffInSeconds / 86400);
            return `منذ ${days} يوم`;
        } else {
            return date.toLocaleDateString('ar-AR');
        }
    }

    // إنشاء منشور HTML
    createPostHTML(post) {
        return `
            <div class="community-post" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-avatar" style="background: ${this.stringToColor(post.author.username)}">
                        ${post.author.username.charAt(0)}
                    </div>
                    <div>
                        <div style="font-weight: bold;">${post.author.fullName || post.author.username}</div>
                        <div style="font-size: 0.8rem; color: var(--text-light);">
                            ${this.formatRelativeTime(post.createdAt)}
                        </div>
                    </div>
                </div>
                <div style="white-space: pre-line; margin-bottom: 15px; line-height: 1.6;">${post.content}</div>
                
                ${post.images && post.images.length > 0 ? `
                    <div class="post-images" style="margin: 15px 0;">
                        ${post.images.map(img => `
                            <img src="${img}" alt="صورة المنشور" style="max-width: 100%; border-radius: 8px; margin-bottom: 8px;">
                        `).join('')}
                    </div>
                ` : ''}
                
                ${post.poll ? this.createPollHTML(post.poll) : ''}
                
                <div class="post-actions">
                    <div class="post-action" onclick="socialManager.handleLike('${post.id}')">
                        <i class="fas fa-heart ${post.isLiked ? 'liked' : ''}"></i>
                        <span>${post.likesCount || 0}</span>
                    </div>
                    <div class="post-action" onclick="socialManager.showComments('${post.id}')">
                        <i class="fas fa-comment"></i>
                        <span>${post.commentsCount || 0}</span>
                    </div>
                    <div class="post-action" onclick="socialManager.sharePost('${post.id}')">
                        <i class="fas fa-share"></i>
                        <span>مشاركة</span>
                    </div>
                    <div class="post-action report-btn" onclick="socialManager.reportContent('${post.id}', 'post')">
                        <i class="fas fa-flag"></i>
                        <span>الإبلاغ</span>
                    </div>
                </div>
                
                <div class="comments-section" id="comments-${post.id}" style="display: none; margin-top: 15px;">
                    <!-- التعليقات تظهر هنا -->
                </div>
            </div>
        `;
    }

    // إنشاء استفتاء HTML
    createPollHTML(poll) {
        const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
        
        return `
            <div class="poll-container">
                <h4>${poll.question}</h4>
                <div class="poll-options">
                    ${poll.options.map((option, index) => {
                        const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                        return `
                            <div class="poll-option ${option.voted ? 'selected' : ''}" 
                                 onclick="socialManager.voteInPoll('${poll.id}', ${index})">
                                <input type="radio" name="poll-${poll.id}" ${option.voted ? 'checked' : ''} style="display: none;">
                                <span>${option.text}</span>
                                ${poll.showResults ? `
                                    <span style="margin-right: auto; font-size: 0.8rem; color: var(--text-light);">
                                        ${percentage}% (${option.votes})
                                    </span>
                                    <div class="result-bar">
                                        <div class="result-fill" style="width: ${percentage}%"></div>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                ${poll.showResults ? `
                    <div style="margin-top: 10px; font-size: 0.8rem; color: var(--text-light); text-align: left;">
                        إجمالي المصوتين: ${totalVotes}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // توليد لون من النص
    stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const colors = [
            '#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6',
            '#ef4444', '#3b82f6', '#84cc16', '#f97316', '#6366f1'
        ];
        
        return colors[Math.abs(hash) % colors.length];
    }

    // معالجات الأحداث
    async handleLike(postId) {
        const result = await this.likePost(postId);
        if (result.success) {
            showToast(result.message, 'success');
            // تحديث الواجهة
            this.refreshPosts();
        } else {
            showToast(result.error, 'error');
        }
    }

    async handleVote(pollId, optionIndex) {
        const result = await this.voteInPoll(pollId, optionIndex);
        if (result.success) {
            showToast(result.message, 'success');
            // تحديث الواجهة
            this.refreshPosts();
        } else {
            showToast(result.error, 'error');
        }
    }

    async handleReport(contentId, contentType) {
        const reason = prompt('يرجى كتابة سبب الإبلاغ:');
        if (!reason || reason.length < 10) {
            showToast('يجب كتابة سبب الإبلاغ (10 أحرف على الأقل)', 'error');
            return;
        }

        const result = await this.reportContent(contentId, contentType, reason);
        if (result.success) {
            showToast(result.message, 'success');
        } else {
            showToast(result.error, 'error');
        }
    }

    // عرض التعليقات
    async showComments(postId) {
        const commentsSection = document.getElementById(`comments-${postId}`);
        if (!commentsSection) return;

        if (commentsSection.style.display === 'none') {
            // جلب التعليقات
            const comments = await this.getComments(postId);
            commentsSection.innerHTML = this.createCommentsHTML(comments);
            commentsSection.style.display = 'block';
        } else {
            commentsSection.style.display = 'none';
        }
    }

    // تجديد المنشورات
    async refreshPosts() {
        if (window.kuttabApp && window.kuttabApp.currentView === 'social') {
            window.kuttabApp.renderSocialView();
        }
    }
}

// ===== دوال الواجهة =====

// إنشاء منشور جديد
async function createNewPost() {
    const contentInput = document.getElementById('newPostContent');
    if (!contentInput) return;

    const content = contentInput.value.trim();
    if (content.length < 5) {
        showToast('يجب كتابة محتوى المنشور (5 أحرف على الأقل)', 'error');
        return;
    }

    const socialManager = new SocialManager();
    const result = await socialManager.createPost(content);

    if (result.success) {
        showToast(result.message, 'success');
        contentInput.value = '';
        
        // مسح معاينة الصور
        const preview = document.getElementById('postImagePreview');
        if (preview) preview.innerHTML = '';
        
        // تحديث المنشورات
        socialManager.refreshPosts();
    } else {
        showToast(result.error, 'error');
    }
}

// نشر منشور
async function publishPost() {
    await createNewPost();
}

// إنشاء استفتاء
async function createPoll() {
    const question = prompt('أدخل سؤال الاستفتاء:');
    if (!question || question.trim().length < 5) {
        showToast('سؤال الاستفتاء يجب أن يكون على الأقل 5 أحرف', 'error');
        return;
    }

    const optionsInput = prompt('أدخل خيارات الاستفتاء (افصل بينها بفاصلة):');
    if (!optionsInput) return;

    const options = optionsInput.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
    
    if (options.length < 2) {
        showToast('يجب إضافة خيارين على الأقل', 'error');
        return;
    }

    const socialManager = new SocialManager();
    const result = await socialManager.createPoll(question, options);

    if (result.success) {
        showToast(result.message, 'success');
        // تحديث المنشورات
        socialManager.refreshPosts();
    } else {
        showToast(result.error, 'error');
    }
}

// اختيار خيار في الاستفتاء
function selectPollOption(element) {
    const pollOptions = element.parentElement.querySelectorAll('.poll-option');
    pollOptions.forEach(opt => opt.classList.remove('selected'));
    
    element.classList.add('selected');
    
    // في التطبيق الحقيقي، هنا سيتم إرسال التصويت للخادم
    showToast('شكراً لتصويتك!', 'success');
}

// الإبلاغ عن محتوى
function reportContent(contentId, contentType) {
    const socialManager = new SocialManager();
    socialManager.handleReport(contentId, contentType);
}

// ===== تهيئة مدير التواصل الاجتماعي =====
const socialManager = new SocialManager();

// جعل الدوال متاحة عالمياً
window.socialManager = socialManager;
window.createNewPost = createNewPost;
window.publishPost = publishPost;
window.createPoll = createPoll;
window.selectPollOption = selectPollOption;
window.reportContent = reportContent;
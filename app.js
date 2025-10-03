// ===== التطبيق الرئيسي لمنصة كُتّاب =====

class KuttabApp {
    constructor() {
        this.currentUser = null;
        this.currentView = 'login';
        this.isLoading = false;
        this.init();
    }

    // تهيئة التطبيق
    async init() {
        console.log('🚀 تهيئة منصة كُتّاب...');
        
        // إعداد معالج الأخطاء العام
        this.setupErrorHandling();
        
        // التحقق من المصادقة
        await this.checkAuthentication();
        
        // إعداد مستمعي الأحداث
        this.setupEventListeners();
        
        // تحميل العرض الحالي
        this.loadCurrentView();
        
        console.log('✅ تم تهيئة التطبيق بنجاح');
    }

    // إعداد معالجة الأخطاء
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('❌ خطأ غير معالج:', event.error);
            this.showToast('حدث خطأ غير متوقع', 'error');
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ وعد مرفوض غير معالج:', event.reason);
            this.showToast('حدث خطأ في العملية', 'error');
        });
    }

    // التحقق من المصادقة
    async checkAuthentication() {
        try {
            const token = localStorage.getItem('kuttab_token');
            const userData = localStorage.getItem('kuttab_user');

            if (token && userData) {
                this.currentUser = JSON.parse(userData);
                this.currentView = 'writing';
                this.showApp();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('خطأ في التحقق من المصادقة:', error);
            this.showLogin();
        }
    }

    // إعداد مستمعي الأحداث
    setupEventListeners() {
        // مستمعي الأحداث العامة
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
        
        // منع إغلاق الصفحة أثناء العمل
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }

    // معالج النقر العام
    handleGlobalClick(event) {
        // إغلاق القوائم المنسدلة عند النقر خارجها
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        dropdowns.forEach(dropdown => {
            if (!dropdown.contains(event.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    // معالج الأزرار العامة
    handleGlobalKeydown(event) {
        // اختصارات لوحة المفاتيح
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 's':
                    event.preventDefault();
                    this.saveCurrentWork();
                    break;
                case 'b':
                    event.preventDefault();
                    this.formatText('bold');
                    break;
                case 'i':
                    event.preventDefault();
                    this.formatText('italic');
                    break;
                case 'u':
                    event.preventDefault();
                    this.formatText('underline');
                    break;
            }
        }
    }

    // معالج قبل إغلاق الصفحة
    handleBeforeUnload(event) {
        const textarea = document.getElementById('writingInput');
        if (textarea && textarea.value.trim().length > 0) {
            event.preventDefault();
            event.returnValue = 'لديك عمل غير محفوظ. هل تريد المغادرة؟';
            return event.returnValue;
        }
    }

    // تحميل العرض الحالي
    loadCurrentView() {
        switch (this.currentView) {
            case 'login':
                this.renderLogin();
                break;
            case 'writing':
                this.renderWritingView();
                break;
            case 'ai':
                this.renderAIView();
                break;
            case 'tools':
                this.renderToolsView();
                break;
            case 'social':
                this.renderSocialView();
                break;
            case 'gallery':
                this.renderGalleryView();
                break;
            case 'learning':
                this.renderLearningView();
                break;
            case 'community':
                this.renderCommunityView();
                break;
            case 'publishing':
                this.renderPublishingView();
                break;
            case 'admin':
                this.renderAdminView();
                break;
        }
    }

    // عرض واجهة التطبيق
    showApp() {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        this.updateUserInterface();
    }

    // عرض واجهة تسجيل الدخول
    showLogin() {
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        this.currentView = 'login';
        this.renderLogin();
    }

    // تحديث واجهة المستخدم
    updateUserInterface() {
        if (!this.currentUser) return;

        // تحديث معلومات المستخدم
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) {
            userAvatar.textContent = this.currentUser.fullName?.charAt(0) || 'ك';
        }

        // تحديث الإحصائيات
        this.updateStatistics();

        // إظهار/إخفاء تبويب المشرف
        const adminTab = document.getElementById('adminTab');
        if (adminTab) {
            adminTab.style.display = this.currentUser.role === 'admin' ? 'block' : 'none';
        }
    }

    // تحديث الإحصائيات
    updateStatistics() {
        const stats = this.currentUser.stats || {};
        
        // العناصر التي تحتاج تحديث
        const elements = {
            'totalWords': stats.totalWords || 0,
            'writingTime': stats.writingTime || 0,
            'productivity': stats.writingTime > 0 ? Math.round(stats.totalWords / stats.writingTime) : 0,
            'savedWorksCount': this.currentUser.savedWorks?.length || 0,
            'aiRequestsCount': this.currentUser.aiRequests?.length || 0,
            'activeDays': stats.activeDays || 1
        };

        // تحديث كل عنصر
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    // عرض إشعار
    showToast(message, type = 'success', duration = 3000) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);

        // إزالة الإشعار بعد المدة المحددة
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    // الحصول على أيقونة الإشعار
    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-triangle',
            'warning': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // تبديل التبويبات
    switchTab(tabName) {
        // إخفاء جميع المحتويات
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // إلغاء تفعيل جميع التبويبات
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // تفعيل التبويب والمحتوى المحدد
        const targetTab = document.getElementById(`${tabName}-tab`);
        const activeTab = event?.currentTarget || document.querySelector(`[onclick="switchTab('${tabName}')"]`);

        if (targetTab) {
            targetTab.classList.add('active');
            this.currentView = tabName;
        }

        if (activeTab) {
            activeTab.classList.add('active');
        }

        // تحميل محتوى التبويب
        this.loadCurrentView();
    }

    // ===== دوال الكتابة =====

    // عرض واجهة الكتابة
    renderWritingView() {
        const writingTab = document.getElementById('writing-tab');
        if (!writingTab) return;

        writingTab.innerHTML = `
            <section class="card">
                <div class="card-header">
                    <h2><i class="fas fa-edit"></i> مساحة الكتابة الإبداعية</h2>
                    <div class="btn-group">
                        <button class="btn btn-ghost" onclick="kuttabApp.checkOriginality()">
                            <i class="fas fa-search"></i> فحص الأصالة
                        </button>
                        <button class="btn btn-secondary" onclick="kuttabApp.exportToPDF()">
                            <i class="fas fa-file-pdf"></i> تصدير PDF
                        </button>
                    </div>
                </div>
                
                <div class="copyright-notice">
                    <i class="fas fa-copyright"></i> جميع الحقوق محفوظة - سيتم إضافة اسم الموقع وتوقيعك على ملف PDF
                </div>
                
                <textarea class="writing-area" id="writingInput" 
                          placeholder="ابدأ كتابتك هنا... جميع الميزات مجانية!"
                          oninput="kuttabApp.updateWritingStats()"></textarea>
                
                <div class="writing-stats">
                    <span id="wordCount"><i class="fas fa-font"></i> 0 كلمة</span>
                    <span id="charCount"><i class="fas fa-text-height"></i> 0 حرف</span>
                    <span id="pageCount"><i class="fas fa-file"></i> 0 صفحة</span>
                    <span id="readingTime"><i class="fas fa-clock"></i> 0 دقيقة قراءة</span>
                </div>
                
                <div class="originality-score" id="originalitySection" style="display: none;">
                    <span>نتيجة فحص الأصالة:</span>
                    <div class="score-bar">
                        <div class="score-fill" id="originalityScoreBar" style="width: 0%"></div>
                    </div>
                    <span id="originalityPercent">0%</span>
                </div>

                <div class="btn-group" style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                    <button class="btn btn-success" onclick="kuttabApp.saveWork()">
                        <i class="fas fa-save"></i> حفظ العمل
                    </button>
                    <button class="btn" onclick="kuttabApp.analyzeWriting()">
                        <i class="fas fa-chart-bar"></i> تحليل النص
                    </button>
                    <button class="btn btn-ghost" onclick="kuttabApp.clearText()">
                        <i class="fas fa-trash"></i> مسح النص
                    </button>
                </div>
            </section>

            <section class="card">
                <div class="card-header">
                    <h2><i class="fas fa-bolt"></i> أدوات سريعة</h2>
                </div>
                <div class="writing-tools">
                    <div class="tool-card" onclick="kuttabApp.formatText('bold')">
                        <div class="tool-icon"><i class="fas fa-bold"></i></div>
                        <h4>عريض</h4>
                        <p>Ctrl+B</p>
                    </div>
                    <div class="tool-card" onclick="kuttabApp.formatText('italic')">
                        <div class="tool-icon"><i class="fas fa-italic"></i></div>
                        <h4>مائل</h4>
                        <p>Ctrl+I</p>
                    </div>
                    <div class="tool-card" onclick="kuttabApp.formatText('underline')">
                        <div class="tool-icon"><i class="fas fa-underline"></i></div>
                        <h4>تحته خط</h4>
                        <p>Ctrl+U</p>
                    </div>
                    <div class="tool-card" onclick="kuttabApp.insertTemplate()">
                        <div class="tool-icon"><i class="fas fa-layer-group"></i></div>
                        <h4>قوالب جاهزة</h4>
                        <p>اختر قالباً</p>
                    </div>
                </div>
            </section>
        `;

        // تحميل العمل المحفوظ إن وجد
        this.loadSavedWork();
    }

    // تحديث إحصائيات الكتابة
    updateWritingStats() {
        const textarea = document.getElementById('writingInput');
        if (!textarea) return;

        const text = textarea.value;
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
        const charCount = text.length;
        const pageCount = Math.ceil(charCount / 2000);
        const readingTime = Math.ceil(wordCount / 200);

        // تحديث العرض
        const elements = {
            'wordCount': `${wordCount} كلمة`,
            'charCount': `${charCount} حرف`,
            'pageCount': `${pageCount} صفحة`,
            'readingTime': `${readingTime} دقيقة قراءة`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = value;
            }
        });

        // تحديث إحصائيات المستخدم
        if (this.currentUser) {
            this.currentUser.stats = this.currentUser.stats || {};
            this.currentUser.stats.totalWords = wordCount;
            this.updateStatistics();
        }
    }

    // فحص أصالة النص
    checkOriginality() {
        const textarea = document.getElementById('writingInput');
        if (!textarea) return;

        const text = textarea.value;
        if (text.length < 10) {
            this.showToast('يرجى كتابة نص أطول لفحص الأصالة', 'error');
            return;
        }

        this.showToast('جاري فحص أصالة النص...', 'info');

        // محاكاة الفحص (في التطبيق الحقيقي سيكون اتصال بالخادم)
        setTimeout(() => {
            const originalityScore = Math.min(100, Math.max(85, Math.floor(Math.random() * 15) + 85));
            
            const originalitySection = document.getElementById('originalitySection');
            const scoreBar = document.getElementById('originalityScoreBar');
            const scorePercent = document.getElementById('originalityPercent');

            if (originalitySection && scoreBar && scorePercent) {
                originalitySection.style.display = 'flex';
                scoreBar.style.width = originalityScore + '%';
                scorePercent.textContent = originalityScore + '%';

                if (originalityScore >= 90) {
                    this.showToast('🎉 النص أصلي بنسبة عالية!', 'success');
                } else if (originalityScore >= 80) {
                    this.showToast('✅ النص أصلي بشكل جيد', 'success');
                } else {
                    this.showToast('⚠️ قد يحتوي النص على بعض المقاطع المتشابهة', 'warning');
                }
            }
        }, 2000);
    }

    // تصدير إلى PDF
    exportToPDF() {
        const textarea = document.getElementById('writingInput');
        if (!textarea) return;

        const text = textarea.value;
        if (text.length < 10) {
            this.showToast('لا يوجد نص لتصديره', 'error');
            return;
        }

        this.showToast('جاري إنشاء ملف PDF...', 'info');

        // محاكاة التصدير (في التطبيق الحقيقي سيكون اتصال بالخادم)
        setTimeout(() => {
            this.showToast('تم تصدير النص إلى PDF بنجاح! سيحتوي الملف على اسم الموقع وحقوق النشر.', 'success');
        }, 2000);
    }

    // حفظ العمل
    saveWork() {
        const textarea = document.getElementById('writingInput');
        if (!textarea) return;

        const text = textarea.value;
        if (text.length < 10) {
            this.showToast('النص قصير جداً للحفظ', 'error');
            return;
        }

        // إنشاء كائن العمل
        const work = {
            id: 'work_' + Date.now(),
            title: 'عملي ' + new Date().toLocaleDateString('ar-AR'),
            content: text,
            timestamp: new Date().toISOString(),
            wordCount: text.split(/\s+/).length
        };

        // حفظ في بيانات المستخدم
        if (this.currentUser) {
            this.currentUser.savedWorks = this.currentUser.savedWorks || [];
            this.currentUser.savedWorks.push(work);
            
            // حفظ في localStorage
            localStorage.setItem('kuttab_user', JSON.stringify(this.currentUser));
        }

        this.showToast(`تم حفظ العمل "${work.title}" بنجاح! ✓`, 'success');
        this.updateStatistics();
    }

    // تحليل النص
    analyzeWriting() {
        const textarea = document.getElementById('writingInput');
        if (!textarea) return;

        const text = textarea.value;
        if (text.length < 10) {
            this.showToast('يرجى كتابة نص أطول لتحليله', 'error');
            return;
        }
        
        const wordCount = text.split(/\s+/).length;
        const charCount = text.length;
        const sentenceCount = text.split(/[.!?]+/).length - 1;
        const paragraphCount = text.split(/\n\s*\n/).length;
        
        const analysis = `📊 تحليل النص:
• عدد الكلمات: ${wordCount}
• عدد الأحرف: ${charCount}
• عدد الجمل: ${sentenceCount}
• عدد الفقرات: ${paragraphCount}
• وقت القراءة المقدر: ${Math.ceil(wordCount/200)} دقيقة
• مستوى التعقيد: ${wordCount > 1000 ? 'متقدم' : wordCount > 500 ? 'متوسط' : 'بسيط'}`;
        
        this.showToast(analysis, 'info');
    }

    // تنسيق النص
    formatText(type) {
        const textarea = document.getElementById('writingInput');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        
        let formattedText = selectedText;
        
        switch(type) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                break;
            case 'underline':
                formattedText = `__${selectedText}__`;
                break;
        }
        
        textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
        this.updateWritingStats();
        
        this.showToast(`تم تطبيق التنسيق: ${type}`, 'success');
    }

    // إدراج قالب
    insertTemplate() {
        const templates = [
            `هيكل القصة القصيرة:

1. المقدمة: تقديم الشخصيات والبيئة
2. العقدة: ظهور المشكلة أو التحدي
3. الذروة: نقطة التحول الرئيسية
4. الحل: نهاية القصة

ابدأ كتابتك هنا...`,

            `هيكل المقال:

المقدمة: فكرة عامة عن الموضوع
الفقرة الأولى: النقطة الرئيسية الأولى
الفقرة الثانية: النقطة الرئيسية الثانية
الفقرة الثالثة: النقطة الرئيسية الثالثة
الخاتمة: تلخيص واستنتاج

ابدأ كتابتك هنا...`,

            `هيكل القصيدة:

المقطع الأول: تقديم الفكرة الرئيسية
المقطع الثاني: تطوير الفكرة
المقطع الثالث: ذروة التعبير
المقطع الرابع: الخاتمة والانطباع النهائي

ابدأ كتابتك هنا...`
        ];
        
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
        const textarea = document.getElementById('writingInput');
        if (textarea) {
            textarea.value = randomTemplate;
            this.updateWritingStats();
            this.showToast('تم إدراج قالب كتابي! 📝', 'success');
        }
    }

    // مسح النص
    clearText() {
        if (confirm('هل أنت متأكد من مسح النص الحالي؟')) {
            const textarea = document.getElementById('writingInput');
            if (textarea) {
                textarea.value = '';
                this.updateWritingStats();
                this.showToast('تم مسح النص بنجاح', 'success');
            }
        }
    }

    // تحميل العمل المحفوظ
    loadSavedWork() {
        if (this.currentUser && this.currentUser.savedWorks && this.currentUser.savedWorks.length > 0) {
            const latestWork = this.currentUser.savedWorks[this.currentUser.savedWorks.length - 1];
            const textarea = document.getElementById('writingInput');
            if (textarea) {
                textarea.value = latestWork.content;
                this.updateWritingStats();
            }
        }
    }

    // ===== باقي دوال العروض =====

    renderAIView() {
        const aiTab = document.getElementById('ai-tab');
        if (!aiTab) return;

        aiTab.innerHTML = `
            <section class="card">
                <div class="card-header">
                    <h2><i class="fas fa-robot"></i> مساعد الكتابة بالذكاء الاصطناعي</h2>
                    <span class="free-badge">مجاني</span>
                </div>
                
                <div class="ai-assistant">
                    <h4><i class="fas fa-comment"></i> مساعدك الشخصي للكتابة</h4>
                    <p>اطلب من الذكاء الاصطناعي مساعدتك في تحسين كتاباتك</p>
                    
                    <div class="form-group">
                        <label>ما الذي تريد المساعدة فيه؟</label>
                        <textarea id="aiRequest" class="writing-area" style="min-height: 100px;" placeholder="اكتب طلبك هنا... مثلاً: 'ساعدني في تحسين هذه الفقرة' أو 'اقترح عنواناً لهذا النص'"></textarea>
                    </div>
                    
                    <div class="ai-actions">
                        <button class="ai-action-btn" onclick="kuttabApp.askAI('improve')">
                            <i class="fas fa-wand-magic-sparkles"></i> تحسين الصياغة
                        </button>
                        <button class="ai-action-btn" onclick="kuttabApp.askAI('expand')">
                            <i class="fas fa-expand"></i> توسيع النص
                        </button>
                        <button class="ai-action-btn" onclick="kuttabApp.askAI('summarize')">
                            <i class="fas fa-compress"></i> تلخيص النص
                        </button>
                        <button class="ai-action-btn" onclick="kuttabApp.askAI('grammar')">
                            <i class="fas fa-spell-check"></i> تدقيق لغوي
                        </button>
                        <button class="ai-action-btn" onclick="kuttabApp.askAI('title')">
                            <i class="fas fa-heading"></i> اقتراح عناوين
                        </button>
                        <button class="ai-action-btn" onclick="kuttabApp.askAI('ideas')">
                            <i class="fas fa-lightbulb"></i> توليد أفكار
                        </button>
                    </div>
                    
                    <button class="btn btn-primary btn-large" onclick="kuttabApp.processAIRequest()">
                        <i class="fas fa-paper-plane"></i> إرسال الطلب
                    </button>
                </div>
                
                <div id="aiResponse" class="ai-response" style="display: none;">
                    <h4><i class="fas fa-robot"></i> رد المساعد:</h4>
                    <div id="aiResponseContent"></div>
                    <div class="btn-group" style="margin-top: 15px;">
                        <button class="btn btn-ghost" onclick="kuttabApp.applyAIResponse()">
                            <i class="fas fa-check"></i> تطبيق الاقتراح
                        </button>
                        <button class="btn btn-ghost" onclick="kuttabApp.regenerateAIResponse()">
                            <i class="fas fa-redo"></i> إعادة توليد
                        </button>
                    </div>
                </div>
            </section>

            <section class="card">
                <div class="card-header">
                    <h2><i class="fas fa-history"></i> الطلبات السابقة</h2>
                </div>
                <div id="aiHistory">
                    <p>لا توجد طلبات سابقة. ابدأ باستخدام المساعد الذكي!</p>
                </div>
            </section>
        `;
    }

    renderToolsView() {
        const toolsTab = document.getElementById('tools-tab');
        if (!toolsTab) return;

        toolsTab.innerHTML = `
            <section class="card">
                <div class="card-header">
                    <h2><i class="fas fa-tools"></i> أدوات الكتابة المتقدمة</h2>
                </div>
                
                <div class="writing-tools">
                    <div class="tool-card" onclick="kuttabApp.openCharacterDevelopment()">
                        <div class="tool-icon"><i class="fas fa-user"></i></div>
                        <h4>تطوير الشخصيات</h4>
                        <p>أداة لبناء شخصيات قصصية</p>
                    </div>
                    <div class="tool-card" onclick="kuttabApp.openPlotBuilder()">
                        <div class="tool-icon"><i class="fas fa-project-diagram"></i></div>
                        <h4>بناء الحبكة</h4>
                        <p>هيكلة القصص والروايات</p>
                    </div>
                    <div class="tool-card" onclick="kuttabApp.openWorldBuilding()">
                        <div class="tool-icon"><i class="fas fa-globe"></i></div>
                        <h4>بناء العالم</h4>
                        <p>تصميم عوالم خيالية</p>
                    </div>
                    <div class="tool-card" onclick="kuttabApp.openDialogueHelper()">
                        <div class="tool-icon"><i class="fas fa-comments"></i></div>
                        <h4>مساعد الحوار</h4>
                        <p>تحسين الحوارات بين الشخصيات</p>
                    </div>
                    <div class="tool-card" onclick="kuttabApp.openResearchHelper()">
                        <div class="tool-icon"><i class="fas fa-search"></i></div>
                        <h4>مساعد البحث</h4>
                        <p>موارد ومراجع للكتابة</p>
                    </div>
                    <div class="tool-card" onclick="kuttabApp.openWritingPrompts()">
                        <div class="tool-icon"><i class="fas fa-lightbulb"></i></div>
                        <h4>مولد الأفكار</h4>
                        <p>اقتراحات كتابية إبداعية</p>
                    </div>
                </div>
            </section>

            <section class="card">
                <div class="card-header">
                    <h2><i class="fas fa-chart-bar"></i> إحصائيات الكتابة</h2>
                </div>
                <div class="grid-3">
                    <div class="card">
                        <h4>📊 تقدم الكتابة</h4>
                        <div style="text-align: center; margin: 15px 0;">
                            <div style="font-size: 2rem; font-weight: bold;" id="totalWords">0</div>
                            <div>كلمة مكتوبة</div>
                        </div>
                    </div>
                    <div class="card">
                        <h4>⏱️ وقت الكتابة</h4>
                        <div style="text-align: center; margin: 15px 0;">
                            <div style="font-size: 2rem; font-weight: bold;" id="writingTime">0</div>
                            <div>دقيقة كتابة</div>
                        </div>
                    </div>
                    <div class="card">
                        <h4>🎯 الإنتاجية</h4>
                        <div style="text-align: center; margin: 15px 0;">
                            <div style="font-size: 2rem; font-weight: bold;" id="productivity">0</div>
                            <div>كلمة/دقيقة</div>
                        </div>
                    </div>
                </div>
            </section>
        `;

        this.updateStatistics();
    }

    // ===== دوال مساعد الذكاء الاصطناعي =====

    askAI(action) {
        const textarea = document.getElementById('writingInput');
        const aiRequest = document.getElementById('aiRequest');
        
        if (!aiRequest) return;

        let requestText = '';
        
        switch(action) {
            case 'improve':
                requestText = 'ساعدني في تحسين صياغة هذا النص';
                break;
            case 'expand':
                requestText = 'أريد توسيع هذا النص وإضافة المزيد من التفاصيل';
                break;
            case 'summarize':
                requestText = 'لخص هذا النص من فضلك';
                break;
            case 'grammar':
                requestText = 'قوم هذا النص لغوياً';
                break;
            case 'title':
                requestText = 'اقترح علي عناوين مناسبة لهذا النص';
                break;
            case 'ideas':
                requestText = 'أعطني أفكاراً للكتابة';
                break;
        }
        
        if (textarea && textarea.value) {
            requestText += ': ' + textarea.value.substring(0, 100) + (textarea.value.length > 100 ? '...' : '');
        }
        
        aiRequest.value = requestText;
    }

    processAIRequest() {
        const aiRequest = document.getElementById('aiRequest');
        if (!aiRequest) return;

        const request = aiRequest.value.trim();
        if (!request) {
            this.showToast('يرجى كتابة طلب للمساعد', 'error');
            return;
        }

        this.showToast('جاري معالجة طلبك...', 'info');

        // محاكاة استجابة الذكاء الاصطناعي
        setTimeout(() => {
            const responses = {
                'improve': 'حسناً، سأقوم بتحسين صياغة النص لجعله أكثر سلاسة واحترافية...',
                'expand': 'سأقوم بتوسيع النص وإضافة تفاصيل إضافية لإثراء المحتوى...',
                'summarize': 'سألخص النص للحفاظ على الأفكار الرئيسية مع تقليل الحجم...',
                'grammar': 'سأقوم بالتدقيق اللغوي وتصحيح الأخطاء الإملائية والنحوية...',
                'title': 'سأقترح مجموعة من العناوين الجذابة والمناسبة للمحتوى...',
                'ideas': 'سأقدم لك مجموعة من الأفكار الإبداعية للكتابة...'
            };

            const action = Object.keys(responses).find(key => 
                request.includes(key) || this.containsArabicKeyword(request, key)
            );

            const response = responses[action] || 'سأقوم بمساعدتك في طلبك. هذا رد عام من المساعد الذكي.';

            const aiResponse = document.getElementById('aiResponse');
            const aiResponseContent = document.getElementById('aiResponseContent');

            if (aiResponse && aiResponseContent) {
                aiResponseContent.textContent = response + '\n\n' + this.generateSampleResponse(request);
                aiResponse.style.display = 'block';
            }

            this.showToast('تمت معالجة طلبك بنجاح! 🤖', 'success');

            // حفظ الطلب في السجل
            this.saveAIRequest(request, response);

        }, 2000);
    }

    containsArabicKeyword(request, action) {
        const keywords = {
            'improve': ['تحسين', 'صياغة', 'أحسن'],
            'expand': ['توسيع', 'تفاصيل', 'أضف'],
            'summarize': ['لخص', 'ملخص', 'اختصار'],
            'grammar': ['قوم', 'لغوياً', 'إملائي'],
            'title': ['عناوين', 'عنوان', 'عناوين'],
            'ideas': ['أفكار', 'فكرة', 'اقتراحات']
        };

        return keywords[action]?.some(keyword => request.includes(keyword)) || false;
    }

    generateSampleResponse(request) {
        return `هذا نموذج للاستجابة بناءً على طلبك: "${request.substring(0, 50)}..."

في التطبيق الحقيقي، سيقوم الذكاء الاصطناعي المتقدم بتحليل نصك وإعطاء ردود مخصصة ومفصلة تساعدك في تحسين كتاباتك بشكل كبير.`;
    }

    applyAIResponse() {
        this.showToast('تم تطبيق اقتراح المساعد على النص! ✨', 'success');
    }

    regenerateAIResponse() {
        this.showToast('جاري إعادة توليد الرد...', 'info');
        setTimeout(() => {
            this.showToast('تم إعادة توليد الرد بنجاح!', 'success');
        }, 1000);
    }

    saveAIRequest(request, response) {
        if (this.currentUser) {
            this.currentUser.aiRequests = this.currentUser.aiRequests || [];
            this.currentUser.aiRequests.push({
                id: 'ai_' + Date.now(),
                request: request,
                response: response,
                timestamp: new Date().toISOString()
            });
            
            localStorage.setItem('kuttab_user', JSON.stringify(this.currentUser));
            this.updateStatistics();
        }
    }

    // ===== دوال الأدوات المتقدمة =====

    openCharacterDevelopment() {
        this.showToast('أداة تطوير الشخصيات - قريباً! 🎭', 'info');
    }

    openPlotBuilder() {
        this.showToast('أداة بناء الحبكة - قريباً! 📖', 'info');
    }

    openWorldBuilding() {
        this.showToast('أداة بناء العالم - قريباً! 🌍', 'info');
    }

    openDialogueHelper() {
        this.showToast('مساعد الحوار - قريباً! 💬', 'info');
    }

    openResearchHelper() {
        this.showToast('مساعد البحث - قريباً! 🔍', 'info');
    }

    openWritingPrompts() {
        const prompts = [
            "اكتب عن شخص وجد مفتاحاً قديماً غير متوقع النتائج...",
            "اكتب قصة تبدأ في محطة قطار مهجورة...",
            "اكتب عن لقاء مع نسخة من نفسك من المستقبل...",
            "اكتب عن كتاب يغير حياة من يقرأه...",
            "اكتب عن يوم استيقظ فيه الجميع وهم يتكلمون لغة واحدة فقط..."
        ];
        
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        const textarea = document.getElementById('writingInput');
        if (textarea) {
            textarea.value = randomPrompt;
            this.updateWritingStats();
            this.showToast('تم توليد فكرة كتابية! 💡', 'success');
        }
    }

    // ===== دوال العروض الأخرى =====

    renderSocialView() {
        // سيتم تنفيذها في social.js
        document.getElementById('social-tab').innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2><i class="fas fa-share-alt"></i> التواصل الاجتماعي</h2>
                </div>
                <p>جاري تحميل محتوى التواصل الاجتماعي...</p>
            </div>
        `;
    }

    renderGalleryView() {
        // سيتم تنفيذها في storage.js
        document.getElementById('gallery-tab').innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2><i class="fas fa-images"></i> معرض الأعمال</h2>
                </div>
                <p>جاري تحميل المعرض...</p>
            </div>
        `;
    }

    renderLearningView() {
        document.getElementById('learning-tab').innerHTML = `
            <section class="learning-card">
                <h2><i class="fas fa-graduation-cap"></i> مركز تعلم الكتابة</h2>
                <p>دورات مجانية وشاملة لتحسين مهاراتك في الكتابة</p>
            </section>

            <section class="card">
                <div class="card-header">
                    <h2>📚 دورات الكتابة المجانية</h2>
                </div>
                <div class="grid-2">
                    <div class="card">
                        <h4>🖋️ أساسيات الكتابة الإبداعية</h4>
                        <p>دورة شاملة للمبتدئين في الكتابة</p>
                        <ul style="margin: 15px 0; padding-right: 20px;">
                            <li>بناء الشخصيات</li>
                            <li>تطوير الحبكة</li>
                            <li>كتابة الحوار</li>
                            <li>الوصف والتشبيه</li>
                        </ul>
                        <button class="btn" style="width: 100%;">بدء الدورة</button>
                    </div>
                    <div class="card">
                        <h4>📖 فن كتابة الرواية</h4>
                        <p>من الفكرة إلى النشر</p>
                        <ul style="margin: 15px 0; padding-right: 20px;">
                            <li>هيكلة الرواية</li>
                            <li>تطوير الشخصيات</li>
                            <li>إدارة الزمن</li>
                            <li>التعديل والمراجعة</li>
                        </ul>
                        <button class="btn" style="width: 100%;">بدء الدورة</button>
                    </div>
                </div>
            </section>
        `;
    }

    renderCommunityView() {
        document.getElementById('community-tab').innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2><i class="fas fa-users"></i> مجتمع الكتاب</h2>
                </div>
                <p>جاري تحميل مجتمع الكتاب...</p>
            </div>
        `;
    }

    renderPublishingView() {
        document.getElementById('publishing-tab').innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2><i class="fas fa-book"></i> النشر والمكتبة</h2>
                </div>
                <p>جاري تحميل خيارات النشر...</p>
            </div>
        `;
    }

    renderAdminView() {
        if (this.currentUser?.role !== 'admin') {
            this.showToast('غير مصرح - تحتاج صلاحيات مشرف', 'error');
            this.switchTab('writing');
            return;
        }

        document.getElementById('admin-tab').innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2><i class="fas fa-crown"></i> لوحة تحكم المشرف</h2>
                </div>
                <p>جاري تحميل لوحة المشرف...</p>
            </div>
        `;
    }

    renderLogin() {
        // تم تنفيذها في HTML
    }
}

// ===== تهيئة التطبيق عند تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', function() {
    // إنشاء نسخة عالمية من التطبيق
    window.kuttabApp = new KuttabApp();
    
    // جعل الدوال متاحة عالمياً
    window.switchTab = (tabName) => window.kuttabApp.switchTab(tabName);
    window.handleLogin = (event) => {
        event.preventDefault();
        window.kuttabApp.handleLogin(event);
    };
});

// ===== دالة تسجيل الدخول =====
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        window.kuttabApp.showToast('يرجى ملء جميع الحقول', 'error');
        return;
    }

    window.kuttabApp.showToast('جاري تسجيل الدخول...', 'info');

    // محاكاة تسجيل الدخول (في التطبيق الحقيقي سيكون اتصال بالخادم)
    setTimeout(() => {
        const userData = {
            id: 'user_' + Date.now(),
            username: username,
            fullName: username,
            role: username === 'مشرف' ? 'admin' : 'user',
            stats: {
                totalWords: 0,
                writingTime: 0,
                activeDays: 1
            },
            savedWorks: [],
            aiRequests: [],
            gallery: []
        };

        // حفظ بيانات المستخدم
        localStorage.setItem('kuttab_token', 'mock_jwt_token_' + Date.now());
        localStorage.setItem('kuttab_user', JSON.stringify(userData));

        window.kuttabApp.currentUser = userData;
        window.kuttabApp.showApp();
        window.kuttabApp.showToast(`مرحباً بك ${username}! 🎉`, 'success');
    }, 1500);
}
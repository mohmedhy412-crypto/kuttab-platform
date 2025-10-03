// ===== إدارة التخزين ورفع الملفات =====

class StorageManager {
    constructor() {
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    }

    // توليد اسم فريد للملف
    generateFileName(originalName, userId, category = 'general') {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const extension = originalName.split('.').pop();
        const safeName = originalName.replace(/[^a-zA-Z0-9.\-]/g, '_');
        
        return `${category}_${timestamp}_${randomString}_${userId}.${extension}`;
    }

    // رفع ملف إلى الخادم
    async uploadFile(file, category = 'general') {
        try {
            // التحقق من حجم الملف
            if (file.size > this.maxFileSize) {
                throw new Error(`حجم الملف كبير جداً. الحد الأقصى: ${this.formatFileSize(this.maxFileSize)}`);
            }

            // التحقق من نوع الملف
            if (!this.allowedTypes.includes(file.type)) {
                throw new Error('نوع الملف غير مدعوم. الأنواع المسموحة: JPEG, PNG, GIF, PDF');
            }

            const user = authManager.getUser();
            if (!user) {
                throw new Error('يجب تسجيل الدخول لرفع الملفات');
            }

            const formData = new FormData();
            const fileName = this.generateFileName(file.name, user.id, category);
            
            formData.append('file', file);
            formData.append('fileName', fileName);
            formData.append('category', category);
            formData.append('userId', user.id);

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authManager.getToken()}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'فشل رفع الملف');
            }

            return { 
                success: true, 
                file: data.file,
                message: 'تم رفع الملف بنجاح'
            };
        } catch (error) {
            console.error('Upload error:', error);
            return { 
                success: false, 
                error: error.message || 'حدث خطأ أثناء رفع الملف' 
            };
        }
    }

    // جلب ملفات المستخدم
    async getUserFiles(category = null) {
        try {
            const user = authManager.getUser();
            if (!user) {
                throw new Error('يجب تسجيل الدخول');
            }

            const url = category ? 
                `/api/files/${user.id}?category=${category}` : 
                `/api/files/${user.id}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${authManager.getToken()}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'فشل جلب الملفات');
            }

            return { success: true, files: data.files };
        } catch (error) {
            console.error('Get files error:', error);
            return { 
                success: false, 
                error: error.message || 'حدث خطأ أثناء جلب الملفات' 
            };
        }
    }

    // حذف ملف
    async deleteFile(fileId) {
        try {
            const response = await fetch(`/api/files/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authManager.getToken()}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'فشل حذف الملف');
            }

            return { success: true, message: 'تم حذف الملف بنجاح' };
        } catch (error) {
            console.error('Delete file error:', error);
            return { 
                success: false, 
                error: error.message || 'حدث خطأ أثناء حذف الملف' 
            };
        }
    }

    // معاينة الصورة قبل الرفع
    previewImage(file, previewElement) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                previewElement.innerHTML = `
                    <div class="upload-preview-item">
                        <img src="${e.target.result}" alt="معاينة الصورة">
                        <div class="remove-upload" onclick="this.parentElement.remove()">×</div>
                    </div>
                `;
                resolve(e.target.result);
            };
            
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // تنسيق حجم الملف
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // التحقق من دعم نوع الملف
    isFileTypeSupported(file) {
        return this.allowedTypes.includes(file.type);
    }

    // الحصول على أنواع الملفات المسموحة
    getAllowedFileTypes() {
        return this.allowedTypes;
    }

    // إضافة عمل للمعرض
    async addToGallery(workData) {
        try {
            const response = await fetch('/api/gallery', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authManager.getToken()}`
                },
                body: JSON.stringify(workData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'فشل إضافة العمل للمعرض');
            }

            return { success: true, work: data.work, message: 'تم إضافة العمل للمعرض بنجاح' };
        } catch (error) {
            console.error('Add to gallery error:', error);
            return { 
                success: false, 
                error: error.message || 'حدث خطأ أثناء إضافة العمل للمعرض' 
            };
        }
    }

    // جلب أعمال المعرض
    async getGalleryWorks(userId = null) {
        try {
            const url = userId ? `/api/gallery/user/${userId}` : '/api/gallery';
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${authManager.getToken()}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'فشل جلب أعمال المعرض');
            }

            return { success: true, works: data.works };
        } catch (error) {
            console.error('Get gallery error:', error);
            return { 
                success: false, 
                error: error.message || 'حدث خطأ أثناء جلب أعمال المعرض' 
            };
        }
    }

    // حذف عمل من المعرض
    async deleteGalleryWork(workId) {
        try {
            const response = await fetch(`/api/gallery/${workId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authManager.getToken()}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'فشل حذف العمل');
            }

            return { success: true, message: 'تم حذف العمل بنجاح' };
        } catch (error) {
            console.error('Delete gallery work error:', error);
            return { 
                success: false, 
                error: error.message || 'حدث خطأ أثناء حذف العمل' 
            };
        }
    }

    // حفظ العمل الحالي
    saveCurrentWork(content, title = null) {
        try {
            const user = authManager.getUser();
            if (!user) return;

            const works = this.getUserWorks();
            const workId = 'work_' + Date.now();
            
            const work = {
                id: workId,
                title: title || `عملي ${new Date().toLocaleDateString('ar-AR')}`,
                content: content,
                wordCount: content.split(/\s+/).length,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            works.push(work);
            localStorage.setItem(`kuttab_works_${user.id}`, JSON.stringify(works));

            return work;
        } catch (error) {
            console.error('Save work error:', error);
            return null;
        }
    }

    // جلب أعمال المستخدم
    getUserWorks() {
        try {
            const user = authManager.getUser();
            if (!user) return [];

            const works = localStorage.getItem(`kuttab_works_${user.id}`);
            return works ? JSON.parse(works) : [];
        } catch (error) {
            console.error('Get user works error:', error);
            return [];
        }
    }

    // حذف عمل
    deleteUserWork(workId) {
        try {
            const user = authManager.getUser();
            if (!user) return false;

            const works = this.getUserWorks();
            const updatedWorks = works.filter(work => work.id !== workId);
            
            localStorage.setItem(`kuttab_works_${user.id}`, JSON.stringify(updatedWorks));
            return true;
        } catch (error) {
            console.error('Delete work error:', error);
            return false;
        }
    }

    // تصدير العمل كملف نصي
    exportWorkAsText(work) {
        const content = `عنوان العمل: ${work.title}\n\n${work.content}\n\n---\nتم الإنشاء في: ${new Date(work.createdAt).toLocaleString('ar-AR')}\nتم التحديث في: ${new Date(work.updatedAt).toLocaleString('ar-AR')}\nعدد الكلمات: ${work.wordCount}\n\nمنصة كُتّاب - المنصة المجانية للكتاب والمؤلفين`;
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = `${work.title.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // نسخ النص للحافظة
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Copy to clipboard error:', error);
            
            // طريقة بديلة للمتصفحات القديمة
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        }
    }
}

// ===== معالجات واجهة المستخدم =====

// فتح نافذة رفع الملف
function openUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// إغلاق نافذة رفع الملف
function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.style.display = 'none';
        // مسح المعاينة
        const preview = document.getElementById('galleryImagePreview');
        if (preview) preview.innerHTML = '';
        
        // مسح الحقول
        const titleInput = document.getElementById('workTitle');
        const descInput = document.getElementById('workDescription');
        if (titleInput) titleInput.value = '';
        if (descInput) descInput.value = '';
    }
}

// معالجة رفع صورة المنشور
function handlePostImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const storage = new StorageManager();
    const preview = document.getElementById('postImagePreview');
    
    if (!preview) return;

    // التحقق من نوع الملف
    if (!storage.isFileTypeSupported(file)) {
        showToast('نوع الملف غير مدعوم. الرجاء اختيار صورة (JPEG, PNG, GIF)', 'error');
        return;
    }

    // التحقق من الحجم
    if (file.size > storage.maxFileSize) {
        showToast(`حجم الملف كبير جداً. الحد الأقصى: ${storage.formatFileSize(storage.maxFileSize)}`, 'error');
        return;
    }

    storage.previewImage(file, preview)
        .then(() => {
            showToast('تم تحميل معاينة الصورة', 'success');
        })
        .catch(error => {
            console.error('Preview error:', error);
            showToast('فشل تحميل معاينة الصورة', 'error');
        });
}

// معالجة رفع صورة المعرض
function handleGalleryImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const storage = new StorageManager();
    const preview = document.getElementById('galleryImagePreview');
    
    if (!preview) return;

    // التحقق من نوع الملف
    if (!storage.isFileTypeSupported(file)) {
        showToast('نوع الملف غير مدعوم. الرجاء اختيار صورة (JPEG, PNG, GIF)', 'error');
        return;
    }

    // التحقق من الحجم
    if (file.size > storage.maxFileSize) {
        showToast(`حجم الملف كبير جداً. الحد الأقصى: ${storage.formatFileSize(storage.maxFileSize)}`, 'error');
        return;
    }

    storage.previewImage(file, preview)
        .then(() => {
            showToast('تم تحميل معاينة الصورة', 'success');
        })
        .catch(error => {
            console.error('Preview error:', error);
            showToast('فشل تحميل معاينة الصورة', 'error');
        });
}

// إضافة عمل للمعرض
async function addToGallery() {
    const titleInput = document.getElementById('workTitle');
    const descInput = document.getElementById('workDescription');
    const preview = document.getElementById('galleryImagePreview');
    
    if (!titleInput || !descInput || !preview) return;

    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    const previewImg = preview.querySelector('img');

    if (!title) {
        showToast('يرجى إدخال عنوان العمل', 'error');
        return;
    }

    if (!previewImg) {
        showToast('يرجى رفع صورة للعمل', 'error');
        return;
    }

    const storage = new StorageManager();
    
    // في التطبيق الحقيقي، هنا سنقوم برفع الصورة أولاً
    // لكن للتبسيط سنستخدم البيانات المحلية
    
    const workData = {
        title: title,
        description: description,
        image: previewImg.src, // في التطبيق الحقيقي سيكون رابط الملف المرفوع
        category: 'artwork'
    };

    const result = await storage.addToGallery(workData);
    
    if (result.success) {
        showToast(result.message, 'success');
        closeUploadModal();
        
        // تحديث المعرض
        if (window.kuttabApp && window.kuttabApp.currentView === 'gallery') {
            window.kuttabApp.renderGalleryView();
        }
    } else {
        showToast(result.error, 'error');
    }
}

// فتح نافذة عرض الصورة
function openImageModal(imageSrc) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    
    if (modal && modalImage) {
        modalImage.src = imageSrc;
        modal.style.display = 'flex';
    }
}

// إغلاق نافذة عرض الصورة
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ===== تهيئة مدير التخزين =====
const storageManager = new StorageManager();

// جعل الدوال متاحة عالمياً
window.storageManager = storageManager;
window.openUploadModal = openUploadModal;
window.closeUploadModal = closeUploadModal;
window.handlePostImageUpload = handlePostImageUpload;
window.handleGalleryImageUpload = handleGalleryImageUpload;
window.addToGallery = addToGallery;
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;
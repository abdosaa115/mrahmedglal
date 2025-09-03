document.addEventListener('DOMContentLoaded', function() {
    // Firebase Configuration
    const firebaseConfig = {
      apiKey: "AIzaSyCFWzsA6RgY0GPD-h5TQHcR72C5DtDloi8",
      authDomain: "ahmedglal-9ed3b.firebaseapp.com",
      projectId: "ahmedglal-9ed3b",
      storageBucket: "ahmedglal-9ed3b.firebasestorage.app",
      messagingSenderId: "618517679057",
      appId: "1:618517679057:web:457d8f45fb98884c6c2ef0",
      measurementId: "G-E2RKE7301D"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- Element Selectors ---
    const signupForm = document.getElementById('signupForm');
    const usernameInput = document.getElementById('username');
    const studentNameInput = document.getElementById('studentName');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const passwordInput = document.getElementById('password');
    const educationLevelSelect = document.getElementById('educationLevel');
    const idDocumentInput = document.getElementById('idDocument');
    const idDocumentPreview = document.getElementById('idDocumentPreview');
    const fileUploadStatus = document.querySelector('.file-upload-status');

    if (!signupForm) {
        console.error("Signup form not found!");
        return;
    }

    // --- Image Preview Logic ---
    idDocumentInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                idDocumentPreview.src = e.target.result;
                idDocumentPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
            fileUploadStatus.textContent = file.name;
        } else {
            idDocumentPreview.src = '';
            idDocumentPreview.style.display = 'none';
            fileUploadStatus.textContent = 'لم يتم اختيار ملف';
        }
    });

    // --- Form Submission Logic ---
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault(); // Prevent page refresh

        const idDocumentFile = idDocumentInput.files[0];
        if (!validateForm(idDocumentFile)) {
            return;
        }

        const submitBtn = signupForm.querySelector('.signup-btn');
        submitBtn.disabled = true;
        showMessage('جاري رفع الملف...', 'loading');

        try {
            const birthCertificateUrl = await uploadFile(idDocumentFile);
            showMessage('جاري إنشاء الحساب...', 'loading');

            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            const email = `${username}@example.com`;

            // Check if username is taken
            const usernameDoc = await db.collection("usernames").doc(username).get();
            if (usernameDoc.exists) {
                throw new Error('اسم المستخدم هذا مسجل بالفعل.');
            }

            // Create user in Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Save user data to Firestore
            const studentName = studentNameInput.value.trim();
            const phoneNumber = phoneNumberInput.value.trim();
            const educationLevel = educationLevelSelect.value;

            const batch = db.batch();
            const userRef = db.collection("users").doc(user.uid);
            batch.set(userRef, {
                username: username,
                name: studentName,
                phone: phoneNumber,
                grade: getGradeName(educationLevel),
                gradeCode: educationLevel,
                status: 'active',
                role: 'student',
                birthCertificateUrl: birthCertificateUrl,
                registeredAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const newUsernameRef = db.collection("usernames").doc(username);
            batch.set(newUsernameRef, { uid: user.uid });

            await batch.commit();

            showMessage('تم إنشاء الحساب بنجاح! سيتم توجيهك لتسجيل الدخول', 'success');
            signupForm.reset();
            idDocumentPreview.style.display = 'none';
            fileUploadStatus.textContent = 'لم يتم اختيار ملف';
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);

        } catch (error) {
            let errorMessage = error.message;
            if (error.code === 'auth/weak-password') {
                errorMessage = 'كلمة المرور ضعيفة جدًا. يجب أن تتكون من 6 أحرف على الأقل.';
            } else if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'اسم المستخدم هذا مسجل بالفعل.';
            }
            showMessage(errorMessage, 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });

    // --- Helper Functions ---
    function validateForm(file) {
        // Basic validation, can be expanded
        if (!file) {
            showMessage('يرجى اختيار ملف شهادة الميلاد', 'error');
            return false;
        }
        return true;
    }

    function getGradeName(gradeCode) {
        const grades = {
            'grade5': 'الصف الخامس الابتدائي', 'grade6': 'الصف السادس الابتدائي', 'grade7': 'الصف الأول الإعدادي',
            'grade8': 'الصف الثاني الإعدادي', 'grade9': 'الصف الثالث الإعدادي', 'grade10': 'الصف الأول الثانوي',
            'grade11': 'الصف الثاني الثانوي', 'grade12': 'الصف الثالث الثانوي'
        };
        return grades[gradeCode] || gradeCode;
    }

    function showMessage(message, type) {
        const existingMessage = document.querySelector('.message');
        if (existingMessage) { existingMessage.remove(); }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-' + type;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        if (type !== 'loading') {
            setTimeout(() => { if (messageDiv.parentNode) { messageDiv.remove(); } }, 4000);
        }
    }

    function uploadFile(file) {
        return new Promise((resolve, reject) => {
            const CLOUD_NAME = 'drqum29ax';
            const UPLOAD_PRESET = 'ahmedglal';
            const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', UPLOAD_PRESET);

            fetch(url, { method: 'POST', body: formData })
                .then(response => response.json())
                .then(data => {
                    if (data.secure_url) {
                        resolve(data.secure_url);
                    } else {
                        reject(new Error("Cloudinary upload failed."));
                    }
                })
                .catch(error => reject(new Error("Upload network error.")));
        });
    }
});
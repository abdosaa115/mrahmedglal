document.addEventListener('DOMContentLoaded', function() {
    // Your web app's Firebase configuration
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

    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const signupLink = document.getElementById('signupLink');

    // معالجة تسجيل الدخول
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!username || !password) {
            showMessage('يرجى ملء جميع الحقول', 'error');
            return;
        }
        
        showMessage('جاري تسجيل الدخول...', 'loading');
        
        // Since Firebase Auth uses email, we construct a dummy email
        const email = `${username}@example.com`;

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in 
                const user = userCredential.user;
                
                // Check user role from Firestore
                db.collection("users").doc(user.uid).get().then((doc) => {
                    if (doc.exists) {
                        const userData = doc.data();
                        if (userData.role === 'admin') {
                            showMessage('مرحباً بك في لوحة الإدارة!', 'success');
                            setTimeout(() => {
                                window.location.href = 'admin.html';
                            }, 1500);
                        } else {
                             if (userData.status === 'active') {
                                showMessage('تم تسجيل الدخول بنجاح!', 'success');
                                localStorage.setItem('currentUser', JSON.stringify({uid: user.uid, ...userData}));
                                setTimeout(() => {
                                    window.location.href = 'dashboard.html';
                                }, 1500);
                            } else {
                                showMessage('تم حظر هذا الحساب. يرجى التواصل مع الإدارة', 'error');
                                auth.signOut();
                            }
                        }
                    } else {
                        showMessage('لم يتم العثور على بيانات المستخدم.', 'error');
                        auth.signOut();
                    }
                }).catch((error) => {
                    showMessage("خطأ في جلب بيانات المستخدم: " + error.message, "error");
                    auth.signOut();
                });
            })
            .catch((error) => {
                let errorMessage = "حدث خطأ غير متوقع.";
                switch (error.code) {
                    case 'auth/user-not-found':
                        errorMessage = 'اسم المستخدم غير مسجل.';
                        break;
                    case 'auth/wrong-password':
                        errorMessage = 'كلمة المرور غير صحيحة.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'صيغة اسم المستخدم غير صحيحة.';
                        break;
                    default:
                        errorMessage = 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.';
                        console.error("Login error:", error);
                }
                showMessage(errorMessage, 'error');
            });
    });

    // معالجة رابط التسجيل - توجيه إلى صفحة التسجيل
    signupLink.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = 'signup.html';
    });

    // دالة لإظهار الرسائل
    function showMessage(message, type) {
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-' + type;
        messageDiv.textContent = message;
        
        messageDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 15px 20px; border-radius: 10px; color: white; font-weight: 600; z-index: 1000; animation: slideIn 0.3s ease-out; max-width: 300px; text-align: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);';
        
        switch(type) {
            case 'success':
                messageDiv.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
                break;
            case 'error':
                messageDiv.style.background = 'linear-gradient(135deg, #f44336, #da190b)';
                break;
            case 'loading':
                messageDiv.style.background = 'linear-gradient(135deg, #2196F3, #0b7dda)';
                break;
            case 'info':
                messageDiv.style.background = 'linear-gradient(135deg, #FF9800, #e68900)';
                break;
        }
        
        document.body.appendChild(messageDiv);
        
        if (type !== 'loading') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.style.animation = 'slideOut 0.3s ease-out';
                    setTimeout(() => {
                        messageDiv.remove();
                    }, 300);
                }
            }, 3000);
        }
    }

    const style = document.createElement('style');
    style.textContent = '@keyframes slideIn { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } } @keyframes slideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }';
    document.head.appendChild(style);

    usernameInput.focus();
});


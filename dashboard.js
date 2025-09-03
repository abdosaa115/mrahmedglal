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
    let currentUserId = null;

    // --- Authentication Check ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            fetchUserData(user.uid);
        } else {
            window.location.href = 'index.html';
        }
    });

    async function fetchUserData(userId) {
        try {
            const userDoc = await db.collection("users").doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                displayStudentInfo(userData);
                // Fetch all data needed for the dashboard in parallel
                const [solutions, examGrades] = await Promise.all([
                    db.collection('solutions').where('studentId', '==', userId).get(),
                    db.collection('exam_grades').where('studentId', '==', userId).get()
                ]);

                const solutionsMap = new Map(solutions.docs.map(doc => [doc.data().assignmentId, doc.data()]));
                const examGradesMap = new Map(examGrades.docs.map(doc => [doc.data().examId, doc.data()]));

                loadAssignments(userData.gradeCode, solutionsMap);
                loadExams(userData.gradeCode, examGradesMap);
            } else {
                logout();
            }
        } catch (error) {
            console.error("Error fetching user data: ", error);
            logout();
        }
    }

    function displayStudentInfo(student) {
        document.getElementById('studentWelcome').textContent = `أهلاً بك، ${student.name || 'طالب'}`;
        document.getElementById('studentName').textContent = `اسم الطالب: ${student.name || 'طالب'}`;
        document.getElementById('studentGrade').textContent = `الصف: ${student.grade || 'غير محدد'}`;
        document.title = `لوحة الطالب - ${student.name || 'طالب'}`;
    }

    // --- Load Assignments ---
    function loadAssignments(gradeCode, solutionsMap) {
        const list = document.getElementById('assignmentsList');
        const counter = document.getElementById('assignmentsCount');
        const noContent = document.getElementById('noAssignments');

        db.collection("assignments").where("gradeCode", "==", gradeCode).orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    noContent.style.display = 'block';
                    list.innerHTML = '';
                    counter.textContent = 0;
                    return;
                }
                noContent.style.display = 'none';
                counter.textContent = snapshot.size;
                let html = '';
                snapshot.forEach(doc => {
                    const assignment = doc.data();
                    const assignmentId = doc.id;
                    const solution = solutionsMap.get(assignmentId);

                    let actionHtml = '';
                    if (solution) {
                        const grade = solution.grade !== null ? solution.grade : 'لم تقيّم بعد';
                        actionHtml = `<div class="submitted-info">تم التسليم بنجاح <br> الدرجة: <strong>${grade}</strong></div>`;
                    } else {
                        actionHtml = `<button class="action-btn upload-btn" data-id="${assignmentId}" data-title="${assignment.title}">رفع الحل</button>`;
                    }

                    html += `
                        <div class="assignment-card">
                            <div class="card-header"><h3 class="card-title">${assignment.title}</h3><span class="card-type assignment-type">واجب</span></div>
                            <div class="card-info"><p>${assignment.description || 'لا يوجد وصف.'}</p></div>
                            <div class="card-actions">${actionHtml}</div>
                        </div>
                    `;
                });
                list.innerHTML = html;
            });
    }

    // --- Load Exams ---
    function loadExams(gradeCode, examGradesMap) {
        const list = document.getElementById('examsList');
        const counter = document.getElementById('examsCount');
        const noContent = document.getElementById('noExams');

        db.collection("exams").where("gradeCode", "==", gradeCode).orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    noContent.style.display = 'block';
                    list.innerHTML = '';
                    counter.textContent = 0;
                    return;
                }
                noContent.style.display = 'none';
                counter.textContent = snapshot.size;
                let html = '';
                snapshot.forEach(doc => {
                    const exam = doc.data();
                    const examId = doc.id;
                    const examGrade = examGradesMap.get(examId);
                    const examDate = exam.createdAt ? exam.createdAt.toDate().toLocaleDateString('ar-EG') : ''

                    let actionHtml = '';
                    if (examGrade) {
                        actionHtml = `<div class="submitted-info">درجتك المسجلة: <strong>${examGrade.grade}</strong></div>`;
                    } else {
                        actionHtml = `
                            <div class="grade-submission">
                                <input type="number" placeholder="أدخل درجتك" class="exam-grade-input" />
                                <button class="action-btn save-exam-grade-btn" data-id="${examId}">حفظ</button>
                            </div>
                        `;
                    }

                    html += `
                        <div class="exam-card">
                            <div class="card-header"><h3 class="card-title">${exam.title}</h3><span class="card-type exam-type">امتحان</span></div>
                            <div class="card-info">
                                <p>${exam.description || 'لا يوجد وصف.'}</p>
                                <small class="date">تاريخ النشر: ${examDate}</small>
                            </div>
                            <div class="card-actions">${actionHtml}</div>
                        </div>
                    `;
                });
                list.innerHTML = html;
            });
    }
    
    // --- Event Handlers for New Features ---
    document.getElementById('examsList').addEventListener('click', async function(e) {
        if (e.target.classList.contains('save-exam-grade-btn')) {
            const examId = e.target.dataset.id;
            const input = e.target.previousElementSibling;
            const grade = input.value;
            if (!grade) return alert('يرجى إدخال الدرجة.');

            try {
                await db.collection('exam_grades').add({ studentId: currentUserId, examId, grade: parseInt(grade), savedAt: firebase.firestore.FieldValue.serverTimestamp() });
                alert('تم حفظ الدرجة بنجاح!');
                e.target.closest('.card-actions').innerHTML = `<div class="submitted-info">درجتك المسجلة: <strong>${grade}</strong></div>`;
            } catch (error) {
                console.error("Error saving exam grade: ", error);
                alert('فشل حفظ الدرجة.');
            }
        }
    });

    // --- Modal, Preview, and Upload Logic (from previous step) ---
    // (The full, correct code for the modal is included here)
    const uploadModal = document.getElementById('uploadModal');
    const uploadForm = document.getElementById('uploadForm');
    const solutionFileInput = document.getElementById('solutionFile');
    const studentNotesInput = document.getElementById('studentNotes');
    const modalTitle = document.getElementById('modalTitle');
    const filePreviewContainer = document.getElementById('filePreviewContainer');

    document.getElementById('assignmentsList').addEventListener('click', function(e) {
        if (e.target.classList.contains('upload-btn')) {
            uploadForm.dataset.assignmentId = e.target.dataset.id;
            modalTitle.textContent = `رفع حل واجب: ${e.target.dataset.title}`;
            uploadModal.style.display = 'flex';
        }
    });

    solutionFileInput.addEventListener('change', () => {
        filePreviewContainer.innerHTML = '';
        if (!solutionFileInput.files) return;

        for (const file of solutionFileInput.files) {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                previewItem.appendChild(img);
            } else if (file.type === 'application/pdf') {
                previewItem.innerHTML = '<div class="pdf-preview"><i class="fas fa-file-pdf"></i></div>';
            }
            const fileName = document.createElement('span');
            fileName.className = 'file-name';
            fileName.textContent = file.name;
            previewItem.appendChild(fileName);
            filePreviewContainer.appendChild(previewItem);
        }
    });

    window.closeUploadModal = function() {
        uploadModal.style.display = 'none';
        uploadForm.reset();
        filePreviewContainer.innerHTML = '';
    }

    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const files = solutionFileInput.files;
        if (files.length === 0) return alert('يرجى اختيار ملف واحد على الأقل.');

        const assignmentId = uploadForm.dataset.assignmentId;
        const studentNotes = studentNotesInput.value.trim();
        const submitBtn = uploadForm.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="loading"></span> جاري رفع (${files.length}) ملفات...`;

        try {
            const uploadPromises = Array.from(files).map(file => uploadFile(file));
            const fileUrls = await Promise.all(uploadPromises);

            await db.collection('solutions').add({
                assignmentId,
                studentId: currentUserId,
                fileUrls,
                notes: studentNotes,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                grade: null
            });
            alert('تم رفع الحل بنجاح!');
            closeUploadModal();
        } catch (error) {
            alert(`فشل رفع الحل: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-upload"></i> رفع الحل';
        }
    });
});

function logout() {
    firebase.auth().signOut().then(() => { window.location.href = 'index.html'; });
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
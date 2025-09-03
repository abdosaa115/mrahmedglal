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

    // --- Authentication Guard ---
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection("users").doc(user.uid).get().then(doc => {
                if (doc.exists && doc.data().role === 'admin') {
                    loadAllData();
                } else {
                    alert("ليس لديك صلاحية الوصول لهذه الصفحة.");
                    window.location.href = 'index.html';
                }
            });
        } else {
            window.location.href = 'index.html';
        }
    });

    function loadAllData() {
        loadAllStudents();
        loadExams();
        loadAssignments();
        loadSubmissions();
    }

    // --- Student Management ---
    const studentsTableBody = document.getElementById('studentsTableBody');
    async function loadAllStudents() {
        if (!studentsTableBody) return;
        studentsTableBody.innerHTML = '<tr><td colspan="6">جاري تحميل الطلاب...</td></tr>';
        try {
            const snapshot = await db.collection("users").where("role", "==", "student").get();
            if (snapshot.empty) {
                studentsTableBody.innerHTML = '<tr class="no-data"><td colspan="6">لا يوجد طلاب مسجلين</td></tr>';
                return;
            }
            let tableHTML = '';
            snapshot.forEach(doc => {
                const student = doc.data();
                const studentId = doc.id;
                const statusText = student.status === 'blocked' ? 'محظور' : 'نشط';
                const statusClass = student.status === 'blocked' ? 'status blocked' : 'status active';
                const blockButtonText = student.status === 'blocked' ? 'إلغاء الحظر' : 'حظر';
                const blockButtonClass = student.status === 'blocked' ? 'action-btn unblock-btn' : 'action-btn block-btn';
                tableHTML += `
                    <tr>
                        <td><strong>${student.name || 'غير متوفر'}</strong></td>
                        <td>${student.username || 'غير متوفر'}</td>
                        <td><span class="grade-badge">${student.grade || 'غير محدد'}</span></td>
                        <td><a href="${student.birthCertificateUrl}" target="_blank"><img src="${student.birthCertificateUrl}" alt="شهادة الميلاد" width="50"/></a></td>
                        <td><span class="${statusClass}">${statusText}</span></td>
                        <td class="actions-cell">
                            <button class="${blockButtonClass}" data-action="block" data-id="${studentId}" data-status="${student.status}">${blockButtonText}</button>
                            <button class="action-btn delete-btn" data-action="delete" data-id="${studentId}" data-username="${student.username}">حذف</button>
                        </td>
                    </tr>
                `;
            });
            studentsTableBody.innerHTML = tableHTML;
        } catch (error) {
            console.error("Error loading students: ", error);
            studentsTableBody.innerHTML = '<tr><td colspan="6">فشل تحميل بيانات الطلاب.</td></tr>';
        }
    }

    studentsTableBody.addEventListener('click', async function(e) {
        const target = e.target.closest('button[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const userId = target.dataset.id;

        if (action === 'block') {
            const currentStatus = target.dataset.status;
            if (confirm(`هل أنت متأكد من ${currentStatus === 'active' ? 'حظر' : 'إلغاء حظر'} هذا الطالب؟`)) {
                try {
                    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
                    await db.collection('users').doc(userId).update({ status: newStatus });
                    alert('تم تحديث حالة الطالب بنجاح.');
                    loadAllStudents();
                } catch (error) {
                    console.error("Error updating student status: ", error);
                    alert('فشل تحديث حالة الطالب.');
                }
            }
        }

        if (action === 'delete') {
            const username = target.dataset.username;
            if (confirm(`هل أنت متأكد من حذف هذا الطالب نهائياً؟\nسيتم حذف بياناته من قاعدة البيانات.`)) {
                try {
                    const batch = db.batch();
                    const userRef = db.collection('users').doc(userId);
                    const usernameRef = db.collection('usernames').doc(username);
                    batch.delete(userRef);
                    batch.delete(usernameRef);
                    await batch.commit();
                    alert('تم حذف بيانات الطالب من قاعدة البيانات بنجاح.\nملاحظة: لحذف الحساب نهائياً من نظام المصادقة، يجب استخدام Cloud Function.');
                    loadAllStudents();
                } catch (error) {
                    console.error("Error deleting student data: ", error);
                    alert('فشل حذف بيانات الطالب.');
                }
            }
        }
    });

    // --- Exam & Assignment Management ---
    const examForm = document.getElementById('examForm');
    const homeworkForm = document.getElementById('homeworkForm');
    const examsTableBody = document.getElementById('examsTableBody');
    const homeworkTableBody = document.getElementById('homeworkTableBody');

    examForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('examTitle').value.trim();
        const description = document.getElementById('examDescription').value.trim();
        const url = document.getElementById('examUrl').value.trim();
        const gradeCode = document.getElementById('examGrade').value;
        if (!title || !url || !gradeCode) return alert('يرجى ملء جميع حقول الامتحان.');

        try {
            await db.collection('exams').add({ title, description, url, gradeCode, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            alert('تم إضافة الامتحان بنجاح!');
            examForm.reset();
        } catch (error) { alert('فشل إضافة الامتحان.'); }
    });

    homeworkForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('homeworkTitle').value.trim();
        const description = document.getElementById('homeworkDescription').value.trim();
        const gradeCode = document.getElementById('homeworkGradeLevel').value;
        if (!title || !description || !gradeCode) return alert('يرجى ملء جميع حقول الواجب.');

        try {
            await db.collection('assignments').add({ title, description, gradeCode, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            alert('تم إضافة الواجب بنجاح!');
            homeworkForm.reset();
        } catch (error) { alert('فشل إضافة الواجب.'); }
    });

    function loadExams() {
        db.collection('exams').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            renderTable(snapshot, examsTableBody, 'امتحانات', renderExamRow);
        });
    }

    function loadAssignments() {
        db.collection('assignments').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            renderTable(snapshot, homeworkTableBody, 'واجبات', renderAssignmentRow);
        });
    }

    function renderTable(snapshot, tableBody, itemType, rowRenderer) {
        if (snapshot.empty) {
            tableBody.innerHTML = `<tr class="no-data"><td colspan="5">لا توجد ${itemType}</td></tr>`;
            return;
        }
        let html = '';
        snapshot.forEach(doc => {
            html += rowRenderer(doc.data(), doc.id);
        });
        tableBody.innerHTML = html;
    }

    function renderExamRow(exam, id) {
        return `
            <tr>
                <td>${exam.title}</td>
                <td><span class="grade-badge">${getGradeName(exam.gradeCode)}</span></td>
                <td>${exam.description}</td>
                <td><a href="${exam.url}" target="_blank">رابط الامتحان</a></td>
                <td class="actions-cell"><button class="action-btn delete-btn" data-collection="exams" data-id="${id}">حذف</button></td>
            </tr>
        `;
    }

    function renderAssignmentRow(assignment, id) {
        return `
            <tr>
                <td>${assignment.title}</td>
                <td><span class="grade-badge">${getGradeName(assignment.gradeCode)}</span></td>
                <td>${assignment.description}</td>
                <td class="actions-cell"><button class="action-btn delete-btn" data-collection="assignments" data-id="${id}">حذف</button></td>
            </tr>
        `;
    }

    document.getElementById('examsTableBody').addEventListener('click', handleDeleteAction);
    document.getElementById('homeworkTableBody').addEventListener('click', handleDeleteAction);

    async function handleDeleteAction(e) {
        const target = e.target.closest('button.delete-btn');
        if (target && target.dataset.collection) {
            const collection = target.dataset.collection;
            const docId = target.dataset.id;
            if (confirm(`هل أنت متأكد من حذف هذا العنصر نهائياً؟`)) {
                try {
                    await db.collection(collection).doc(docId).delete();
                    alert('تم الحذف بنجاح.');
                } catch (error) { alert('فشل الحذف.'); }
            }
        }
    }

    // --- Submission Management ---
    const submissionsTableBody = document.getElementById('submissionsTableBody');
    async function loadSubmissions() {
        if (!submissionsTableBody) return;
        submissionsTableBody.innerHTML = '<tr><td colspan="6">جاري تحميل التسليمات...</td></tr>';

        try {
            const [solutionsSnap, usersSnap, assignmentsSnap] = await Promise.all([
                db.collection('solutions').orderBy('submittedAt', 'desc').get(),
                db.collection('users').get(),
                db.collection('assignments').get()
            ]);

            if (solutionsSnap.empty) {
                submissionsTableBody.innerHTML = '<tr class="no-data"><td colspan="6">لا توجد تسليمات</td></tr>';
                return;
            }

            const usersMap = new Map(usersSnap.docs.map(doc => [doc.id, doc.data()]));
            const assignmentsMap = new Map(assignmentsSnap.docs.map(doc => [doc.id, doc.data()]));

            let html = '';
            solutionsSnap.forEach(doc => {
                const solution = doc.data();
                const student = usersMap.get(solution.studentId) || { name: 'طالب محذوف', username: '-' };
                const assignment = assignmentsMap.get(solution.assignmentId) || { title: 'واجب محذوف' };
                const submittedAt = solution.submittedAt ? solution.submittedAt.toDate().toLocaleString('ar-EG') : 'غير محدد';
                let filesHtml = 'لا توجد ملفات';
                if (Array.isArray(solution.fileUrls) && solution.fileUrls.length > 0) {
                    filesHtml = solution.fileUrls.map((url, index) => `<a href="${url}" target="_blank">ملف ${index + 1}</a>`).join(' | ');
                } else if (typeof solution.fileUrl === 'string') {
                    filesHtml = `<a href="${solution.fileUrl}" target="_blank">ملف 1</a>`;
                }

                html += `
                    <tr>
                        <td><strong>${student.name}</strong><br><small>${student.username}</small></td>
                        <td>${assignment.title}</td>
                        <td class="files-cell">${filesHtml}</td>
                        <td>${submittedAt}</td>
                        <td><input type="number" class="grade-input" value="${solution.grade || ''}" placeholder="--">
                        <td><button class="action-btn save-grade-btn" data-id="${doc.id}">حفظ</button>
                            <button class="action-btn delete-btn" data-collection="solutions" data-id="${doc.id}">حذف</button>
                        </td>
                    </tr>
                `;
            });
            submissionsTableBody.innerHTML = html;

        } catch (error) {
            console.error("Error loading submissions: ", error);
            submissionsTableBody.innerHTML = '<tr><td colspan="6">فشل تحميل التسليمات.</td></tr>';
        }
    }

    submissionsTableBody.addEventListener('click', async function(e) {
        const target = e.target;
        if (target.classList.contains('save-grade-btn')) {
            const submissionId = target.dataset.id;
            const gradeInput = target.closest('tr').querySelector('.grade-input');
            const grade = parseInt(gradeInput.value, 10);
            if (isNaN(grade)) return alert('يرجى إدخال درجة صحيحة.');

            try {
                await db.collection('solutions').doc(submissionId).update({ grade: grade });
                alert('تم حفظ الدرجة بنجاح!');
                target.style.backgroundColor = '#28a745'; // Green feedback
            } catch (error) { alert('فشل حفظ الدرجة.'); }
        }
    });

    // --- Helper Functions ---
    function getGradeName(gradeCode) {
        const grades = {
            'grade5': 'الصف الخامس الابتدائي', 'grade6': 'الصف السادس الابتدائي', 'grade7': 'الصف الأول الإعدادي',
            'grade8': 'الصف الثاني الإعدادي', 'grade9': 'الصف الثالث الإعدادي', 'grade10': 'الصف الأول الثانوي',
            'grade11': 'الصف الثاني الثانوي', 'grade12': 'الصف الثالث الثانوي'
        };
        return grades[gradeCode] || gradeCode;
    }
});

function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        firebase.auth().signOut().then(() => { window.location.href = 'index.html'; });
    }
}
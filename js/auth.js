// js/auth.js
document.addEventListener('DOMContentLoaded', function() {
    // Các phần tử DOM
    const userProfile = document.getElementById('userProfile');
    const userName = document.getElementById('userName');
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const logoutLink = document.getElementById('logoutLink');
    const adminLink = document.getElementById('adminLink');
    const authModal = document.getElementById('authModal');
    const closeModal = document.querySelector('.close-modal');
    const loginTabBtn = document.getElementById('loginTabBtn');
    const registerTabBtn = document.getElementById('registerTabBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const loginError = document.getElementById('loginError');
    const registerError = document.getElementById('registerError');
    
    // Kiểm tra trạng thái đăng nhập
    auth.onAuthStateChanged(user => {
        if (user) {
            // Người dùng đã đăng nhập
            userName.textContent = user.displayName || user.email.split('@')[0];
            loginLink.style.display = 'none';
            registerLink.style.display = 'none';
            logoutLink.style.display = 'block';
            
            // Kiểm tra quyền admin
            checkAdmin(user.uid);
        } else {
            // Người dùng chưa đăng nhập
            userName.textContent = 'Tài khoản';
            loginLink.style.display = 'block';
            registerLink.style.display = 'block';
            logoutLink.style.display = 'none';
            adminLink.style.display = 'none';
        }
    });
    
    // Mở modal đăng nhập
    loginLink.addEventListener('click', function(e) {
        e.preventDefault();
        authModal.style.display = 'flex';
        showLoginForm();
    });
    
    // Mở modal đăng ký
    registerLink.addEventListener('click', function(e) {
        e.preventDefault();
        authModal.style.display = 'flex';
        showRegisterForm();
    });
    
    // Đóng modal
    closeModal.addEventListener('click', function() {
        authModal.style.display = 'none';
        clearErrors();
    });
    
    // Đóng modal khi click bên ngoài
    window.addEventListener('click', function(e) {
        if (e.target === authModal) {
            authModal.style.display = 'none';
            clearErrors();
        }
    });
    
    // Chuyển tab đăng nhập
    loginTabBtn.addEventListener('click', function() {
        showLoginForm();
    });
    
    // Chuyển tab đăng ký
    registerTabBtn.addEventListener('click', function() {
        showRegisterForm();
    });
    
    // Đăng nhập
    loginBtn.addEventListener('click', function() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            showError(loginError, 'Vui lòng điền đầy đủ thông tin');
            return;
        }
        
        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                // Đăng nhập thành công
                authModal.style.display = 'none';
                clearErrors();
                clearFormFields();
                alert('Đăng nhập thành công!');
            })
            .catch(error => {
                showError(loginError, getAuthErrorMessage(error.code));
            });
    });
    
    // Đăng ký
    registerBtn.addEventListener('click', function() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        
        if (!name || !email || !password || !confirmPassword) {
            showError(registerError, 'Vui lòng điền đầy đủ thông tin');
            return;
        }
        
        if (password.length < 6) {
            showError(registerError, 'Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }
        
        if (password !== confirmPassword) {
            showError(registerError, 'Mật khẩu xác nhận không khớp');
            return;
        }
        
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                // Cập nhật tên hiển thị
                return userCredential.user.updateProfile({
                    displayName: name
                });
            })
            .then(() => {
                // Tạo bản ghi người dùng trong Firestore
                return db.collection('users').doc(auth.currentUser.uid).set({
                    name: name,
                    email: email,
                    role: 'customer',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                // Đăng ký thành công
                authModal.style.display = 'none';
                clearErrors();
                clearFormFields();
                alert('Đăng ký thành công!');
            })
            .catch(error => {
                showError(registerError, getAuthErrorMessage(error.code));
            });
    });
    
    // Đăng xuất
    logoutLink.addEventListener('click', function(e) {
        e.preventDefault();
        auth.signOut()
            .then(() => {
                alert('Đã đăng xuất thành công');
                // Chuyển về trang chủ nếu đang ở trang admin
                if (window.location.pathname.includes('admin.html')) {
                    window.location.href = 'index.html';
                }
            })
            .catch(error => {
                alert('Lỗi khi đăng xuất: ' + error.message);
            });
    });
    
    // Hàm hiển thị form đăng nhập
    function showLoginForm() {
        loginTabBtn.classList.add('active');
        registerTabBtn.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        clearErrors();
    }
    
    // Hàm hiển thị form đăng ký
    function showRegisterForm() {
        registerTabBtn.classList.add('active');
        loginTabBtn.classList.remove('active');
        registerForm.style.display = 'block';
        loginForm.style.display = 'none';
        clearErrors();
    }
    
    // Hàm hiển thị lỗi
    function showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }
    
    // Hàm xóa lỗi
    function clearErrors() {
        loginError.style.display = 'none';
        registerError.style.display = 'none';
        loginError.textContent = '';
        registerError.textContent = '';
    }
    
    // Hàm xóa nội dung form
    function clearFormFields() {
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerConfirmPassword').value = '';
    }
    
    // Hàm kiểm tra quyền admin
    function checkAdmin(userId) {
        db.collection('users').doc(userId).get()
            .then(doc => {
                if (doc.exists && doc.data().role === 'admin') {
                    adminLink.style.display = 'block';
                } else {
                    adminLink.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Lỗi khi kiểm tra quyền admin:', error);
            });
    }
    
    // Hàm chuyển đổi mã lỗi Firebase sang thông báo tiếng Việt
    function getAuthErrorMessage(errorCode) {
        const errorMessages = {
            'auth/invalid-email': 'Email không hợp lệ',
            'auth/user-disabled': 'Tài khoản đã bị vô hiệu hóa',
            'auth/user-not-found': 'Không tìm thấy tài khoản với email này',
            'auth/wrong-password': 'Mật khẩu không chính xác',
            'auth/email-already-in-use': 'Email đã được sử dụng',
            'auth/weak-password': 'Mật khẩu quá yếu',
            'auth/operation-not-allowed': 'Hoạt động không được phép',
            'auth/too-many-requests': 'Quá nhiều yêu cầu. Vui lòng thử lại sau'
        };
        
        return errorMessages[errorCode] || 'Đã xảy ra lỗi. Vui lòng thử lại';
    }

});
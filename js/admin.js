// js/admin.js - FILE HOÀN CHỈNH
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra Firebase đã khởi tạo chưa
    if (typeof db === 'undefined' || typeof auth === 'undefined') {
        console.error('Firebase chưa được khởi tạo');
        showError('Hệ thống quản trị chưa sẵn sàng. Vui lòng tải lại trang.');
        return;
    }
    
    // Kiểm tra đăng nhập và quyền admin
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        // Kiểm tra quyền admin
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                if (!doc.exists || doc.data().role !== 'admin') {
                    alert('Bạn không có quyền truy cập trang quản trị');
                    window.location.href = 'index.html';
                } else {
                    // Hiển thị tên admin
                    document.getElementById('adminUserName').textContent = 
                        `Xin chào, ${user.displayName || user.email.split('@')[0]}`;
                    
                    // Setup upload ảnh
                    setupImageUpload();
                    
                    // Load dữ liệu admin
                    loadDashboardData();
                    loadProducts();
                    loadUsers();
                    loadOrders();
                }
            })
            .catch(error => {
                console.error('Lỗi khi kiểm tra quyền admin:', error);
                alert('Lỗi khi kiểm tra quyền truy cập: ' + error.message);
                window.location.href = 'index.html';
            });
    });
    
    // Xử lý chuyển tab
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            
            // Cập nhật active state
            document.querySelectorAll('.sidebar-nav a').forEach(item => {
                item.classList.remove('active');
            });
            this.classList.add('active');
            
            // Hiển thị section tương ứng
            document.querySelectorAll('.admin-section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(targetId).classList.add('active');
            
            // Cập nhật tiêu đề
            document.getElementById('adminPageTitle').textContent = 
                this.textContent.replace(/<i.*?>.*?<\/i>/g, '').trim();
                
            // Load dữ liệu cho tab được chọn
            switch(targetId) {
                case 'dashboard':
                    loadDashboardData();
                    break;
                case 'products':
                    loadProducts();
                    break;
                case 'users':
                    loadUsers();
                    break;
                case 'orders':
                    loadOrders();
                    break;
            }
        });
    });
    
    // Xử lý đăng xuất admin
    document.getElementById('adminLogoutBtn').addEventListener('click', function() {
        if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
            auth.signOut()
                .then(() => {
                    window.location.href = 'index.html';
                })
                .catch(error => {
                    alert('Lỗi khi đăng xuất: ' + error.message);
                });
        }
    });
    
    // Xử lý thêm sản phẩm
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', function() {
            openProductModal();
        });
    }
    
    // Xử lý form sản phẩm
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProduct();
        });
    }
    
    // Đóng modal sản phẩm
    const closeModalBtn = document.querySelector('#productModal .close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeProductModal);
    }
});

// ========== HÀM HELPER ==========

// Hàm định dạng giá tiền
function formatPrice(price) {
    if (typeof price !== 'number') {
        price = parseFloat(price) || 0;
    }
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Hàm định dạng ngày tháng
function formatDate(date) {
    if (!date) return 'N/A';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Hàm lấy tên danh mục
function getCategoryName(category) {
    const categories = {
        'laptop': 'Laptop',
        'pc': 'PC - Máy tính để bàn',
        'component': 'Linh kiện máy tính',
        'accessory': 'Phụ kiện',
        'monitor': 'Màn hình'
    };
    
    return categories[category] || category;
}

// Hàm lấy class trạng thái
function getStatusClass(status) {
    const statusClasses = {
        'pending': 'pending',
        'processing': 'processing',
        'shipped': 'shipped',
        'completed': 'completed',
        'cancelled': 'cancelled'
    };
    
    return statusClasses[status] || 'pending';
}

// Hàm lấy tên trạng thái
function getStatusText(status) {
    const statusTexts = {
        'pending': 'Chờ xử lý',
        'processing': 'Đang xử lý',
        'shipped': 'Đang giao hàng',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy'
    };
    
    return statusTexts[status] || status;
}

// Hàm lấy tên phương thức thanh toán
function getPaymentMethodText(method) {
    const methods = {
        'cod': 'COD',
        'bank_transfer': 'Chuyển khoản',
        'momo': 'MoMo'
    };
    return methods[method] || method || 'N/A';
}

// Hàm lấy trạng thái thanh toán
function getPaymentStatusText(status) {
    const statuses = {
        'pending': 'Chờ thanh toán',
        'paid': 'Đã thanh toán',
        'failed': 'Thất bại'
    };
    return statuses[status] || status || 'N/A';
}

// Hàm hiển thị lỗi
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'admin-error';
    errorDiv.innerHTML = `
        <div style="background: #f8d7da; color: #721c24; padding: 15px; margin: 20px; border-radius: 5px; border: 1px solid #f5c6cb;">
            <i class="fas fa-exclamation-circle"></i> ${message}
            <button onclick="this.parentElement.parentElement.remove()" style="float: right; background: none; border: none; color: #721c24; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    const mainContent = document.querySelector('.admin-main');
    if (mainContent) {
        mainContent.insertBefore(errorDiv, mainContent.firstChild);
    }
}

// ========== SETUP UPLOAD ẢNH ==========

function setupImageUpload() {
    const imageUpload = document.getElementById('imageUpload');
    if (imageUpload) {
        imageUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // Kiểm tra file type
            if (!file.type.match('image.*')) {
                alert('Vui lòng chọn file ảnh (JPEG, PNG, GIF)');
                return;
            }
            
            // Kiểm tra kích thước file (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert('File ảnh quá lớn. Vui lòng chọn file nhỏ hơn 2MB');
                return;
            }
            
            // Tạo URL tạm thời để preview
            const reader = new FileReader();
            reader.onload = function(e) {
                // Hiển thị preview
                let previewContainer = document.getElementById('imagePreview');
                if (!previewContainer) {
                    previewContainer = document.createElement('div');
                    previewContainer.id = 'imagePreview';
                    previewContainer.style.marginTop = '10px';
                    imageUpload.parentNode.appendChild(previewContainer);
                }
                
                previewContainer.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <img src="${e.target.result}" style="max-width: 100px; max-height: 100px; border-radius: 4px;">
                        <span style="color: #28a745; font-size: 14px;">
                            <i class="fas fa-check-circle"></i> Ảnh đã được chọn
                        </span>
                    </div>
                `;
                
                // Cập nhật URL ảnh vào input
                document.getElementById('productImage').value = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
}

// ========== DASHBOARD ==========

// Biến phân trang
let currentProductPage = 1;
let currentOrderPage = 1;
let currentUserPage = 1;
const itemsPerPage = 10;

function loadDashboardData() {
    showLoading('#dashboard');
    
    // Đếm sản phẩm
    db.collection('products').get()
        .then(querySnapshot => {
            document.getElementById('totalProducts').textContent = querySnapshot.size;
        })
        .catch(error => {
            console.error('Lỗi khi đếm sản phẩm:', error);
        });
    
    // Đếm người dùng
    db.collection('users').get()
        .then(querySnapshot => {
            document.getElementById('totalUsers').textContent = querySnapshot.size;
        })
        .catch(error => {
            console.error('Lỗi khi đếm người dùng:', error);
        });
    
    // Đếm đơn hàng và tính doanh thu
    db.collection('orders').get()
        .then(querySnapshot => {
            document.getElementById('totalOrders').textContent = querySnapshot.size;
            
            let totalRevenue = 0;
            let pendingOrders = 0;
            let completedOrders = 0;
            
            querySnapshot.forEach(doc => {
                const order = doc.data();
                if (order.total) {
                    if (order.status === 'completed') {
                        totalRevenue += order.total;
                        completedOrders++;
                    } else if (order.status === 'pending') {
                        pendingOrders++;
                    }
                }
            });
            
            document.getElementById('totalRevenue').textContent = formatPrice(totalRevenue) + 'đ';
            document.getElementById('completedOrders').textContent = completedOrders;
            document.getElementById('pendingOrders').textContent = pendingOrders;
        })
        .catch(error => {
            console.error('Lỗi khi đếm đơn hàng:', error);
        });
    
    // Load đơn hàng gần đây
    loadRecentOrders();
}

function loadRecentOrders() {
    db.collection('orders')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get()
        .then(querySnapshot => {
            const tbody = document.querySelector('#recentOrdersTable tbody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            if (querySnapshot.empty) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 30px; color: #6c757d;">
                            <i class="fas fa-inbox" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                            Chưa có đơn hàng nào
                        </td>
                    </tr>
                `;
                return;
            }
            
            querySnapshot.forEach(doc => {
                const order = doc.data();
                order.id = doc.id;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${order.orderId || order.id.substring(0, 8).toUpperCase()}</td>
                    <td>${order.customerName || 'Khách hàng'}</td>
                    <td>${formatDate(order.createdAt?.toDate())}</td>
                    <td>${formatPrice(order.total || 0)}đ</td>
                    <td>
                        <span class="status-badge ${getStatusClass(order.status)}">
                            ${getStatusText(order.status)}
                        </span>
                    </td>
                    <td>
                        <button class="btn-action" onclick="viewOrderDetail('${order.id}')" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action" onclick="updateOrderStatus('${order.id}')" title="Cập nhật trạng thái">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                `;
                
                tbody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Lỗi khi tải đơn hàng gần đây:', error);
            const tbody = document.querySelector('#recentOrdersTable tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 30px; color: #dc3545;">
                            <i class="fas fa-exclamation-triangle"></i> Lỗi khi tải dữ liệu
                        </td>
                    </tr>
                `;
            }
        });
}

// ========== QUẢN LÝ SẢN PHẨM ==========

function loadProducts() {
    showLoading('#products');
    
    const tbody = document.querySelector('#productsTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="loading"><div class="loading-spinner"></div> Đang tải sản phẩm...</td></tr>';
    
    db.collection('products')
        .orderBy('createdAt', 'desc')
        .get()
        .then(querySnapshot => {
            tbody.innerHTML = '';
            
            if (querySnapshot.empty) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: #6c757d;">
                            <i class="fas fa-box-open" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                            Chưa có sản phẩm nào
                        </td>
                    </tr>
                `;
                return;
            }
            
            let products = [];
            querySnapshot.forEach(doc => {
                const product = doc.data();
                product.id = doc.id;
                products.push(product);
            });
            
            // Phân trang
            const totalProducts = products.length;
            const totalPages = Math.ceil(totalProducts / itemsPerPage);
            const startIndex = (currentProductPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, totalProducts);
            
            const pageProducts = products.slice(startIndex, endIndex);
            
            pageProducts.forEach(product => {
                const discountPercent = product.originalPrice ? 
                    Math.round((1 - product.price / product.originalPrice) * 100) : 0;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <img src="${product.image || 'https://via.placeholder.com/50x50/cccccc/969696?text=SP'}" 
                             alt="${product.name}" 
                             class="product-thumb"
                             onerror="this.src='https://via.placeholder.com/50x50/cccccc/969696?text=SP'">
                    </td>
                    <td>
                        <strong>${product.name}</strong><br>
                        <small style="color: #6c757d;">${product.brand || 'Không có thương hiệu'}</small>
                    </td>
                    <td>${getCategoryName(product.category)}</td>
                    <td>
                        <strong style="color: #dc3545;">${formatPrice(product.price)}đ</strong>
                        ${product.originalPrice ? 
                            `<br><small style="text-decoration: line-through; color: #6c757d;">${formatPrice(product.originalPrice)}đ</small>` : ''}
                        ${discountPercent > 0 ? 
                            `<br><small style="color: #28a745;">-${discountPercent}%</small>` : ''}
                    </td>
                    <td>
                        <span class="stock-badge ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                            ${product.stock > 0 ? product.stock : 'Hết hàng'}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${product.active ? 'active' : 'inactive'}">
                            ${product.active ? 'Hiển thị' : 'Ẩn'}
                        </span>
                        ${product.featured ? '<br><small class="featured-badge">Nổi bật</small>' : ''}
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action" onclick="editProduct('${product.id}')" title="Sửa">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-danger" onclick="deleteProduct('${product.id}')" title="Xóa">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                
                tbody.appendChild(row);
            });
            
            // Hiển thị phân trang
            displayPagination('productPagination', totalPages, currentProductPage, 'changeProductPage');
            
        })
        .catch(error => {
            console.error('Lỗi khi tải sản phẩm:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle"></i> Lỗi khi tải sản phẩm: ${error.message}
                    </td>
                </tr>
            `;
        });
}

// ========== QUẢN LÝ NGƯỜI DÙNG ==========

function loadUsers() {
    showLoading('#users');
    
    const tbody = document.querySelector('#usersTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="loading"><div class="loading-spinner"></div> Đang tải người dùng...</td></tr>';
    
    db.collection('users')
        .orderBy('createdAt', 'desc')
        .get()
        .then(querySnapshot => {
            tbody.innerHTML = '';
            
            if (querySnapshot.empty) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 40px; color: #6c757d;">
                            <i class="fas fa-users" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                            Chưa có người dùng nào
                        </td>
                    </tr>
                `;
                return;
            }
            
            let users = [];
            querySnapshot.forEach(doc => {
                const user = doc.data();
                user.id = doc.id;
                users.push(user);
            });
            
            // Phân trang
            const totalUsers = users.length;
            const totalPages = Math.ceil(totalUsers / itemsPerPage);
            const startIndex = (currentUserPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, totalUsers);
            
            const pageUsers = users.slice(startIndex, endIndex);
            
            pageUsers.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><code>${user.id.substring(0, 8)}...</code></td>
                    <td>
                        <strong>${user.name || 'Chưa có tên'}</strong><br>
                        <small>${user.email}</small>
                    </td>
                    <td>
                        <span class="role-badge ${user.role}">
                            ${user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}
                        </span>
                    </td>
                    <td>${formatDate(user.createdAt?.toDate())}</td>
                    <td>
                        ${user.lastLogin ? formatDate(user.lastLogin?.toDate()) : 'Chưa đăng nhập'}
                    </td>
                    <td>
                        <div class="action-buttons">
                            ${user.role !== 'admin' ? 
                                `<button class="btn-action btn-success" onclick="makeAdmin('${user.id}')" title="Cấp quyền admin">
                                    <i class="fas fa-user-shield"></i>
                                </button>` : 
                                `<button class="btn-action btn-warning" onclick="removeAdmin('${user.id}')" title="Xóa quyền admin">
                                    <i class="fas fa-user-times"></i>
                                </button>`
                            }
                            ${user.role !== 'admin' ? 
                                `<button class="btn-action btn-danger" onclick="deleteUser('${user.id}')" title="Xóa người dùng">
                                    <i class="fas fa-trash"></i>
                                </button>` : ''
                            }
                        </div>
                    </td>
                `;
                
                tbody.appendChild(row);
            });
            
            // Hiển thị phân trang
            displayPagination('userPagination', totalPages, currentUserPage, 'changeUserPage');
            
        })
        .catch(error => {
            console.error('Lỗi khi tải người dùng:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle"></i> Lỗi khi tải người dùng: ${error.message}
                    </td>
                </tr>
            `;
        });
}

// ========== QUẢN LÝ ĐƠN HÀNG ==========

function loadOrders() {
    showLoading('#orders');
    
    const tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="8" class="loading"><div class="loading-spinner"></div> Đang tải đơn hàng...</td></tr>';
    
    db.collection('orders')
        .orderBy('createdAt', 'desc')
        .get()
        .then(querySnapshot => {
            tbody.innerHTML = '';
            
            if (querySnapshot.empty) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 40px; color: #6c757d;">
                            <i class="fas fa-shopping-cart" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                            Chưa có đơn hàng nào
                        </td>
                    </tr>
                `;
                return;
            }
            
            let orders = [];
            querySnapshot.forEach(doc => {
                const order = doc.data();
                order.id = doc.id;
                orders.push(order);
            });
            
            // Phân trang
            const totalOrders = orders.length;
            const totalPages = Math.ceil(totalOrders / itemsPerPage);
            const startIndex = (currentOrderPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, totalOrders);
            
            const pageOrders = orders.slice(startIndex, endIndex);
            
            pageOrders.forEach(order => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><code>${order.orderId || order.id.substring(0, 8).toUpperCase()}</code></td>
                    <td>
                        <strong>${order.customerName || 'Khách hàng'}</strong><br>
                        <small>${order.customerPhone || 'Không có số điện thoại'}</small>
                    </td>
                    <td>${formatPrice(order.total || 0)}đ</td>
                    <td>
                        <span class="status-badge ${getStatusClass(order.status)}">
                            ${getStatusText(order.status)}
                        </span>
                    </td>
                    <td>${getPaymentMethodText(order.paymentMethod)}</td>
                    <td>
                        <span class="payment-status ${order.paymentStatus || 'pending'}">
                            ${getPaymentStatusText(order.paymentStatus)}
                        </span>
                    </td>
                    <td>${formatDate(order.createdAt?.toDate())}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action" onclick="viewOrderDetail('${order.id}')" title="Xem chi tiết">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-action" onclick="updateOrderStatus('${order.id}')" title="Cập nhật trạng thái">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                `;
                
                tbody.appendChild(row);
            });
            
            // Hiển thị phân trang
            displayPagination('orderPagination', totalPages, currentOrderPage, 'changeOrderPage');
            
        })
        .catch(error => {
            console.error('Lỗi khi tải đơn hàng:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle"></i> Lỗi khi tải đơn hàng: ${error.message}
                    </td>
                </tr>
            `;
        });
}

// ========== PHÂN TRANG ==========

function displayPagination(containerId, totalPages, currentPage, changePageFunction) {
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.className = 'pagination';
        document.querySelector('.table-container').appendChild(container);
    }
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Nút Previous
    if (currentPage > 1) {
        paginationHTML += `
            <button class="page-btn" onclick="${changePageFunction}(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
    }
    
    // Trang đầu
    paginationHTML += `
        <button class="page-btn ${currentPage === 1 ? 'active' : ''}" onclick="${changePageFunction}(1)">
            1
        </button>
    `;
    
    // Dấu ... nếu cần
    if (currentPage > 3) {
        paginationHTML += `<span class="page-dots">...</span>`;
    }
    
    // Các trang xung quanh trang hiện tại
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = startPage; i <= endPage; i++) {
        if (i > 1 && i < totalPages) {
            paginationHTML += `
                <button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="${changePageFunction}(${i})">
                    ${i}
                </button>
            `;
        }
    }
    
    // Dấu ... nếu cần
    if (currentPage < totalPages - 2) {
        paginationHTML += `<span class="page-dots">...</span>`;
    }
    
    // Trang cuối (nếu có nhiều hơn 1 trang)
    if (totalPages > 1) {
        paginationHTML += `
            <button class="page-btn ${currentPage === totalPages ? 'active' : ''}" onclick="${changePageFunction}(${totalPages})">
                ${totalPages}
            </button>
        `;
    }
    
    // Nút Next
    if (currentPage < totalPages) {
        paginationHTML += `
            <button class="page-btn" onclick="${changePageFunction}(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }
    
    container.innerHTML = paginationHTML;
}

function changeProductPage(page) {
    currentProductPage = page;
    loadProducts();
    scrollToTop();
}

function changeUserPage(page) {
    currentUserPage = page;
    loadUsers();
    scrollToTop();
}

function changeOrderPage(page) {
    currentOrderPage = page;
    loadOrders();
    scrollToTop();
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== MODAL SẢN PHẨM ==========

function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    
    if (productId) {
        // Chế độ chỉnh sửa
        title.textContent = 'Chỉnh sửa sản phẩm';
        
        showLoading('#productModal .modal-content');
        
        db.collection('products').doc(productId).get()
            .then(doc => {
                if (doc.exists) {
                    const product = doc.data();
                    
                    document.getElementById('productId').value = productId;
                    document.getElementById('productName').value = product.name || '';
                    document.getElementById('productCategory').value = product.category || '';
                    document.getElementById('productPrice').value = product.price || 0;
                    document.getElementById('productOriginalPrice').value = product.originalPrice || '';
                    document.getElementById('productStock').value = product.stock || 0;
                    document.getElementById('productBrand').value = product.brand || '';
                    document.getElementById('productRating').value = product.rating || 0;
                    document.getElementById('productDescription').value = product.description || '';
                    document.getElementById('productImage').value = product.image || '';
                    document.getElementById('productFeatured').checked = product.featured || false;
                    document.getElementById('productActive').checked = product.active !== false;
                    
                    // Hiển thị preview ảnh nếu có
                    if (product.image) {
                        let previewContainer = document.getElementById('imagePreview');
                        if (!previewContainer) {
                            previewContainer = document.createElement('div');
                            previewContainer.id = 'imagePreview';
                            previewContainer.style.marginTop = '10px';
                            document.getElementById('imageUpload').parentNode.appendChild(previewContainer);
                        }
                        previewContainer.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                <img src="${product.image}" style="max-width: 100px; max-height: 100px; border-radius: 4px;">
                                <span style="color: #6c757d; font-size: 14px;">
                                    <i class="fas fa-image"></i> Ảnh hiện tại
                                </span>
                            </div>
                        `;
                    }
                    
                    hideLoading('#productModal .modal-content');
                }
            })
            .catch(error => {
                console.error('Lỗi khi tải thông tin sản phẩm:', error);
                alert('Không thể tải thông tin sản phẩm: ' + error.message);
                hideLoading('#productModal .modal-content');
            });
    } else {
        // Chế độ thêm mới
        title.textContent = 'Thêm sản phẩm mới';
        
        // Reset form
        document.getElementById('productForm').reset();
        document.getElementById('productId').value = '';
        document.getElementById('productActive').checked = true;
        
        // Xóa preview ảnh
        const previewContainer = document.getElementById('imagePreview');
        if (previewContainer) {
            previewContainer.remove();
        }
    }
    
    modal.style.display = 'flex';
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    
    // Reset form
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    
    // Xóa preview ảnh
    const previewContainer = document.getElementById('imagePreview');
    if (previewContainer) {
        previewContainer.remove();
    }
}

function saveProduct() {
    const productId = document.getElementById('productId').value;
    const productData = {
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('productCategory').value,
        price: parseInt(document.getElementById('productPrice').value) || 0,
        originalPrice: parseInt(document.getElementById('productOriginalPrice').value) || null,
        stock: parseInt(document.getElementById('productStock').value) || 0,
        brand: document.getElementById('productBrand').value.trim() || '',
        rating: parseFloat(document.getElementById('productRating').value) || 0,
        description: document.getElementById('productDescription').value.trim() || '',
        image: document.getElementById('productImage').value.trim() || 'https://via.placeholder.com/300x200/cccccc/969696?text=Sản+phẩm',
        featured: document.getElementById('productFeatured').checked,
        active: document.getElementById('productActive').checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Validate
    if (!productData.name) {
        alert('Vui lòng nhập tên sản phẩm');
        return;
    }
    
    if (!productData.category) {
        alert('Vui lòng chọn danh mục');
        return;
    }
    
    if (productData.price <= 0) {
        alert('Vui lòng nhập giá hợp lệ');
        return;
    }
    
    const saveBtn = document.getElementById('saveProductBtn');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Đang lưu...';
    
    // Thêm createdAt nếu là sản phẩm mới
    if (!productId) {
        productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }
    
    const promise = productId ? 
        db.collection('products').doc(productId).update(productData) :
        db.collection('products').add(productData);
    
    promise
        .then(() => {
            alert(productId ? 'Cập nhật sản phẩm thành công' : 'Thêm sản phẩm thành công');
            closeProductModal();
            loadProducts();
            loadDashboardData();
        })
        .catch(error => {
            console.error('Lỗi khi lưu sản phẩm:', error);
            alert('Lỗi khi lưu sản phẩm: ' + error.message);
        })
        .finally(() => {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        });
}

// ========== QUẢN LÝ SẢN PHẨM ==========

function editProduct(productId) {
    openProductModal(productId);
}

function deleteProduct(productId) {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này không? Hành động này không thể hoàn tác.')) {
        return;
    }
    
    db.collection('products').doc(productId).delete()
        .then(() => {
            alert('Xóa sản phẩm thành công');
            loadProducts();
            loadDashboardData();
        })
        .catch(error => {
            console.error('Lỗi khi xóa sản phẩm:', error);
            alert('Lỗi khi xóa sản phẩm: ' + error.message);
        });
}

// ========== QUẢN LÝ NGƯỜI DÙNG ==========

function makeAdmin(userId) {
    if (!confirm('Bạn có chắc chắn muốn cấp quyền admin cho người dùng này?')) {
        return;
    }
    
    db.collection('users').doc(userId).update({
        role: 'admin',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        alert('Đã cấp quyền admin thành công');
        loadUsers();
        loadDashboardData();
    })
    .catch(error => {
        console.error('Lỗi khi cấp quyền admin:', error);
        alert('Lỗi khi cấp quyền admin: ' + error.message);
    });
}

function removeAdmin(userId) {
    if (!confirm('Bạn có chắc chắn muốn xóa quyền admin của người dùng này?')) {
        return;
    }
    
    db.collection('users').doc(userId).update({
        role: 'customer',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        alert('Đã xóa quyền admin thành công');
        loadUsers();
        loadDashboardData();
    })
    .catch(error => {
        console.error('Lỗi khi xóa quyền admin:', error);
        alert('Lỗi khi xóa quyền admin: ' + error.message);
    });
}

function deleteUser(userId) {
    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này không? Hành động này không thể hoàn tác.')) {
        return;
    }
    
    db.collection('users').doc(userId).delete()
        .then(() => {
            alert('Xóa người dùng thành công');
            loadUsers();
            loadDashboardData();
        })
        .catch(error => {
            console.error('Lỗi khi xóa người dùng:', error);
            alert('Lỗi khi xóa người dùng: ' + error.message);
        });
}

// ========== QUẢN LÝ ĐƠN HÀNG ==========

function viewOrderDetail(orderId) {
    showLoading('body');
    
    db.collection('orders').doc(orderId).get()
        .then(doc => {
            if (!doc.exists) {
                alert('Không tìm thấy đơn hàng');
                hideLoading('body');
                return;
            }
            
            const order = doc.data();
            order.id = orderId;
            
            // Tạo modal chi tiết đơn hàng
            const modalHTML = `
                <div class="modal" id="orderDetailModal">
                    <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                        <span class="close-modal" onclick="closeModal('orderDetailModal')">&times;</span>
                        <h2>Chi tiết đơn hàng</h2>
                        <h3 style="color: #007bff; margin-bottom: 20px;">${order.orderId || order.id.substring(0, 8).toUpperCase()}</h3>
                        
                        <div class="order-detail-container">
                            <div class="order-info-section">
                                <h4><i class="fas fa-user"></i> Thông tin khách hàng</h4>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <strong>Tên:</strong> ${order.customerName || 'N/A'}
                                    </div>
                                    <div class="info-item">
                                        <strong>Email:</strong> ${order.customerEmail || 'N/A'}
                                    </div>
                                    <div class="info-item">
                                        <strong>Điện thoại:</strong> ${order.customerPhone || 'N/A'}
                                    </div>
                                    <div class="info-item">
                                        <strong>Địa chỉ:</strong> ${order.shippingAddress || 'N/A'}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="order-info-section">
                                <h4><i class="fas fa-receipt"></i> Thông tin đơn hàng</h4>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <strong>Ngày đặt:</strong> ${formatDate(order.createdAt?.toDate())}
                                    </div>
                                    <div class="info-item">
                                        <strong>Trạng thái:</strong> 
                                        <span class="status-badge ${getStatusClass(order.status)}">
                                            ${getStatusText(order.status)}
                                        </span>
                                    </div>
                                    <div class="info-item">
                                        <strong>Phương thức TT:</strong> ${getPaymentMethodText(order.paymentMethod)}
                                    </div>
                                    <div class="info-item">
                                        <strong>Trạng thái TT:</strong> 
                                        <span class="payment-status ${order.paymentStatus || 'pending'}">
                                            ${getPaymentStatusText(order.paymentStatus)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            ${order.notes ? `
                            <div class="order-info-section">
                                <h4><i class="fas fa-sticky-note"></i> Ghi chú</h4>
                                <p style="background: #f8f9fa; padding: 10px; border-radius: 4px;">${order.notes}</p>
                            </div>` : ''}
                            
                            <div class="order-info-section">
                                <h4><i class="fas fa-box"></i> Sản phẩm</h4>
                                <div class="order-items-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th width="50%">Sản phẩm</th>
                                                <th width="15%">Đơn giá</th>
                                                <th width="10%">SL</th>
                                                <th width="25%">Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${order.items && order.items.length > 0 ? 
                                                order.items.map(item => `
                                                    <tr>
                                                        <td>${item.name || 'Sản phẩm'}</td>
                                                        <td>${formatPrice(item.price || 0)}đ</td>
                                                        <td>${item.quantity || 1}</td>
                                                        <td>${formatPrice((item.price || 0) * (item.quantity || 1))}đ</td>
                                                    </tr>
                                                `).join('') : 
                                                '<tr><td colspan="4" style="text-align: center; padding: 20px;">Không có sản phẩm</td></tr>'
                                            }
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colspan="2"></td>
                                                <td style="text-align: right;"><strong>Tạm tính:</strong></td>
                                                <td><strong>${formatPrice(order.subtotal || 0)}đ</strong></td>
                                            </tr>
                                            <tr>
                                                <td colspan="2"></td>
                                                <td style="text-align: right;"><strong>Phí vận chuyển:</strong></td>
                                                <td><strong>${formatPrice(order.shippingFee || 0)}đ</strong></td>
                                            </tr>
                                            <tr>
                                                <td colspan="2"></td>
                                                <td style="text-align: right;"><strong>Giảm giá:</strong></td>
                                                <td><strong>-${formatPrice(order.discount || 0)}đ</strong></td>
                                            </tr>
                                            <tr style="background: #f8f9fa;">
                                                <td colspan="2"></td>
                                                <td style="text-align: right;"><strong>Tổng cộng:</strong></td>
                                                <td><strong style="color: #dc3545; font-size: 18px;">${formatPrice(order.total || 0)}đ</strong></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                            
                            <div class="order-actions-section">
                                <h4><i class="fas fa-cog"></i> Thao tác</h4>
                                <div class="action-buttons">
                                    <button class="btn-action" onclick="updateOrderStatusPrompt('${orderId}', 'processing')">
                                        <i class="fas fa-check-circle"></i> Xác nhận đơn
                                    </button>
                                    <button class="btn-action" onclick="updateOrderStatusPrompt('${orderId}', 'shipped')">
                                        <i class="fas fa-shipping-fast"></i> Đang giao hàng
                                    </button>
                                    <button class="btn-action btn-success" onclick="updateOrderStatusPrompt('${orderId}', 'completed')">
                                        <i class="fas fa-check-double"></i> Hoàn thành
                                    </button>
                                    <button class="btn-action btn-danger" onclick="updateOrderStatusPrompt('${orderId}', 'cancelled')">
                                        <i class="fas fa-times-circle"></i> Hủy đơn
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Thêm modal vào body
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Hiển thị modal
            document.getElementById('orderDetailModal').style.display = 'flex';
            hideLoading('body');
            
        })
        .catch(error => {
            console.error('Lỗi khi tải chi tiết đơn hàng:', error);
            alert('Không thể tải chi tiết đơn hàng: ' + error.message);
            hideLoading('body');
        });
}

function updateOrderStatusPrompt(orderId, newStatus) {
    const statusText = getStatusText(newStatus);
    if (confirm(`Bạn có chắc chắn muốn cập nhật trạng thái đơn hàng thành "${statusText}"?`)) {
        updateOrderStatus(orderId, newStatus);
    }
}

function updateOrderStatus(orderId, newStatus) {
    showLoading('#orderDetailModal .modal-content');
    
    db.collection('orders').doc(orderId).update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        alert('Cập nhật trạng thái đơn hàng thành công');
        
        // Đóng modal và reload dữ liệu
        closeModal('orderDetailModal');
        loadDashboardData();
        loadOrders();
        hideLoading('#orderDetailModal .modal-content');
        
    })
    .catch(error => {
        console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error);
        alert('Lỗi khi cập nhật trạng thái: ' + error.message);
        hideLoading('#orderDetailModal .modal-content');
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        // Xóa modal khỏi DOM sau khi đóng
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
}

// ========== UTILITY FUNCTIONS ==========

function showLoading(selector) {
    const element = document.querySelector(selector);
    if (element) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>Đang tải...</p>
            </div>
        `;
        element.appendChild(loadingDiv);
    }
}

function hideLoading(selector) {
    const element = document.querySelector(selector);
    if (element) {
        const loadingOverlay = element.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
}

// ========== THÊM CSS DINAMIC ==========

// Thêm CSS cho admin
const adminStyles = `
    <style>
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .loading-content {
            text-align: center;
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .status-badge.pending {
            background: #fff3cd;
            color: #856404;
        }
        
        .status-badge.processing {
            background: #cce5ff;
            color: #004085;
        }
        
        .status-badge.shipped {
            background: #d1ecf1;
            color: #0c5460;
        }
        
        .status-badge.completed {
            background: #d4edda;
            color: #155724;
        }
        
        .status-badge.cancelled {
            background: #f8d7da;
            color: #721c24;
        }
        
        .status-badge.active {
            background: #d4edda;
            color: #155724;
        }
        
        .status-badge.inactive {
            background: #f8d7da;
            color: #721c24;
        }
        
        .role-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .role-badge.admin {
            background: #d4edda;
            color: #155724;
        }
        
        .role-badge.customer {
            background: #cce5ff;
            color: #004085;
        }
        
        .stock-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .stock-badge.in-stock {
            background: #d4edda;
            color: #155724;
        }
        
        .stock-badge.out-of-stock {
            background: #f8d7da;
            color: #721c24;
        }
        
        .featured-badge {
            display: inline-block;
            padding: 2px 6px;
            background: #ffc107;
            color: #212529;
            border-radius: 8px;
            font-size: 10px;
            font-weight: 600;
            margin-top: 2px;
        }
        
        .payment-status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .payment-status.pending {
            background: #fff3cd;
            color: #856404;
        }
        
        .payment-status.paid {
            background: #d4edda;
            color: #155724;
        }
        
        .payment-status.failed {
            background: #f8d7da;
            color: #721c24;
        }
        
        .action-buttons {
            display: flex;
            gap: 5px;
        }
        
        .btn-action {
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 4px;
            background: #f8f9fa;
            color: #495057;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
        }
        
        .btn-action:hover {
            background: #e9ecef;
        }
        
        .btn-action.btn-danger {
            background: #f8d7da;
            color: #721c24;
        }
        
        .btn-action.btn-danger:hover {
            background: #f5c6cb;
        }
        
        .btn-action.btn-success {
            background: #d4edda;
            color: #155724;
        }
        
        .btn-action.btn-success:hover {
            background: #c3e6cb;
        }
        
        .btn-action.btn-warning {
            background: #fff3cd;
            color: #856404;
        }
        
        .btn-action.btn-warning:hover {
            background: #ffeaa7;
        }
        
        .pagination {
            display: flex;
            justify-content: center;
            gap: 5px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
        }
        
        .page-btn {
            width: 36px;
            height: 36px;
            border: 1px solid #dee2e6;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            transition: all 0.3s;
        }
        
        .page-btn:hover {
            background: #f8f9fa;
            border-color: #007bff;
            color: #007bff;
        }
        
        .page-btn.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
        }
        
        .page-dots {
            display: flex;
            align-items: center;
            padding: 0 10px;
            color: #6c757d;
        }
        
        /* Order Detail Modal Styles */
        .order-detail-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
        }
        
        .order-info-section {
            margin-bottom: 25px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        
        .order-info-section h4 {
            margin-bottom: 15px;
            color: #333;
            font-size: 16px;
        }
        
        .order-info-section h4 i {
            margin-right: 8px;
            color: #007bff;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        
        .info-item {
            padding: 8px;
            background: white;
            border-radius: 4px;
            border: 1px solid #dee2e6;
        }
        
        .info-item strong {
            color: #495057;
            margin-right: 5px;
        }
        
        .order-items-table {
            overflow-x: auto;
            margin-top: 10px;
        }
        
        .order-items-table table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .order-items-table th,
        .order-items-table td {
            padding: 10px;
            border: 1px solid #dee2e6;
            text-align: left;
        }
        
        .order-items-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }
        
        .order-items-table tfoot tr:last-child td {
            background: #f8f9fa;
            font-weight: bold;
        }
        
        .order-actions-section {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #dee2e6;
        }
        
        .order-actions-section .action-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
        }
        
        .order-actions-section .btn-action {
            padding: 10px 15px;
            min-width: 120px;
            height: auto;
        }
        
        .order-actions-section .btn-action i {
            margin-right: 5px;
        }
        
        /* Product Thumbnail */
        .product-thumb {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: 4px;
            border: 1px solid #dee2e6;
        }
        
        /* Error Message */
        .admin-error {
            animation: fadeIn 0.3s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
`;

// Thêm CSS vào head
document.head.insertAdjacentHTML('beforeend', adminStyles);

// Khởi tạo khi trang được tải
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Đã xử lý trong phần trên
    });
} else {
    // DOM đã sẵn sàng
}
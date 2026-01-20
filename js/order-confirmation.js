// js/order-confirmation.js
console.log('order-confirmation.js đang load...');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM sẵn sàng trong order-confirmation.js');
    
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    
    if (!orderId) {
        showError('Không tìm thấy mã đơn hàng');
        return;
    }
    
    console.log('Mã đơn hàng:', orderId);
    
    checkAuth().then(user => {
        if (!user) {
            showError('Vui lòng đăng nhập để xem đơn hàng');
            setTimeout(() => window.location.href = 'index.html', 3000);
            return;
        }
        
        loadOrderDetails(orderId, user.uid);
    });
});

function loadOrderDetails(orderId, userId) {
    console.log('Đang tải chi tiết đơn hàng:', orderId);
    
    if (!db) {
        console.error('Firestore chưa được khởi tạo');
        showError('Hệ thống chưa sẵn sàng. Vui lòng thử lại sau.');
        return;
    }
    
    db.collection('orders').doc(orderId).get()
        .then(orderDoc => {
            if (!orderDoc.exists) {
                showError('Đơn hàng không tồn tại');
                return;
            }
            
            const orderData = orderDoc.data();
            
            if (orderData.userId !== userId) {
                showError('Bạn không có quyền xem đơn hàng này');
                return;
            }
            
            console.log('Đã tìm thấy đơn hàng:', orderData);
            
            const loadingElement = document.getElementById('loading');
            const contentElement = document.getElementById('confirmationContent');
            
            loadingElement.style.display = 'none';
            contentElement.style.display = 'block';
            
            displayOrderDetails(orderData, orderId);
            
            if (typeof updateCartCount === 'function') {
                updateCartCount();
            }
        })
        .catch(error => {
            console.error('Lỗi khi tải đơn hàng:', error);
            showError('Đã xảy ra lỗi khi tải thông tin đơn hàng');
        });
}

function displayOrderDetails(orderData, orderId) {
    console.log('Hiển thị chi tiết đơn hàng');
    
    document.getElementById('orderId').textContent = orderId;
    
    if (orderData.createdAt) {
        const orderDate = orderData.createdAt.toDate ? 
            orderData.createdAt.toDate() : new Date(orderData.createdAt);
        document.getElementById('orderDate').textContent = orderDate.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    const status = orderData.status || 'pending';
    document.getElementById('orderStatus').textContent = getStatusText(status);
    
    const statusBadge = document.getElementById('statusBadge');
    statusBadge.textContent = getStatusText(status);
    statusBadge.className = 'status-badge ' + getStatusClass(status);
    
    if (orderData.paymentMethod) {
        const paymentText = getPaymentMethodText(orderData.paymentMethod);
        document.getElementById('paymentMethod').textContent = paymentText;
    }
    
    if (orderData.total) {
        document.getElementById('orderTotal').textContent = formatPrice(orderData.total) + 'đ';
    }
    
    if (orderData.fullName) {
        document.getElementById('shippingName').textContent = orderData.fullName;
    }
    
    if (orderData.phone) {
        document.getElementById('shippingPhone').textContent = orderData.phone;
    }
    
    if (orderData.email) {
        document.getElementById('shippingEmail').textContent = orderData.email;
    }
    
    let address = '';
    if (orderData.address) address += orderData.address;
    if (orderData.district) address += ', ' + getDistrictText(orderData.district);
    if (orderData.province) address += ', ' + getProvinceText(orderData.province);
    document.getElementById('shippingAddress').textContent = address;
    
    if (orderData.note) {
        document.getElementById('orderNote').textContent = orderData.note;
    } else {
        document.getElementById('orderNote').textContent = 'Không có ghi chú';
    }
    
    loadOrderItems(orderData.items || []);
    
    updateOrderSummary(orderData);
}

function loadOrderItems(items) {
    const orderItemsContainer = document.getElementById('orderItems');
    orderItemsContainer.innerHTML = '';
    
    if (!items || items.length === 0) {
        orderItemsContainer.innerHTML = '<p>Không có sản phẩm nào</p>';
        return;
    }
    
    const promises = items.map(item => {
        return db.collection('products').doc(item.productId).get()
            .then(productDoc => {
                if (productDoc.exists) {
                    const product = productDoc.data();
                    return createOrderItemElement(product, item);
                }
                return null;
            })
            .catch(error => {
                console.error('Lỗi khi tải sản phẩm:', error);
                return null;
            });
    });
    
    Promise.all(promises)
        .then(itemElements => {
            itemElements.forEach(element => {
                if (element) {
                    orderItemsContainer.appendChild(element);
                }
            });
        })
        .catch(error => {
            console.error('Lỗi khi tải danh sách sản phẩm:', error);
            orderItemsContainer.innerHTML = '<p>Không thể tải danh sách sản phẩm</p>';
        });
}

function createOrderItemElement(product, item) {
    const element = document.createElement('div');
    element.className = 'order-item';
    
    const itemTotal = (product.price || 0) * (item.quantity || 1);
    
    element.innerHTML = `
        <div class="order-item-image">
            <img src="${product.image || 'https://via.placeholder.com/80x80/cccccc/969696?text=SP'}" 
                 alt="${product.name || 'Sản phẩm'}">
        </div>
        <div class="order-item-info">
            <h4>${product.name || 'Sản phẩm'}</h4>
            <div class="order-item-quantity">Số lượng: ${item.quantity || 1}</div>
        </div>
        <div class="order-item-price">
            ${formatPrice(itemTotal)}đ
        </div>
    `;
    
    return element;
}

function updateOrderSummary(orderData) {
    const subtotal = orderData.subtotal || 0;
    const shippingFee = orderData.shippingFee || 0;
    const discount = orderData.discount || 0;
    const total = orderData.total || 0;
    
    document.getElementById('orderSubtotal').textContent = formatPrice(subtotal) + 'đ';
    document.getElementById('orderShipping').textContent = formatPrice(shippingFee) + 'đ';
    document.getElementById('orderDiscount').textContent = formatPrice(discount) + 'đ';
    document.getElementById('orderGrandTotal').textContent = formatPrice(total) + 'đ';
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Chờ xác nhận',
        'processing': 'Đang xử lý',
        'shipped': 'Đang giao hàng',
        'delivered': 'Đã giao hàng',
        'cancelled': 'Đã hủy'
    };
    return statusMap[status] || 'Chờ xác nhận';
}

function getStatusClass(status) {
    const classMap = {
        'pending': 'status-pending',
        'processing': 'status-processing',
        'shipped': 'status-shipped',
        'delivered': 'status-delivered',
        'cancelled': 'status-cancelled'
    };
    return classMap[status] || 'status-pending';
}

function getPaymentMethodText(method) {
    const methodMap = {
        'cod': 'Thanh toán khi nhận hàng (COD)',
        'banking': 'Chuyển khoản ngân hàng',
        'momo': 'Ví MoMo',
        'zalopay': 'ZaloPay'
    };
    return methodMap[method] || method;
}

function getProvinceText(province) {
    const provinceMap = {
        'hcm': 'TP. Hồ Chí Minh',
        'hn': 'Hà Nội',
        'dn': 'Đà Nẵng'
    };
    return provinceMap[province] || province;
}

function getDistrictText(district) {
    const districtMap = {
        'q1': 'Quận 1',
        'q2': 'Quận 2',
        'q3': 'Quận 3',
        'q4': 'Quận 4',
        'q5': 'Quận 5',
        'hk': 'Quận Hoàn Kiếm',
        'hbt': 'Quận Hai Bà Trưng',
        'cgl': 'Quận Cầu Giấy',
        'dd': 'Quận Đống Đa',
        'th': 'Quận Tây Hồ',
        'hc': 'Quận Hải Châu',
        'st': 'Quận Sơn Trà',
        'nl': 'Quận Ngũ Hành Sơn',
        'cl': 'Quận Cẩm Lệ'
    };
    return districtMap[district] || district;
}

function showError(message) {
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    
    loadingElement.style.display = 'none';
    errorElement.style.display = 'block';
    
    if (message) {
        errorElement.querySelector('h3').textContent = message;
    }
}

if (typeof window !== 'undefined') {
    if (typeof formatPrice === 'undefined') {
        window.formatPrice = function(price) {
            if (typeof price !== 'number') {
                price = parseFloat(price) || 0;
            }
            return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        };
    }
    
    if (typeof checkAuth === 'undefined') {
        window.checkAuth = function() {
            return new Promise((resolve) => {
                if (typeof auth === 'undefined') {
                    resolve(null);
                    return;
                }
                auth.onAuthStateChanged(user => {
                    resolve(user);
                });
            });
        };
    }
    
    if (typeof showNotification === 'undefined') {
        window.showNotification = function(message, type = 'success') {
            alert((type === 'error' ? '❌ ' : '✅ ') + message);
        };
    }
}
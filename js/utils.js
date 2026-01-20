// js/utils.js
console.log('utils.js đang load...');

function formatPrice(price) {
    if (typeof price !== 'number') {
        price = parseFloat(price) || 0;
    }
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function generateStarRating(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i === fullStars + 1 && hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    
    return stars;
}

function updateCartCount() {
    console.log('Gọi updateCartCount');
    
    if (typeof auth === 'undefined') {
        const cartCountElements = document.querySelectorAll('#cartCount, .cart-count');
        cartCountElements.forEach(el => el.textContent = '0');
        return;
    }
    
    auth.onAuthStateChanged(user => {
        const cartCountElements = document.querySelectorAll('#cartCount, .cart-count, .cart-count-badge');
        
        if (!user) {
            cartCountElements.forEach(el => {
                el.textContent = '0';
                if (el.classList.contains('cart-count-badge')) {
                    el.style.display = 'none';
                }
            });
            return;
        }
        
        if (typeof db === 'undefined') {
            console.warn('Firestore chưa được khởi tạo');
            return;
        }
        
        db.collection('carts').doc(user.uid).collection('items').get()
            .then(querySnapshot => {
                let totalItems = 0;
                querySnapshot.forEach(doc => {
                    const item = doc.data();
                    totalItems += item.quantity || 1;
                });
                
                cartCountElements.forEach(el => {
                    el.textContent = totalItems;
                    if (el.classList.contains('cart-count-badge')) {
                        el.style.display = totalItems > 0 ? 'inline-block' : 'none';
                    }
                });
            })
            .catch(error => {
                console.error('Lỗi khi đếm giỏ hàng:', error);
            });
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-id', product.id);
    
    const discountPercent = product.originalPrice ? 
        Math.round((1 - product.price / product.originalPrice) * 100) : 0;
    
    card.innerHTML = `
        <div class="product-image">
            <img src="${product.image || 'https://via.placeholder.com/300x200/cccccc/969696?text=Sản+phẩm'}" 
                 alt="${product.name}" 
                 class="product-img"
                 onerror="this.src='https://via.placeholder.com/300x200/cccccc/969696?text=Sản+phẩm'">
            ${discountPercent > 0 ? `<div class="product-badge">-${discountPercent}%</div>` : ''}
            ${product.stock <= 0 ? `<div class="out-of-stock-badge">Hết hàng</div>` : ''}
        </div>
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <div class="product-price">
                <span class="current-price">${formatPrice(product.price)}đ</span>
                ${product.originalPrice ? 
                    `<span class="original-price">${formatPrice(product.originalPrice)}đ</span>` : ''}
            </div>
            <div class="product-rating">
                <div class="stars">${generateStarRating(product.rating || 0)}</div>
                <span class="rating-count">(${product.reviewCount || 0})</span>
            </div>
            <div class="product-actions">
                <button class="btn-cart" onclick="addToCart('${product.id}')">
                    <i class="fas fa-cart-plus"></i> Thêm vào giỏ
                </button>
                <button class="btn-favorite" onclick="toggleFavorite('${product.id}', this)">
                    <i class="far fa-heart"></i>
                </button>
            </div>
        </div>
    `;
    
    card.addEventListener('click', function(e) {
        if (e.target.closest('.product-actions') || 
            e.target.tagName === 'BUTTON' || 
            e.target.tagName === 'I') {
            return;
        }
        window.location.href = `product-detail.html?id=${product.id}`;
    });
    
    return card;
}

function addToCart(productId, quantity = 1) {
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
        showNotification('Hệ thống chưa sẵn sàng. Vui lòng thử lại sau.', 'error');
        return;
    }
    
    auth.onAuthStateChanged(user => {
        if (!user) {
            showNotification('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng', 'error');
            const authModal = document.getElementById('authModal');
            if (authModal) authModal.style.display = 'flex';
            return;
        }
        
        db.collection('products').doc(productId).get()
            .then(productDoc => {
                if (!productDoc.exists) {
                    showNotification('Sản phẩm không tồn tại', 'error');
                    return;
                }
                
                const product = productDoc.data();
                if (product.stock <= 0) {
                    showNotification('Sản phẩm đã hết hàng', 'error');
                    return;
                }
                
                const cartRef = db.collection('carts').doc(user.uid).collection('items').doc(productId);
                
                return cartRef.get().then(cartDoc => {
                    if (cartDoc.exists) {
                        const currentQty = cartDoc.data().quantity || 0;
                        const newQty = currentQty + quantity;
                        
                        if (newQty > product.stock) {
                            showNotification(`Chỉ còn ${product.stock} sản phẩm trong kho`, 'error');
                            return;
                        }
                        
                        return cartRef.update({
                            quantity: newQty,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    } else {
                        return cartRef.set({
                            productId: productId,
                            quantity: quantity,
                            addedAt: firebase.firestore.FieldValue.serverTimestamp(),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                });
            })
            .then(() => {
                showNotification('Đã thêm vào giỏ hàng');
                updateCartCount();
            })
            .catch(error => {
                console.error('Lỗi khi thêm vào giỏ hàng:', error);
                showNotification('Có lỗi xảy ra. Vui lòng thử lại', 'error');
            });
    });
}

function toggleFavorite(productId, button = null) {
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
        showNotification('Hệ thống chưa sẵn sàng. Vui lòng thử lại sau.', 'error');
        return;
    }
    
    auth.onAuthStateChanged(user => {
        if (!user) {
            showNotification('Vui lòng đăng nhập để sử dụng tính năng này', 'error');
            const authModal = document.getElementById('authModal');
            if (authModal) authModal.style.display = 'flex';
            return;
        }
        
        const favoriteRef = db.collection('favorites').doc(user.uid).collection('items').doc(productId);
        
        favoriteRef.get()
            .then(doc => {
                if (doc.exists) {
                    return favoriteRef.delete().then(() => {
                        if (button) {
                            button.innerHTML = '<i class="far fa-heart"></i>';
                            button.classList.remove('active');
                        }
                        showNotification('Đã xóa khỏi danh sách yêu thích');
                    });
                } else {
                    return favoriteRef.set({
                        productId: productId,
                        addedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(() => {
                        if (button) {
                            button.innerHTML = '<i class="fas fa-heart"></i>';
                            button.classList.add('active');
                        }
                        showNotification('Đã thêm vào danh sách yêu thích');
                    });
                }
            })
            .catch(error => {
                console.error('Lỗi khi thao tác với yêu thích:', error);
                showNotification('Có lỗi xảy ra. Vui lòng thử lại', 'error');
            });
    });
}

function showNotification(message, type = 'success') {
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function checkFavoriteStatus(productId, callback) {
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
        if (callback) callback(false);
        return;
    }
    
    auth.onAuthStateChanged(user => {
        if (!user) {
            if (callback) callback(false);
            return;
        }
        
        db.collection('favorites').doc(user.uid).collection('items').doc(productId).get()
            .then(doc => {
                if (callback) callback(doc.exists);
            })
            .catch(error => {
                console.error('Lỗi khi kiểm tra yêu thích:', error);
                if (callback) callback(false);
            });
    });
}

function checkAuth(redirectIfNotLoggedIn = true) {
    return new Promise((resolve) => {
        if (typeof auth === 'undefined') {
            if (redirectIfNotLoggedIn) {
                window.location.href = 'index.html';
            }
            resolve(null);
            return;
        }
        
        auth.onAuthStateChanged(user => {
            if (!user && redirectIfNotLoggedIn) {
                if (window.location.pathname.includes('cart.html') || 
                    window.location.pathname.includes('favorites.html') ||
                    window.location.pathname.includes('checkout.html') ||
                    window.location.pathname.includes('admin.html')) {
                    window.location.href = 'index.html';
                }
                resolve(null);
            } else {
                resolve(user);
            }
        });
    });
}

function formatDate(date) {
    if (!date) return '';
    
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function validatePhoneNumber(phone) {
    const regex = /^(0|\+84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}$/;
    return regex.test(phone.replace(/\s/g, ''));
}

function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function parseCurrency(currencyString) {
    if (!currencyString) return 0;
    return parseFloat(currencyString.replace(/\./g, '').replace('đ', '').trim());
}

if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background-color: #28a745;
            color: white;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            max-width: 400px;
            min-width: 300px;
        }
        
        .notification.error {
            background-color: #dc3545;
        }
        
        .notification.warning {
            background-color: #ffc107;
            color: #333;
        }
        
        .notification.info {
            background-color: #17a2b8;
        }
        
        .notification i {
            font-size: 20px;
            flex-shrink: 0;
        }
        
        .notification span {
            flex-grow: 1;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            padding: 0;
            font-size: 16px;
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        
        .notification-close:hover {
            opacity: 1;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}

if (typeof window !== 'undefined') {
    window.formatPrice = formatPrice;
    window.generateStarRating = generateStarRating;
    window.updateCartCount = updateCartCount;
    window.createProductCard = createProductCard;
    window.addToCart = addToCart;
    window.toggleFavorite = toggleFavorite;
    window.showNotification = showNotification;
    window.checkFavoriteStatus = checkFavoriteStatus;
    window.checkAuth = checkAuth;
    window.formatDate = formatDate;
    window.generateUniqueId = generateUniqueId;
    window.validatePhoneNumber = validatePhoneNumber;
    window.validateEmail = validateEmail;
    window.parseCurrency = parseCurrency;
}
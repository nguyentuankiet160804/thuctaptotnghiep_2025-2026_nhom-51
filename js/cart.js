// js/cart.js
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra đăng nhập
    auth.onAuthStateChanged(user => {
        if (!user) {
            // Nếu chưa đăng nhập, hiển thị thông báo
            document.getElementById('cartItems').innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Vui lòng đăng nhập để xem giỏ hàng</h3>
                    <p>Đăng nhập để xem sản phẩm trong giỏ hàng của bạn</p>
                    <button class="btn-primary" id="loginFromCartBtn">Đăng nhập ngay</button>
                </div>
            `;
            
            document.getElementById('loginFromCartBtn').addEventListener('click', function() {
                document.getElementById('authModal').style.display = 'flex';
            });
            
            return;
        }
        
        // Load giỏ hàng
        loadCart(user.uid);
        
        // Xử lý thanh toán
        document.getElementById('checkoutBtn').addEventListener('click', function() {
            proceedToCheckout();
        });
    });
});

// Hàm load giỏ hàng
function loadCart(userId) {
    db.collection('carts').doc(userId).collection('items').get()
        .then(querySnapshot => {
            const cartItemsContainer = document.getElementById('cartItems');
            const cartSummary = document.getElementById('cartSummary');
            const emptyCart = document.getElementById('emptyCart');
            const recommendedProducts = document.getElementById('recommendedProducts');
            
            if (querySnapshot.empty) {
                // Giỏ hàng trống
                emptyCart.style.display = 'block';
                cartSummary.style.display = 'none';
                recommendedProducts.style.display = 'none';
                return;
            }
            
            // Ẩn giỏ hàng trống
            emptyCart.style.display = 'none';
            
            // Hiển thị tóm tắt
            cartSummary.style.display = 'block';
            
            // Load sản phẩm đề xuất
            loadRecommendedProducts();
            recommendedProducts.style.display = 'block';
            
            // Xóa nội dung cũ
            cartItemsContainer.innerHTML = '';
            
            let subtotal = 0;
            let cartItems = [];
            
            // Lấy thông tin chi tiết cho từng sản phẩm
            const promises = [];
            
            querySnapshot.forEach(doc => {
                const cartItem = doc.data();
                cartItem.cartId = doc.id;
                
                promises.push(
                    db.collection('products').doc(cartItem.productId).get()
                        .then(productDoc => {
                            if (productDoc.exists) {
                                const product = productDoc.data();
                                product.id = productDoc.id;
                                
                                // Tính giá
                                const itemTotal = product.price * cartItem.quantity;
                                subtotal += itemTotal;
                                
                                cartItems.push({
                                    cartItem: cartItem,
                                    product: product,
                                    itemTotal: itemTotal
                                });
                            }
                        })
                );
            });
            
            // Khi tất cả sản phẩm đã được load
            Promise.all(promises)
                .then(() => {
                    // Sắp xếp theo thời gian thêm vào giỏ
                    cartItems.sort((a, b) => 
                        b.cartItem.addedAt?.toDate() - a.cartItem.addedAt?.toDate()
                    );
                    
                    // Hiển thị sản phẩm
                    cartItems.forEach(item => {
                        cartItemsContainer.appendChild(createCartItemElement(item));
                    });
                    
                    // Cập nhật tổng tiền
                    updateCartSummary(subtotal);
                })
                .catch(error => {
                    console.error('Lỗi khi tải giỏ hàng:', error);
                    showNotification('Đã xảy ra lỗi khi tải giỏ hàng', 'error');
                });
        })
        .catch(error => {
            console.error('Lỗi khi tải giỏ hàng:', error);
            showNotification('Đã xảy ra lỗi khi tải giỏ hàng', 'error');
        });
}

// Hàm tạo element cho sản phẩm trong giỏ hàng
function createCartItemElement(item) {
    const { cartItem, product, itemTotal } = item;
    
    const element = document.createElement('div');
    element.className = 'cart-item';
    element.setAttribute('data-id', cartItem.cartId);
    element.setAttribute('data-product-id', product.id);
    
    element.innerHTML = `
        <div class="cart-item-image">
            <img src="${product.image || 'https://via.placeholder.com/100x100/cccccc/969696?text=SP'}" alt="${product.name}">
        </div>
        <div class="cart-item-info">
            <h3 class="cart-item-name">${product.name}</h3>
            <div class="cart-item-price">
                <span class="current-price">${typeof formatPrice === 'function' ? formatPrice(product.price) : product.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ</span>
                ${product.originalPrice ? 
                    `<span class="original-price">${typeof formatPrice === 'function' ? formatPrice(product.originalPrice) : product.originalPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ</span>` : ''}
            </div>
            <div class="cart-item-stock">
                ${product.stock > 0 ? 
                    `<span class="in-stock"><i class="fas fa-check"></i> Còn hàng</span>` : 
                    `<span class="out-of-stock"><i class="fas fa-times"></i> Hết hàng</span>`}
            </div>
        </div>
        <div class="cart-item-quantity">
            <button class="qty-btn minus"><i class="fas fa-minus"></i></button>
            <input type="number" class="qty-input" value="${cartItem.quantity}" min="1" max="${Math.min(product.stock, 10)}">
            <button class="qty-btn plus"><i class="fas fa-plus"></i></button>
        </div>
        <div class="cart-item-total">
            <span class="total-price">${typeof formatPrice === 'function' ? formatPrice(itemTotal) : itemTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ</span>
        </div>
        <div class="cart-item-actions">
            <button class="btn-remove" title="Xóa">
                <i class="fas fa-trash"></i>
            </button>
            <button class="btn-favorite" title="Thêm vào yêu thích">
                <i class="far fa-heart"></i>
            </button>
        </div>
    `;
    
    // Xử lý sự kiện
    const qtyInput = element.querySelector('.qty-input');
    const minusBtn = element.querySelector('.minus');
    const plusBtn = element.querySelector('.plus');
    const removeBtn = element.querySelector('.btn-remove');
    const favoriteBtn = element.querySelector('.btn-favorite');
    
    minusBtn.addEventListener('click', function() {
        let currentVal = parseInt(qtyInput.value);
        if (currentVal > 1) {
            qtyInput.value = currentVal - 1;
            updateCartItemQuantity(cartItem.cartId, -1);
        }
    });
    
    plusBtn.addEventListener('click', function() {
        let currentVal = parseInt(qtyInput.value);
        const maxStock = parseInt(qtyInput.max);
        
        if (currentVal < maxStock) {
            qtyInput.value = currentVal + 1;
            updateCartItemQuantity(cartItem.cartId, 1);
        } else {
            showNotification(`Chỉ còn ${maxStock} sản phẩm trong kho`, 'warning');
        }
    });
    
    qtyInput.addEventListener('change', function() {
        const newQuantity = parseInt(this.value);
        const maxStock = parseInt(this.max);
        
        if (newQuantity < 1) {
            this.value = 1;
            updateCartItemQuantity(cartItem.cartId, 0, 1);
        } else if (newQuantity > maxStock) {
            this.value = maxStock;
            showNotification(`Chỉ còn ${maxStock} sản phẩm trong kho`, 'warning');
            updateCartItemQuantity(cartItem.cartId, 0, maxStock);
        } else {
            const diff = newQuantity - cartItem.quantity;
            updateCartItemQuantity(cartItem.cartId, diff);
        }
    });
    
    removeBtn.addEventListener('click', function() {
        if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?')) {
            removeCartItem(cartItem.cartId);
        }
    });
    
    favoriteBtn.addEventListener('click', function() {
        toggleFavorite(product.id, this);
    });
    
    // Kiểm tra trạng thái yêu thích
    checkFavoriteStatus(product.id, function(isFavorite) {
        if (isFavorite) {
            favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
            favoriteBtn.classList.add('active');
        }
    });
    
    return element;
}

// Hàm cập nhật số lượng sản phẩm trong giỏ hàng
function updateCartItemQuantity(cartItemId, quantityDiff, setQuantity = null) {
    auth.onAuthStateChanged(user => {
        if (!user) return;
        
        const cartItemRef = db.collection('carts').doc(user.uid).collection('items').doc(cartItemId);
        
        if (setQuantity !== null) {
            // Đặt số lượng cụ thể
            cartItemRef.update({
                quantity: setQuantity,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                // Reload giỏ hàng
                loadCart(user.uid);
                updateCartCount();
            })
            .catch(error => {
                console.error('Lỗi khi cập nhật số lượng:', error);
                showNotification('Đã xảy ra lỗi khi cập nhật số lượng', 'error');
            });
        } else {
            // Cập nhật dựa trên số lượng thay đổi
            cartItemRef.update({
                quantity: firebase.firestore.FieldValue.increment(quantityDiff),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                // Reload giỏ hàng
                loadCart(user.uid);
                updateCartCount();
            })
            .catch(error => {
                console.error('Lỗi khi cập nhật số lượng:', error);
                showNotification('Đã xảy ra lỗi khi cập nhật số lượng', 'error');
            });
        }
    });
}

// Hàm xóa sản phẩm khỏi giỏ hàng
function removeCartItem(cartItemId) {
    auth.onAuthStateChanged(user => {
        if (!user) return;
        
        db.collection('carts').doc(user.uid).collection('items').doc(cartItemId).delete()
            .then(() => {
                // Xóa element khỏi DOM
                const itemElement = document.querySelector(`.cart-item[data-id="${cartItemId}"]`);
                if (itemElement) {
                    itemElement.style.opacity = '0';
                    itemElement.style.transform = 'translateX(100%)';
                    setTimeout(() => itemElement.remove(), 300);
                }
                
                // Kiểm tra nếu giỏ hàng trống
                setTimeout(() => {
                    const cartItems = document.querySelectorAll('.cart-item');
                    if (cartItems.length === 0) {
                        document.getElementById('emptyCart').style.display = 'block';
                        document.getElementById('cartSummary').style.display = 'none';
                        document.getElementById('recommendedProducts').style.display = 'none';
                    } else {
                        // Cập nhật tổng tiền
                        updateCartSummary();
                    }
                    
                    updateCartCount();
                    showNotification('Đã xóa sản phẩm khỏi giỏ hàng');
                }, 300);
            })
            .catch(error => {
                console.error('Lỗi khi xóa sản phẩm:', error);
                showNotification('Đã xảy ra lỗi khi xóa sản phẩm', 'error');
            });
    });
}

// Hàm cập nhật tóm tắt giỏ hàng
function updateCartSummary(subtotal = null) {
    if (subtotal === null) {
        // Tính lại subtotal từ các sản phẩm trong giỏ
        subtotal = 0;
        document.querySelectorAll('.cart-item').forEach(item => {
            const priceText = item.querySelector('.total-price').textContent;
            const price = parseCurrency(priceText);
            subtotal += price;
        });
    }
    
    // Tính phí vận chuyển
    const shippingFee = subtotal > 1000000 ? 0 : 30000;
    
    // Giảm giá (ví dụ: 10% nếu tổng > 5 triệu)
    const discount = subtotal > 5000000 ? subtotal * 0.1 : 0;
    
    // Tổng cộng
    const total = subtotal + shippingFee - discount;
    
    // Cập nhật UI
    document.getElementById('subtotal').textContent = formatPrice(subtotal) + 'đ';
    document.getElementById('shippingFee').textContent = formatPrice(shippingFee) + 'đ';
    document.getElementById('discountAmount').textContent = formatPrice(discount) + 'đ';
    document.getElementById('totalAmount').textContent = formatPrice(total) + 'đ';
}

// Hàm kiểm tra trạng thái yêu thích cho sản phẩm trong giỏ hàng
function checkCartItemFavoriteStatus(productId, favoriteBtn) {
    auth.onAuthStateChanged(user => {
        if (!user) return;
        
        db.collection('favorites').doc(user.uid).collection('items').doc(productId).get()
            .then(doc => {
                if (doc.exists) {
                    favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
                    favoriteBtn.classList.add('active');
                }
            })
            .catch(error => {
                console.error('Lỗi khi kiểm tra yêu thích:', error);
            });
    });
}

// Hàm load sản phẩm đề xuất
function loadRecommendedProducts() {
    // Lấy 4 sản phẩm ngẫu nhiên
    db.collection('products')
        .where('active', '==', true)
        .limit(4)
        .get()
        .then(querySnapshot => {
            const container = document.getElementById('recommendedProductsGrid');
            if (!container) return;
            
            container.innerHTML = '';
            
            if (querySnapshot.empty) {
                container.innerHTML = '<p class="no-products">Chưa có sản phẩm đề xuất</p>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const product = doc.data();
                product.id = doc.id;
                
                // Sử dụng hàm createProductCard từ utils.js
                if (typeof createProductCard === 'function') {
                    container.appendChild(createProductCard(product));
                } else {
                    // Fallback nếu hàm không tồn tại
                    const simpleCard = document.createElement('div');
                    simpleCard.className = 'product-card';
                    simpleCard.innerHTML = `
                        <div class="product-image">
                            <img src="${product.image || ''}" alt="${product.name}">
                        </div>
                        <div class="product-info">
                            <h3>${product.name}</h3>
                            <p>${product.price ? product.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + 'đ' : ''}</p>
                            <button onclick="addToCart('${product.id}')">Thêm vào giỏ</button>
                        </div>
                    `;
                    container.appendChild(simpleCard);
                }
            });
        })
        .catch(error => {
            console.error('Lỗi khi tải sản phẩm đề xuất:', error);
            const container = document.getElementById('recommendedProductsGrid');
            if (container) {
                container.innerHTML = '<p class="error">Không thể tải sản phẩm đề xuất</p>';
            }
        });
}

// Hàm tiến hành thanh toán
function proceedToCheckout() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            showNotification('Vui lòng đăng nhập để thanh toán', 'error');
            document.getElementById('authModal').style.display = 'flex';
            return;
        }
        
        // Kiểm tra giỏ hàng có sản phẩm không
        db.collection('carts').doc(user.uid).collection('items').get()
            .then(querySnapshot => {
                if (querySnapshot.empty) {
                    showNotification('Giỏ hàng của bạn đang trống', 'warning');
                    return;
                }
                
                // Kiểm tra tồn kho
                let outOfStockItems = [];
                const promises = [];
                
                querySnapshot.forEach(doc => {
                    const cartItem = doc.data();
                    
                    promises.push(
                        db.collection('products').doc(cartItem.productId).get()
                            .then(productDoc => {
                                if (productDoc.exists) {
                                    const product = productDoc.data();
                                    if (product.stock < cartItem.quantity) {
                                        outOfStockItems.push({
                                            name: product.name,
                                            stock: product.stock,
                                            requested: cartItem.quantity
                                        });
                                    }
                                }
                            })
                    );
                });
                
                Promise.all(promises)
                    .then(() => {
                        if (outOfStockItems.length > 0) {
                            let message = 'Một số sản phẩm không đủ số lượng tồn kho:\n';
                            outOfStockItems.forEach(item => {
                                message += `- ${item.name}: Còn ${item.stock}, bạn yêu cầu ${item.requested}\n`;
                            });
                            alert(message);
                            return;
                        }
                        
                        // Chuyển đến trang thanh toán
                        window.location.href = 'checkout.html';
                    });
            })
            .catch(error => {
                console.error('Lỗi khi kiểm tra giỏ hàng:', error);
                showNotification('Đã xảy ra lỗi khi kiểm tra giỏ hàng', 'error');
            });
    });
}

// CSS bổ sung cho trang giỏ hàng
const cartStyles = `
    <style>
        .page-title {
            font-size: 28px;
            margin-bottom: 30px;
            color: #333;
        }
        
        .cart-container {
            display: grid;
            grid-template-columns: 1fr 350px;
            gap: 30px;
            margin-bottom: 40px;
        }
        
        .cart-items {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        
        .empty-cart {
            text-align: center;
            padding: 60px 20px;
        }
        
        .empty-cart i {
            font-size: 80px;
            color: #ddd;
            margin-bottom: 20px;
        }
        
        .empty-cart h3 {
            font-size: 22px;
            color: #666;
            margin-bottom: 10px;
        }
        
        .empty-cart p {
            color: #999;
            margin-bottom: 30px;
        }
        
        .cart-item {
            display: grid;
            grid-template-columns: 100px 1fr 150px 120px 60px;
            gap: 20px;
            padding: 20px 0;
            border-bottom: 1px solid #eee;
            align-items: center;
            transition: all 0.3s ease;
        }
        
        .cart-item:last-child {
            border-bottom: none;
        }
        
        .cart-item-image img {
            width: 100px;
            height: 100px;
            object-fit: cover;
            border-radius: 4px;
        }
        
        .cart-item-name {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 10px;
            color: #333;
        }
        
        .cart-item-price .current-price {
            font-size: 18px;
            font-weight: 700;
            color: #dc3545;
            margin-right: 10px;
        }
        
        .cart-item-price .original-price {
            font-size: 14px;
            color: #999;
            text-decoration: line-through;
        }
        
        .cart-item-stock .in-stock {
            color: #28a745;
            font-size: 14px;
        }
        
        .cart-item-stock .in-stock i {
            margin-right: 5px;
        }
        
        .cart-item-stock .out-of-stock {
            color: #dc3545;
            font-size: 14px;
        }
        
        .cart-item-quantity {
            display: flex;
            align-items: center;
        }
        
        .cart-item-quantity .qty-btn {
            width: 36px;
            height: 36px;
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .cart-item-quantity .qty-btn:hover {
            background-color: #e9ecef;
        }
        
        .cart-item-quantity .qty-input {
            width: 60px;
            height: 36px;
            text-align: center;
            border: 1px solid #ddd;
            border-left: none;
            border-right: none;
            font-size: 16px;
        }
        
        .cart-item-total {
            font-size: 18px;
            font-weight: 700;
            color: #333;
            text-align: right;
        }
        
        .cart-item-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .cart-item-actions button {
            width: 40px;
            height: 40px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: all 0.2s;
        }
        
        .cart-item-actions .btn-remove {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .cart-item-actions .btn-remove:hover {
            background-color: #f5c6cb;
        }
        
        .cart-item-actions .btn-favorite {
            background-color: #f8f9fa;
            color: #555;
            border: 1px solid #ddd;
        }
        
        .cart-item-actions .btn-favorite.active {
            background-color: #dc3545;
            color: white;
            border-color: #dc3545;
        }
        
        .cart-summary {
            background-color: white;
            border-radius: 8px;
            padding: 25px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            height: fit-content;
            position: sticky;
            top: 20px;
        }
        
        .cart-summary h3 {
            font-size: 20px;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
            color: #333;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            color: #555;
        }
        
        .summary-row.total {
            font-size: 20px;
            font-weight: 700;
            color: #333;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        
        .btn-checkout {
            width: 100%;
            padding: 15px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
            transition: background-color 0.3s;
        }
        
        .btn-checkout:hover {
            background-color: #218838;
        }
        
        .payment-methods {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
        }
        
        .payment-methods p {
            color: #666;
            margin-bottom: 10px;
        }
        
        .payment-methods i {
            margin-right: 5px;
        }
        
        .payment-icons {
            display: flex;
            justify-content: center;
            gap: 15px;
            font-size: 24px;
            color: #555;
        }
        
        .recommended-products {
            margin-top: 40px;
        }
        
        .recommended-products h2 {
            font-size: 24px;
            margin-bottom: 20px;
            color: #333;
        }
        
        .recommended-products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
        }
        
        @media (max-width: 992px) {
            .cart-container {
                grid-template-columns: 1fr;
            }
            
            .cart-item {
                grid-template-columns: 80px 1fr;
                grid-template-rows: auto auto auto;
                gap: 15px;
            }
            
            .cart-item-image {
                grid-row: 1 / 3;
            }
            
            .cart-item-info {
                grid-column: 2;
            }
            
            .cart-item-quantity,
            .cart-item-total,
            .cart-item-actions {
                grid-column: 1 / 3;
                justify-self: start;
            }
            
            .cart-item-actions {
                flex-direction: row;
                position: absolute;
                right: 0;
                top: 20px;
            }
        }
        
        @media (max-width: 576px) {
            .cart-item {
                grid-template-columns: 1fr;
                position: relative;
                padding-left: 100px;
            }
            
            .cart-item-image {
                position: absolute;
                left: 0;
                top: 20px;
            }
            
            .cart-item-image img {
                width: 80px;
                height: 80px;
            }
            
            .cart-item-actions {
                position: static;
                grid-column: 1;
            }
            
            .recommended-products-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
`;

// Thêm CSS vào head
if (!document.querySelector('#cart-styles')) {
    const style = document.createElement('style');
    style.id = 'cart-styles';
    style.textContent = cartStyles;
    document.head.appendChild(style);
}
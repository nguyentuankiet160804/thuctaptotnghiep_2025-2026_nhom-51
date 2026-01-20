// js/checkout.js
console.log('checkout.js đang load...');

function waitForFirebase() {
    return new Promise((resolve) => {
        if (typeof auth !== 'undefined' && typeof db !== 'undefined') {
            resolve();
        } else {
            document.addEventListener('firebaseReady', resolve);
            setTimeout(resolve, 3000);
        }
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM đã sẵn sàng, bắt đầu khởi tạo checkout...');
    
    console.log('Kiểm tra các phần tử DOM:');
    console.log('emptyCartMessage:', document.getElementById('emptyCartMessage'));
    console.log('checkoutItems:', document.getElementById('checkoutItems'));
    console.log('checkoutForm:', document.getElementById('checkoutForm'));
    console.log('paymentMethods:', document.getElementById('paymentMethods'));
    console.log('checkoutSubtotal:', document.getElementById('checkoutSubtotal'));
    console.log('formatPrice function exists:', typeof formatPrice);
    console.log('updateCartCount function exists:', typeof updateCartCount);
    
    const requiredElements = [
        'emptyCartMessage',
        'checkoutItems',
        'checkoutForm',
        'checkoutSubtotal',
        'checkoutShippingFee',
        'checkoutDiscount',
        'checkoutTotal'
    ];
    
    let allElementsExist = true;
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`Không tìm thấy phần tử: #${id}`);
            allElementsExist = false;
        }
    });
    
    if (!allElementsExist) {
        console.error('Thiếu các phần tử DOM cần thiết');
        return;
    }
    
    await waitForFirebase();
    
    console.log('Firebase đã sẵn sàng, kiểm tra auth...');
    
    try {
        if (typeof checkAuth === 'function') {
            const user = await checkAuth();
            if (!user) {
                window.location.href = 'index.html';
                return;
            }
            initCheckout(user.uid);
        } else {
            auth.onAuthStateChanged(user => {
                if (!user) {
                    window.location.href = 'index.html';
                    return;
                }
                initCheckout(user.uid);
            });
        }
    } catch (error) {
        console.error('Lỗi kiểm tra auth:', error);
        showNotification('Lỗi xác thực. Vui lòng đăng nhập lại.', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
});

function initCheckout(userId) {
    console.log('Khởi tạo checkout cho user:', userId);
    
    loadCartForCheckout(userId);
    loadShippingAddress(userId);
    loadPaymentMethods();
    setupEventListeners(userId);
}

function loadCartForCheckout(userId) {
    console.log('Đang load giỏ hàng cho thanh toán...');
    
    const emptyCartMessage = document.getElementById('emptyCartMessage');
    const checkoutForm = document.getElementById('checkoutForm');
    const cartSummary = document.querySelector('.checkout-summary');
    const checkoutItems = document.getElementById('checkoutItems');
    
    if (!db) {
        console.error('Firestore chưa được khởi tạo');
        showNotification('Hệ thống chưa sẵn sàng. Vui lòng tải lại trang.', 'error');
        return;
    }
    
    db.collection('carts').doc(userId).collection('items').get()
        .then(querySnapshot => {
            console.log('Số sản phẩm trong giỏ:', querySnapshot.size);
            
            if (querySnapshot.empty) {
                emptyCartMessage.style.display = 'block';
                checkoutForm.style.display = 'none';
                if (cartSummary) cartSummary.style.display = 'none';
                return;
            }
            
            emptyCartMessage.style.display = 'none';
            checkoutForm.style.display = 'block';
            if (cartSummary) cartSummary.style.display = 'block';
            
            if (checkoutItems) checkoutItems.innerHTML = '';
            
            let subtotal = 0;
            let cartItems = [];
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
            
            return Promise.all(promises).then(() => {
                console.log('Đã load xong thông tin sản phẩm');
                
                if (checkoutItems) {
                    cartItems.forEach(item => {
                        const element = createCheckoutItemElement(item);
                        if (element) checkoutItems.appendChild(element);
                    });
                }
                
                updateCheckoutSummary(subtotal);
            });
        })
        .catch(error => {
            console.error('Lỗi khi tải giỏ hàng:', error);
            showNotification('Đã xảy ra lỗi khi tải giỏ hàng', 'error');
        });
}

function createCheckoutItemElement(item) {
    const { cartItem, product, itemTotal } = item;
    
    const element = document.createElement('div');
    element.className = 'checkout-item';
    element.setAttribute('data-id', cartItem.cartId);
    element.setAttribute('data-product-id', product.id);
    
    const price = product.price || 0;
    const total = itemTotal || 0;
    
    let priceFormatted, totalFormatted;
    
    if (typeof formatPrice === 'function') {
        priceFormatted = formatPrice(price);
        totalFormatted = formatPrice(total);
    } else {
        priceFormatted = price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        totalFormatted = total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    
    element.innerHTML = `
        <div class="checkout-item-image">
            <img src="${product.image || 'https://via.placeholder.com/80x80/cccccc/969696?text=SP'}" alt="${product.name}">
        </div>
        <div class="checkout-item-info">
            <h4 class="checkout-item-name">${product.name || 'Sản phẩm'}</h4>
            <div class="checkout-item-price">
                <span class="current-price">${priceFormatted}đ</span>
            </div>
        </div>
        <div class="checkout-item-quantity">
            <span>Số lượng: ${cartItem.quantity || 1}</span>
        </div>
        <div class="checkout-item-total">
            <span class="total-price">${totalFormatted}đ</span>
        </div>
    `;
    
    return element;
}

function updateCheckoutSummary(subtotal) {
    console.log('Cập nhật tóm tắt, subtotal:', subtotal);
    
    const checkoutSubtotal = document.getElementById('checkoutSubtotal');
    const checkoutShippingFee = document.getElementById('checkoutShippingFee');
    const checkoutDiscount = document.getElementById('checkoutDiscount');
    const checkoutTotal = document.getElementById('checkoutTotal');
    const totalAmountInput = document.getElementById('totalAmount');
    
    if (!checkoutSubtotal || !checkoutShippingFee || !checkoutDiscount || !checkoutTotal) {
        console.error('Thiếu phần tử tóm tắt thanh toán');
        return;
    }
    
    const shippingFee = subtotal > 1000000 ? 0 : 30000;
    const discount = calculateDiscount(subtotal);
    const total = subtotal + shippingFee - discount;
    
    let subtotalFormatted, shippingFeeFormatted, discountFormatted, totalFormatted;
    
    if (typeof formatPrice === 'function') {
        subtotalFormatted = formatPrice(subtotal);
        shippingFeeFormatted = formatPrice(shippingFee);
        discountFormatted = formatPrice(discount);
        totalFormatted = formatPrice(total);
    } else {
        subtotalFormatted = subtotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        shippingFeeFormatted = shippingFee.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        discountFormatted = discount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        totalFormatted = total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    
    checkoutSubtotal.textContent = subtotalFormatted + 'đ';
    checkoutShippingFee.textContent = shippingFeeFormatted + 'đ';
    checkoutDiscount.textContent = discountFormatted + 'đ';
    checkoutTotal.textContent = totalFormatted + 'đ';
    
    if (totalAmountInput) {
        totalAmountInput.value = total;
    }
}

function calculateDiscount(subtotal) {
    const promoCodeInput = document.getElementById('promoCode');
    if (!promoCodeInput) return 0;
    
    const promoCode = promoCodeInput.value.trim();
    let discount = 0;
    
    if (promoCode) {
        const promoList = {
            'WELCOME10': 0.1,
            'SAVE20': 0.2,
            'FREESHIP': 30000
        };
        
        if (promoList[promoCode]) {
            if (promoCode === 'FREESHIP') {
                discount = Math.min(30000, subtotal > 1000000 ? 0 : 30000);
            } else {
                discount = subtotal * promoList[promoCode];
            }
            promoCodeInput.classList.add('valid');
            promoCodeInput.classList.remove('invalid');
            showNotification(`Áp dụng mã ${promoCode} thành công!`, 'success');
        } else {
            promoCodeInput.classList.add('invalid');
            promoCodeInput.classList.remove('valid');
            showNotification('Mã giảm giá không hợp lệ', 'error');
        }
    }
    
    return discount;
}

function loadShippingAddress(userId) {
    const fullNameInput = document.getElementById('fullName');
    const phoneInput = document.getElementById('phone');
    const addressInput = document.getElementById('address');
    
    if (!fullNameInput || !phoneInput || !addressInput) {
        console.warn('Không tìm thấy input địa chỉ');
        return;
    }
    
    if (!db) {
        console.warn('Firestore chưa sẵn sàng');
        return;
    }
    
    db.collection('users').doc(userId).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                
                if (userData.fullName) fullNameInput.value = userData.fullName;
                if (userData.phone) phoneInput.value = userData.phone;
                if (userData.address) addressInput.value = userData.address;
            }
        })
        .catch(error => {
            console.error('Lỗi khi tải thông tin người dùng:', error);
        });
}

function loadPaymentMethods() {
    const container = document.getElementById('paymentMethods');
    if (!container) {
        console.error('Không tìm thấy #paymentMethods');
        return;
    }
    
    const paymentMethods = [
        { id: 'cod', name: 'Thanh toán khi nhận hàng (COD)', icon: 'fa-money-bill-wave' },
        { id: 'banking', name: 'Chuyển khoản ngân hàng', icon: 'fa-university' },
        { id: 'momo', name: 'Ví MoMo', icon: 'fa-mobile-alt' },
        { id: 'zalopay', name: 'ZaloPay', icon: 'fa-qrcode' }
    ];
    
    container.innerHTML = '';
    
    paymentMethods.forEach(method => {
        const div = document.createElement('div');
        div.className = 'payment-method';
        div.innerHTML = `
            <input type="radio" name="paymentMethod" id="payment_${method.id}" value="${method.id}" ${method.id === 'cod' ? 'checked' : ''}>
            <label for="payment_${method.id}">
                <i class="fas ${method.icon}"></i>
                <span>${method.name}</span>
            </label>
        `;
        container.appendChild(div);
    });
}

function setupEventListeners(userId) {
    const applyPromoBtn = document.getElementById('applyPromoBtn');
    if (applyPromoBtn) {
        applyPromoBtn.addEventListener('click', function() {
            const checkoutItems = document.getElementById('checkoutItems');
            if (checkoutItems && checkoutItems.children.length > 0) {
                const cartItems = checkoutItems.querySelectorAll('.checkout-item');
                const subtotal = Array.from(cartItems).reduce((total, item) => {
                    const priceText = item.querySelector('.total-price')?.textContent || '0đ';
                    const price = parseFloat(priceText.replace(/\./g, '').replace('đ', '').trim()) || 0;
                    return total + price;
                }, 0);
                
                calculateDiscount(subtotal);
                updateCheckoutSummary(subtotal);
            }
        });
    }
    
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();
            placeOrder(userId);
        });
    }
    
    const provinceSelect = document.getElementById('province');
    if (provinceSelect) {
        provinceSelect.addEventListener('change', function() {
            loadDistricts(this.value);
        });
    }
}

function loadDistricts(provinceId) {
    const districtSelect = document.getElementById('district');
    if (!districtSelect) return;
    
    const districts = {
        'hcm': [
            { id: 'q1', name: 'Quận 1' },
            { id: 'q2', name: 'Quận 2' },
            { id: 'q3', name: 'Quận 3' },
            { id: 'q4', name: 'Quận 4' },
            { id: 'q5', name: 'Quận 5' }
        ],
        'hn': [
            { id: 'hk', name: 'Quận Hoàn Kiếm' },
            { id: 'hbt', name: 'Quận Hai Bà Trưng' },
            { id: 'cgl', name: 'Quận Cầu Giấy' },
            { id: 'dd', name: 'Quận Đống Đa' },
            { id: 'th', name: 'Quận Tây Hồ' }
        ],
        'dn': [
            { id: 'hc', name: 'Quận Hải Châu' },
            { id: 'st', name: 'Quận Sơn Trà' },
            { id: 'nl', name: 'Quận Ngũ Hành Sơn' },
            { id: 'cl', name: 'Quận Cẩm Lệ' }
        ]
    };
    
    districtSelect.innerHTML = '<option value="">Chọn quận/huyện</option>';
    
    if (districts[provinceId]) {
        districts[provinceId].forEach(district => {
            const option = document.createElement('option');
            option.value = district.id;
            option.textContent = district.name;
            districtSelect.appendChild(option);
        });
    }
}

function placeOrder(userId) {
    console.log('Bắt đầu đặt hàng cho user:', userId);
    
    const fullNameInput = document.getElementById('fullName');
    const phoneInput = document.getElementById('phone');
    const provinceSelect = document.getElementById('province');
    const districtSelect = document.getElementById('district');
    const addressInput = document.getElementById('address');
    
    if (!fullNameInput || !phoneInput || !provinceSelect || !districtSelect || !addressInput) {
        showNotification('Thiếu thông tin bắt buộc', 'error');
        return;
    }
    
    const orderData = {
        userId: userId,
        fullName: fullNameInput.value.trim(),
        phone: phoneInput.value.trim(),
        province: provinceSelect.value,
        district: districtSelect.value,
        address: addressInput.value.trim(),
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const emailInput = document.getElementById('email');
    const noteInput = document.getElementById('note');
    const paymentMethodRadio = document.querySelector('input[name="paymentMethod"]:checked');
    const promoCodeInput = document.getElementById('promoCode');
    
    if (emailInput) orderData.email = emailInput.value.trim();
    if (noteInput) orderData.note = noteInput.value.trim();
    if (paymentMethodRadio) orderData.paymentMethod = paymentMethodRadio.value;
    if (promoCodeInput) orderData.promoCode = promoCodeInput.value.trim();
    
    const totalElement = document.getElementById('checkoutTotal');
    if (totalElement) {
        const totalText = totalElement.textContent;
        orderData.total = parseFloat(totalText.replace(/\./g, '').replace('đ', '').trim()) || 0;
    }
    
    if (!orderData.fullName || !orderData.phone || !orderData.address) {
        showNotification('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
        return;
    }
    
    const submitBtn = document.querySelector('#checkoutForm button[type="submit"]');
    if (!submitBtn) return;
    
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Đang xử lý...';
    submitBtn.disabled = true;
    
    db.collection('carts').doc(userId).collection('items').get()
        .then(cartSnapshot => {
            if (cartSnapshot.empty) {
                throw new Error('Giỏ hàng trống');
            }
            
            const orderItems = [];
            
            cartSnapshot.forEach(doc => {
                const cartItem = doc.data();
                orderItems.push({
                    productId: cartItem.productId,
                    quantity: cartItem.quantity || 1
                });
            });
            
            orderData.items = orderItems;
            
            return db.collection('orders').add(orderData);
        })
        .then(orderRef => {
            console.log('Đã tạo order:', orderRef.id);
            
            return deleteCart(userId).then(() => orderRef);
        })
        .then(orderRef => {
            showNotification('Đặt hàng thành công!', 'success');
            
            if (typeof updateCartCount === 'function') {
                updateCartCount();
            } else {
                document.querySelectorAll('#cartCount, .cart-count').forEach(el => {
                    el.textContent = '0';
                });
            }
            
            setTimeout(() => {
                window.location.href = `order-confirmation.html?orderId=${orderRef.id}`;
            }, 1500);
        })
        .catch(error => {
            console.error('Lỗi khi đặt hàng:', error);
            showNotification(error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.', 'error');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
}

function deleteCart(userId) {
    return db.collection('carts').doc(userId).collection('items').get()
        .then(snapshot => {
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            return batch.commit();
        });
}

const checkoutStyles = `
    <style>
        .checkout-container {
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 30px;
            margin: 30px 0;
        }
        
        .checkout-form {
            background-color: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .checkout-summary {
            background-color: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            position: sticky;
            top: 20px;
            height: fit-content;
        }
        
        .section-title {
            font-size: 20px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
            color: #333;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #555;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            border-color: #007bff;
            outline: none;
        }
        
        .form-group input.error,
        .form-group select.error,
        .form-group textarea.error {
            border-color: #dc3545;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .checkout-item {
            display: grid;
            grid-template-columns: 80px 1fr auto auto;
            gap: 15px;
            padding: 15px 0;
            border-bottom: 1px solid #eee;
            align-items: center;
        }
        
        .checkout-item-image img {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 4px;
        }
        
        .checkout-item-name {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 5px;
            color: #333;
        }
        
        .checkout-item-price {
            font-size: 16px;
            color: #dc3545;
            font-weight: 600;
        }
        
        .checkout-item-quantity {
            color: #666;
        }
        
        .checkout-item-total {
            font-size: 18px;
            font-weight: 700;
            color: #333;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
            color: #555;
        }
        
        .summary-row.total {
            font-size: 20px;
            font-weight: 700;
            color: #333;
            border-bottom: none;
            padding-top: 15px;
            border-top: 2px solid #eee;
        }
        
        .promo-code {
            display: flex;
            gap: 10px;
            margin: 20px 0;
        }
        
        .promo-code input {
            flex-grow: 1;
        }
        
        .promo-code input.valid {
            border-color: #28a745;
            background-color: #f8fff9;
        }
        
        .promo-code input.invalid {
            border-color: #dc3545;
            background-color: #fff8f8;
        }
        
        .payment-methods {
            margin: 20px 0;
        }
        
        .payment-method {
            margin-bottom: 10px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .payment-method:hover {
            border-color: #007bff;
            background-color: #f8f9fa;
        }
        
        .payment-method input[type="radio"] {
            margin-right: 10px;
        }
        
        .payment-method label {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            margin: 0;
            font-weight: normal;
        }
        
        .payment-method i {
            font-size: 20px;
            color: #007bff;
        }
        
        .btn-primary {
            width: 100%;
            padding: 15px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        
        .btn-primary:hover {
            background-color: #218838;
        }
        
        .btn-primary:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        
        .btn-secondary {
            padding: 10px 20px;
            background-color: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .btn-secondary:hover {
            background-color: #5a6268;
        }
        
        .empty-cart-message {
            text-align: center;
            padding: 60px 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .empty-cart-message i {
            font-size: 80px;
            color: #ddd;
            margin-bottom: 20px;
        }
        
        .empty-cart-message h3 {
            font-size: 24px;
            color: #666;
            margin-bottom: 10px;
        }
        
        .empty-cart-message p {
            color: #999;
            margin-bottom: 30px;
        }
        
        @media (max-width: 992px) {
            .checkout-container {
                grid-template-columns: 1fr;
            }
            
            .checkout-summary {
                position: static;
                margin-top: 30px;
            }
        }
        
        @media (max-width: 576px) {
            .form-row {
                grid-template-columns: 1fr;
            }
            
            .checkout-item {
                grid-template-columns: 60px 1fr;
                grid-template-rows: auto auto;
            }
            
            .checkout-item-image {
                grid-row: 1 / 3;
            }
            
            .checkout-item-quantity,
            .checkout-item-total {
                grid-column: 2;
            }
            
            .promo-code {
                flex-direction: column;
            }
        }
    </style>
`;

if (!document.querySelector('#checkout-styles')) {
    const style = document.createElement('style');
    style.id = 'checkout-styles';
    style.textContent = checkoutStyles;
    document.head.appendChild(style);
}

setTimeout(() => {
    if (typeof updateCartCount === 'function') {
        console.log('Gọi updateCartCount từ checkout.js');
        updateCartCount();
    }
}, 1000);
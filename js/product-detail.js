// js/product-detail.js
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra Firebase
    if (typeof db === 'undefined') {
        console.error('Firestore chưa được khởi tạo');
        showError('Hệ thống đang khởi tạo. Vui lòng tải lại trang.');
        return;
    }
    
    // Lấy ID sản phẩm từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        alert('Không tìm thấy sản phẩm');
        window.location.href = 'index.html';
        return;
    }
    
    // Load chi tiết sản phẩm
    loadProductDetail(productId);
    
    // Load sản phẩm liên quan
    loadRelatedProducts(productId);
    
    // Xử lý số lượng
    const qtyInput = document.getElementById('productQuantity');
    const qtyMinus = document.getElementById('qtyMinus');
    const qtyPlus = document.getElementById('qtyPlus');
    
    if (qtyMinus && qtyPlus && qtyInput) {
        qtyMinus.addEventListener('click', function() {
            let currentVal = parseInt(qtyInput.value) || 1;
            if (currentVal > 1) {
                qtyInput.value = currentVal - 1;
            }
        });
        
        qtyPlus.addEventListener('click', function() {
            let currentVal = parseInt(qtyInput.value) || 1;
            qtyInput.value = currentVal + 1;
        });
    }
    
    // Xử lý thêm vào giỏ hàng
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            const quantity = parseInt(document.getElementById('productQuantity').value) || 1;
            addToCart(productId, quantity);
        });
    }
    
    // Xử lý mua ngay
    const buyNowBtn = document.getElementById('buyNowBtn');
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', function() {
            const quantity = parseInt(document.getElementById('productQuantity').value) || 1;
            buyNow(productId, quantity);
        });
    }
    
    // Xử lý yêu thích
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', function() {
            toggleFavorite(productId);
        });
    }
    
    // Xử lý tab mô tả sản phẩm
    document.querySelectorAll('.desc-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Cập nhật active tab
            document.querySelectorAll('.desc-tab').forEach(t => {
                t.classList.remove('active');
            });
            this.classList.add('active');
            
            // Hiển thị nội dung tương ứng
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const contentElement = document.getElementById(tabId + 'Content');
            if (contentElement) {
                contentElement.classList.add('active');
            }
        });
    });
    
    // Cập nhật số lượng giỏ hàng
    updateCartCount();
});

// Hàm hiển thị lỗi
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'product-error';
    errorDiv.innerHTML = `
        <div style="background: #f8d7da; color: #721c24; padding: 15px; margin: 20px; border-radius: 5px; border: 1px solid #f5c6cb; text-align: center;">
            <i class="fas fa-exclamation-circle"></i> ${message}
            <br>
            <button onclick="location.reload()" style="margin-top: 10px; background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-redo"></i> Tải lại trang
            </button>
        </div>
    `;
    
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.insertBefore(errorDiv, mainContent.firstChild);
    }
}

// Hàm load chi tiết sản phẩm
function loadProductDetail(productId) {
    showLoading();
    
    db.collection('products').doc(productId).get()
        .then(doc => {
            if (!doc.exists) {
                alert('Sản phẩm không tồn tại');
                window.location.href = 'index.html';
                return;
            }
            
            const product = doc.data();
            product.id = doc.id;
            
            // Cập nhật tiêu đề trang
            document.title = product.name + ' - TechStore';
            
            // Cập nhật breadcrumb
            const categoryNames = {
                'laptop': 'Laptop',
                'pc': 'PC - Máy tính để bàn',
                'component': 'Linh kiện máy tính',
                'accessory': 'Phụ kiện',
                'monitor': 'Màn hình'
            };
            
            const categoryName = categoryNames[product.category] || product.category;
            const categoryBreadcrumb = document.getElementById('categoryBreadcrumb');
            if (categoryBreadcrumb) {
                categoryBreadcrumb.textContent = categoryName;
                categoryBreadcrumb.href = `category.html?category=${product.category}&name=${encodeURIComponent(categoryName)}`;
            }
            
            const productNameBreadcrumb = document.getElementById('productNameBreadcrumb');
            if (productNameBreadcrumb) {
                productNameBreadcrumb.textContent = product.name;
            }
            
            // Cập nhật hình ảnh
            const mainImage = document.getElementById('mainProductImage');
            if (mainImage) {
                mainImage.src = product.image || 'https://via.placeholder.com/600x400/cccccc/969696?text=Sản+phẩm';
                mainImage.alt = product.name;
            }
            
            // Thêm thumbnails
            const thumbnailsContainer = document.getElementById('imageThumbnails');
            if (thumbnailsContainer) {
                thumbnailsContainer.innerHTML = `
                    <div class="thumbnail active">
                        <img src="${product.image || 'https://via.placeholder.com/100x70/cccccc/969696?text=SP'}" alt="${product.name}">
                    </div>
                    <div class="thumbnail">
                        <img src="https://via.placeholder.com/100x70/cccccc/969696?text=Góc+khác" alt="Góc khác">
                    </div>
                    <div class="thumbnail">
                        <img src="https://via.placeholder.com/100x70/cccccc/969696?text=Hộp" alt="Hộp sản phẩm">
                    </div>
                `;
                
                // Xử lý click thumbnail
                document.querySelectorAll('.thumbnail').forEach(thumb => {
                    thumb.addEventListener('click', function() {
                        document.querySelectorAll('.thumbnail').forEach(t => {
                            t.classList.remove('active');
                        });
                        this.classList.add('active');
                        if (mainImage) {
                            mainImage.src = this.querySelector('img').src;
                        }
                    });
                });
            }
            
            // Cập nhật thông tin sản phẩm
            const productTitle = document.getElementById('productTitle');
            if (productTitle) {
                productTitle.textContent = product.name;
            }
            
            // Đánh giá
            const starsContainer = document.getElementById('productStars');
            if (starsContainer) {
                starsContainer.innerHTML = generateStarRating(product.rating || 0);
            }
            
            const ratingText = document.getElementById('productRatingText');
            if (ratingText) {
                ratingText.textContent = `(${product.reviewCount || 0} đánh giá)`;
            }
            
            const productSKU = document.getElementById('productSKU');
            if (productSKU) {
                productSKU.textContent = product.id.substring(0, 8).toUpperCase();
            }
            
            // Giá
            const currentPrice = document.getElementById('productCurrentPrice');
            if (currentPrice) {
                currentPrice.textContent = formatPrice(product.price) + 'đ';
            }
            
            const originalPrice = document.getElementById('productOriginalPrice');
            const discountElement = document.getElementById('productDiscount');
            
            if (product.originalPrice) {
                if (originalPrice) {
                    originalPrice.textContent = formatPrice(product.originalPrice) + 'đ';
                    originalPrice.style.display = 'inline';
                }
                
                const discountPercent = Math.round((1 - product.price / product.originalPrice) * 100);
                if (discountElement) {
                    discountElement.textContent = `-${discountPercent}%`;
                    discountElement.style.display = 'inline';
                }
            }
            
            // Trạng thái kho
            const stockStatus = document.getElementById('stockStatus');
            const addToCartBtn = document.getElementById('addToCartBtn');
            const buyNowBtn = document.getElementById('buyNowBtn');
            
            if (stockStatus) {
                if (product.stock > 0) {
                    stockStatus.innerHTML = '<i class="fas fa-check-circle"></i> Còn hàng';
                    stockStatus.style.color = '#28a745';
                } else {
                    stockStatus.innerHTML = '<i class="fas fa-times-circle"></i> Hết hàng';
                    stockStatus.style.color = '#dc3545';
                    
                    if (addToCartBtn) addToCartBtn.disabled = true;
                    if (buyNowBtn) buyNowBtn.disabled = true;
                }
            }
            
            // Thông số kỹ thuật tóm tắt
            const specsContainer = document.getElementById('productSpecs');
            if (specsContainer) {
                if (product.specs && typeof product.specs === 'object') {
                    let specsHtml = '<h3>Thông số nổi bật:</h3><ul>';
                    
                    for (const [key, value] of Object.entries(product.specs)) {
                        const label = getSpecLabel(key);
                        specsHtml += `<li><strong>${label}:</strong> ${value}</li>`;
                    }
                    
                    specsHtml += '</ul>';
                    specsContainer.innerHTML = specsHtml;
                } else {
                    specsContainer.innerHTML = '<h3>Thông số nổi bật:</h3><p>Đang cập nhật...</p>';
                }
            }
            
            // Mô tả chi tiết
            const descriptionText = document.getElementById('productDescriptionText');
            if (descriptionText) {
                descriptionText.textContent = product.description || 'Không có mô tả cho sản phẩm này.';
            }
            
            // Thông số kỹ thuật chi tiết
            const specsTable = document.getElementById('specsTable');
            if (specsTable) {
                if (product.specs && typeof product.specs === 'object') {
                    let specsTableHtml = '';
                    
                    for (const [key, value] of Object.entries(product.specs)) {
                        const label = getSpecLabel(key);
                        specsTableHtml += `
                            <tr>
                                <td class="spec-label">${label}</td>
                                <td class="spec-value">${value}</td>
                            </tr>
                        `;
                    }
                    
                    specsTable.innerHTML = specsTableHtml;
                } else {
                    specsTable.innerHTML = `
                        <tr>
                            <td colspan="2" style="text-align: center; padding: 20px; color: #6c757d;">
                                <i class="fas fa-info-circle"></i> Đang cập nhật thông số kỹ thuật...
                            </td>
                        </tr>
                    `;
                }
            }
            
            // Kiểm tra trạng thái yêu thích
            checkFavoriteStatus(productId);
            
            hideLoading();
            
        })
        .catch(error => {
            console.error('Lỗi khi tải chi tiết sản phẩm:', error);
            showError('Đã xảy ra lỗi khi tải thông tin sản phẩm');
            hideLoading();
        });
}

// Hàm load sản phẩm liên quan
function loadRelatedProducts(productId) {
    // Lấy danh mục của sản phẩm hiện tại
    db.collection('products').doc(productId).get()
        .then(doc => {
            if (doc.exists) {
                const product = doc.data();
                
                // Lấy các sản phẩm cùng danh mục
                db.collection('products')
                    .where('category', '==', product.category)
                    .where('active', '==', true)
                    .limit(5)
                    .get()
                    .then(querySnapshot => {
                        const container = document.getElementById('relatedProducts');
                        if (!container) return;
                        
                        container.innerHTML = '';
                        
                        let hasRelatedProducts = false;
                        
                        querySnapshot.forEach(doc => {
                            const relatedProduct = doc.data();
                            relatedProduct.id = doc.id;
                            
                            // Bỏ qua sản phẩm hiện tại
                            if (relatedProduct.id !== productId) {
                                container.appendChild(createProductCard(relatedProduct));
                                hasRelatedProducts = true;
                            }
                        });
                        
                        // Nếu không có sản phẩm liên quan
                        if (!hasRelatedProducts) {
                            container.innerHTML = '<p class="no-products">Không có sản phẩm liên quan.</p>';
                        }
                    })
                    .catch(error => {
                        console.error('Lỗi khi tải sản phẩm liên quan:', error);
                        const container = document.getElementById('relatedProducts');
                        if (container) {
                            container.innerHTML = '<p class="error">Không thể tải sản phẩm liên quan.</p>';
                        }
                    });
            }
        });
}

// Hàm thêm vào giỏ hàng
function addToCart(productId, quantity) {
    if (typeof auth === 'undefined') {
        alert('Hệ thống chưa sẵn sàng. Vui lòng tải lại trang.');
        return;
    }
    
    auth.onAuthStateChanged(user => {
        if (!user) {
            alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.style.display = 'flex';
            }
            return;
        }
        
        // Kiểm tra số lượng tồn kho
        db.collection('products').doc(productId).get()
            .then(doc => {
                if (doc.exists) {
                    const product = doc.data();
                    
                    if (product.stock < quantity) {
                        alert(`Chỉ còn ${product.stock} sản phẩm trong kho`);
                        return;
                    }
                    
                    // Thêm vào giỏ hàng
                    const cartItemRef = db.collection('carts').doc(user.uid).collection('items').doc(productId);
                    
                    cartItemRef.get()
                        .then(cartDoc => {
                            if (cartDoc.exists) {
                                // Tăng số lượng nếu đã có
                                return cartItemRef.update({
                                    quantity: firebase.firestore.FieldValue.increment(quantity),
                                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            } else {
                                // Thêm mới sản phẩm
                                return cartItemRef.set({
                                    productId: productId,
                                    quantity: quantity,
                                    addedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            }
                        })
                        .then(() => {
                            alert(`Đã thêm ${quantity} sản phẩm vào giỏ hàng`);
                            updateCartCount();
                        })
                        .catch(error => {
                            console.error('Lỗi khi thêm vào giỏ hàng:', error);
                            alert('Đã xảy ra lỗi khi thêm sản phẩm vào giỏ hàng');
                        });
                }
            })
            .catch(error => {
                console.error('Lỗi khi kiểm tra tồn kho:', error);
                alert('Đã xảy ra lỗi');
            });
    });
}

// Hàm mua ngay
function buyNow(productId, quantity) {
    if (typeof auth === 'undefined') {
        alert('Hệ thống chưa sẵn sàng. Vui lòng tải lại trang.');
        return;
    }
    
    auth.onAuthStateChanged(user => {
        if (!user) {
            alert('Vui lòng đăng nhập để mua hàng');
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.style.display = 'flex';
            }
            return;
        }
        
        // Kiểm tra số lượng tồn kho
        db.collection('products').doc(productId).get()
            .then(doc => {
                if (doc.exists) {
                    const product = doc.data();
                    
                    if (product.stock < quantity) {
                        alert(`Chỉ còn ${product.stock} sản phẩm trong kho`);
                        return;
                    }
                    
                    // Thêm vào giỏ hàng và chuyển đến trang thanh toán
                    const cartItemRef = db.collection('carts').doc(user.uid).collection('items').doc(productId);
                    
                    cartItemRef.set({
                        productId: productId,
                        quantity: quantity,
                        addedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    })
                    .then(() => {
                        // Chuyển đến trang giỏ hàng
                        window.location.href = 'checkout.html';
                    })
                    .catch(error => {
                        console.error('Lỗi khi mua ngay:', error);
                        alert('Đã xảy ra lỗi');
                    });
                }
            });
    });
}

// Hàm kiểm tra trạng thái yêu thích
function checkFavoriteStatus(productId) {
    if (typeof auth === 'undefined') return;
    
    auth.onAuthStateChanged(user => {
        if (!user) return;
        
        if (typeof db === 'undefined') return;
        
        db.collection('favorites').doc(user.uid).collection('items').doc(productId).get()
            .then(doc => {
                const favoriteBtn = document.getElementById('favoriteBtn');
                if (favoriteBtn) {
                    if (doc.exists) {
                        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
                        favoriteBtn.classList.add('active');
                    } else {
                        favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
                        favoriteBtn.classList.remove('active');
                    }
                }
            })
            .catch(error => {
                console.error('Lỗi khi kiểm tra yêu thích:', error);
            });
    });
}

// Hàm yêu thích
function toggleFavorite(productId) {
    if (typeof auth === 'undefined') {
        alert('Hệ thống chưa sẵn sàng. Vui lòng tải lại trang.');
        return;
    }
    
    auth.onAuthStateChanged(user => {
        if (!user) {
            alert('Vui lòng đăng nhập để thêm sản phẩm vào yêu thích');
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.style.display = 'flex';
            }
            return;
        }
        
        if (typeof db === 'undefined') {
            alert('Hệ thống chưa sẵn sàng');
            return;
        }
        
        const favoriteRef = db.collection('favorites').doc(user.uid).collection('items').doc(productId);
        const favoriteBtn = document.getElementById('favoriteBtn');
        
        favoriteRef.get()
            .then(doc => {
                if (doc.exists) {
                    // Xóa khỏi yêu thích
                    return favoriteRef.delete()
                        .then(() => {
                            if (favoriteBtn) {
                                favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
                                favoriteBtn.classList.remove('active');
                            }
                            alert('Đã xóa khỏi danh sách yêu thích');
                        });
                } else {
                    // Thêm vào yêu thích
                    return favoriteRef.set({
                        productId: productId,
                        addedAt: firebase.firestore.FieldValue.serverTimestamp()
                    })
                    .then(() => {
                        if (favoriteBtn) {
                            favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
                            favoriteBtn.classList.add('active');
                        }
                        alert('Đã thêm vào danh sách yêu thích');
                    });
                }
            })
            .catch(error => {
                console.error('Lỗi khi thao tác với yêu thích:', error);
                alert('Đã xảy ra lỗi');
            });
    });
}

// Hàm lấy nhãn thông số
function getSpecLabel(key) {
    const labels = {
        'cpu': 'CPU',
        'ram': 'RAM',
        'storage': 'Lưu trữ',
        'display': 'Màn hình',
        'os': 'Hệ điều hành',
        'gpu': 'Card đồ họa',
        'battery': 'Pin',
        'weight': 'Trọng lượng',
        'ports': 'Cổng kết nối',
        'wifi': 'Wi-Fi',
        'brand': 'Thương hiệu',
        'model': 'Model',
        'color': 'Màu sắc',
        'size': 'Kích thước',
        'resolution': 'Độ phân giải'
    };
    
    return labels[key] || key;
}

// Hàm định dạng giá tiền
function formatPrice(price) {
    if (typeof price !== 'number') {
        price = parseFloat(price) || 0;
    }
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Hàm tạo xếp hạng sao
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

// Hàm tạo thẻ sản phẩm
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-id', product.id);
    
    // Tính phần trăm giảm giá
    const discountPercent = product.originalPrice ? 
        Math.round((1 - product.price / product.originalPrice) * 100) : 0;
    
    card.innerHTML = `
        <div class="product-image">
            <img src="${product.image || 'https://via.placeholder.com/300x200/cccccc/969696?text=Sản+phẩm'}" alt="${product.name}">
            ${discountPercent > 0 ? `<div class="product-badge">-${discountPercent}%</div>` : ''}
        </div>
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <div class="product-price">
                <span class="current-price">${formatPrice(product.price)}đ</span>
                ${product.originalPrice ? 
                    `<span class="original-price">${formatPrice(product.originalPrice)}đ</span>` : ''}
                ${discountPercent > 0 ? `<span class="discount">-${discountPercent}%</span>` : ''}
            </div>
            <div class="product-rating">
                <div class="stars">
                    ${generateStarRating(product.rating || 0)}
                </div>
                <span class="rating-count">(${product.reviewCount || 0})</span>
            </div>
            <div class="product-actions">
                <button class="btn-cart" onclick="addToCart('${product.id}')">
                    <i class="fas fa-cart-plus"></i> Thêm vào giỏ
                </button>
                <button class="btn-favorite" onclick="toggleFavorite('${product.id}')">
                    <i class="far fa-heart"></i>
                </button>
            </div>
        </div>
    `;
    
    // Thêm sự kiện click để xem chi tiết sản phẩm
    card.addEventListener('click', function(e) {
        if (!e.target.closest('.product-actions')) {
            window.location.href = `product-detail.html?id=${product.id}`;
        }
    });
    
    return card;
}

// Hàm cập nhật số lượng giỏ hàng
function updateCartCount() {
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = '0';
        }
        return;
    }
    
    auth.onAuthStateChanged(user => {
        const cartCount = document.getElementById('cartCount');
        if (!cartCount) return;
        
        if (!user) {
            cartCount.textContent = '0';
            return;
        }
        
        db.collection('carts').doc(user.uid).collection('items').get()
            .then(querySnapshot => {
                let totalItems = 0;
                querySnapshot.forEach(doc => {
                    totalItems += doc.data().quantity || 0;
                });
                cartCount.textContent = totalItems;
            })
            .catch(error => {
                console.error('Lỗi khi đếm giỏ hàng:', error);
                cartCount.textContent = '0';
            });
    });
}

// Hàm hiển thị loading
function showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'productLoading';
    loadingDiv.className = 'product-loading';
    loadingDiv.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div class="loading-spinner"></div>
            <p style="margin-top: 15px; color: #6c757d;">Đang tải thông tin sản phẩm...</p>
        </div>
    `;
    
    const mainContent = document.querySelector('.product-detail-container');
    if (mainContent) {
        mainContent.style.display = 'none';
        mainContent.parentNode.insertBefore(loadingDiv, mainContent);
    }
}

// Hàm ẩn loading
function hideLoading() {
    const loadingDiv = document.getElementById('productLoading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
    
    const mainContent = document.querySelector('.product-detail-container');
    if (mainContent) {
        mainContent.style.display = 'grid';
    }
}

// Thêm CSS loading
const productDetailStyles = `
    <style>
        .product-loading {
            min-height: 400px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .product-error {
            animation: fadeIn 0.3s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .no-products {
            text-align: center;
            padding: 30px;
            color: #6c757d;
            grid-column: 1 / -1;
        }
        
        .error {
            text-align: center;
            padding: 30px;
            color: #dc3545;
            grid-column: 1 / -1;
        }
    </style>
`;

// Thêm CSS vào head
document.head.insertAdjacentHTML('beforeend', productDetailStyles);

// Đảm bảo file kết thúc đúng
// Không có gì thêm sau dòng này
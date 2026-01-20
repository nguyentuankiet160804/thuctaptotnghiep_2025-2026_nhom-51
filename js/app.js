// js/app.js - File JavaScript chính cho toàn bộ ứng dụng
document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo banner slider
    initBannerSlider();
    
    // Xử lý banner slider
    function initBannerSlider() {
        const slides = document.querySelectorAll('.banner-slide');
        if (slides.length === 0) return;
        
        let currentSlide = 0;
        
        function showSlide(index) {
            slides.forEach((slide, i) => {
                slide.classList.remove('active');
                if (i === index) {
                    slide.classList.add('active');
                }
            });
        }
        
        // Tự động chuyển slide
        setInterval(() => {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        }, 5000);
    }
    
    // Xử lý tìm kiếm
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // Xử lý click danh mục
    document.querySelectorAll('.category-item, .main-nav a[data-category]').forEach(item => {
        item.addEventListener('click', function(e) {
            if (this.hasAttribute('data-category')) {
                e.preventDefault();
                const category = this.getAttribute('data-category');
                filterProductsByCategory(category);
            }
        });
    });
    
    // Xử lý "Xem tất cả"
    document.querySelectorAll('.view-all').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.getAttribute('data-category');
            filterProductsByCategory(category);
        });
    });
});

// Hàm tìm kiếm
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    
    if (searchTerm) {
        // Lưu từ khóa tìm kiếm vào sessionStorage
        sessionStorage.setItem('searchTerm', searchTerm);
        window.location.href = 'search.html';
    }
}

// Hàm lọc sản phẩm theo danh mục
function filterProductsByCategory(category) {
    const categoryNames = {
        'laptop': 'Laptop',
        'pc': 'PC - Máy tính để bàn',
        'component': 'Linh kiện máy tính',
        'accessory': 'Phụ kiện',
        'monitor': 'Màn hình'
    };
    
    const categoryName = categoryNames[category] || category;
    window.location.href = `category.html?category=${category}&name=${encodeURIComponent(categoryName)}`;
}

// Hàm định dạng giá tiền
function formatPrice(price) {
    if (typeof price !== 'number') {
        price = parseFloat(price) || 0;
    }
    return price.toLocaleString('vi-VN');
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

// Hàm tạo thẻ sản phẩm (dùng chung)
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

// Hàm thêm vào giỏ hàng (dùng chung)
function addToCart(productId, quantity = 1) {
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
                    
                    const cartItemRef = db.collection('carts').doc(user.uid).collection('items').doc(productId);
                    
                    cartItemRef.get()
                        .then(cartDoc => {
                            const currentQuantity = cartDoc.exists ? cartDoc.data().quantity : 0;
                            const newQuantity = currentQuantity + quantity;
                            
                            if (product.stock < newQuantity) {
                                alert(`Chỉ còn ${product.stock} sản phẩm trong kho`);
                                return;
                            }
                            
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
                            alert(`Đã thêm sản phẩm vào giỏ hàng`);
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

// Hàm yêu thích (dùng chung)
function toggleFavorite(productId) {
    auth.onAuthStateChanged(user => {
        if (!user) {
            alert('Vui lòng đăng nhập để thêm sản phẩm vào yêu thích');
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.style.display = 'flex';
            }
            return;
        }
        
        const favoriteRef = db.collection('favorites').doc(user.uid).collection('items').doc(productId);
        const favoriteBtn = event.target.closest('.btn-favorite');
        
        favoriteRef.get()
            .then(doc => {
                if (doc.exists) {
                    // Xóa khỏi yêu thích
                    return favoriteRef.delete()
                        .then(() => {
                            if (favoriteBtn) {
                                favoriteBtn.classList.remove('active');
                                favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
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
                            favoriteBtn.classList.add('active');
                            favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
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

// Hàm cập nhật số lượng giỏ hàng (dùng chung)
function updateCartCount() {
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
            });
    });
}

// Cập nhật số lượng giỏ hàng khi trang được tải
updateCartCount();

// Khởi tạo các sự kiện khi DOM đã sẵn sàng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function initApp() {
    // Đã được xử lý trong DOMContentLoaded
}
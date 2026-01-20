// js/category.js - FILE HOÀN CHỈNH
let currentCategory = '';
let currentProducts = [];
let filteredProducts = [];
let currentPage = 1;
const productsPerPage = 12;
let activeFilters = {
    brands: [],
    minPrice: null,
    maxPrice: null,
    minRating: null
};

document.addEventListener('DOMContentLoaded', function() {
    // Lấy thông tin danh mục từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const categoryName = urlParams.get('name');
    
    if (!category) {
        window.location.href = 'index.html';
        return;
    }
    
    currentCategory = category;
    
    // Cập nhật tiêu đề
    const categoryTitle = document.getElementById('categoryTitle');
    const categoryHeader = document.getElementById('categoryHeader');
    
    if (categoryName) {
        categoryTitle.textContent = categoryName;
        categoryHeader.textContent = categoryName;
        document.title = categoryName + ' - TechStore';
    } else {
        const categoryNames = {
            'laptop': 'Laptop',
            'pc': 'PC - Máy tính để bàn',
            'component': 'Linh kiện máy tính',
            'accessory': 'Phụ kiện',
            'monitor': 'Màn hình'
        };
        
        const name = categoryNames[category] || category;
        categoryTitle.textContent = name;
        categoryHeader.textContent = name;
        document.title = name + ' - TechStore';
    }
    
    // Load sản phẩm
    loadCategoryProducts();
    
    // Xử lý sắp xếp
    const sortSelect = document.getElementById('sortProducts');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            sortProducts(this.value);
        });
    }
    
    // Xử lý bộ lọc giá
    const applyPriceBtn = document.getElementById('applyPriceFilter');
    if (applyPriceBtn) {
        applyPriceBtn.addEventListener('click', function() {
            applyPriceFilter();
        });
    }
    
    // Xử lý xóa bộ lọc
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', resetFilters);
    }
    
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
    
    // Xử lý bộ lọc thương hiệu và đánh giá
    document.addEventListener('change', function(e) {
        if (e.target.type === 'checkbox') {
            updateFilters();
        }
    });
    
    // Cập nhật số lượng giỏ hàng
    updateCartCount();
});

// ========== HÀM HELPER ==========

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

// Hàm thêm vào giỏ hàng
function addToCart(productId, quantity = 1) {
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
        const favoriteBtn = event ? event.target.closest('.btn-favorite') : null;
        
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

// ========== CHỨC NĂNG CHÍNH ==========

// Hàm load sản phẩm theo danh mục
function loadCategoryProducts() {
    showLoading();
    
    db.collection('products')
        .where('category', '==', currentCategory)
        .where('active', '==', true)
        .get()
        .then(querySnapshot => {
            currentProducts = [];
            
            querySnapshot.forEach(doc => {
                const product = doc.data();
                product.id = doc.id;
                currentProducts.push(product);
            });
            
            // Lấy danh sách thương hiệu
            updateBrandFilters();
            
            // Áp dụng bộ lọc và hiển thị
            applyFilters();
            
            hideLoading();
        })
        .catch(error => {
            console.error('Lỗi khi tải sản phẩm:', error);
            alert('Đã xảy ra lỗi khi tải sản phẩm');
            hideLoading();
        });
}

// Hàm cập nhật bộ lọc thương hiệu
function updateBrandFilters() {
    const brands = new Set();
    currentProducts.forEach(product => {
        if (product.brand) {
            brands.add(product.brand);
        }
    });
    
    const brandFiltersContainer = document.getElementById('brandFilters');
    if (!brandFiltersContainer) return;
    
    brandFiltersContainer.innerHTML = '';
    
    Array.from(brands).sort().forEach(brand => {
        const count = currentProducts.filter(p => p.brand === brand).length;
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" value="${brand}">
            <span>${brand}</span>
            <span class="filter-count">(${count})</span>
        `;
        brandFiltersContainer.appendChild(label);
    });
}

// Hàm áp dụng bộ lọc
function applyFilters() {
    filteredProducts = [...currentProducts];
    
    // Lọc theo thương hiệu
    if (activeFilters.brands.length > 0) {
        filteredProducts = filteredProducts.filter(product => 
            activeFilters.brands.includes(product.brand)
        );
    }
    
    // Lọc theo giá
    if (activeFilters.minPrice !== null) {
        filteredProducts = filteredProducts.filter(product => 
            product.price >= activeFilters.minPrice
        );
    }
    
    if (activeFilters.maxPrice !== null) {
        filteredProducts = filteredProducts.filter(product => 
            product.price <= activeFilters.maxPrice
        );
    }
    
    // Lọc theo đánh giá
    if (activeFilters.minRating !== null) {
        filteredProducts = filteredProducts.filter(product => 
            (product.rating || 0) >= activeFilters.minRating
        );
    }
    
    // Cập nhật số lượng sản phẩm
    const productsCount = document.getElementById('productsCount');
    if (productsCount) {
        productsCount.textContent = filteredProducts.length;
    }
    
    // Hiển thị sản phẩm
    displayProducts();
}

// Hàm hiển thị sản phẩm
function displayProducts() {
    const container = document.getElementById('categoryProducts');
    const noProducts = document.getElementById('noProducts');
    const pagination = document.getElementById('pagination');
    
    if (!container) return;
    
    if (filteredProducts.length === 0) {
        container.style.display = 'none';
        if (noProducts) noProducts.style.display = 'block';
        if (pagination) pagination.style.display = 'none';
        return;
    }
    
    container.style.display = 'grid';
    if (noProducts) noProducts.style.display = 'none';
    
    // Tính toán phân trang
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = Math.min(startIndex + productsPerPage, filteredProducts.length);
    const pageProducts = filteredProducts.slice(startIndex, endIndex);
    
    // Hiển thị sản phẩm
    container.innerHTML = '';
    pageProducts.forEach(product => {
        try {
            container.appendChild(createProductCard(product));
        } catch (error) {
            console.error('Lỗi khi tạo thẻ sản phẩm:', error);
        }
    });
    
    // Hiển thị phân trang
    displayPagination(totalPages);
}

// Hàm hiển thị phân trang
function displayPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    
    let paginationHtml = '';
    
    // Nút trước
    if (currentPage > 1) {
        paginationHtml += `
            <button class="page-btn" data-page="${currentPage - 1}">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
    }
    
    // Các trang
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    // Nút sau
    if (currentPage < totalPages) {
        paginationHtml += `
            <button class="page-btn" data-page="${currentPage + 1}">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }
    
    pagination.innerHTML = paginationHtml;
    
    // Xử lý click phân trang
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = parseInt(this.getAttribute('data-page'));
            if (page !== currentPage) {
                currentPage = page;
                displayProducts();
                // Cuộn lên đầu trang
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

// Hàm sắp xếp sản phẩm
function sortProducts(sortBy) {
    switch (sortBy) {
        case 'price_asc':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price_desc':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'name_asc':
            filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name_desc':
            filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'newest':
            filteredProducts.sort((a, b) => {
                const dateA = a.createdAt?.toDate() || new Date(0);
                const dateB = b.createdAt?.toDate() || new Date(0);
                return dateB - dateA;
            });
            break;
        case 'rating':
            filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
        default:
            // Mặc định: sắp xếp theo thời gian tạo
            filteredProducts.sort((a, b) => {
                const dateA = a.createdAt?.toDate() || new Date(0);
                const dateB = b.createdAt?.toDate() || new Date(0);
                return dateB - dateA;
            });
    }
    
    currentPage = 1;
    displayProducts();
}

// Hàm cập nhật bộ lọc
function updateFilters() {
    // Thương hiệu
    const brandCheckboxes = document.querySelectorAll('#brandFilters input[type="checkbox"]');
    activeFilters.brands = [];
    brandCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            activeFilters.brands.push(checkbox.value);
        }
    });
    
    // Đánh giá
    const ratingCheckboxes = document.querySelectorAll('#ratingFilters input[type="checkbox"]');
    activeFilters.minRating = null;
    ratingCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const rating = parseInt(checkbox.value);
            if (activeFilters.minRating === null || rating > activeFilters.minRating) {
                activeFilters.minRating = rating;
            }
        }
    });
    
    currentPage = 1;
    applyFilters();
}

// Hàm áp dụng bộ lọc giá
function applyPriceFilter() {
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    
    if (!minPriceInput || !maxPriceInput) return;
    
    const minPrice = minPriceInput.value;
    const maxPrice = maxPriceInput.value;
    
    activeFilters.minPrice = minPrice ? parseInt(minPrice) : null;
    activeFilters.maxPrice = maxPrice ? parseInt(maxPrice) : null;
    
    // Validate
    if (activeFilters.minPrice !== null && activeFilters.maxPrice !== null) {
        if (activeFilters.minPrice > activeFilters.maxPrice) {
            alert('Giá tối thiểu không được lớn hơn giá tối đa');
            return;
        }
    }
    
    currentPage = 1;
    applyFilters();
}

// Hàm reset bộ lọc
function resetFilters() {
    // Reset UI
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    if (minPriceInput) minPriceInput.value = '';
    if (maxPriceInput) maxPriceInput.value = '';
    
    // Reset bộ lọc
    activeFilters = {
        brands: [],
        minPrice: null,
        maxPrice: null,
        minRating: null
    };
    
    currentPage = 1;
    applyFilters();
}

// ========== UTILITY FUNCTIONS ==========

function showLoading() {
    const container = document.getElementById('categoryProducts');
    if (container) {
        container.innerHTML = `
            <div class="loading" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <div class="loading-spinner"></div>
                <p style="margin-top: 15px; color: #6c757d;">Đang tải sản phẩm...</p>
            </div>
        `;
    }
    
    const noProducts = document.getElementById('noProducts');
    if (noProducts) {
        noProducts.style.display = 'none';
    }
    
    const pagination = document.getElementById('pagination');
    if (pagination) {
        pagination.style.display = 'none';
    }
}

function hideLoading() {
    // Loading sẽ được thay thế khi hiển thị sản phẩm
}

// CSS bổ sung cho trang danh mục
const categoryStyles = `
    <style>
        .loading-spinner {
            width: 40px;
            height: 40px;
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
        
        .filter-count {
            margin-left: auto;
            color: #999;
            font-size: 12px;
        }
        
        .page-btn {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #ddd;
            background-color: white;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            color: #555;
            transition: all 0.3s;
        }
        
        .page-btn:hover {
            background-color: #f8f9fa;
            border-color: #007bff;
            color: #007bff;
        }
        
        .page-btn.active {
            background-color: #007bff;
            color: white;
            border-color: #007bff;
        }
        
        .page-dots {
            display: flex;
            align-items: center;
            padding: 0 10px;
            color: #6c757d;
        }
        
        .no-products {
            text-align: center;
            padding: 60px 20px;
            color: #6c757d;
        }
        
        .no-products i {
            font-size: 60px;
            margin-bottom: 20px;
            display: block;
            color: #ddd;
        }
        
        /* Cập nhật CSS cho product-card trong category */
        .products-grid-large .product-card {
            transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .products-grid-large .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
    </style>
`;

// Thêm CSS vào head
document.head.insertAdjacentHTML('beforeend', categoryStyles);
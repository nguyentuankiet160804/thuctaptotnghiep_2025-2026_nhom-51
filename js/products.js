// js/products.js
document.addEventListener('DOMContentLoaded', function() {
    // Load sản phẩm nổi bật
    loadFeaturedProducts();
    
    // Load sản phẩm theo danh mục
    loadCategoryProducts('laptop', 'laptopProducts');
    loadCategoryProducts('pc', 'pcProducts');
    
    // Xử lý click danh mục
    document.querySelectorAll('.category-item, .view-all, .main-nav a[data-category]').forEach(item => {
        item.addEventListener('click', function(e) {
            if (this.hasAttribute('data-category') || this.classList.contains('category-item')) {
                e.preventDefault();
                const category = this.getAttribute('data-category') || 
                               (this.classList.contains('category-item') ? this.getAttribute('data-category') : null);
                
                if (category) {
                    // Hiển thị sản phẩm theo danh mục
                    filterProductsByCategory(category);
                }
            }
        });
    });
    
    // Xử lý tìm kiếm
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
});

// Hàm load sản phẩm nổi bật
function loadFeaturedProducts() {
    const featuredContainer = document.getElementById('featuredProducts');
    if (!featuredContainer) return;
    
    // Lấy 10 sản phẩm nổi bật
    db.collection('products')
        .where('featured', '==', true)
        .limit(10)
        .get()
        .then(querySnapshot => {
            featuredContainer.innerHTML = '';
            
            if (querySnapshot.empty) {
                // Nếu không có sản phẩm nổi bật, lấy 10 sản phẩm mới nhất
                return db.collection('products')
                    .orderBy('createdAt', 'desc')
                    .limit(10)
                    .get();
            }
            
            return querySnapshot;
        })
        .then(querySnapshot => {
            if (querySnapshot.empty) {
                featuredContainer.innerHTML = '<p class="no-products">Chưa có sản phẩm nào.</p>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const product = doc.data();
                product.id = doc.id;
                
                // Sử dụng hàm createProductCard từ utils.js
                if (typeof createProductCard === 'function') {
                    featuredContainer.appendChild(createProductCard(product));
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
                    featuredContainer.appendChild(simpleCard);
                }
            });
        })
        .catch(error => {
            console.error('Lỗi khi tải sản phẩm nổi bật:', error);
            featuredContainer.innerHTML = '<p class="error">Đã xảy ra lỗi khi tải sản phẩm.</p>';
        });
}

// Hàm load sản phẩm theo danh mục
function loadCategoryProducts(category, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    db.collection('products')
        .where('category', '==', category)
        .limit(10)
        .get()
        .then(querySnapshot => {
            container.innerHTML = '';
            
            if (querySnapshot.empty) {
                container.innerHTML = '<p class="no-products">Chưa có sản phẩm nào trong danh mục này.</p>';
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
            console.error(`Lỗi khi tải sản phẩm ${category}:`, error);
            container.innerHTML = '<p class="error">Đã xảy ra lỗi khi tải sản phẩm.</p>';
        });
}

// Hàm lọc sản phẩm theo danh mục
function filterProductsByCategory(category) {
    // Đổi tiêu đề trang
    const categoryNames = {
        'laptop': 'Laptop',
        'pc': 'PC - Máy tính để bàn',
        'component': 'Linh kiện máy tính',
        'accessory': 'Phụ kiện',
        'monitor': 'Màn hình'
    };
    
    // Cập nhật URL để hiển thị sản phẩm theo danh mục
    window.location.href = `category.html?category=${category}&name=${encodeURIComponent(categoryNames[category])}`;
}

// Hàm tìm kiếm sản phẩm
function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    
    if (searchTerm) {
        window.location.href = `search.html?q=${encodeURIComponent(searchTerm)}`;
    } else {
        showNotification('Vui lòng nhập từ khóa tìm kiếm', 'warning');
    }
}
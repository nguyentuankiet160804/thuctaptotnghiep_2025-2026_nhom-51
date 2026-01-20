// js/favorites.js
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra đăng nhập
    auth.onAuthStateChanged(user => {
        if (!user) {
            // Nếu chưa đăng nhập
            document.getElementById('favoritesGrid').style.display = 'none';
            document.getElementById('emptyFavorites').style.display = 'block';
            document.getElementById('emptyFavorites').innerHTML = `
                <div class="empty-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <h3>Vui lòng đăng nhập để xem sản phẩm yêu thích</h3>
                <p>Đăng nhập để xem danh sách sản phẩm yêu thích của bạn</p>
                <button class="btn-primary" id="loginFromFavoritesBtn">Đăng nhập ngay</button>
            `;
            
            document.getElementById('suggestedProducts').style.display = 'none';
            
            document.getElementById('loginFromFavoritesBtn').addEventListener('click', function() {
                document.getElementById('authModal').style.display = 'flex';
            });
            
            return;
        }
        
        // Load sản phẩm yêu thích
        loadFavorites(user.uid);
        
        // Load sản phẩm gợi ý
        loadSuggestedProducts();
        
        // Xử lý sắp xếp
        document.getElementById('sortBy').addEventListener('change', function() {
            sortFavorites(this.value, user.uid);
        });
        
        // Xử lý xóa tất cả
        document.getElementById('clearFavoritesBtn').addEventListener('click', function() {
            clearAllFavorites(user.uid);
        });
    });
});

// Hàm load sản phẩm yêu thích
function loadFavorites(userId) {
    db.collection('favorites').doc(userId).collection('items')
        .orderBy('addedAt', 'desc')
        .get()
        .then(querySnapshot => {
            const favoritesGrid = document.getElementById('favoritesGrid');
            const emptyFavorites = document.getElementById('emptyFavorites');
            
            if (querySnapshot.empty) {
                // Không có sản phẩm yêu thích
                favoritesGrid.style.display = 'none';
                emptyFavorites.style.display = 'block';
                return;
            }
            
            // Hiển thị danh sách sản phẩm
            favoritesGrid.style.display = 'grid';
            emptyFavorites.style.display = 'none';
            favoritesGrid.innerHTML = '';
            
            let favorites = [];
            const promises = [];
            
            querySnapshot.forEach(doc => {
                const favoriteItem = doc.data();
                favoriteItem.favoriteId = doc.id;
                favoriteItem.addedAt = favoriteItem.addedAt?.toDate();
                
                promises.push(
                    db.collection('products').doc(favoriteItem.productId).get()
                        .then(productDoc => {
                            if (productDoc.exists) {
                                const product = productDoc.data();
                                product.id = productDoc.id;
                                product.addedAt = favoriteItem.addedAt;
                                
                                favorites.push(product);
                            }
                        })
                );
            });
            
            Promise.all(promises)
                .then(() => {
                    // Hiển thị sản phẩm
                    favorites.forEach(product => {
                        const productCard = createFavoriteCard(product);
                        favoritesGrid.appendChild(productCard);
                    });
                })
                .catch(error => {
                    console.error('Lỗi khi tải sản phẩm yêu thích:', error);
                    alert('Đã xảy ra lỗi khi tải sản phẩm yêu thích');
                });
        })
        .catch(error => {
            console.error('Lỗi khi tải danh sách yêu thích:', error);
        });
}

// Hàm tạo thẻ sản phẩm yêu thích
function createFavoriteCard(product) {
    const card = document.createElement('div');
    card.className = 'favorite-card';
    card.setAttribute('data-id', product.id);
    
    // Tính phần trăm giảm giá
    const discountPercent = product.originalPrice ? 
        Math.round((1 - product.price / product.originalPrice) * 100) : 0;
    
    card.innerHTML = `
        <div class="favorite-card-header">
            <div class="favorite-badge">
                <i class="fas fa-heart"></i>
            </div>
            <button class="btn-remove-favorite" title="Xóa khỏi yêu thích">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="favorite-card-image">
            <img src="${product.image || 'https://via.placeholder.com/300x200/cccccc/969696?text=Sản+phẩm'}" alt="${product.name}">
            ${discountPercent > 0 ? `<div class="product-badge">-${discountPercent}%</div>` : ''}
        </div>
        
        <div class="favorite-card-info">
            <h3 class="product-name">${product.name}</h3>
            
            <div class="product-price">
                <span class="current-price">${formatPrice(product.price)}đ</span>
                ${product.originalPrice ? 
                    `<span class="original-price">${formatPrice(product.originalPrice)}đ</span>` : ''}
            </div>
            
            <div class="product-rating">
                <div class="stars">
                    ${generateStarRating(product.rating || 0)}
                </div>
                <span class="rating-count">(${product.reviewCount || 0})</span>
            </div>
            
            <div class="product-stock">
                ${product.stock > 0 ? 
                    `<span class="in-stock"><i class="fas fa-check-circle"></i> Còn hàng</span>` :
                    `<span class="out-of-stock"><i class="fas fa-times-circle"></i> Hết hàng</span>`}
            </div>
            
            <div class="favorite-actions">
                <button class="btn-add-to-cart">
                    <i class="fas fa-cart-plus"></i> Thêm vào giỏ
                </button>
                <button class="btn-view-detail">
                    Xem chi tiết
                </button>
            </div>
            
            <div class="added-date">
                <i class="far fa-clock"></i> Đã thêm: ${formatDate(product.addedAt)}
            </div>
        </div>
    `;
    
    // Xử lý sự kiện
    const removeBtn = card.querySelector('.btn-remove-favorite');
    const addToCartBtn = card.querySelector('.btn-add-to-cart');
    const viewDetailBtn = card.querySelector('.btn-view-detail');
    
    removeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        removeFromFavorites(product.id);
    });
    
    addToCartBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        addToCart(product.id, 1);
    });
    
    viewDetailBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        window.location.href = `product-detail.html?id=${product.id}`;
    });
    
    // Click vào card để xem chi tiết
    card.addEventListener('click', function(e) {
        if (!e.target.closest('.favorite-card-header') && 
            !e.target.closest('.favorite-actions')) {
            window.location.href = `product-detail.html?id=${product.id}`;
        }
    });
    
    return card;
}

// Hàm xóa khỏi yêu thích
function removeFromFavorites(productId) {
    auth.onAuthStateChanged(user => {
        if (!user) return;
        
        db.collection('favorites').doc(user.uid).collection('items').doc(productId).delete()
            .then(() => {
                // Xóa card khỏi DOM
                const card = document.querySelector(`.favorite-card[data-id="${productId}"]`);
                if (card) {
                    card.remove();
                }
                
                // Kiểm tra nếu không còn sản phẩm nào
                const remainingCards = document.querySelectorAll('.favorite-card');
                if (remainingCards.length === 0) {
                    document.getElementById('favoritesGrid').style.display = 'none';
                    document.getElementById('emptyFavorites').style.display = 'block';
                }
                
                alert('Đã xóa sản phẩm khỏi danh sách yêu thích');
            })
            .catch(error => {
                console.error('Lỗi khi xóa khỏi yêu thích:', error);
                alert('Đã xảy ra lỗi khi xóa sản phẩm');
            });
    });
}

// Hàm sắp xếp sản phẩm yêu thích
function sortFavorites(sortBy, userId) {
    db.collection('favorites').doc(userId).collection('items')
        .get()
        .then(querySnapshot => {
            let favorites = [];
            const promises = [];
            
            querySnapshot.forEach(doc => {
                const favoriteItem = doc.data();
                favoriteItem.favoriteId = doc.id;
                favoriteItem.addedAt = favoriteItem.addedAt?.toDate();
                
                promises.push(
                    db.collection('products').doc(favoriteItem.productId).get()
                        .then(productDoc => {
                            if (productDoc.exists) {
                                const product = productDoc.data();
                                product.id = productDoc.id;
                                product.addedAt = favoriteItem.addedAt;
                                
                                favorites.push(product);
                            }
                        })
                );
            });
            
            Promise.all(promises)
                .then(() => {
                    // Sắp xếp theo tiêu chí
                    switch (sortBy) {
                        case 'newest':
                            favorites.sort((a, b) => b.addedAt - a.addedAt);
                            break;
                        case 'oldest':
                            favorites.sort((a, b) => a.addedAt - b.addedAt);
                            break;
                        case 'price_asc':
                            favorites.sort((a, b) => a.price - b.price);
                            break;
                        case 'price_desc':
                            favorites.sort((a, b) => b.price - a.price);
                            break;
                    }
                    
                    // Hiển thị lại danh sách
                    const favoritesGrid = document.getElementById('favoritesGrid');
                    favoritesGrid.innerHTML = '';
                    
                    favorites.forEach(product => {
                        const productCard = createFavoriteCard(product);
                        favoritesGrid.appendChild(productCard);
                    });
                });
        })
        .catch(error => {
            console.error('Lỗi khi sắp xếp:', error);
        });
}

// Hàm xóa tất cả sản phẩm yêu thích
function clearAllFavorites(userId) {
    if (!confirm('Bạn có chắc chắn muốn xóa tất cả sản phẩm khỏi danh sách yêu thích?')) {
        return;
    }
    
    // Lấy tất cả sản phẩm yêu thích
    db.collection('favorites').doc(userId).collection('items').get()
        .then(querySnapshot => {
            const deletePromises = [];
            querySnapshot.forEach(doc => {
                deletePromises.push(doc.ref.delete());
            });
            
            return Promise.all(deletePromises);
        })
        .then(() => {
            // Cập nhật giao diện
            document.getElementById('favoritesGrid').style.display = 'none';
            document.getElementById('emptyFavorites').style.display = 'block';
            alert('Đã xóa tất cả sản phẩm khỏi danh sách yêu thích');
        })
        .catch(error => {
            console.error('Lỗi khi xóa tất cả yêu thích:', error);
            alert('Đã xảy ra lỗi khi xóa sản phẩm');
        });
}

// Hàm load sản phẩm gợi ý
function loadSuggestedProducts() {
    // Lấy 4 sản phẩm ngẫu nhiên
    db.collection('products')
        .where('active', '==', true)
        .where('featured', '==', true)
        .limit(4)
        .get()
        .then(querySnapshot => {
            const container = document.getElementById('suggestedProducts');
            container.innerHTML = '';
            
            if (querySnapshot.empty) {
                // Nếu không có sản phẩm nổi bật, lấy sản phẩm mới nhất
                return db.collection('products')
                    .where('active', '==', true)
                    .orderBy('createdAt', 'desc')
                    .limit(4)
                    .get();
            }
            
            return querySnapshot;
        })
        .then(querySnapshot => {
            const container = document.getElementById('suggestedProducts');
            
            querySnapshot.forEach(doc => {
                const product = doc.data();
                product.id = doc.id;
                container.appendChild(createProductCard(product));
            });
        })
        .catch(error => {
            console.error('Lỗi khi tải sản phẩm gợi ý:', error);
        });
}

// Hàm định dạng ngày
function formatDate(date) {
    if (!date) return 'N/A';
    
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Hôm nay';
    } else if (diffDays === 1) {
        return 'Hôm qua';
    } else if (diffDays < 7) {
        return `${diffDays} ngày trước`;
    } else {
        return date.toLocaleDateString('vi-VN');
    }
}

// CSS bổ sung cho trang yêu thích
const favoritesStyles = `
    <style>
        .favorites-container {
            margin-bottom: 50px;
        }
        
        .filters {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        
        .filter-group {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .filter-group label {
            font-weight: 500;
            color: #555;
        }
        
        .filter-group select {
            padding: 8px 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            min-width: 200px;
        }
        
        .btn-clear-favorites {
            padding: 8px 20px;
            background-color: #f8d7da;
            color: #721c24;
            border: none;
            border-radius: 4px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        
        .btn-clear-favorites:hover {
            background-color: #f5c6cb;
        }
        
        .btn-clear-favorites i {
            margin-right: 8px;
        }
        
        .favorites-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 25px;
        }
        
        .favorite-card {
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            transition: transform 0.3s;
            position: relative;
            cursor: pointer;
        }
        
        .favorite-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        
        .favorite-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background-color: #f8f9fa;
            border-bottom: 1px solid #eee;
        }
        
        .favorite-badge {
            color: #dc3545;
            font-size: 18px;
        }
        
        .btn-remove-favorite {
            background: none;
            border: none;
            color: #999;
            font-size: 18px;
            cursor: pointer;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
        }
        
        .btn-remove-favorite:hover {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .favorite-card-image {
            height: 200px;
            overflow: hidden;
            position: relative;
        }
        
        .favorite-card-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s;
        }
        
        .favorite-card:hover .favorite-card-image img {
            transform: scale(1.05);
        }
        
        .favorite-card-info {
            padding: 20px;
        }
        
        .favorite-card .product-name {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 10px;
            height: 40px;
            overflow: hidden;
            color: #333;
        }
        
        .favorite-card .product-price {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .favorite-card .current-price {
            font-size: 18px;
            font-weight: 700;
            color: #dc3545;
        }
        
        .favorite-card .original-price {
            font-size: 14px;
            color: #999;
            text-decoration: line-through;
        }
        
        .favorite-card .product-rating {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .favorite-card .product-stock {
            margin-bottom: 15px;
        }
        
        .favorite-card .in-stock {
            color: #28a745;
            font-size: 14px;
        }
        
        .favorite-card .in-stock i {
            margin-right: 5px;
        }
        
        .favorite-card .out-of-stock {
            color: #dc3545;
            font-size: 14px;
        }
        
        .favorite-card .out-of-stock i {
            margin-right: 5px;
        }
        
        .favorite-actions {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .favorite-actions button {
            flex: 1;
            padding: 10px 0;
            border: none;
            border-radius: 4px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        
        .btn-add-to-cart {
            background-color: #007bff;
            color: white;
        }
        
        .btn-add-to-cart:hover {
            background-color: #0056b3;
        }
        
        .btn-add-to-cart i {
            margin-right: 5px;
        }
        
        .btn-view-detail {
            background-color: #f8f9fa;
            color: #555;
            border: 1px solid #ddd;
        }
        
        .btn-view-detail:hover {
            background-color: #e9ecef;
        }
        
        .added-date {
            font-size: 12px;
            color: #999;
            text-align: right;
        }
        
        .added-date i {
            margin-right: 5px;
        }
        
        .empty-favorites {
            text-align: center;
            padding: 60px 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        
        .empty-icon {
            font-size: 80px;
            color: #ddd;
            margin-bottom: 20px;
        }
        
        .empty-favorites h3 {
            font-size: 22px;
            color: #666;
            margin-bottom: 10px;
        }
        
        .empty-favorites p {
            color: #999;
            margin-bottom: 30px;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
            line-height: 1.6;
        }
        
        .suggested-products {
            margin-bottom: 50px;
        }
        
        @media (max-width: 768px) {
            .filters {
                flex-direction: column;
                gap: 15px;
                align-items: stretch;
            }
            
            .filter-group {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .filter-group select {
                width: 100%;
            }
            
            .favorites-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
`;

// Thêm CSS vào head
document.head.insertAdjacentHTML('beforeend', favoritesStyles);

// Cập nhật số lượng giỏ hàng
updateCartCount();
console.log('ai-advisor.js đang load...');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM sẵn sàng trong ai-advisor.js');
    
    initializeAIPage();
    setupEventListeners();
    
    if (typeof updateCartCount === 'function') {
        updateCartCount();
    }
});

let userPreferences = {
    budget: 30000000,
    category: 'laptop',
    priority: 'balanced',
    usages: [],
    features: []
};

const BUDGET_CONFIG = {
    MIN: 10000000,
    MAX: 100000000,
    STEP: 1000000
};

function initializeAIPage() {
    const budgetSlider = document.getElementById('budgetSlider');
    const budgetValue = document.getElementById('budgetValue');
    
    if (budgetSlider && budgetValue) {
        budgetSlider.min = BUDGET_CONFIG.MIN;
        budgetSlider.max = BUDGET_CONFIG.MAX;
        budgetSlider.step = BUDGET_CONFIG.STEP;
        
        budgetSlider.addEventListener('input', function() {
            const value = parseInt(this.value);
            budgetValue.textContent = formatPrice(value) + 'đ';
            userPreferences.budget = value;
            updateBudgetRangeDisplay();
        });
        
        budgetValue.textContent = formatPrice(userPreferences.budget) + 'đ';
        budgetSlider.value = userPreferences.budget;
        updateBudgetRangeDisplay();
    }
    
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            categoryCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            userPreferences.category = this.dataset.category;
        });
    });
    
    if (categoryCards.length > 0) {
        categoryCards[0].classList.add('selected');
    }
    
    const priorityOptions = document.querySelectorAll('.priority-option');
    priorityOptions.forEach(option => {
        option.addEventListener('click', function() {
            priorityOptions.forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            userPreferences.priority = this.dataset.priority;
        });
    });
    
    const balancedOption = document.querySelector('.priority-option[data-priority="balanced"]');
    if (balancedOption) {
        balancedOption.classList.add('selected');
    }
    
    const usageTags = document.querySelectorAll('.usage-tag');
    usageTags.forEach(tag => {
        tag.addEventListener('click', function() {
            this.classList.toggle('selected');
            const usage = this.dataset.usage;
            
            if (this.classList.contains('selected')) {
                if (!userPreferences.usages.includes(usage)) {
                    userPreferences.usages.push(usage);
                }
            } else {
                userPreferences.usages = userPreferences.usages.filter(u => u !== usage);
            }
        });
    });
    
    const featureCheckboxes = document.querySelectorAll('.feature-checkbox input[type="checkbox"]');
    featureCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const feature = this.value;
            const parent = this.closest('.feature-checkbox');
            
            if (this.checked) {
                parent.classList.add('selected');
                if (!userPreferences.features.includes(feature)) {
                    userPreferences.features.push(feature);
                }
            } else {
                parent.classList.remove('selected');
                userPreferences.features = userPreferences.features.filter(f => f !== feature);
            }
        });
    });
}

function updateBudgetRangeDisplay() {
    const minBudget = userPreferences.budget * 0.8;
    const maxBudget = userPreferences.budget * 1.2;
    
    const rangeDisplay = document.getElementById('budgetRangeDisplay');
    if (rangeDisplay) {
        rangeDisplay.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-top: 5px; color: #666; font-size: 14px;">
                <span>${formatPrice(minBudget)}đ</span>
                <span>Khoảng giá tìm kiếm</span>
                <span>${formatPrice(maxBudget)}đ</span>
            </div>
        `;
    }
}

function setupEventListeners() {
    const form = document.getElementById('aiAdvisorForm');
    const submitBtn = document.getElementById('submitBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            findBestProduct();
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetForm);
    }
    
    if (submitBtn) {
        submitBtn.addEventListener('click', findBestProduct);
    }
}

function findBestProduct() {
    console.log('Tìm sản phẩm tốt nhất với preferences:', userPreferences);
    
    if (!userPreferences.category) {
        showNotification('Vui lòng chọn loại sản phẩm', 'error');
        return;
    }
    
    if (!userPreferences.priority) {
        showNotification('Vui lòng chọn ưu tiên sử dụng', 'error');
        return;
    }
    
    if (userPreferences.usages.length === 0) {
        showNotification('Vui lòng chọn ít nhất một mục đích sử dụng', 'error');
        return;
    }
    
    if (userPreferences.budget < BUDGET_CONFIG.MIN || userPreferences.budget > BUDGET_CONFIG.MAX) {
        showNotification(`Ngân sách phải từ ${formatPrice(BUDGET_CONFIG.MIN)}đ đến ${formatPrice(BUDGET_CONFIG.MAX)}đ`, 'error');
        return;
    }
    
    showLoading(true);
    
    if (!db) {
        console.error('Firestore chưa được khởi tạo');
        showNotification('Hệ thống chưa sẵn sàng. Vui lòng thử lại sau.', 'error');
        showLoading(false);
        return;
    }
    
    const minBudget = Math.max(userPreferences.budget * 0.8, BUDGET_CONFIG.MIN);
    const maxBudget = Math.min(userPreferences.budget * 1.2, BUDGET_CONFIG.MAX);
    
    console.log(`Tìm sản phẩm từ ${formatPrice(minBudget)} đến ${formatPrice(maxBudget)}`);
    
    db.collection('products')
        .where('category', '==', userPreferences.category)
        .where('active', '==', true)
        .get()
        .then(querySnapshot => {
            console.log(`Tìm thấy ${querySnapshot.size} sản phẩm trong danh mục`);
            
            if (querySnapshot.size === 0) {
                showNoResults();
                return;
            }
            
            let bestProduct = null;
            let bestScore = -1;
            let analyzedCount = 0;
            
            querySnapshot.forEach(doc => {
                const product = doc.data();
                product.id = doc.id;
                
                if (product.stock <= 0) {
                    return;
                }
                
                if (product.price < minBudget || product.price > maxBudget) {
                    return;
                }
                
                const score = calculateProductScore(product, userPreferences);
                analyzedCount++;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestProduct = product;
                    bestProduct.aiScore = score;
                    bestProduct.matchPercentage = Math.round(score);
                }
                
                const analysisCountElement = document.getElementById('analysisCount');
                if (analysisCountElement) {
                    analysisCountElement.textContent = analyzedCount;
                }
            });
            
            console.log(`Đã phân tích ${analyzedCount} sản phẩm`);
            
            if (!bestProduct) {
                showNoResults();
                return;
            }
            
            console.log('Sản phẩm tốt nhất:', bestProduct);
            console.log('Điểm số:', bestScore);
            
            displayBestProduct(bestProduct);
            
        })
        .catch(error => {
            console.error('Lỗi khi tìm sản phẩm:', error);
            
            if (error.code === 'failed-precondition') {
                console.log('Thử phương án backup...');
                findProductWithSimpleQuery();
            } else {
                showNotification('Đã xảy ra lỗi khi tìm kiếm. Vui lòng thử lại.', 'error');
                showLoading(false);
            }
        });
}

function findProductWithSimpleQuery() {
    db.collection('products')
        .where('category', '==', userPreferences.category)
        .get()
        .then(querySnapshot => {
            console.log(`Tìm thấy ${querySnapshot.size} sản phẩm`);
            
            if (querySnapshot.size === 0) {
                showNoResults();
                return;
            }
            
            const minBudget = Math.max(userPreferences.budget * 0.8, BUDGET_CONFIG.MIN);
            const maxBudget = Math.min(userPreferences.budget * 1.2, BUDGET_CONFIG.MAX);
            
            let bestProduct = null;
            let bestScore = -1;
            let analyzedCount = 0;
            
            querySnapshot.forEach(doc => {
                const product = doc.data();
                product.id = doc.id;
                
                if (!product.active || product.stock <= 0) {
                    return;
                }
                
                if (product.price < minBudget || product.price > maxBudget) {
                    return;
                }
                
                const score = calculateProductScore(product, userPreferences);
                analyzedCount++;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestProduct = product;
                    bestProduct.aiScore = score;
                    bestProduct.matchPercentage = Math.round(score);
                }
            });
            
            if (!bestProduct) {
                showNoResults();
                return;
            }
            
            displayBestProduct(bestProduct);
            
        })
        .catch(error => {
            console.error('Lỗi phương án backup:', error);
            showNotification('Đã xảy ra lỗi khi tìm kiếm. Vui lòng thử lại sau.', 'error');
            showLoading(false);
        });
}

function calculateProductScore(product, preferences) {
    let score = 0;
    const maxScore = 100;
    
    const budgetDiff = Math.abs(product.price - preferences.budget);
    const budgetMaxDiff = preferences.budget * 0.2;
    const budgetScore = 40 * (1 - Math.min(budgetDiff / budgetMaxDiff, 1));
    score += budgetScore;
    
    score += calculatePriorityScore(product, preferences.priority);
    
    score += calculateUsageScore(product, preferences.usages);
    
    score += calculateFeatureScore(product, preferences.features);
    
    return Math.min(score, maxScore);
}

function calculatePriorityScore(product, priority) {
    let score = 0;
    const specs = product.specs || {};
    
    switch(priority) {
        case 'performance':
            let performanceScore = 0;
            
            if (specs.cpu) {
                if (specs.cpu.includes('i9') || specs.cpu.includes('Ryzen 9')) performanceScore += 12;
                else if (specs.cpu.includes('i7') || specs.cpu.includes('Ryzen 7')) performanceScore += 10;
                else if (specs.cpu.includes('i5') || specs.cpu.includes('Ryzen 5')) performanceScore += 8;
                else if (specs.cpu.includes('i3') || specs.cpu.includes('Ryzen 3')) performanceScore += 6;
                else performanceScore += 4;
            }
            
            if (specs.ram) {
                const ramGB = parseInt(specs.ram);
                if (ramGB >= 32) performanceScore += 10;
                else if (ramGB >= 16) performanceScore += 8;
                else if (ramGB >= 8) performanceScore += 6;
                else performanceScore += 4;
            }
            
            if (specs.gpu) {
                if (specs.gpu.includes('RTX 4090') || specs.gpu.includes('RTX 4080')) performanceScore += 8;
                else if (specs.gpu.includes('RTX 4070') || specs.gpu.includes('RTX 4060')) performanceScore += 6;
                else if (specs.gpu.includes('RTX 3060') || specs.gpu.includes('RTX 3070')) performanceScore += 5;
                else if (specs.gpu.includes('RTX 3050') || specs.gpu.includes('RTX 2060')) performanceScore += 4;
                else if (specs.gpu.includes('GTX')) performanceScore += 2;
            }
            
            if (specs.storage) {
                if (specs.storage.includes('NVMe')) performanceScore += 5;
                else if (specs.storage.includes('SSD')) performanceScore += 4;
                else if (specs.storage.includes('HDD')) performanceScore += 2;
            }
            
            score = (performanceScore / 35) * 35;
            break;
            
        case 'balanced':
            let valueScore = 0;
            
            if (specs.cpu) {
                if (specs.cpu.includes('i7') || specs.cpu.includes('Ryzen 7')) valueScore += 15;
                else if (specs.cpu.includes('i5') || specs.cpu.includes('Ryzen 5')) valueScore += 12;
                else if (specs.cpu.includes('i3') || specs.cpu.includes('Ryzen 3')) valueScore += 8;
            }
            
            if (specs.ram) {
                const ramGB = parseInt(specs.ram);
                if (ramGB >= 16) valueScore += 10;
                else if (ramGB >= 8) valueScore += 8;
            }
            
            if (specs.storage && specs.storage.includes('SSD')) {
                valueScore += 5;
            }
            
            if (specs.gpu && specs.gpu.includes('RTX')) {
                valueScore += 5;
            }
            
            if (valueScore > 0 && product.price > 0) {
                const priceInMillions = product.price / 1000000;
                const valueRatio = valueScore / priceInMillions;
                
                if (valueRatio > 15) score = 35;
                else if (valueRatio > 12) score = 30;
                else if (valueRatio > 9) score = 25;
                else if (valueRatio > 6) score = 20;
                else score = 15;
            }
            break;
            
        case 'budget':
            if (product.price < 8000000) score += 20;
            else if (product.price < 15000000) score += 15;
            else if (product.price < 25000000) score += 10;
            
            if (specs.ram && parseInt(specs.ram) >= 8) score += 8;
            if (specs.cpu && (specs.cpu.includes('i5') || specs.cpu.includes('Ryzen 5'))) score += 7;
            if (product.warranty && product.warranty >= 24) score += 5;
            break;
    }
    
    return Math.min(score, 35);
}

function calculateUsageScore(product, usages) {
    let score = 0;
    const maxScorePerUsage = 3;
    
    const specs = product.specs || {};
    
    usages.forEach(usage => {
        let usageScore = 0;
        
        switch(usage) {
            case 'office':
                if (specs.storage && specs.storage.includes('SSD')) usageScore += 2;
                if (specs.cpu && (specs.cpu.includes('i5') || specs.cpu.includes('Ryzen 5'))) usageScore += 1;
                if (product.weight && product.weight < 2) usageScore += 1;
                break;
                
            case 'gaming':
                if (specs.gpu && specs.gpu.includes('RTX')) usageScore += 2;
                if (specs.ram && parseInt(specs.ram) >= 16) usageScore += 1;
                if (specs.display && (specs.display.includes('144Hz') || specs.display.includes('165Hz'))) usageScore += 1;
                break;
                
            case 'design':
                if (specs.display && (specs.display.includes('4K') || specs.display.includes('OLED'))) usageScore += 2;
                if (specs.gpu && specs.gpu.includes('RTX')) usageScore += 1;
                if (specs.ram && parseInt(specs.ram) >= 16) usageScore += 1;
                break;
                
            case 'study':
                if (product.weight && product.weight < 1.8) usageScore += 2;
                if (specs.battery && parseInt(specs.battery) >= 8) usageScore += 1;
                if (specs.cpu && (specs.cpu.includes('i5') || specs.cpu.includes('Ryzen 5'))) usageScore += 1;
                break;
                
            case 'programming':
                if (specs.ram && parseInt(specs.ram) >= 16) usageScore += 2;
                if (specs.cpu && (specs.cpu.includes('i7') || specs.cpu.includes('Ryzen 7'))) usageScore += 1;
                if (specs.storage && specs.storage.includes('SSD')) usageScore += 1;
                break;
                
            case 'video':
                if (specs.ram && parseInt(specs.ram) >= 32) usageScore += 2;
                if (specs.cpu && specs.cpu.includes('i9')) usageScore += 1;
                if (specs.gpu && specs.gpu.includes('RTX')) usageScore += 1;
                break;
                
            case 'entertainment':
                if (specs.display && specs.display.includes('OLED')) usageScore += 2;
                if (specs.speakers && specs.speakers.includes('Dolby')) usageScore += 1;
                if (specs.display && specs.display.includes('4K')) usageScore += 1;
                break;
                
            case 'streaming':
                if (specs.webcam && parseInt(specs.webcam) >= 1080) usageScore += 2;
                if (specs.cpu && specs.cpu.includes('i7')) usageScore += 1;
                if (specs.ram && parseInt(specs.ram) >= 16) usageScore += 1;
                break;
        }
        
        usageScore = Math.min(usageScore, maxScorePerUsage);
        score += usageScore;
    });
    
    const maxPossibleScore = usages.length * maxScorePerUsage;
    if (maxPossibleScore > 0) {
        score = (score / maxPossibleScore) * 15;
    }
    
    return Math.min(score, 15);
}

function calculateFeatureScore(product, features) {
    let score = 0;
    const maxScorePerFeature = 2;
    
    const specs = product.specs || {};
    
    features.forEach(feature => {
        let featureScore = 0;
        
        switch(feature) {
            case 'lightweight':
                if (product.weight && product.weight < 1.5) featureScore += 2;
                else if (product.weight && product.weight < 2) featureScore += 1;
                break;
                
            case 'battery':
                if (specs.battery && parseInt(specs.battery) >= 10) featureScore += 2;
                else if (specs.battery && parseInt(specs.battery) >= 8) featureScore += 1;
                break;
                
            case 'display':
                if (specs.display && specs.display.includes('4K')) featureScore += 2;
                else if (specs.display && specs.display.includes('OLED')) featureScore += 2;
                else if (specs.display && specs.display.includes('IPS')) featureScore += 1;
                break;
                
            case 'quiet':
                if (specs.cooling && (specs.cooling.includes('Quiet') || specs.cooling.includes('Silent'))) featureScore += 2;
                break;
                
            case 'upgrade':
                if (specs.upgradable && specs.upgradable === 'Yes') featureScore += 2;
                break;
                
            case 'warranty':
                if (product.warranty && product.warranty >= 36) featureScore += 2;
                else if (product.warranty && product.warranty >= 24) featureScore += 1;
                break;
        }
        
        featureScore = Math.min(featureScore, maxScorePerFeature);
        score += featureScore;
    });
    
    const maxPossibleScore = features.length * maxScorePerFeature;
    if (maxPossibleScore > 0) {
        score = (score / maxPossibleScore) * 10;
    }
    
    return Math.min(score, 10);
}

function displayBestProduct(product) {
    const resultsContainer = document.getElementById('resultsGrid');
    const aiResults = document.getElementById('aiResults');
    const aiLoading = document.getElementById('aiLoading');
    const noResults = document.getElementById('noResults');
    const resultsTitle = document.querySelector('.results-title');
    const resultsSubtitle = document.querySelector('.results-subtitle');
    
    if (!resultsContainer || !aiResults || !aiLoading) {
        console.error('Không tìm thấy container kết quả');
        return;
    }
    
    aiLoading.style.display = 'none';
    noResults.style.display = 'none';
    aiResults.style.display = 'block';
    
    if (resultsTitle) {
        resultsTitle.textContent = '🎯 SẢN PHẨM TỐT NHẤT CHO BẠN';
    }
    
    if (resultsSubtitle) {
        resultsSubtitle.textContent = 'Được AI lựa chọn dựa trên tất cả tiêu chí của bạn';
    }
    
    resultsContainer.innerHTML = '';
    
    const resultCard = createResultCard(product);
    resultsContainer.appendChild(resultCard);
    
    updateAIExplanation(product, userPreferences);
    
    aiResults.scrollIntoView({ behavior: 'smooth' });
}

function createResultCard(product) {
    const card = document.createElement('div');
    card.className = 'result-card';
    
    const specs = product.specs || {};
    
    let specsHTML = '';
    
    if (specs.cpu) {
        specsHTML += `
            <div class="spec-item">
                <span class="spec-label">CPU:</span>
                <span class="spec-value">${specs.cpu}</span>
            </div>
        `;
    }
    
    if (specs.ram) {
        specsHTML += `
            <div class="spec-item">
                <span class="spec-label">RAM:</span>
                <span class="spec-value">${specs.ram}</span>
            </div>
        `;
    }
    
    if (specs.storage) {
        specsHTML += `
            <div class="spec-item">
                <span class="spec-label">Lưu trữ:</span>
                <span class="spec-value">${specs.storage}</span>
            </div>
        `;
    }
    
    if (specs.gpu) {
        specsHTML += `
            <div class="spec-item">
                <span class="spec-label">GPU:</span>
                <span class="spec-value">${specs.gpu}</span>
            </div>
        `;
    }
    
    if (specs.display) {
        specsHTML += `
            <div class="spec-item">
                <span class="spec-label">Màn hình:</span>
                <span class="spec-value">${specs.display}</span>
            </div>
        `;
    }
    
    if (specs.battery) {
        specsHTML += `
            <div class="spec-item">
                <span class="spec-label">Pin:</span>
                <span class="spec-value">${specs.battery} giờ</span>
            </div>
        `;
    }
    
    if (product.warranty) {
        specsHTML += `
            <div class="spec-item">
                <span class="spec-label">Bảo hành:</span>
                <span class="spec-value">${product.warranty} tháng</span>
            </div>
        `;
    }
    
    const isWithinBudgetRange = Math.abs(product.price - userPreferences.budget) <= userPreferences.budget * 0.2;
    
    card.innerHTML = `
        <div class="result-badge best">TỐT NHẤT</div>
        
        <div class="result-image">
            <img src="${product.image || 'https://via.placeholder.com/400x300/cccccc/969696?text=Sản+phẩm'}" 
                 alt="${product.name}" 
                 onerror="this.src='https://via.placeholder.com/400x300/cccccc/969696?text=Sản+phẩm'">
        </div>
        
        <div class="result-content">
            <h3 class="result-name">${product.name}</h3>
            <div class="result-price">${formatPrice(product.price)}đ</div>
            
            <div class="budget-info">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #666; font-size: 14px;">Ngân sách của bạn:</span>
                    <span style="color: #007bff; font-weight: bold;">${formatPrice(userPreferences.budget)}đ</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #666; font-size: 14px;">Chênh lệch:</span>
                    <span style="color: ${product.price <= userPreferences.budget ? '#28a745' : '#dc3545'}; font-weight: bold;">
                        ${product.price <= userPreferences.budget ? '-' : '+'}${formatPrice(Math.abs(product.price - userPreferences.budget))}đ
                    </span>
                </div>
            </div>
            
            <div class="result-specs">
                ${specsHTML}
            </div>
            
            <div class="result-match">
                <div class="match-title">Mức độ phù hợp:</div>
                <div class="match-bar">
                    <div class="match-fill" style="width: ${product.matchPercentage}%"></div>
                </div>
                <div class="match-percent">${product.matchPercentage}%</div>
            </div>
            
            <div style="margin-top: 20px; background-color: #f8f9fa; padding: 15px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #666; font-size: 14px;">Phù hợp ngân sách:</span>
                    <span style="color: ${isWithinBudgetRange ? '#28a745' : '#ffc107'}; font-weight: bold;">
                        ${isWithinBudgetRange ? 'TRONG KHOẢNG' : 'NGOÀI KHOẢNG'}
                    </span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #666; font-size: 14px;">Còn hàng:</span>
                    <span style="color: ${product.stock > 0 ? '#28a745' : '#dc3545'}; font-weight: bold;">
                        ${product.stock > 0 ? 'CÓ HÀNG' : 'HẾT HÀNG'}
                    </span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #666; font-size: 14px;">Đánh giá:</span>
                    <span style="color: #ffc107; font-weight: bold;">
                        ${product.rating || 0}/5 ⭐
                    </span>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button class="btn-cart" onclick="addToCart('${product.id}')" 
                        style="flex: 1; padding: 12px; background-color: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;"
                        ${product.stock <= 0 ? 'disabled' : ''}>
                    <i class="fas fa-cart-plus"></i> ${product.stock > 0 ? 'THÊM VÀO GIỎ HÀNG' : 'HẾT HÀNG'}
                </button>
                <a href="product-detail.html?id=${product.id}" 
                   style="flex: 1; padding: 12px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: bold;">
                    <i class="fas fa-info-circle"></i> XEM CHI TIẾT
                </a>
            </div>
        </div>
    `;
    
    return card;
}

function updateAIExplanation(product, preferences) {
    const explanationElement = document.getElementById('aiExplanation');
    if (!explanationElement) return;
    
    const categoryName = getCategoryName(preferences.category);
    const priorityName = getPriorityName(preferences.priority);
    const isWithinBudgetRange = Math.abs(product.price - preferences.budget) <= preferences.budget * 0.2;
    
    let explanation = `🏆 <strong>"${product.name}"</strong> là sản phẩm <span style="color: #28a745; font-weight: bold;">TỐT NHẤT</span> cho bạn!<br><br>`;
    
    explanation += `📊 <strong>Điểm phù hợp:</strong> ${product.matchPercentage}/100 điểm<br>`;
    explanation += `💰 <strong>Ngân sách của bạn:</strong> ${formatPrice(preferences.budget)}đ<br>`;
    explanation += `💵 <strong>Giá sản phẩm:</strong> ${formatPrice(product.price)}đ `;
    explanation += `<span style="color: ${isWithinBudgetRange ? '#28a745' : '#ffc107'}; font-weight: bold;">(${isWithinBudgetRange ? 'Trong khoảng' : 'Ngoài khoảng'} tìm kiếm)</span><br>`;
    explanation += `🎯 <strong>Ưu tiên:</strong> ${priorityName}<br>`;
    
    if (preferences.usages.length > 0) {
        explanation += `🎮 <strong>Mục đích:</strong> ${preferences.usages.join(', ')}<br>`;
    }
    
    if (preferences.features.length > 0) {
        explanation += `✨ <strong>Tính năng:</strong> ${preferences.features.join(', ')}<br><br>`;
    }
    
    explanation += `🔍 AI đã phân tích tất cả sản phẩm ${categoryName} trong khoảng giá `;
    explanation += `<strong>${formatPrice(preferences.budget * 0.8)}đ - ${formatPrice(preferences.budget * 1.2)}đ</strong> `;
    explanation += `và tìm thấy <strong>"${product.name}"</strong> là sự lựa chọn tốt nhất.`;
    
    if (product.matchPercentage >= 85) {
        explanation += `<br><br><span style="color: #28a745; font-weight: bold;">🎯 Đây là sản phẩm XUẤT SẮC với mức độ phù hợp rất cao!</span>`;
    } else if (product.matchPercentage >= 70) {
        explanation += `<br><br><span style="color: #17a2b8; font-weight: bold;">👍 Đây là sản phẩm RẤT TỐT cho nhu cầu của bạn.</span>`;
    } else {
        explanation += `<br><br><span style="color: #ffc107; font-weight: bold;">⚠️ Đây là sản phẩm TỐT NHẤT trong ngân sách, nhưng có thể cân nhắc điều chỉnh ngân sách để có lựa chọn tốt hơn.</span>`;
    }
    
    explanationElement.innerHTML = explanation;
}

function getCategoryName(category) {
    const categories = {
        'laptop': 'laptop',
        'pc': 'máy tính để bàn',
        'component': 'linh kiện máy tính',
        'monitor': 'màn hình',
        'accessory': 'phụ kiện'
    };
    return categories[category] || category;
}

function getPriorityName(priority) {
    const priorities = {
        'performance': 'HIỆU NĂNG CAO',
        'balanced': 'CÂN BẰNG GIÁ TRỊ',
        'budget': 'TIẾT KIỆM NGÂN SÁCH'
    };
    return priorities[priority] || priority;
}

function showLoading(show) {
    const form = document.getElementById('aiAdvisorForm');
    const loading = document.getElementById('aiLoading');
    const results = document.getElementById('aiResults');
    const noResults = document.getElementById('noResults');
    
    if (show) {
        if (form) form.style.display = 'none';
        if (loading) loading.style.display = 'block';
        if (results) results.style.display = 'none';
        if (noResults) noResults.style.display = 'none';
    } else {
        if (form) form.style.display = 'block';
        if (loading) loading.style.display = 'none';
    }
}

function showNoResults() {
    const loading = document.getElementById('aiLoading');
    const noResults = document.getElementById('noResults');
    const results = document.getElementById('aiResults');
    
    if (loading) loading.style.display = 'none';
    if (noResults) noResults.style.display = 'block';
    if (results) results.style.display = 'none';
    
    const noResultsText = document.querySelector('.no-results-text');
    if (noResultsText) {
        const minBudget = userPreferences.budget * 0.8;
        const maxBudget = userPreferences.budget * 1.2;
        noResultsText.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-search" style="font-size: 48px; color: #6c757d; margin-bottom: 20px;"></i>
                <h4 style="color: #dc3545;">Không tìm thấy sản phẩm phù hợp</h4>
                <p>Không có sản phẩm trong khoảng giá:<br>
                <strong>${formatPrice(minBudget)}đ - ${formatPrice(maxBudget)}đ</strong></p>
                <p><small>Vui lòng thử:</small></p>
                <ul style="text-align: left; display: inline-block;">
                    <li>Điều chỉnh ngân sách cao hơn</li>
                    <li>Thay đổi loại sản phẩm</li>
                    <li>Giảm bớt yêu cầu về tính năng</li>
                </ul>
                <button onclick="resetForm()" style="margin-top: 20px; padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    <i class="fas fa-redo"></i> Đặt lại tiêu chí
                </button>
            </div>
        `;
    }
}

function resetForm() {
    const form = document.getElementById('aiAdvisorForm');
    const loading = document.getElementById('aiLoading');
    const results = document.getElementById('aiResults');
    const noResults = document.getElementById('noResults');
    
    if (form) form.style.display = 'block';
    if (loading) loading.style.display = 'none';
    if (results) results.style.display = 'none';
    if (noResults) noResults.style.display = 'none';
    
    userPreferences = {
        budget: 30000000,
        category: 'laptop',
        priority: 'balanced',
        usages: [],
        features: []
    };
    
    const budgetSlider = document.getElementById('budgetSlider');
    const budgetValue = document.getElementById('budgetValue');
    if (budgetSlider && budgetValue) {
        budgetSlider.value = userPreferences.budget;
        budgetValue.textContent = formatPrice(userPreferences.budget) + 'đ';
        updateBudgetRangeDisplay();
    }
    
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach((card, index) => {
        card.classList.remove('selected');
        if (index === 0) card.classList.add('selected');
    });
    
    const priorityOptions = document.querySelectorAll('.priority-option');
    priorityOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.priority === 'balanced') {
            option.classList.add('selected');
        }
    });
    
    const usageTags = document.querySelectorAll('.usage-tag');
    usageTags.forEach(tag => {
        tag.classList.remove('selected');
    });
    
    const featureCheckboxes = document.querySelectorAll('.feature-checkbox input[type="checkbox"]');
    featureCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.closest('.feature-checkbox').classList.remove('selected');
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    showNotification('Đã đặt lại tất cả tiêu chí', 'success');
}

if (typeof window !== 'undefined') {
    window.resetForm = resetForm;
    window.findBestProduct = findBestProduct;
    
    if (typeof window.formatPrice !== 'function') {
        window.formatPrice = function(price) {
            return new Intl.NumberFormat('vi-VN').format(price);
        };
    }
    
    if (typeof window.showNotification !== 'function') {
        window.showNotification = function(message, type = 'info') {
            alert(message);
        };
    }
    
    if (typeof window.addToCart !== 'function') {
        window.addToCart = function(productId) {
            alert('Thêm vào giỏ hàng: ' + productId);
        };
    }
}
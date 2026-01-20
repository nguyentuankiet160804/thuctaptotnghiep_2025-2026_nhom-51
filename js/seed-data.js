// js/seed-data.js
// Chạy hàm này một lần để tạo dữ liệu mẫu

function createSampleData() {
    // Đảm bảo người dùng đã đăng nhập và có quyền admin
    auth.onAuthStateChanged(user => {
        if (!user) {
            alert('Vui lòng đăng nhập với tài khoản admin trước');
            return;
        }
        
        // Kiểm tra quyền admin
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                if (!doc.exists || doc.data().role !== 'admin') {
                    alert('Bạn cần quyền admin để tạo dữ liệu mẫu');
                    return;
                }
                
                // Tạo dữ liệu sản phẩm mẫu
                createSampleProducts();
            })
            .catch(error => {
                console.error('Lỗi khi kiểm tra quyền:', error);
            });
    });
}

function createSampleProducts() {
    const sampleProducts = [
        // ========== LAPTOP (10 sản phẩm) ==========
        {
            name: 'Laptop Dell XPS 13 9310',
            category: 'laptop',
            price: 32990000,
            originalPrice: 35990000,
            stock: 15,
            brand: 'Dell',
            rating: 4.8,
            reviewCount: 128,
            description: 'Laptop Dell XPS 13 9310, Intel Core i7-1165G7, RAM 16GB, SSD 512GB, Màn hình 13.4 inch 4K UHD+, Windows 10 Pro, Vỏ nhôm màu bạc.',
            image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: true,
            active: true,
            specs: {
                cpu: 'Intel Core i7-1165G7',
                ram: '16GB LPDDR4x',
                storage: '512GB SSD M.2 NVMe',
                display: '13.4 inch 4K UHD+ (3840 x 2400)',
                graphics: 'Intel Iris Xe Graphics',
                os: 'Windows 10 Pro',
                battery: '52Wh',
                weight: '1.27kg',
                ports: '2 x Thunderbolt 4, 1 x USB-C, MicroSD card reader'
            }
        },
        {
            name: 'MacBook Pro 14 inch M1 Pro',
            category: 'laptop',
            price: 52990000,
            originalPrice: 54990000,
            stock: 8,
            brand: 'Apple',
            rating: 4.9,
            reviewCount: 256,
            description: 'MacBook Pro 14 inch với chip M1 Pro, 8 nhân CPU, 14 nhân GPU, RAM 16GB, SSD 512GB, màn hình Liquid Retina XDR.',
            image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: true,
            active: true,
            specs: {
                cpu: 'Apple M1 Pro 8-core',
                ram: '16GB unified memory',
                storage: '512GB SSD',
                display: '14.2 inch Liquid Retina XDR (3024 x 1964)',
                graphics: '14-core GPU',
                os: 'macOS Monterey',
                battery: '70Wh (khoảng 17 giờ)',
                weight: '1.6kg',
                ports: '3 x Thunderbolt 4, HDMI, SDXC, MagSafe 3'
            }
        },
        {
            name: 'Laptop ASUS ROG Zephyrus G14',
            category: 'laptop',
            price: 28990000,
            originalPrice: 31990000,
            stock: 12,
            brand: 'ASUS',
            rating: 4.7,
            reviewCount: 189,
            description: 'Laptop gaming ASUS ROG Zephyrus G14, AMD Ryzen 9 5900HS, RTX 3060 6GB, RAM 16GB, SSD 1TB, Màn hình 14 inch QHD 120Hz.',
            image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: true,
            active: true
        },
        {
            name: 'Laptop HP Spectre x360',
            category: 'laptop',
            price: 27990000,
            originalPrice: 29990000,
            stock: 10,
            brand: 'HP',
            rating: 4.6,
            reviewCount: 94,
            description: 'Laptop 2-in-1 HP Spectre x360, Intel Core i7-1165G7, RAM 16GB, SSD 512GB, Màn hình 13.5 inch 3K2K OLED cảm ứng.',
            image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: false,
            active: true
        },
        {
            name: 'Laptop Lenovo ThinkPad X1 Carbon',
            category: 'laptop',
            price: 34990000,
            originalPrice: 37990000,
            stock: 7,
            brand: 'Lenovo',
            rating: 4.8,
            reviewCount: 112,
            description: 'Laptop doanh nhân Lenovo ThinkPad X1 Carbon Gen 9, Intel Core i7-1165G7, RAM 16GB, SSD 512GB, Màn hình 14 inch 4K.',
            image: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: true,
            active: true
        },
        {
            name: 'Laptop Acer Swift 3',
            category: 'laptop',
            price: 16990000,
            originalPrice: 18990000,
            stock: 20,
            brand: 'Acer',
            rating: 4.3,
            reviewCount: 76,
            description: 'Laptop Acer Swift 3, AMD Ryzen 7 5700U, RAM 8GB, SSD 512GB, Màn hình 14 inch Full HD IPS, Windows 11.',
            image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: false,
            active: true
        },
        {
            name: 'Laptop MSI Prestige 14',
            category: 'laptop',
            price: 23990000,
            originalPrice: 25990000,
            stock: 9,
            brand: 'MSI',
            rating: 4.5,
            reviewCount: 68,
            description: 'Laptop MSI Prestige 14, Intel Core i7-1195G7, RAM 16GB, SSD 1TB, Màn hình 14 inch 4K UHD, vỏ kim loại cao cấp.',
            image: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: false,
            active: true
        },
        {
            name: 'Laptop Microsoft Surface Laptop 4',
            category: 'laptop',
            price: 29990000,
            originalPrice: 32990000,
            stock: 6,
            brand: 'Microsoft',
            rating: 4.7,
            reviewCount: 89,
            description: 'Microsoft Surface Laptop 4, AMD Ryzen 7 4980U, RAM 16GB, SSD 512GB, Màn hình 13.5 inch PixelSense cảm ứng.',
            image: 'https://images.unsplash.com/photo-1545235617-9465d2a55698?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: false,
            active: true
        },
        {
            name: 'Laptop Razer Blade 15',
            category: 'laptop',
            price: 45990000,
            originalPrice: 49990000,
            stock: 4,
            brand: 'Razer',
            rating: 4.8,
            reviewCount: 45,
            description: 'Laptop gaming Razer Blade 15, Intel Core i7-11800H, RTX 3070 8GB, RAM 16GB, SSD 1TB, Màn hình 15.6 inch QHD 240Hz.',
            image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: true,
            active: true
        },
        {
            name: 'Laptop LG Gram 17',
            category: 'laptop',
            price: 34990000,
            originalPrice: 36990000,
            stock: 8,
            brand: 'LG',
            rating: 4.6,
            reviewCount: 72,
            description: 'Laptop siêu nhẹ LG Gram 17, Intel Core i7-1165G7, RAM 16GB, SSD 1TB, Màn hình 17 inch WQXGA IPS, chỉ nặng 1.35kg.',
            image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: false,
            active: true
        },
        
        // ========== PC (10 sản phẩm) ==========
        {
            name: 'PC Gaming ASUS ROG Strix G10CE',
            category: 'pc',
            price: 24990000,
            originalPrice: 27990000,
            stock: 12,
            brand: 'ASUS',
            rating: 4.7,
            reviewCount: 156,
            description: 'PC Gaming ASUS ROG Strix G10CE, Intel Core i7-11700, RAM 16GB, SSD 512GB + HDD 1TB, NVIDIA RTX 3060 12GB, Windows 11.',
            image: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: true,
            active: true,
            specs: {
                cpu: 'Intel Core i7-11700 (8 nhân, 16 luồng)',
                ram: '16GB DDR4 3200MHz',
                storage: '512GB SSD NVMe + 1TB HDD',
                graphics: 'NVIDIA GeForce RTX 3060 12GB',
                psu: '650W 80 Plus Bronze',
                os: 'Windows 11 Home'
            }
        },
        {
            name: 'PC Gaming MSI MAG Codex 5',
            category: 'pc',
            price: 21990000,
            originalPrice: 23990000,
            stock: 15,
            brand: 'MSI',
            rating: 4.5,
            reviewCount: 98,
            description: 'PC Gaming MSI MAG Codex 5, Intel Core i5-11400F, RAM 16GB, SSD 512GB, NVIDIA RTX 3060 Ti 8GB, vỏ case RGB.',
            image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: true,
            active: true
        },
        {
            name: 'PC Workstation Dell Precision 3650',
            category: 'pc',
            price: 32990000,
            originalPrice: 35990000,
            stock: 6,
            brand: 'Dell',
            rating: 4.8,
            reviewCount: 42,
            description: 'PC Workstation Dell Precision 3650, Intel Xeon W-1350, RAM 32GB ECC, SSD 1TB, NVIDIA RTX A2000 6GB, hỗ trợ ISV.',
            image: 'https://images.unsplash.com/photo-1545235617-9465d2a55698?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: false,
            active: true
        },
        {
            name: 'PC Mini HP ProDesk 400 G6',
            category: 'pc',
            price: 11990000,
            originalPrice: 13990000,
            stock: 18,
            brand: 'HP',
            rating: 4.4,
            reviewCount: 67,
            description: 'PC Mini HP ProDesk 400 G6, Intel Core i5-10500T, RAM 8GB, SSD 256GB, Windows 10 Pro, kích thước nhỏ gọn.',
            image: 'https://images.unsplash.com/photo-1586950012036-b957f2c7cbf0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: false,
            active: true
        },
        {
            name: 'PC All-in-One Apple iMac 24 inch',
            category: 'pc',
            price: 38990000,
            originalPrice: 41990000,
            stock: 5,
            brand: 'Apple',
            rating: 4.9,
            reviewCount: 124,
            description: 'Apple iMac 24 inch M1, chip Apple M1 8-core, RAM 8GB, SSD 256GB, màn hình 24 inch 4.5K Retina, 7 màu sắc.',
            image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: true,
            active: true
        },
        {
            name: 'PC Gaming Acer Predator Orion 3000',
            category: 'pc',
            price: 26990000,
            originalPrice: 29990000,
            stock: 9,
            brand: 'Acer',
            rating: 4.6,
            reviewCount: 83,
            description: 'PC Gaming Acer Predator Orion 3000, Intel Core i7-11700F, RAM 16GB, SSD 1TB, NVIDIA RTX 3070 8GB, cooling system độc đáo.',
            image: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: false,
            active: true
        },
        {
            name: 'PC Lenovo ThinkCentre M70q',
            category: 'pc',
            price: 14990000,
            originalPrice: 16990000,
            stock: 14,
            brand: 'Lenovo',
            rating: 4.3,
            reviewCount: 56,
            description: 'PC Tiny Lenovo ThinkCentre M70q, Intel Core i5-10500T, RAM 8GB, SSD 512GB, Windows 10 Pro, hỗ trợ VESA mount.',
            image: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: false,
            active: true
        },
        {
            name: 'PC Workstation HP Z2 Tower G5',
            category: 'pc',
            price: 27990000,
            originalPrice: 30990000,
            stock: 7,
            brand: 'HP',
            rating: 4.7,
            reviewCount: 39,
            description: 'PC Workstation HP Z2 Tower G5, Intel Core i7-10700, RAM 16GB ECC, SSD 512GB, NVIDIA Quadro P1000 4GB, bảo hành 3 năm.',
            image: 'https://images.unsplash.com/photo-1586953208448-b95a87b4d1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: false,
            active: true
        },
        {
            name: 'PC Gaming CyberPowerPC Gamer Xtreme',
            category: 'pc',
            price: 22990000,
            originalPrice: 24990000,
            stock: 11,
            brand: 'CyberPowerPC',
            rating: 4.5,
            reviewCount: 91,
            description: 'PC Gaming CyberPowerPC Gamer Xtreme, Intel Core i5-11600KF, RAM 16GB, SSD 1TB, NVIDIA RTX 3060 12GB, case RGB tempered glass.',
            image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: false,
            active: true
        },
        {
            name: 'PC Dell OptiPlex 3090 Micro',
            category: 'pc',
            price: 10990000,
            originalPrice: 12990000,
            stock: 22,
            brand: 'Dell',
            rating: 4.2,
            reviewCount: 48,
            description: 'PC Dell OptiPlex 3090 Micro, Intel Core i3-10105T, RAM 4GB, SSD 256GB, Windows 10 Pro, kích thước siêu nhỏ 0.7L.',
            image: 'https://images.unsplash.com/photo-1586950012036-b957f2c7cbf0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: false,
            active: true
        },
        
        // ========== LINH KIỆN (10 sản phẩm) ==========
        {
            name: 'CPU Intel Core i9-12900K',
            category: 'component',
            price: 11990000,
            originalPrice: 12990000,
            stock: 25,
            brand: 'Intel',
            rating: 4.9,
            reviewCount: 167,
            description: 'CPU Intel Core i9-12900K, 16 cores (8P+8E), 24 threads, 3.2GHz up to 5.2GHz, 30MB Cache, LGA 1700, hỗ trợ DDR5.',
            image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: true,
            active: true,
            specs: {
                socket: 'LGA 1700',
                cores: '16 (8 Performance + 8 Efficiency)',
                threads: '24',
                baseClock: '3.2 GHz',
                maxBoost: '5.2 GHz',
                cache: '30MB Intel Smart Cache',
                tdp: '125W',
                memory: 'DDR5-4800, DDR4-3200'
            }
        },
        {
            name: 'VGA NVIDIA GeForce RTX 4090 24GB',
            category: 'component',
            price: 45990000,
            originalPrice: 49990000,
            stock: 8,
            brand: 'NVIDIA',
            rating: 4.9,
            reviewCount: 89,
            description: 'Card đồ họa NVIDIA GeForce RTX 4090 24GB GDDR6X, kiến trúc Ada Lovelace, DLSS 3, Ray Tracing thế hệ thứ 3.',
            image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: true,
            active: true
        },
        // Thêm 8 linh kiện khác...
        
        // ========== PHỤ KIỆN (10 sản phẩm) ==========
        {
            name: 'Bàn phím cơ Logitech G Pro X',
            category: 'accessory',
            price: 2890000,
            originalPrice: 3290000,
            stock: 40,
            brand: 'Logitech',
            rating: 4.6,
            reviewCount: 234,
            description: 'Bàn phím cơ Logitech G Pro X, Switch GX Blue Clicky có thể thay thế, RGB LIGHTSYNC, USB Passthrough, thiết kế Tenkeyless.',
            image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: true,
            active: true,
            specs: {
                switchType: 'GX Blue Clicky (hot-swappable)',
                layout: 'Tenkeyless (87 keys)',
                backlight: 'RGB LIGHTSYNC',
                connectivity: 'USB wired',
                features: 'Detachable cable, USB passthrough'
            }
        },
        {
            name: 'Chuột gaming Razer DeathAdder V2 Pro',
            category: 'accessory',
            price: 2490000,
            originalPrice: 2890000,
            stock: 35,
            brand: 'Razer',
            rating: 4.7,
            reviewCount: 189,
            description: 'Chuột gaming không dây Razer DeathAdder V2 Pro, sensor Focus+ 20K DPI, HyperSpeed Wireless, 8 nút lập trình.',
            image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: true,
            active: true
        },
        // Thêm 8 phụ kiện khác...
        
        // ========== MÀN HÌNH (10 sản phẩm) ==========
        {
            name: 'Màn hình Samsung Odyssey G7 32 inch',
            category: 'monitor',
            price: 12990000,
            originalPrice: 14990000,
            stock: 18,
            brand: 'Samsung',
            rating: 4.8,
            reviewCount: 312,
            description: 'Màn hình gaming Samsung Odyssey G7 32 inch, 2K QHD 2560x1440, 240Hz, 1ms, Curved 1000R, HDR600, G-Sync Compatible.',
            image: 'https://images.unsplash.com/photo-1546548970-71785318a17b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: true,
            active: true,
            specs: {
                size: '32 inch',
                resolution: '2560 x 1440 (QHD)',
                refreshRate: '240Hz',
                responseTime: '1ms (GTG)',
                panel: 'VA, Curved 1000R',
                hdr: 'HDR600',
                adaptiveSync: 'G-Sync Compatible, FreeSync Premium Pro',
                ports: '2 x HDMI 2.0, 1 x DisplayPort 1.4'
            }
        },
        {
            name: 'Màn hình LG UltraGear 27GP850-B',
            category: 'monitor',
            price: 8990000,
            originalPrice: 10990000,
            stock: 22,
            brand: 'LG',
            rating: 4.7,
            reviewCount: 198,
            description: 'Màn hình gaming LG UltraGear 27GP850-B, 27 inch QHD Nano IPS, 180Hz (OC 180Hz), 1ms, G-Sync Compatible, HDR10.',
            image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            featured: true,
            active: true
        },
        // Thêm 8 màn hình khác...
    ];
    
    let addedCount = 0;
    const totalProducts = sampleProducts.length;
    
    sampleProducts.forEach(product => {
        db.collection('products').add({
            ...product,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            addedCount++;
            console.log(`Đã thêm sản phẩm: ${product.name}`);
            
            if (addedCount === totalProducts) {
                alert(`Đã thêm ${addedCount} sản phẩm mẫu vào cơ sở dữ liệu!`);
                
                // Tạo tài khoản admin mẫu
                createAdminUser();
            }
        })
        .catch(error => {
            console.error('Lỗi khi thêm sản phẩm:', error);
            alert('Lỗi khi thêm sản phẩm: ' + error.message);
        });
    });
}

function createAdminUser() {
    // Tạo tài khoản admin trong Authentication (cần làm thủ công trong Firebase Console)
    // Sau đó thêm vào Firestore
    const adminEmail = 'admin@techstore.vn';
    
    db.collection('users').where('email', '==', adminEmail).get()
        .then(querySnapshot => {
            if (querySnapshot.empty) {
                console.log('Vui lòng tạo tài khoản admin trong Firebase Authentication với email: ' + adminEmail);
                console.log('Sau đó thêm thủ công vào collection users với role: admin');
            }
        });
}

// Hàm này có thể được gọi từ console trình duyệt: createSampleData()
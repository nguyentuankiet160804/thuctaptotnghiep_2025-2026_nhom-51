// product-matcher.js
class ProductMatcher {
    constructor(userRequirements) {
        this.requirements = userRequirements;
    }
    
    // Parse product specifications from string or object
    parseSpecs(product) {
        let specs = product.specs || {};
        
        // If specs is a string, try to parse it
        if (typeof specs === 'string') {
            try {
                specs = JSON.parse(specs);
            } catch (e) {
                specs = {};
            }
        }
        
        return specs;
    }
    
    // Extract numeric values from specs
    extractNumericSpecs(specs) {
        const result = {};
        
        // CPU: try to extract core count and generation
        if (specs.cpu) {
            const cpu = specs.cpu.toLowerCase();
            // Simple heuristic for CPU score
            if (cpu.includes('i9') || cpu.includes('ryzen 9')) result.cpuScore = 5;
            else if (cpu.includes('i7') || cpu.includes('ryzen 7')) result.cpuScore = 4;
            else if (cpu.includes('i5') || cpu.includes('ryzen 5')) result.cpuScore = 3;
            else if (cpu.includes('i3') || cpu.includes('ryzen 3')) result.cpuScore = 2;
            else result.cpuScore = 1;
        } else {
            result.cpuScore = 1;
        }
        
        // RAM: extract GB
        if (specs.ram) {
            const ramMatch = specs.ram.toString().match(/(\d+)/);
            result.ram = ramMatch ? parseInt(ramMatch[1]) : 4;
        } else {
            result.ram = 4;
        }
        
        // Storage: extract capacity and type (SSD/HDD)
        if (specs.storage) {
            const storage = specs.storage.toLowerCase();
            // Check for SSD
            if (storage.includes('ssd')) result.storageScore = 5;
            else if (storage.includes('hdd')) result.storageScore = 2;
            else result.storageScore = 3;
            
            // Extract capacity
            const capacityMatch = storage.match(/(\d+)\s*(tb|gb)/i);
            if (capacityMatch) {
                let capacity = parseInt(capacityMatch[1]);
                if (capacityMatch[2].toLowerCase() === 'tb') capacity *= 1000;
                result.storageCapacity = capacity;
            } else {
                result.storageCapacity = 256; // Assume 256GB
            }
        } else {
            result.storageScore = 3;
            result.storageCapacity = 256;
        }
        
        // GPU: simple classification
        if (specs.gpu) {
            const gpu = specs.gpu.toLowerCase();
            if (gpu.includes('rtx') && (gpu.includes('3080') || gpu.includes('3090') || gpu.includes('4080') || gpu.includes('4090'))) result.gpuScore = 5;
            else if (gpu.includes('rtx') || gpu.includes('gtx 1660') || gpu.includes('rx 6600')) result.gpuScore = 4;
            else if (gpu.includes('mx') || gpu.includes('radeon')) result.gpuScore = 3;
            else if (gpu.includes('intel iris') || gpu.includes('uhd')) result.gpuScore = 2;
            else result.gpuScore = 1;
        } else {
            result.gpuScore = 1;
        }
        
        // Battery: extract Wh
        if (specs.battery) {
            const batteryMatch = specs.battery.match(/(\d+)\s*(wh|mah)/i);
            if (batteryMatch) {
                result.battery = parseInt(batteryMatch[1]);
                if (batteryMatch[2].toLowerCase() === 'mah') result.battery = result.battery / 1000; // Convert mAh to Ah (simplified)
            } else {
                result.battery = 40; // Assume 40Wh
            }
        } else {
            result.battery = 40;
        }
        
        // Weight: extract kg
        if (specs.weight) {
            const weightMatch = specs.weight.toString().match(/(\d+(\.\d+)?)/);
            result.weight = weightMatch ? parseFloat(weightMatch[1]) : 2.0;
        } else {
            result.weight = 2.0;
        }
        
        return result;
    }
    
    // Calculate match score for a single product
    calculateMatchScore(product) {
        const specs = this.parseSpecs(product);
        const numericSpecs = this.extractNumericSpecs(specs);
        
        let score = 0;
        let totalWeight = 0;
        
        // CPU matching
        if (this.requirements.cpu) {
            const cpuDiff = Math.abs(numericSpecs.cpuScore - this.requirements.cpu);
            score += (5 - cpuDiff) * 1.5; // CPU has higher weight
            totalWeight += 1.5;
        }
        
        // RAM matching
        if (this.requirements.ram) {
            // Convert required RAM level to actual GB
            const requiredRam = this.requirements.ram * 4; // Level 1 = 4GB, Level 5 = 20GB
            const ramDiff = Math.abs(numericSpecs.ram - requiredRam) / 4;
            score += (5 - Math.min(ramDiff, 5)) * 1.2;
            totalWeight += 1.2;
        }
        
        // GPU matching
        if (this.requirements.gpu) {
            const gpuDiff = Math.abs(numericSpecs.gpuScore - this.requirements.gpu);
            score += (5 - gpuDiff) * 1.0;
            totalWeight += 1.0;
        }
        
        // Storage matching (simplified)
        if (this.requirements.storage) {
            const requiredStorage = this.requirements.storage * 200; // Level 1 = 200GB, Level 5 = 1000GB
            const storageDiff = Math.abs(numericSpecs.storageCapacity - requiredStorage) / 200;
            score += (5 - Math.min(storageDiff, 5)) * 0.8;
            totalWeight += 0.8;
            
            // Bonus for SSD
            if (this.requirements.storage >= 4 && numericSpecs.storageScore >= 4) {
                score += 2;
                totalWeight += 0.5;
            }
        }
        
        // Battery matching
        if (this.requirements.battery) {
            const requiredBattery = this.requirements.battery * 15; // Level 1 = 15Wh, Level 5 = 75Wh
            const batteryDiff = Math.abs(numericSpecs.battery - requiredBattery) / 15;
            score += (5 - Math.min(batteryDiff, 5)) * 0.7;
            totalWeight += 0.7;
        }
        
        // Weight matching (lighter is better for mobility)
        if (this.requirements.weight) {
            // For weight, lower is better. Reverse the requirement: if user wants light (weight requirement high), they want low weight number
            const desiredWeight = 3 - (this.requirements.weight / 2); // Level 5 = 0.5kg (ultra light), Level 1 = 2.5kg
            const weightDiff = Math.abs(numericSpecs.weight - desiredWeight);
            score += (5 - Math.min(weightDiff * 2, 5)) * 0.8;
            totalWeight += 0.8;
        }
        
        // Price matching (very important)
        if (this.requirements.priceRange && product.price) {
            const price = product.price;
            const { min, max } = this.requirements.priceRange;
            
            if (price >= min && price <= max) {
                // Perfect match within budget
                score += 5 * 2.0;
                totalWeight += 2.0;
            } else if (price < min) {
                // Below budget - still good but not optimal
                const diffRatio = (min - price) / min;
                score += (5 - Math.min(diffRatio * 10, 4)) * 1.5;
                totalWeight += 1.5;
            } else {
                // Above budget - penalize
                const diffRatio = (price - max) / max;
                score += Math.max(1, 5 - diffRatio * 10) * 1.5;
                totalWeight += 1.5;
            }
        }
        
        // Normalize score to 0-1 range
        const normalizedScore = totalWeight > 0 ? score / (totalWeight * 5) : 0;
        
        // Additional factors
        let finalScore = normalizedScore;
        
        // Boost score for featured products
        if (product.featured) {
            finalScore *= 1.1;
        }
        
        // Boost for high rating
        if (product.rating && product.rating >= 4) {
            finalScore *= 1.05;
        }
        
        // Ensure score is between 0 and 1
        return Math.min(1, Math.max(0, finalScore));
    }
    
    // Get top recommendations
    getTopRecommendations(products, limit = 5) {
        const scoredProducts = products.map(product => {
            return {
                product: product,
                score: this.calculateMatchScore(product)
            };
        });
        
        // Sort by score descending
        scoredProducts.sort((a, b) => b.score - a.score);
        
        // Return top N products
        return scoredProducts.slice(0, limit);
    }
}
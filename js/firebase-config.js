// js/firebase-config.js - SỬA LẠI
// Cấu hình Firebase
const firebaseConfig = {
  apiKey: "AIzaSyByxpwNt7noovNXm4hBO8Sd7GP_Tcw__NY",
  authDomain: "tech-53432.firebaseapp.com",
  projectId: "tech-53432",
  storageBucket: "tech-53432.firebasestorage.app",
  messagingSenderId: "688258032399",
  appId: "1:688258032399:web:a3da9e127ea97c1b09d47a",
  measurementId: "G-3HZ16WDZEW"
};

// Khởi tạo Firebase
let app;
let db;
let auth;
let storage;

try {
    // Kiểm tra xem Firebase đã được khởi tạo chưa
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK chưa được tải');
        throw new Error('Firebase SDK chưa được tải');
    }
    
    // Kiểm tra xem Firebase đã được khởi tạo chưa
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
        console.log('Firebase đã được khởi tạo mới');
    } else {
        app = firebase.app(); // Sử dụng app đã có
        console.log('Sử dụng Firebase app đã tồn tại');
    }
    
    // Khởi tạo các dịch vụ
    db = firebase.firestore();
    auth = firebase.auth();
    
    // Kiểm tra storage (có thể không tồn tại trong một số trang)
    if (typeof firebase.storage !== 'undefined') {
        storage = firebase.storage();
    } else {
        console.log('Firebase Storage không khả dụng trên trang này');
        storage = null;
    }
    
    console.log('Firebase initialized successfully');
    
} catch (error) {
    console.error('Firebase initialization error:', error);
    
    // Tạo các biến giả để tránh lỗi
    db = {
        collection: () => ({ 
            doc: () => ({ 
                get: () => Promise.reject('Firestore not initialized'),
                set: () => Promise.reject('Firestore not initialized'),
                update: () => Promise.reject('Firestore not initialized'),
                delete: () => Promise.reject('Firestore not initialized')
            }),
            where: () => ({ get: () => Promise.reject('Firestore not initialized') }),
            orderBy: () => ({ get: () => Promise.reject('Firestore not initialized') }),
            limit: () => ({ get: () => Promise.reject('Firestore not initialized') }),
            get: () => Promise.reject('Firestore not initialized'),
            add: () => Promise.reject('Firestore not initialized')
        })
    };
    
    auth = {
        onAuthStateChanged: (callback) => { 
            setTimeout(() => callback(null), 100); 
            return () => {}; 
        },
        signInWithEmailAndPassword: () => Promise.reject('Auth not initialized'),
        createUserWithEmailAndPassword: () => Promise.reject('Auth not initialized'),
        signOut: () => Promise.reject('Auth not initialized'),
        currentUser: null
    };
    
    storage = null;
}
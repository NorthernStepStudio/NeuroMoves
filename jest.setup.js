// Mock AsyncStorage for all tests
jest.mock('@react-native-async-storage/async-storage', () => {
    const store = {};
    return {
        __esModule: true,
        default: {
            getItem: jest.fn((key) => Promise.resolve(store[key] || null)),
            setItem: jest.fn((key, value) => {
                store[key] = value;
                return Promise.resolve();
            }),
            removeItem: jest.fn((key) => {
                delete store[key];
                return Promise.resolve();
            }),
            clear: jest.fn(() => {
                Object.keys(store).forEach(k => delete store[k]);
                return Promise.resolve();
            }),
            getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
        },
    };
});

// Mock react-native-purchases
jest.mock('react-native-purchases', () => {
    return {
        configure: jest.fn(),
        getCustomerInfo: jest.fn(() => Promise.resolve({
            entitlements: { active: {} }
        })),
        addCustomerInfoUpdateListener: jest.fn(),
        removeCustomerInfoUpdateListener: jest.fn(),
    };
});

jest.mock('@react-native-async-storage/async-storage', () => {
  const mem = {};
  return {
    setItem: jest.fn((key, value) => {
      mem[key] = value;
      return Promise.resolve();
    }),
    getItem: jest.fn(key =>
      Promise.resolve(mem[key] !== undefined ? mem[key] : null),
    ),
    removeItem: jest.fn(key => {
      delete mem[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(mem).forEach(k => {
        delete mem[k];
      });
      return Promise.resolve();
    }),
  };
});

jest.mock('@boltearth/react-native-sdk', () => ({
  initializeWithOptions: jest.fn(() => Promise.resolve()),
  presentChargerFlow: jest.fn(() => Promise.resolve()),
  presentBookingHistoryFlow: jest.fn(() => Promise.resolve()),
  logout: jest.fn(() => Promise.resolve(true)),
}));

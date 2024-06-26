const config = {
  transform: {
    "\\.[jt]sx?$": ["babel-jest"],
  } /** this is the default value for transform property */,
  transformIgnorePatterns: ["/node_modules/(?!(base32-encode|to-data-view)/)"],
  testTimeout: 60000,
};

export default config;

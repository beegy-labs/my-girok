module.exports = function (options) {
  return {
    ...options,
    // Preserve __dirname behavior - use actual directory path at runtime
    node: {
      __dirname: false,
      __filename: false,
    },
  };
};

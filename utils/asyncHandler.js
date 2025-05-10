module.exports = function asyncHandler(callback) {
  return function(req, res, next) {
    try {
      const result = callback(req, res, next);
      if (result && typeof result.catch === 'function') {
        result.catch(next);
      }
      return result;
    } catch (error) {
      next(error);
    }
  };
};
  
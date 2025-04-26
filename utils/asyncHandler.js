module.exports = function asyncHandler(callback) {
    return function(req, res, next) {
      callback(req, res, next).catch(next);
    };
  };
  
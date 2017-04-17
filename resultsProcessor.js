module.exports = function() {
    require('ts-jest/coverageprocessor').apply(this, arguments);
    return require('jest-junit').apply(this, arguments);
};

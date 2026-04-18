module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['./test/steps/**/*.ts'],
    paths: ['./test/features/**/*.feature'],
    parallel: 0,
    format: ['progress'],
  },
};

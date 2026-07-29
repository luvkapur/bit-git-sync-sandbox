const { jestConfig } = require('@teambit/react.react-env');
// const { esmConfig } = require('@teambit/react.jest.react-jest');

const { generateNodeModulesPattern } = require('@teambit/dependencies.modules.packages-excluder');

const packagesToExclude = [
  '@teambit',
  '@learnbit',
  'react-medium-image-zoom',
  'react-syntax-highlighter',
  '@react-aria',
];

module.exports = {
  ...jestConfig,
  transformIgnorePatterns: ['^.+.module.(css|sass|scss)$', generateNodeModulesPattern({ packages: packagesToExclude, excludeComponents: true })],
};

module.exports = {
  extends: [require.resolve('@teambit/react.react-env/config/eslintrc')],
  rules: {
    'no-console': 'error',
    'no-use-before-define': 'off', // provided by ts-eslin/no-use-before
    '@typescript-eslint/no-use-before-define': ['error', { typedefs: false, functions: false }],
    'react/jsx-props-no-spreading': 'off',
    'react/require-default-props': 'off',
    'arrow-body-style': 'off',
    'prefer-arrow-callback': ['warn', { allowNamedFunctions: true }],
    'react/destructuring-assignment': 'off',
    'class-methods-use-this': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    '@typescript-eslint/no-shadow': 'off',
    'no-nested-ternary': 'off',
    '@typescript-eslint/no-unused-expressions': 'warn',
    'no-return-assign': 'off',
    'consistent-return': 'warn',
    radix: 'off',
  },
};

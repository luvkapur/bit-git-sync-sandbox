import { ReactEnv } from '@teambit/react.react-env';
import type { ReactEnvInterface } from '@teambit/react.react-env';
import { Compiler } from '@teambit/compiler';
import { ReactPreview } from '@teambit/preview.react-preview';
import { EnvHandler } from '@teambit/envs';
import {
  TypescriptCompiler,
  TypescriptTask,
  resolveTypes,
} from '@teambit/typescript.typescript-compiler';
import { ESLintLinter } from '@teambit/defender.eslint-linter';
import { ESLint as ESLintLib } from 'eslint';
import { JestTask, JestTester } from '@teambit/defender.jest-tester';
import { PrettierFormatter } from '@teambit/defender.prettier-formatter';
import { Tester } from '@teambit/tester';
import { Preview } from '@teambit/preview';
import { Pipeline } from '@teambit/builder';
import { SchemaExtractor } from '@teambit/schema';
import { TypeScriptExtractor } from '@teambit/typescript';
import {
  addCustomAliases,
  customizeExposeLoaders,
} from './config/webpack.config';

export class React extends ReactEnv implements ReactEnvInterface {
  name = 'react';

  icon = 'https://static.bit.dev/extensions-icons/react.svg';

  protected tsconfigPath = require.resolve('./config/tsconfig.json');

  protected tsTypesPath = './types';

  compiler(): EnvHandler<Compiler> {
    return TypescriptCompiler.from({
      tsconfig: this.tsconfigPath,
      types: resolveTypes(__dirname, [this.tsTypesPath]),
      // typescript,
    });
  }

  tester(): EnvHandler<Tester> {
    return JestTester.from({
      jest: require.resolve('jest'),
      config: require.resolve('./config/jest.config'),
    });
  }

  preview(): EnvHandler<Preview> {
    return ReactPreview.from({
      docsTemplate: require.resolve('./preview/docs'),
      mounter: require.resolve('./preview/mounter'),
      transformers: [addCustomAliases, customizeExposeLoaders],
      hostDependencies: super.hostDependencies,
    });
  }

  linter() {
    return ESLintLinter.from({
      tsconfig: require.resolve('./config/tsconfig.json'),
      eslint: ESLintLib,
      configPath: require.resolve('./config/eslintrc.js'),
      pluginsPath: __dirname,
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
    });
  }

  formatter() {
    return PrettierFormatter.from({
      configPath: require.resolve('./config/prettier.config.js'),
    });
  }

  // starters() {
  //   return [new ReactWorkspaceStarter()];
  // }

  // generators() {
  //   return TemplateList.from([ReactComponentTemplate.from()]);
  // }

  build() {
    return Pipeline.from([
      TypescriptTask.from({
        tsconfig: this.tsconfigPath,
        types: resolveTypes(__dirname, [this.tsTypesPath]),
        // typescript,
      }),
      JestTask.from({
        config: require.resolve('./config/jest.config'),
        jest: require.resolve('jest'),
      }),
    ]);
  }

  schemaExtractor(): EnvHandler<SchemaExtractor> {
    return TypeScriptExtractor.from({
      tsconfig: require.resolve('./config/tsconfig.json'),
    });
  }
}

export default new React();

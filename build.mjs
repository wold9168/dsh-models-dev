/**
 * 宿主 + 客户端构建（dsh-at-file 同款）：
 * - lib/index.js  宿主 ESM（Node），external 掉 @deepseek-ai/* 与 cordis，打包 schemastery；
 * - lib/client.js 浏览器 CJS 单文件，包在 ModuleLoader 握手里，external 掉 react 与 @deepseek-ai/*；
 * - 再跑 tsc 输出声明到 lib/types。
 */
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

mkdirSync('lib', { recursive: true })

// 宿主 external 掉 @deepseek-ai/*、cordis 与运行时依赖（undici/zod/yaml）：
// undici 内含 CJS require 调用，打包进 ESM 会在 Node 下崩溃；zod/yaml 与
// 运行时共享同一实例更稳。这些包随本包依赖一起安装，宿主可解析。
const hostExternal = ['@deepseek-ai/cordis', '@deepseek-ai/dsh-*', 'undici', 'zod', 'yaml']
// 客户端仅 external @deepseek-ai/*、cordis 与 react 家族；zod 打包进
// client.js（浏览器模块系统不一定提供 zod），与 dsh-at-file 一致。
const clientExternal = [
  '@deepseek-ai/cordis', '@deepseek-ai/dsh-*',
  'react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'scheduler',
]
const PLUGIN_ID = '@deepseek-ai/dsh-models-sync'

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  sourcemap: true,
  external: hostExternal,
  logLevel: 'info',
})

await build({
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: true,
  jsx: 'automatic',
  external: clientExternal,
  banner: {
    js: `window.__ModuleLoader__.load({ id: '${PLUGIN_ID}', factory: (require) => { var module = { exports: {} }; var exports = module.exports;`,
  },
  footer: {
    js: 'return module.exports; } });',
  },
  logLevel: 'info',
})

execFileSync('node_modules/.bin/tsc', ['-p', 'tsconfig.json'], { stdio: 'inherit' })

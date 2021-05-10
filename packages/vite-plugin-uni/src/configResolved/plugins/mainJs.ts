import path from 'path'
import slash from 'slash'
import { Plugin, ResolvedConfig } from 'vite'
import { VitePluginUniResolvedOptions } from '../..'

export function uniMainJsPlugin(
  config: ResolvedConfig,
  options: VitePluginUniResolvedOptions
): Plugin {
  const mainPath = slash(path.resolve(options.inputDir, 'main'))
  const mainJsPath = mainPath + '.js'
  const mainTsPath = mainPath + '.ts'
  const pagesJsonJsPath = slash(path.resolve(options.inputDir, 'pages.json.js'))
  const isSSR =
    config.command === 'serve'
      ? !!config.server.middlewareMode
      : config.command === 'build'
      ? !!(config.build.ssr || config.build.ssrManifest)
      : false
  return {
    name: 'vite:uni-main-js',
    transform(code, id, ssr) {
      if (id === mainJsPath || id === mainTsPath) {
        if (!isSSR) {
          code = code.includes('createSSRApp')
            ? createApp(code)
            : createLegacyApp(code)
        } else {
          code = ssr ? createSSRServerApp(code) : createSSRClientApp(code)
        }
        return {
          code: `import { plugin } from '@dcloudio/uni-h5';import '${pagesJsonJsPath}';${code}`,
          map: this.getCombinedSourcemap(),
        }
      }
    },
  }
}

function createApp(code: string) {
  return `createApp().app.use(plugin).mount("#app");${code.replace(
    'createSSRApp',
    'createVueApp as createSSRApp'
  )}`
}

function createLegacyApp(code: string) {
  return `function createApp(rootComponent,rootProps){return createVueApp(rootComponent, rootProps).use(plugin)};${code.replace(
    'createApp',
    'createVueApp'
  )}`
}

function createSSRClientApp(code: string) {
  return `import { UNI_SSR, UNI_SSR_STORE } from '@dcloudio/uni-shared';const { app, store } = createApp();app.use(plugin);store && window[UNI_SSR] && window[UNI_SSR][UNI_SSR_STORE] && store.replaceState(window[UNI_SSR][UNI_SSR_STORE]);app.router.isReady().then(() => app.mount("#app"));${code}`
}

function createSSRServerApp(code: string) {
  return code
}
import debug from './debug'
import util from './util'
import { _Vue } from './vuet-static'
export default class Vuet {
  constructor (opts) {
    debug.assertVue()
    // debug.assertPromise()
    this.version = '__version__'
    this.modules = {}
    this.store = {}
    this.options = {
      pathJoin: '/',
      modules: {}
    }
    this.app = null
    this.vm = new _Vue({
      data: {
        modules: this.store
      }
    })
    Object.assign(this.options, opts)
    Vuet.callRuleHook('init', this)
    Object.keys(this.options.modules).forEach(k => {
      this.addModules(k, this.options.modules[k])
    })
  }
  _init (app) {
    this.app = app
  }
  addModules (path, modules) {
    if (util.isObject(modules.modules)) {
      Object.keys(modules.modules).forEach(k => {
        this.addModules(`${path}${this.options.pathJoin}${k}`, modules.modules[k])
      })
    }
    if (typeof modules.data !== 'function') return this
    const vuet = this
    const opts = { ...Vuet.options.module, ...modules }
    _Vue.set(vuet.store, path, opts.data())
    vuet.modules[path] = opts
    Object.defineProperty(opts, 'vuet', {
      get: () => (vuet)
    })
    Object.defineProperty(opts, 'app', {
      get: () => (vuet.app)
    })
    Object.defineProperty(opts, 'state', {
      get () {
        return vuet.store[path]
      },
      set (val) {
        vuet.store[path] = val
      }
    })
    Object.keys(opts).forEach(k => {
      if (typeof opts[k] === 'function') {
        const native = opts[k]
        opts[k] = function proxy () {
          return native.apply(vuet.modules[path], arguments)
        }
      }
    })
    if (util.isObject(opts.state)) {
      Object.keys(opts.state).forEach(k => {
        if (k in opts) {
          return debug.warn(`'${path}' the '${k}' already exists on the object`)
        }
        Object.defineProperty(opts, k, {
          get () {
            return vuet.store[path][k]
          },
          set (val) {
            vuet.store[path][k] = val
          }
        })
      })
    }
    Vuet.callRuleHook('addModule', this, path)
    return this.getModule(path)
  }
  getModule (path) {
    debug.assertModule(this, path)
    return this.modules[path]
  }
  getState (path) {
    debug.assertModule(this, path)
    return this.modules[path].state
  }
  replaceStore (store) {
    this.store = this.vm.$data.modules = store
    return this
  }
  destroy () {
    this.vm.$destroy()
    Vuet.callRuleHook('destroy', this)
  }
}

export default () => {
  const orgAddEventListener = document.addEventListener
  const orgRemoveEventListener = document.removeEventListener
  const mousemoveListeners = new Set()
  globalThis.mousemoveListeners = mousemoveListeners


  document.addEventListener = function (type, listener, options) {
    if (type==='mousemove') {
      mousemoveListeners.add(listener)
    }
    return orgAddEventListener.call(this, type, listener, options)
  }

  document.removeEventListener = function (type, listener, options) {
    if (type==='mousemove') {
      mousemoveListeners.delete(listener)
    }
    return orgRemoveEventListener.call(this, type, listener, options)
  }
}

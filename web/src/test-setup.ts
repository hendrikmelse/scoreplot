// jsdom doesn't implement ResizeObserver, and has no layout, so pretend everything is this size
const observedSize = { width: 800, height: 600 };

globalThis.ResizeObserver = class {
  constructor(private callback: ResizeObserverCallback) {}
  observe() {
    this.callback([{ contentRect: observedSize } as ResizeObserverEntry], this);
  }
  unobserve() {}
  disconnect() {}
};

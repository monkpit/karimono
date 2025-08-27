// Jest setup file for global test configuration

// Mock HTML element constructors for instanceof checks
class MockHTMLElement {
  tagName: string;
  children: any[] = [];
  parentElement: any = null;
  textContent = '';
  innerHTML = '';
  style: any = {};
  classList: any;
  value = '';
  checked = false;
  disabled = false;
  id = '';
  className = '';
  private _attributes: Record<string, any> = {};
  private _listeners: Record<string, ((e: any) => void)[]> = {};

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();

    this.style = new Proxy(
      { _cssText: '' },
      {
        set: (target: any, prop: string, value: any): boolean => {
          target[prop] = value;
          if (prop === 'cssText') {
            value.split(';').forEach((style: string) => {
              const [key, val] = style.split(':');
              if (key && val) {
                target[key.trim()] = val.trim();
              }
            });
          }
          return true;
        },
        get: (target: any, prop: string): any => {
          return target[prop];
        },
      }
    );

    const classNames = new Set<string>();
    this.classList = {
      add: (name: string): void => {
        classNames.add(name);
      },
      remove: (name: string): boolean => classNames.delete(name),
      toggle: (name: string): boolean =>
        classNames.has(name) ? classNames.delete(name) : !!classNames.add(name),
      contains: (name: string): boolean => classNames.has(name),
    };
  }

  appendChild = (child: any): any => {
    this.children.push(child);
    child.parentElement = this;
    return child;
  };

  removeChild = (child: any): any => {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
      child.parentElement = null;
    }
    return child;
  };

  remove = (): void => {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  };

  setAttribute = (name: string, value: any): void => {
    this._attributes[name] = value;
  };

  getAttribute = (name: string): any => {
    return this._attributes[name] ?? null;
  };

  removeAttribute = (name: string): void => {
    delete this._attributes[name];
  };

  addEventListener = (type: string, listener: (e: any) => void): void => {
    if (!this._listeners[type]) {
      this._listeners[type] = [];
    }
    this._listeners[type].push(listener);
  };

  removeEventListener = (type: string, listener: (e: any) => void): void => {
    if (this._listeners[type]) {
      this._listeners[type] = this._listeners[type].filter(l => l !== listener);
    }
  };

  querySelector = (selector: string): any => {
    return this.querySelectorAll(selector)[0] ?? null;
  };

  querySelectorAll = (selector: string): any[] => {
    let result: any[] = [];
    for (const child of this.children) {
      if (child.matches?.(selector)) {
        result.push(child);
      }
      // Only recurse if child has querySelectorAll method and children
      if (child.querySelectorAll && child.children && child.children.length > 0) {
        result = result.concat(child.querySelectorAll(selector));
      }
    }
    return result;
  };

  matches = (selector: string): boolean => {
    if (!selector) return false;
    return selector.split(',').some(sel => {
      const s = sel.trim();
      if (s.startsWith('.')) return this.classList?.contains(s.substring(1));
      if (s.startsWith('#')) return this.id === s.substring(1);
      if (s.startsWith('[')) return this.getAttribute(s.slice(1, -1)) !== null;
      return this.tagName && this.tagName.toLowerCase() === s.toLowerCase();
    });
  };

  click = (): void => {
    // Trigger click event listeners
    if (this._listeners.click) {
      this._listeners.click.forEach(listener => listener({ type: 'click', target: this }));
    }
  };
}

class MockHTMLCanvasElement extends MockHTMLElement {
  width: number;
  height: number;

  constructor() {
    super('canvas');
    this.width = 160;
    this.height = 144;
  }

  getContext = (contextType: string): any => {
    if (contextType === '2d') {
      return mockCanvas2DContext;
    }
    return null;
  };
}

class MockHTMLSelectElement extends MockHTMLElement {
  options: any[];
  selectedIndex: number;

  constructor() {
    super('select');
    this.options = [];
    this.selectedIndex = -1;
  }

  appendChild = (child: any): any => {
    this.children.push(child);
    child.parentElement = this;
    if (child.tagName === 'OPTION') {
      this.options.push(child);
    }
    return child;
  };
}

class MockHTMLButtonElement extends MockHTMLElement {
  type: string;

  constructor() {
    super('button');
    this.type = 'button';
  }
}

class MockHTMLInputElement extends MockHTMLElement {
  type: string;

  constructor() {
    super('input');
    this.type = 'text';
  }
}

class MockHTMLDivElement extends MockHTMLElement {
  constructor() {
    super('div');
  }
}

class MockHTMLOptionElement extends MockHTMLElement {
  value: string;
  text: string;

  constructor() {
    super('option');
    this.value = '';
    this.text = '';
  }
}

// Set up global HTML element constructors for instanceof checks
global.HTMLElement = MockHTMLElement as any;
global.HTMLCanvasElement = MockHTMLCanvasElement as any;
global.HTMLSelectElement = MockHTMLSelectElement as any;
global.HTMLButtonElement = MockHTMLButtonElement as any;
global.HTMLInputElement = MockHTMLInputElement as any;
global.HTMLDivElement = MockHTMLDivElement as any;
global.HTMLOptionElement = MockHTMLOptionElement as any;

// Mock Canvas API for EmulatorDisplay testing
const mockCanvas2DContext = {
  clearRect: jest.fn(),
  drawImage: jest.fn(),
  putImageData: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
  })),
  imageSmoothingEnabled: false,
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  createImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
  })),
};

// Create a global mock function for document.createElement
const mockCreateElement = (tagName: string): HTMLElement => {
  const tagLower = tagName.toLowerCase();

  switch (tagLower) {
    case 'canvas':
      return new MockHTMLCanvasElement() as any;
    case 'select':
      return new MockHTMLSelectElement() as any;
    case 'button':
      return new MockHTMLButtonElement() as any;
    case 'input':
      return new MockHTMLInputElement() as any;
    case 'div':
      return new MockHTMLDivElement() as any;
    case 'option':
      return new MockHTMLOptionElement() as any;
    default:
      return new MockHTMLElement(tagName) as any;
  }
};

// Override document.createElement globally
Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
  writable: true,
});

// Mock document.body for appendChild/removeChild using comprehensive element mock
const mockDocumentBody = new MockHTMLElement('body');

Object.defineProperty(document, 'body', {
  value: mockDocumentBody,
  writable: true,
});

// Mock window.getComputedStyle for display components
const createComputedStyleMock = (_element: any): any => {
  // Return a simple object with the properties we need
  return {
    getPropertyValue: jest.fn((prop: string) => {
      switch (prop) {
        case 'width':
          return '200px';
        case 'height':
          return '100px';
        default:
          return '';
      }
    }),
    setProperty: jest.fn(),
    width: '200px',
    height: '100px',
    position: 'static',
    top: 'auto',
    left: 'auto',
    right: 'auto',
    bottom: 'auto',
    display: 'block',
    visibility: 'visible',
    overflow: 'visible',
  };
};

const mockGetComputedStyle = jest.fn(createComputedStyleMock);

Object.defineProperty(window, 'getComputedStyle', {
  value: mockGetComputedStyle,
  writable: true,
  configurable: true,
});

// Also define it as global for direct imports
(global as any).getComputedStyle = mockGetComputedStyle;

// Mock window.setTimeout and clearTimeout for DOM operations
global.setTimeout = jest.fn((fn: () => void) => {
  if (typeof fn === 'function') {
    fn();
  }
  return 1;
}) as any;

global.clearTimeout = jest.fn();

// Mock window.requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((fn: (time: number) => void) => {
  if (typeof fn === 'function') {
    fn(16.67); // Mock 60fps frame time
  }
  return 1;
}) as any;

global.cancelAnimationFrame = jest.fn();

// Mock window dimensions for responsive components
Object.defineProperty(window, 'innerWidth', {
  value: 1024,
  writable: true,
});

Object.defineProperty(window, 'innerHeight', {
  value: 768,
  writable: true,
});

// Mock screen object
Object.defineProperty(window, 'screen', {
  value: {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1040,
  },
  writable: true,
});

// Mock ImageData constructor for canvas testing
global.ImageData = class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(data: Uint8ClampedArray, width: number, height?: number) {
    this.data = data;
    this.width = width;
    this.height = height ?? data.length / (4 * width);
  }
} as any;

// Enhanced test isolation for preventing state leakage
beforeEach(() => {
  // Clear any lingering timers
  jest.clearAllTimers();
  // Clear console methods that might affect other tests - but NOT mockGetComputedStyle
  // jest.clearAllMocks(); // COMMENTED OUT - this was clearing our getComputedStyle mock
  // Reset localStorage for each test
  localStorage.clear();

  // Restore getComputedStyle mock implementation after any potential clearing
  mockGetComputedStyle.mockImplementation(createComputedStyleMock);
  Object.defineProperty(window, 'getComputedStyle', {
    value: mockGetComputedStyle,
    writable: true,
    configurable: true,
  });
  (global as any).getComputedStyle = mockGetComputedStyle;
});

afterEach(() => {
  // Clean up test isolation - no timer manipulation needed
  // since we use simple mocks instead of fake timers
});

export {};

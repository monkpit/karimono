import { setupCounter } from '../src/counter';

describe('Counter (temporary Vite example)', () => {
  let button: HTMLButtonElement;

  beforeEach(() => {
    button = document.createElement('button');
  });

  it('should initialize counter to 0', () => {
    setupCounter(button);
    expect(button.innerHTML).toBe('count is 0');
  });

  it('should increment counter when clicked', () => {
    setupCounter(button);

    button.click();
    expect(button.innerHTML).toBe('count is 1');

    button.click();
    expect(button.innerHTML).toBe('count is 2');
  });
});

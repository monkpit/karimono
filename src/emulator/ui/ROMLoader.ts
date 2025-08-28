/**
 * ROMLoader - Game Boy ROM file loading component
 *
 * Provides drag & drop and file picker functionality for loading
 * Game Boy ROM files (.gb, .gbc) with validation and user feedback.
 */

// eslint-disable-next-line no-unused-vars
export type ROMLoadCallback = (romData: Uint8Array, filename: string) => void;

/**
 * ROM file loader with drag & drop and file picker support
 */
export class ROMLoader {
  private container: HTMLElement;
  private onROMLoad: ROMLoadCallback;
  private dropzone!: HTMLElement; // Definite assignment - initialized in createUI()
  private fileInput!: HTMLInputElement; // Definite assignment - initialized in createUI()

  // File size limits (in bytes)
  private static readonly MIN_ROM_SIZE = 32768; // 32KB minimum
  private static readonly MAX_ROM_SIZE = 8 * 1024 * 1024; // 8MB maximum

  /**
   * Create ROM loader component
   */
  constructor(container: HTMLElement | null, onROMLoad: ROMLoadCallback) {
    if (!container) {
      throw new Error('Container element is required');
    }

    this.container = container;
    this.onROMLoad = onROMLoad;

    this.createUI();
    this.setupEventListeners();
  }

  /**
   * Create the ROM loader UI elements
   */
  private createUI(): void {
    // Create drop zone
    this.dropzone = document.createElement('div');
    this.dropzone.className = 'rom-loader-dropzone';
    this.dropzone.innerHTML = `
      <div class="rom-loader-content">
        <div class="rom-loader-icon">📁</div>
        <div class="rom-loader-text">
          <p><strong>Drop your ROM file here</strong></p>
          <p>or click to browse</p>
        </div>
        <div class="rom-loader-formats">
          Supports .gb and .gbc files
        </div>
      </div>
    `;

    // Create hidden file input
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.gb,.gbc';
    this.fileInput.multiple = false;
    this.fileInput.style.display = 'none';

    // Add elements to container
    this.container.appendChild(this.dropzone);
    this.container.appendChild(this.fileInput);

    // Add initial styles (only in browser environment)
    this.addStyles();
  }

  /**
   * Add CSS styles for the ROM loader
   */
  private addStyles(): void {
    // Skip style injection in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // Only add styles if document.head is available (browser environment)
    if (!document.head) {
      return;
    }

    // Check if styles already exist
    if (document.head.querySelector('[data-rom-loader-styles]')) {
      return;
    }

    const style = document.createElement('style');
    style.setAttribute('data-rom-loader-styles', 'true');
    style.textContent = `
      .rom-loader-dropzone {
        border: 2px dashed #00ff00;
        border-radius: 10px;
        padding: 40px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        background: #1a1a1a;
        color: #00ff00;
        font-family: 'Courier New', monospace;
        min-height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .rom-loader-dropzone:hover {
        border-color: #66ff66;
        background: #2a2a2a;
      }

      .rom-loader-dropzone.dragover {
        border-color: #66ff66;
        background: #2a2a2a;
        transform: scale(1.02);
      }

      .rom-loader-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
      }

      .rom-loader-icon {
        font-size: 48px;
      }

      .rom-loader-text p {
        margin: 5px 0;
      }

      .rom-loader-formats {
        font-size: 14px;
        opacity: 0.8;
      }

      .rom-loader-loading {
        color: #ffff66;
        font-weight: bold;
        margin-top: 10px;
      }

      .rom-loader-error {
        color: #ff6666;
        font-weight: bold;
        margin-top: 10px;
        padding: 10px;
        background: #331111;
        border-radius: 5px;
        border: 1px solid #ff6666;
      }

      .rom-loader-status {
        color: #66ff66;
        font-weight: bold;
        margin-top: 10px;
        padding: 10px;
        background: #113311;
        border-radius: 5px;
        border: 1px solid #66ff66;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Set up event listeners for drag & drop and file input
   */
  private setupEventListeners(): void {
    // Drag & drop events
    this.dropzone.addEventListener('dragover', this.handleDragOver.bind(this));
    this.dropzone.addEventListener('dragleave', this.handleDragLeave.bind(this));
    this.dropzone.addEventListener('drop', this.handleDrop.bind(this));
    this.dropzone.addEventListener('click', this.handleClick.bind(this));

    // File input change
    this.fileInput.addEventListener('change', this.handleFileInput.bind(this));

    // Prevent default drag behavior on document
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', e => e.preventDefault());
  }

  /**
   * Handle dragover event
   */
  private handleDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dropzone.classList.add('dragover');
  }

  /**
   * Handle dragleave event
   */
  private handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dropzone.classList.remove('dragover');
  }

  /**
   * Handle drop event
   */
  private handleDrop(event: DragEvent): void {
    event.preventDefault();
    this.dropzone.classList.remove('dragover');

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      void this.processFile(files[0]);
    }
  }

  /**
   * Handle click on dropzone to open file picker
   */
  private handleClick(): void {
    this.fileInput.click();
  }

  /**
   * Handle file input change
   */
  private handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      void this.processFile(files[0]);
    }
  }

  /**
   * Process selected file
   */
  private async processFile(file: File): Promise<void> {
    // Clear previous errors
    this.clearMessages();

    // Validate file
    if (!this.validateFile(file)) {
      this.showError('Invalid ROM file. Please select a .gb or .gbc file.');
      return;
    }

    // Show loading state
    this.showLoading();

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const romData = new Uint8Array(arrayBuffer);

      // Load ROM
      this.onROMLoad(romData, file.name);

      // Show success status
      this.showStatus(`${file.name} loaded (${this.formatFileSize(file.size)})`);
    } catch (error) {
      this.showError(
        `Failed to load ROM: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Validate ROM file
   */
  public validateFile(file: File): boolean {
    // Check file extension
    const extension = file.name.toLowerCase().split('.').pop();
    if (extension !== 'gb' && extension !== 'gbc') {
      return false;
    }

    // Check file size
    if (file.size < ROMLoader.MIN_ROM_SIZE || file.size > ROMLoader.MAX_ROM_SIZE) {
      return false;
    }

    return true;
  }

  /**
   * Read file as ArrayBuffer using Promise wrapper
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (): void => resolve(reader.result as ArrayBuffer);
      reader.onerror = (): void => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Show loading state
   */
  private showLoading(): void {
    const existingLoading = this.container.querySelector('.rom-loader-loading');
    if (!existingLoading) {
      const loading = document.createElement('div');
      loading.className = 'rom-loader-loading';
      loading.textContent = 'Loading ROM...';
      this.container.appendChild(loading);
    }
  }

  /**
   * Hide loading state
   */
  private hideLoading(): void {
    const loading = this.container.querySelector('.rom-loader-loading');
    if (loading) {
      this.container.removeChild(loading);
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const error = document.createElement('div');
    error.className = 'rom-loader-error';
    error.textContent = message;
    this.container.appendChild(error);
  }

  /**
   * Show status message
   */
  private showStatus(message: string): void {
    const status = document.createElement('div');
    status.className = 'rom-loader-status';
    status.textContent = message;
    this.container.appendChild(status);
  }

  /**
   * Clear all message elements
   */
  private clearMessages(): void {
    const messages = this.container.querySelectorAll('.rom-loader-error, .rom-loader-status');
    messages.forEach(msg => this.container.removeChild(msg));
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  }
}

type SweetAlertIcon = 'success' | 'error' | 'warning' | 'info' | 'question';

type AlertResult = {
  isConfirmed: boolean;
  isDenied: boolean;
  isDismissed: boolean;
};

declare global {
  interface Window {
    Swal: any;
  }
}

const SWEETALERT_CDN = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';

const baseConfig = {
  confirmButtonColor: '#16a34a',
  cancelButtonColor: '#94a3b8',
  buttonsStyling: true,
} as const;

const fallbackAlert = {
  fire: ({
    title,
    text,
    showCancelButton,
    confirmButtonText,
    cancelButtonText,
  }: {
    title: string;
    text?: string;
    showCancelButton?: boolean;
    confirmButtonText?: string;
    cancelButtonText?: string;
  }) => {
    const message = `${title}${text ? `\n${text}` : ''}`;

    if (showCancelButton) {
      const confirmed = window.confirm(
        `${message}\n\nTekan OK untuk ${confirmButtonText ?? 'Ya'}, Cancel untuk ${cancelButtonText ?? 'Batal'}.`
      );
      return Promise.resolve({
        isConfirmed: confirmed,
        isDenied: false,
        isDismissed: !confirmed,
      } as AlertResult);
    }

    window.alert(message);
    return Promise.resolve({
      isConfirmed: true,
      isDenied: false,
      isDismissed: false,
    } as AlertResult);
  },
  showLoading: () => undefined,
  close: () => undefined,
};

let loadPromise: Promise<any> | null = null;

const LOAD_TIMEOUT_MS = 4000;

const loadSwal = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve<any>(null);
  }

  if (window.Swal) {
    return Promise.resolve(window.Swal);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${SWEETALERT_CDN}"]`);

    const handleResolve = (instance: any = window.Swal ?? null) => {
      resolve(instance ?? null);
    };

    const handleError = () => {
      resolve(null);
    };

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        handleResolve();
        return;
      }

      const timeoutId = window.setTimeout(() => {
        existingScript.removeEventListener('load', loadHandler);
        existingScript.removeEventListener('error', errorHandler);
        handleError();
      }, LOAD_TIMEOUT_MS);

      function loadHandler() {
        window.clearTimeout(timeoutId);
        existingScript.dataset.loaded = 'true';
        handleResolve();
      }

      function errorHandler() {
        window.clearTimeout(timeoutId);
        handleError();
      }

      existingScript.addEventListener('load', loadHandler, { once: true });
      existingScript.addEventListener('error', errorHandler, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = SWEETALERT_CDN;
    script.async = true;
    script.dataset.loaded = 'false';
    const timeoutId = window.setTimeout(() => {
      script.onerror?.(new Event('error'));
    }, LOAD_TIMEOUT_MS);

    script.onload = () => {
      window.clearTimeout(timeoutId);
      script.dataset.loaded = 'true';
      handleResolve();
    };
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      handleError();
    };
    document.head.appendChild(script);
  });

  return loadPromise;
};

const ensureSwal = async () => {
  const swalInstance = await loadSwal();
  if (swalInstance) {
    window.Swal = swalInstance;
    return swalInstance;
  }

  console.warn('SweetAlert2 belum dimuat. Menggunakan fallback window alert/confirm.');
  return fallbackAlert;
};

export const showAlert = async (
  title: string,
  text: string,
  icon: SweetAlertIcon = 'info'
) => {
  const SwalInstance = await ensureSwal();
  return SwalInstance.fire({
    ...baseConfig,
    title,
    text,
    icon
  });
};

export const showSuccess = async (title: string, text = '') => {
  const SwalInstance = await ensureSwal();
  return SwalInstance.fire({
    ...baseConfig,
    icon: 'success',
    title,
    text,
    confirmButtonText: 'Siap'
  });
};

export const showError = async (title: string, text = '') => {
  const SwalInstance = await ensureSwal();
  return SwalInstance.fire({
    ...baseConfig,
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Mengerti'
  });
};

export const showWarning = async (title: string, text = '') => {
  const SwalInstance = await ensureSwal();
  return SwalInstance.fire({
    ...baseConfig,
    icon: 'warning',
    title,
    text,
    confirmButtonText: 'Mengerti'
  });
};

export const showConfirmation = async (
  title: string,
  text: string,
  confirmButtonText = 'Ya',
  cancelButtonText = 'Batal'
): Promise<AlertResult> => {
  const SwalInstance = await ensureSwal();
  return SwalInstance.fire({
    ...baseConfig,
    icon: 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText
  });
};

export const showLoading = async (title = 'Memproses data...') => {
  const SwalInstance = await ensureSwal();
  return SwalInstance.fire({
    ...baseConfig,
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      SwalInstance.showLoading();
    }
  });
};

export const closeAlert = async () => {
  const SwalInstance = await ensureSwal();
  if (typeof SwalInstance.close === 'function') {
    SwalInstance.close();
  }
};

// Lazy loader for PDF libraries to reduce initial bundle size
// These libraries are ~500KB+ and should only be loaded when needed

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
};

let jsPDFModule: typeof import('jspdf') | null = null;
let autoTableModule: typeof import('jspdf-autotable') | null = null;

export async function loadPDFLibraries() {
  if (!jsPDFModule || !autoTableModule) {
    const [jsPDF, autoTable] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    jsPDFModule = jsPDF;
    autoTableModule = autoTable;
  }
  return {
    jsPDF: jsPDFModule.default,
    autoTable: autoTableModule.default
  };
}

// Preload PDF libraries when user is likely to need them
export function preloadPDFLibraries() {
  const idleWindow = window as IdleWindow;

  // Use requestIdleCallback if available, otherwise setTimeout
  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(() => {
      loadPDFLibraries().catch(() => {
        // Silently fail - will be loaded on demand
      });
    });
  } else {
    setTimeout(() => {
      loadPDFLibraries().catch(() => {});
    }, 3000);
  }
}

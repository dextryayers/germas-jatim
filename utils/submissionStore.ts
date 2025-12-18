export interface SubmissionRecord {
  id: string;
  type: 'evaluasi' | 'laporan';
  instansiName: string;
  submitDate: string; // ISO String
  year: number;
  status: 'pending' | 'verified' | 'rejected';
  
  // Data Payloads
  payload: any; 
}

const STORAGE_KEY = 'germas_submissions_db';

export const SubmissionStore = {
  getAll: (): SubmissionRecord[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  add: (submission: Omit<SubmissionRecord, 'id' | 'status'>) => {
    const current = SubmissionStore.getAll();
    const newRecord: SubmissionRecord = {
      ...submission,
      id: `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: 'pending'
    };
    
    // Add to beginning of list
    const updated = [newRecord, ...current];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newRecord;
  },

  updateStatus: (id: string, status: 'verified' | 'rejected') => {
    const current = SubmissionStore.getAll();
    const updated = current.map(item => 
      item.id === id ? { ...item, status } : item
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  remove: (id: string) => {
    const current = SubmissionStore.getAll();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  init: () => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }
  }
};

// Initialize on load
SubmissionStore.init();
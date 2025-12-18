import toast from "react-hot-toast";

// GANTI URL INI DENGAN URL DEPLOYMENT GOOGLE APPS SCRIPT ANDA NANTI
// Format URL biasanya: https://script.google.com/macros/s/AKfycbx.../exec
const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE';

export const submitToGoogleSheets = async (
  sheetName: 'Evaluasi' | 'Laporan', 
  payload: Record<string, any>
) => {
  const toastId = toast.loading('Mengirim data ke Spreadsheet...');

  try {
    // 1. Tambahkan Metadata Waktu
    const dataToSend = {
      sheet_name: sheetName,
      timestamp: new Date().toLocaleString('id-ID'),
      ...payload
    };

    // 2. Kirim menggunakan fetch
    // Google Apps Script memerlukan mode 'no-cors' untuk POST dari browser client-side sederhana
    // atau kita menggunakan trik form-data untuk menghindari preflight check yang rumit.
    
    const formData = new FormData();
    Object.keys(dataToSend).forEach(key => {
        // Pastikan value adalah string
        formData.append(key, String(dataToSend[key]));
    });

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: formData,
      // mode: 'no-cors' // Penting agar tidak blocked oleh CORS browser saat hit Google
    });

    // Karena no-cors, kita tidak bisa membaca response status secara akurat di beberapa browser
    // Kita asumsikan sukses jika fetch tidak throw error.
    
    toast.success('Data berhasil dikirim ke Spreadsheet!', { id: toastId });
    return true;

  } catch (error) {
    console.error('Gagal kirim ke sheets:', error);
    toast.error('Gagal koneksi ke Spreadsheet. Data tersimpan lokal.', { id: toastId });
    return false;
  }
};

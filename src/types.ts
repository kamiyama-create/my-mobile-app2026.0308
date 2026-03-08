export type ReceiptStatus = 'pending' | 'sent' | 'error';
export type ReceiptType = 'advance' | 'deposit';

export interface ReceiptData {
  id: string;
  date: string;
  store_name: string;
  amount: number;
  category: string;
  type: ReceiptType;
  note: string;
  status: ReceiptStatus;
  timestamp: number;
}

export interface ToastState {
  message: string;
  type: 'success' | 'error';
}

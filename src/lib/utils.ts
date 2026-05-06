import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return "RS " + amount.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

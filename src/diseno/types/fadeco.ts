import type { LucideIcon } from 'lucide-react';

export type Theme = 'light' | 'dark';

export interface NavItem { id: string; label: string; to: string; icon: LucideIcon; }
export interface BrandInfo { mark: string; name: string; subtitle: string; }
export interface UserInfo { name: string; role: string; initials: string; }
export interface SupportLink { label: string; detail: string; to: string; }

export interface StatCardData { id: string; label: string; value: number | string; icon: LucideIcon; trend?: number[]; }
export interface NextEventData { title: string; meta: string; daysLeft: number; }
export interface ActivityItem { id: string; name: string; detail: string; initials: string; tone?: 'green' | 'amber'; }

export interface SupportStatData { id: string; label: string; value: number | string; progress?: number; caption?: string; badge?: string; }
export interface AttentionItem { id: string; label: string; }

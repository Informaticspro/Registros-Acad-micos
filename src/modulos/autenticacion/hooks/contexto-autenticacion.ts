import { createContext } from 'react';
import { PerfilUsuario } from '@/tipos/dominio';
export type AuthContextValue = {
  profile: PerfilUsuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<PerfilUsuario>;
  signOut: () => Promise<void>;
};
export const AuthContext = createContext<AuthContextValue | null>(null);

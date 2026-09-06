import type { ErrorCode } from '@ggclubs/schemas';
import type { User } from 'firebase/auth';
import { createContext } from 'react';
import type { UserRecord } from './api.js';

export type UserRole = 'player' | 'admin';

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  role: UserRole | null;
  /** Documento em `users`. Só é confiável quando `accountStatus === 'ready'`. */
  account: UserRecord | null;
  /**
   * `error` existe pra separar "não tem conta" de "não consegui perguntar".
   * Sem essa distinção, uma API fora do ar manda quem já tem conta pro
   * onboarding · foi exatamente o que aconteceu quando o dev server caiu.
   */
  accountStatus: 'idle' | 'loading' | 'ready' | 'error';
  /**
   * O código do erro que impediu de carregar a conta · `null` quando não houve
   * erro.
   *
   * Existe por um caso concreto: **conta suspensa também cai em `error`**, e sem
   * o código a tela dizia "algo deu errado do nosso lado", que é falso e não
   * ajuda. Pior, a pessoa ficava sem saída · `/login` devolve pro `/app` pelo
   * `GuestRoute`, porque o usuário do Firebase existe.
   */
  accountError: ErrorCode | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Cria a conta no Firebase. O documento em `users` nasce no onboarding. */
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccount: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

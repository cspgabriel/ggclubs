import { useContext } from 'react';
import { MyChatsContext, type MyChatsValue } from '@/lib/my-chats-context';

/**
 * As minhas conversas, do provider da casca · ver o `MyChatsContext`.
 *
 * Ele mora aqui, e não ao lado do provider, porque arquivo que exporta
 * componente **e** hook derruba o fast refresh do Vite.
 */
export function useMyChats(): MyChatsValue {
  return useContext(MyChatsContext);
}

/**
 * Raiz da aplicação Humanittá Gestão (demonstração, sem backend).
 *
 * - Roteamento: src/app/router.tsx (URLs reais; cada módulo declara as próprias rotas).
 * - Dados: src/core (store único persistido em localStorage, repositórios, serviços, hooks).
 * - Perfis: login de demonstração escolhe um usuário fictício — NÃO é autenticação. No produto,
 *   o perfil vem da sessão autenticada e cada rota/ação é validada no servidor.
 *   Ver docs/ARCHITECTURE.md e design_system/documentation/PERMISSIONS.md.
 *
 * Somente o Integrador (Agente 0) altera este arquivo.
 */
import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from '@ds/components';
import { createAppRouter } from './app/router';

export function App() {
  const [router] = useState(createAppRouter);
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}

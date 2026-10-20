import { Routes } from '@angular/router';
import { Home } from './home/home';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'Personal Resolver · Consulta de cédula y NIT',
  },
  {
    path: 'privacidad',
    loadComponent: () => import('./pages/privacy/privacy').then((m) => m.Privacy),
    title: 'Política de privacidad · Personal Resolver',
  },
  {
    path: 'terminos',
    loadComponent: () => import('./pages/terms/terms').then((m) => m.Terms),
    title: 'Términos de uso · Personal Resolver',
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
    title: 'Página no encontrada · Personal Resolver',
  },
];

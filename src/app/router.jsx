import { createBrowserRouter } from 'react-router';
import RootLayout from './RootLayout.jsx';
import Home from '../pages/Home.jsx';
import NotFound from '../pages/NotFound.jsx';
import { PageLoader } from '../components/PageLoader.jsx';
import { GuestOnly, RequireAuth, RequireRole } from '../features/auth/guards.jsx';

// Cada página fuera del home se descarga solo cuando se visita (code splitting).
// Si se publicó una versión nueva con la pestaña abierta, los archivos viejos ya no existen:
// se recarga una vez para traer la versión actual (máx. una vez cada 30 s, para no entrar en bucle).
const RELOAD_KEY = 'mo:chunk-reload';
const page = (load, name = 'default') => async () => {
  try {
    return { Component: (await load())[name] };
  } catch (err) {
    let last = 0;
    try { last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0; } catch { /* sin storage */ }
    if (Date.now() - last > 30_000) {
      try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* sin storage */ }
      window.location.reload();
      return new Promise(() => {}); // la página se recarga; no mostrar el error mientras tanto
    }
    throw err;
  }
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    HydrateFallback: PageLoader,
    children: [
      { index: true, element: <Home /> },

      // Auth
      {
        element: <GuestOnly />,
        children: [
          { path: 'login', lazy: page(() => import('../features/auth/pages/LoginPage.jsx')) },
          { path: 'registro', lazy: page(() => import('../features/auth/pages/RegisterPage.jsx')) },
        ],
      },
      { path: 'recuperar', lazy: page(() => import('../features/auth/pages/RecoverPage.jsx')) },
      { path: 'recuperar/nueva', lazy: page(() => import('../features/auth/pages/NewPasswordPage.jsx')) },
      { path: 'tratamiento-de-datos', lazy: page(() => import('../pages/DataPolicyPage.jsx')) },

      // Tienda
      { path: 'tienda', lazy: page(() => import('../features/store/ShopPage.jsx')) },
      { path: 'categoria/:slug', lazy: page(() => import('../features/store/ShopPage.jsx'), 'CategoryShop') },
      { path: 'zona/:slug', lazy: page(() => import('../features/store/ShopPage.jsx'), 'ZoneShop') },
      { path: 'producto/:slug', lazy: page(() => import('../features/store/ProductPage.jsx')) },
      { path: 'embajadores', lazy: page(() => import('../features/store/AmbassadorPages.jsx'), 'AmbassadorsPage') },
      { path: 'embajador/:slug', lazy: page(() => import('../features/store/AmbassadorPages.jsx'), 'AmbassadorPage') },
      { path: 'kits', lazy: page(() => import('../features/store/KitPages.jsx'), 'KitsPage') },
      { path: 'kit/:slug', lazy: page(() => import('../features/store/KitPages.jsx'), 'KitPage') },
      { path: 'quiero-ser-embajador', lazy: page(() => import('../features/store/JoinPage.jsx')) },

      // Compra
      { path: 'carrito', lazy: page(() => import('../features/cart/CartPage.jsx')) },
      { path: 'checkout', lazy: page(() => import('../features/checkout/CheckoutPage.jsx')) },
      { path: 'pago/resultado', lazy: page(() => import('../features/checkout/PaymentResultPage.jsx')) },
      { path: 'pedido/:numero', lazy: page(() => import('../features/orders/GuestOrderPage.jsx')) },

      // Cuenta del cliente
      {
        path: 'cuenta',
        element: <RequireAuth />,
        children: [
          {
            lazy: page(() => import('../features/account/AccountLayout.jsx')),
            children: [
              { index: true, lazy: page(() => import('../features/account/AccountHome.jsx')) },
              { path: 'pedidos', lazy: page(() => import('../features/orders/OrdersPage.jsx')) },
              { path: 'pedidos/:numero', lazy: page(() => import('../features/orders/OrderDetailPage.jsx')) },
              { path: 'deseos', lazy: page(() => import('../features/wishlist/WishlistPage.jsx')) },
              { path: 'direcciones', lazy: page(() => import('../features/account/AddressesPage.jsx')) },
            ],
          },
        ],
      },

      { path: '*', element: <NotFound /> },
    ],
  },
  // Panel del embajador: fuera del layout de la tienda y en su propio bundle.
  {
    path: '/panel',
    HydrateFallback: PageLoader,
    element: <RequireAuth><RequireRole roles={['embajador']} /></RequireAuth>,
    children: [
      {
        lazy: page(() => import('../features/ambassador-panel/PanelLayout.jsx')),
        children: [
          { index: true, lazy: page(() => import('../features/ambassador-panel/PanelHome.jsx')) },
          { path: 'productos', lazy: page(() => import('../features/ambassador-panel/ProductsPage.jsx')) },
          { path: 'productos/nuevo', lazy: page(() => import('../features/ambassador-panel/ProductEditor.jsx')) },
          { path: 'productos/:id', lazy: page(() => import('../features/ambassador-panel/ProductEditor.jsx')) },
          { path: 'pedidos', lazy: page(() => import('../features/ambassador-panel/OrdersPage.jsx')) },
          { path: 'pagos', lazy: page(() => import('../features/ambassador-panel/PayoutsPage.jsx')) },
          { path: 'perfil', lazy: page(() => import('../features/ambassador-panel/ProfilePage.jsx')) },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
  // Administración: fuera del layout de la tienda y en su propio bundle.
  {
    path: '/admin',
    HydrateFallback: PageLoader,
    element: <RequireAuth><RequireRole roles={['admin']} /></RequireAuth>,
    children: [
      {
        lazy: page(() => import('../features/admin/AdminLayout.jsx')),
        children: [
          { index: true, lazy: page(() => import('../features/admin/Dashboard.jsx')) },
          { path: 'aprobaciones', lazy: page(() => import('../features/admin/ApprovalsPage.jsx')) },
          { path: 'pedidos', lazy: page(() => import('../features/admin/OrdersAdmin.jsx'), 'OrdersList') },
          { path: 'pedidos/:numero', lazy: page(() => import('../features/admin/OrdersAdmin.jsx'), 'OrderAdminDetail') },
          { path: 'productos', lazy: page(() => import('../features/admin/ProductsAdmin.jsx'), 'ProductsList') },
          { path: 'productos/nuevo', lazy: page(() => import('../features/admin/ProductsAdmin.jsx'), 'ProductAdminEdit') },
          { path: 'productos/:id', lazy: page(() => import('../features/admin/ProductsAdmin.jsx'), 'ProductAdminEdit') },
          { path: 'embajadores', lazy: page(() => import('../features/admin/AmbassadorsAdmin.jsx'), 'AmbassadorsList') },
          { path: 'embajadores/nuevo', lazy: page(() => import('../features/admin/AmbassadorsAdmin.jsx'), 'AmbassadorAdmin') },
          { path: 'embajadores/:id', lazy: page(() => import('../features/admin/AmbassadorsAdmin.jsx'), 'AmbassadorAdmin') },
          { path: 'solicitudes', lazy: page(() => import('../features/admin/AmbassadorsAdmin.jsx'), 'ApplicationsPage') },
          { path: 'liquidaciones', lazy: page(() => import('../features/admin/PayoutsAdmin.jsx')) },
          { path: 'pagos', lazy: page(() => import('../features/admin/PaymentsAdmin.jsx')) },
          { path: 'kits', lazy: page(() => import('../features/admin/KitsAdmin.jsx'), 'KitsList') },
          { path: 'kits/nuevo', lazy: page(() => import('../features/admin/KitsAdmin.jsx'), 'KitEditor') },
          { path: 'kits/:id', lazy: page(() => import('../features/admin/KitsAdmin.jsx'), 'KitEditor') },
          { path: 'contenido', lazy: page(() => import('../features/admin/ContentAdmin.jsx')) },
          { path: 'cupones', lazy: page(() => import('../features/admin/MiscAdmin.jsx'), 'CouponsPage') },
          { path: 'usuarios', lazy: page(() => import('../features/admin/MiscAdmin.jsx'), 'UsersPage') },
          { path: 'resenas', lazy: page(() => import('../features/admin/MiscAdmin.jsx'), 'ReviewsPage') },
          { path: 'actividad', lazy: page(() => import('../features/admin/MiscAdmin.jsx'), 'ActivityPage') },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);

export const ROLE_HOME = {
  owner: '/dashboard',
  admin: '/dashboard',
  manager: '/staff',
  office: '/staff',
  staff: '/inventory/products',
  delivery: '/delivery',
}

export const resolveLandingRoute = (role) => ROLE_HOME[role] ?? '/'


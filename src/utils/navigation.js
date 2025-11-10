export const ROLE_HOME = {
  owner: '/owner',
  admin: '/owner',
  manager: '/staff',
  office: '/staff',
  staff: '/inventory/products',
  delivery: '/delivery',
}

export const resolveLandingRoute = (role) => ROLE_HOME[role] ?? '/'


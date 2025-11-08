const UnauthorizedPage = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
    <div className="rounded-3xl border border-white/10 bg-white/10 px-8 py-12 text-center">
      <h1 className="text-2xl font-semibold">Access Restricted</h1>
      <p className="mt-3 text-sm text-white/70">
        You do not have permission to view this page. Please contact your administrator if you
        believe this is a mistake.
      </p>
    </div>
  </div>
)

export default UnauthorizedPage

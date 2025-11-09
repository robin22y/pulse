import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

const ICON_PATHS = {
  dashboard: (
    <path
      d="M4 4h6v8H4zM14 4h6v5h-6zM14 11h6v9h-6zM4 14h6v6H4z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  people: (
    <>
      <path
        d="M8.5 12.25c1.794 0 3.25-1.567 3.25-3.5S10.294 5.25 8.5 5.25 5.25 6.817 5.25 8.75 6.706 12.25 8.5 12.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M3.5 18.5c.727-2.768 2.663-4.25 4.999-4.25 2.336 0 4.272 1.482 4.999 4.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M15.75 10.25c1.518 0 2.75-1.257 2.75-2.808S17.268 4.635 15.75 4.635s-2.75 1.257-2.75 2.807 1.232 2.808 2.75 2.808Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.8"
      />
      <path
        d="M14.4 12.55c1.842 0 3.316 1.209 3.906 3.402"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.8"
      />
    </>
  ),
  package: (
    <>
      <path
        d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M4 7.5v9l8 4.5 8-4.5v-9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M12 12v9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  report: (
    <>
      <path
        d="M7 4h10l3 4v12H7z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M7 4l-3 4v12h3"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M11 12h6M11 15h6M11 18h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  inventory: (
    <>
      <path
        d="M5 6h14v14H5z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M9 6V4h6v2M9 10h6M9 14h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  delivery: (
    <>
      <path
        d="M4 16V6a2 2 0 0 1 2-2h7l5 6v6"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M13 4v6h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="7.5" cy="18.5" r="1.5" fill="currentColor" />
      <circle cx="16.5" cy="18.5" r="1.5" fill="currentColor" />
    </>
  ),
  settings: (
    <>
      <path
        d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M19.4 13a7.5 7.5 0 0 0 .08-.99c0-.34-.03-.67-.08-.99l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.49 1a7.53 7.53 0 0 0-1.71-.99l-.38-2.65A.5.5 0 0 0 13 2h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.62.26-1.19.6-1.71.99l-2.49-1a.5.5 0 0 0-.6.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65A7.52 7.52 0 0 0 4.5 12c0 .34.03.67.08.99l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .6.22l2.49-1c.52.39 1.09.73 1.71.99l.38 2.65a.5.5 0 0 0 .5.42h4a.5.5 0 0 0 .5-.42l.38-2.65c.62-.26 1.19-.6 1.71-.99l2.49 1a.5.5 0 0 0 .6-.22l2-3.46a.5.5 0 0 0-.12-.64Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
    </>
  ),
}

const Icon = ({ name, active }) => {
  const path = ICON_PATHS[name] ?? ICON_PATHS.dashboard
  return (
    <svg
      className={`h-6 w-6 transition ${active ? 'text-primary' : 'text-slate-300/80'}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      {path}
    </svg>
  )
}

const BottomNavigation = ({ items = [], activePath }) => {
  const navigate = useNavigate()

  const enhancedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        active: activePath.startsWith(item.path),
      })),
    [items, activePath],
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-center justify-around py-3">
        {enhancedItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 rounded-2xl px-4 py-2 transition ${
              item.active ? 'bg-primary/10 text-primary' : 'text-slate-300/80 hover:text-white'
            }`}
          >
            <Icon name={item.icon} active={item.active} />
            <span className="text-xs font-medium tracking-wide uppercase">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export default BottomNavigation


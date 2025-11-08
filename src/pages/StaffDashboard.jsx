import FluentCard from '../components/FluentCard.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'

const StaffDashboard = () => {
  const { profile } = useAuth()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-white">Team Hub</h2>
        <p className="text-sm text-white/60">
          Welcome back {profile?.full_name ?? ''}. Stay on top of tasks, consignments, and delivery
          updates.
        </p>
      </header>

      <FluentCard glass>
        <h3 className="text-lg font-semibold text-white">Quick Links</h3>
        <p className="mt-2 text-sm text-white/60">
          Use the bottom navigation to access inventory, create consignments, and update delivery
          status.
        </p>
      </FluentCard>
    </div>
  )
}

export default StaffDashboard

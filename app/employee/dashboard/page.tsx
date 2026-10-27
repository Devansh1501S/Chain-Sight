import { Suspense } from 'react'
import EmployeeWorkspace from '../../../components/employee-workspace'

export default function EmployeeDashboard() {
  return (
    <Suspense
      fallback={
        <div className="access-state">
          <p>Loading Employee Workspace...</p>
        </div>
      }
    >
      <EmployeeWorkspace />
    </Suspense>
  )
}

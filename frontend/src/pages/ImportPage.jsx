import { useNavigate } from 'react-router-dom'
import ImportCSV from '../components/ImportCSV'

export default function ImportPage() {
  const navigate = useNavigate()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-fg mb-6">Import</h1>
      <ImportCSV onComplete={() => navigate('/')} />
    </div>
  )
}

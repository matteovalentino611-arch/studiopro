import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Users, FileText, BarChart3, Mail, LogOut, Menu, X, Clock, Phone, Loader } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function StudioPro() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [loading, setLoading] = useState(false);

  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [clientsRes, appointmentsRes, documentsRes, invoicesRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/clients`, { headers }),
        fetch(`${API_URL}/api/appointments`, { headers }),
        fetch(`${API_URL}/api/documents`, { headers }),
        fetch(`${API_URL}/api/invoices`, { headers }),
        fetch(`${API_URL}/api/stats`, { headers })
      ]);

      if (clientsRes.ok) setClients(await clientsRes.json());
      if (appointmentsRes.ok) setAppointments(await appointmentsRes.json());
      if (documentsRes.ok) setDocuments(await documentsRes.json());
      if (invoicesRes.ok) setInvoices(await invoicesRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error('Error:', err);
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.target);
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password')
        })
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        setCurrentUser(data.user);
        localStorage.setItem('token', data.token);
        setIsLoggedIn(true);
      } else {
        alert('Errore login');
      }
    } catch (err) {
      console.error('Error:', err);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setToken(null);
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('token');
  };

  const addClient = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const response = await fetch(`${API_URL}/api/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          phone: formData.get('phone')
        })
      });

      if (response.ok) {
        fetchData();
        setShowModal(false);
        e.target.reset();
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const addAppointment = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const response = await fetch(`${API_URL}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          client_id: parseInt(formData.get('clientId')),
          title: formData.get('title'),
          date: formData.get('date'),
          time: formData.get('time')
        })
      });

      if (response.ok) {
        fetchData();
        setShowModal(false);
        e.target.reset();
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} loading={loading} />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="text-2xl font-bold text-blue-600">StudioPro</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{currentUser?.name || currentUser?.email}</span>
            <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded">
              <LogOut size={20} className="text-gray-600" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {loading && <LoadingSpinner />}
          {!loading && activeTab === 'dashboard' && <DashboardTab stats={stats} appointments={appointments} clients={clients} />}
          {!loading && activeTab === 'clients' && <ClientsTab clients={clients} onAdd={() => { setModalType('client'); setShowModal(true); }} />}
          {!loading && activeTab === 'calendar' && <CalendarTab appointments={appointments} clients={clients} onAdd={() => { setModalType('appointment'); setShowModal(true); }} />}
          {!loading && activeTab === 'documents' && <DocumentsTab documents={documents} clients={clients} />}
          {!loading && activeTab === 'invoices' && <InvoicesTab invoices={invoices} clients={clients} />}
          {!loading && activeTab === 'automation' && <AutomationTab />}
        </main>
      </div>

      {showModal && (
        <Modal
          type={modalType}
          onClose={() => setShowModal(false)}
          onSubmit={modalType === 'client' ? addClient : addAppointment}
          clients={clients}
        />
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader className="animate-spin text-blue-600" size={40} />
    </div>
  );
}

function Sidebar({ isOpen, activeTab, setActiveTab, onLogout }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'clients', label: 'Clienti', icon: Users },
    { id: 'calendar', label: 'Agende', icon: Calendar },
    { id: 'documents', label: 'Documenti', icon: FileText },
    { id: 'invoices', label: 'Fatture', icon: Mail },
    { id: 'automation', label: 'Automazioni', icon: Mail },
  ];

  return (
    <div className={`${isOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col border-r border-gray-800`}>
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">SP</div>
          {isOpen && <span className="font-bold">StudioPro</span>}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
                }`}
            >
              <Icon size={20} />
              {isOpen && <span className="text-sm font-medium">{tab.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition"
        >
          <LogOut size={20} />
          {isOpen && <span className="text-sm font-medium">Esci</span>}
        </button>
      </div>
    </div>
  );
}

function DashboardTab({ stats, appointments, clients }) {
  if (!stats) return <div className="p-8">Caricamento...</div>;

  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Clienti" value={stats.clients} color="blue" />
        <StatCard label="Appuntamenti" value={stats.appointments} color="orange" />
        <StatCard label="Fatturato" value={`€${stats.totalRevenue}`} color="green" />
        <StatCard label="Pagato" value={`€${stats.paidRevenue}`} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow">
          <h3 className="font-bold text-lg mb-4">Appuntamenti</h3>
          <div className="space-y-3">
            {appointments.slice(0, 5).map(apt => (
              <div key={apt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">{apt.title}</p>
                  <p className="text-sm text-gray-500">{apt.date} - {apt.time}</p>
                </div>
                <Clock size={18} className="text-orange-500" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow">
          <h3 className="font-bold text-lg mb-4">Clienti</h3>
          <div className="space-y-2">
            {clients.slice(0, 3).map(client => (
              <div key={client.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="font-medium text-gray-900">{client.name}</p>
                <p className="text-xs text-gray-500">{client.email}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientsTab({ clients, onAdd }) {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Clienti</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Nuovo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => (
          <div key={client.id} className="bg-white rounded-xl p-6 shadow border border-gray-200 hover:shadow-lg transition">
            <h3 className="font-bold text-lg text-gray-900">{client.name}</h3>
            <p className={`text-xs font-semibold mt-2 ${client.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
              {client.status === 'active' ? '● Attivo' : '● Inattivo'}
            </p>

            <div className="space-y-2 text-sm mt-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail size={16} />
                {client.email}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={16} />
                {client.phone}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarTab({ appointments, clients, onAdd }) {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Agende</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Nuovo Appuntamento
        </button>
      </div>

      <div className="space-y-4">
        {appointments.map(apt => {
          const client = clients.find(c => c.id === apt.client_id);
          return (
            <div key={apt.id} className="bg-white rounded-xl p-6 shadow border border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{apt.title}</h3>
                <p className="text-gray-600 text-sm">Cliente: {client?.name}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-2 text-gray-500 text-sm">
                    <Calendar size={16} />
                    {apt.date}
                  </span>
                  <span className="flex items-center gap-2 text-gray-500 text-sm">
                    <Clock size={16} />
                    {apt.time}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocumentsTab({ documents, clients }) {
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Documenti</h2>

      <div className="space-y-4">
        {documents.map(doc => {
          const client = clients.find(c => c.id === doc.client_id);
          return (
            <div key={doc.id} className="bg-white rounded-xl p-6 shadow border border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <FileText size={20} className="text-blue-500" />
                  {doc.name}
                </h3>
                <p className="text-gray-600 text-sm">Cliente: {client?.name}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InvoicesTab({ invoices, clients }) {
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Fatture</h2>

      <div className="bg-white rounded-xl overflow-hidden shadow border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Cliente</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Importo</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Stato</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(invoice => {
              const client = clients.find(c => c.id === invoice.client_id);
              return (
                <tr key={invoice.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900 font-medium">{client?.name}</td>
                  <td className="px-6 py-4 text-gray-900 font-bold">€{invoice.amount}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${invoice.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                      }`}>
                      {invoice.status === 'paid' ? 'Pagata' : 'In sospeso'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AutomationTab() {
  const automations = [
    { title: 'Email benvenuto', description: 'Automatica quando nuovo cliente', status: 'active' },
    { title: 'Reminder appuntamenti', description: '24h prima', status: 'active' },
    { title: 'Follow-up pratiche', description: 'Ogni 14 giorni', status: 'inactive' },
  ];

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Automazioni</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {automations.map((auto, idx) => (
          <div key={idx} className="bg-white rounded-xl p-6 shadow border border-gray-200">
            <h3 className="font-bold text-lg text-gray-900">{auto.title}</h3>
            <p className="text-gray-600 text-sm mt-2">{auto.description}</p>
            <span className={`inline-block mt-4 px-3 py-1 rounded-full text-xs font-bold ${auto.status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
              }`}>
              {auto.status === 'active' ? 'Attiva' : 'Inattiva'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className={`${colors[color]} rounded-xl p-6 border border-gray-200`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}

function LoginPage({ onLogin, loading }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl p-8 space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">SP</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">StudioPro</h1>
            <p className="text-gray-600 mt-2">Gestione per professionisti</p>
          </div>

          <form onSubmit={onLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                placeholder="email@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Accesso...' : 'Accedi'}
            </button>
          </form>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-900">
              Non hai account? Registrati con qualsiasi email!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Modal({ type, onClose, onSubmit, clients }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {type === 'client' ? 'Nuovo Cliente' : 'Nuovo Appuntamento'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {type === 'client' ? (
            <>
              <input
                type="text"
                name="name"
                placeholder="Nome"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
              <input
                type="tel"
                name="phone"
                placeholder="Telefono"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </>
          ) : (
            <>
              <select
                name="clientId"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              >
                <option value="">Seleziona cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input
                type="text"
                name="title"
                placeholder="Titolo"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
              <input
                type="date"
                name="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
              <input
                type="time"
                name="time"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Salva
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
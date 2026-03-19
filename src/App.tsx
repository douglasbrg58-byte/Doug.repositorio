import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  serverTimestamp, 
  orderBy,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';
import { getDocFromServer, doc as firestoreDoc } from 'firebase/firestore';
import { Victim, VictimStatus, Visit, VisitType, VisitSituation } from './types';
import { 
  Plus, 
  Search, 
  BarChart3, 
  Users, 
  UserMinus, 
  UserX, 
  ArrowLeft, 
  Save, 
  Edit, 
  History, 
  FileText,
  LogOut,
  ChevronRight,
  Calendar,
  Phone,
  User as UserIcon,
  ShieldAlert,
  AlertTriangle,
  Download,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, setError?: (err: string) => void) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  const errStr = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errStr);
  if (setError) setError(errStr);
  throw new Error(errStr);
}

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '', 
  type = 'button',
  disabled = false
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'; 
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) => {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-purple-600 text-white hover:bg-purple-700 shadow-sm",
    secondary: "bg-purple-100 text-purple-700 hover:bg-purple-200",
    outline: "border-2 border-purple-200 text-purple-700 hover:border-purple-300 hover:bg-purple-50",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
    ghost: "text-purple-600 hover:bg-purple-50"
  };

  return (
    <button type={type} onClick={onClick} className={`${baseStyles} ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

const Input = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = 'text', 
  required = false,
  className = "",
  name,
  defaultValue
}: { 
  label?: string; 
  value?: string; 
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  placeholder?: string; 
  type?: string;
  required?: boolean;
  className?: string;
  name?: string;
  defaultValue?: string;
}) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && <label className="text-sm font-semibold text-purple-900">{label}{required && '*'}</label>}
    <input 
      type={type} 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
      required={required}
      name={name}
      defaultValue={defaultValue}
      className="px-3 py-2 border-2 border-purple-100 rounded-lg focus:border-purple-400 focus:outline-none transition-colors bg-white text-purple-900"
    />
  </div>
);

const Select = ({ 
  label, 
  value, 
  onChange, 
  options,
  required = false,
  className = "",
  name,
  defaultValue
}: { 
  label?: string; 
  value?: string; 
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; 
  options: { value: string; label: string }[];
  required?: boolean;
  className?: string;
  name?: string;
  defaultValue?: string;
}) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && <label className="text-sm font-semibold text-purple-900">{label}{required && '*'}</label>}
    <select 
      value={value} 
      onChange={onChange}
      required={required}
      name={name}
      defaultValue={defaultValue}
      className="px-3 py-2 border-2 border-purple-100 rounded-lg focus:border-purple-400 focus:outline-none transition-colors bg-white text-purple-900"
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'new' | 'case' | 'reports'>('dashboard');
  const [activeTab, setActiveTab] = useState<VictimStatus>('active');
  const [victims, setVictims] = useState<Victim[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVictimId, setSelectedVictimId] = useState<string | null>(null);
  const [editingVictim, setEditingVictim] = useState<Victim | null>(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [newVictimStatus, setNewVictimStatus] = useState<VictimStatus>('active');
  const [uploading, setUploading] = useState(false);
  const [victimToDelete, setVictimToDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = true; // No login required, everyone is admin

  // Test connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(firestoreDoc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    if (db) testConnection();
  }, []);

  // Report filters
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error", error);
    }
  };

  const handleLogout = () => signOut(auth);

  // Data Fetching
  useEffect(() => {
    const victimsQuery = query(collection(db, 'victims'), orderBy('createdAt', 'desc'));
    const unsubscribeVictims = onSnapshot(victimsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Victim));
      setVictims(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'victims', setError);
    });

    const visitsQuery = query(collection(db, 'visits'), orderBy('date', 'desc'));
    const unsubscribeVisits = onSnapshot(visitsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Visit));
      setVisits(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'visits', setError);
    });

    return () => {
      unsubscribeVictims();
      unsubscribeVisits();
    };
  }, []);

  // Derived Data
  const filteredVictims = useMemo(() => {
    return victims.filter(v => {
      const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           v.internalCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           v.processNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      // If searching, ignore tabs to find the victim anywhere
      if (searchTerm) return matchesSearch;
      
      // Otherwise, filter by the active tab
      return v.status === activeTab && matchesSearch;
    });
  }, [victims, activeTab, searchTerm]);

  const selectedVictim = useMemo(() => 
    victims.find(v => v.id === selectedVictimId), 
  [victims, selectedVictimId]);

  const victimVisits = useMemo(() => 
    visits.filter(v => v.victimId === selectedVictimId), 
  [visits, selectedVictimId]);

  const filteredVisitsForReport = useMemo(() => {
    return visits.filter(v => {
      if (!v.date) return false;
      const [year, month] = v.date.split('-').map(Number);
      if (reportType === 'monthly') {
        return (month - 1) === reportMonth && year === reportYear;
      }
      return year === reportYear;
    });
  }, [visits, reportType, reportMonth, reportYear]);

  const filteredVictimsForReport = useMemo(() => {
    return victims.filter(v => {
      // Use protectiveMeasureDate if available, otherwise fallback to createdAt
      let dateToUse = v.protectiveMeasureDate;
      if (!dateToUse && v.createdAt) {
        const d = v.createdAt.toDate ? v.createdAt.toDate() : new Date();
        dateToUse = format(d, 'yyyy-MM-dd');
      }
      
      if (!dateToUse) return false;
      
      const [year, month] = dateToUse.split('-').map(Number);
      if (reportType === 'monthly') {
        return (month - 1) === reportMonth && year === reportYear;
      }
      return year === reportYear;
    });
  }, [victims, reportType, reportMonth, reportYear]);

  // Actions
  const handleSaveVictim = async (data: Partial<Victim>, file?: File) => {
    setUploading(true);
    try {
      let attachmentUrl = editingVictim?.attachmentUrl || '';
      let attachmentName = editingVictim?.attachmentName || '';

      if (file) {
        // Check file size (max 700KB to ensure Base64 doesn't exceed 1MB Firestore limit)
        if (file.size > 700 * 1024) {
          alert("O arquivo é muito grande. O limite é de 700KB para anexos.");
          setUploading(false);
          return;
        }

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        attachmentUrl = await base64Promise;
        attachmentName = file.name;
      }

      const victimData = {
        ...data,
        attachmentUrl,
        attachmentName,
        updatedAt: serverTimestamp(),
      };

      if (editingVictim) {
        await updateDoc(doc(db, 'victims', editingVictim.id), victimData);
      } else {
        await addDoc(collection(db, 'victims'), {
          ...victimData,
          createdAt: serverTimestamp(),
        });
      }
      
      // Update active tab to the status of the saved victim so it appears immediately
      if (data.status) {
        setActiveTab(data.status);
      }
      
      setEditingVictim(null);
      setView('dashboard');
    } catch (error) {
      handleFirestoreError(error, editingVictim ? OperationType.UPDATE : OperationType.CREATE, 'victims', setError);
      alert("Erro ao salvar cadastro. Verifique o tamanho do arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: VictimStatus) => {
    try {
      await updateDoc(doc(db, 'victims', id), { 
        status, 
        updatedAt: serverTimestamp() 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'victims', setError);
    }
  };

  const handleAddVisit = async (data: Partial<Visit>) => {
    if (!selectedVictimId) return;
    try {
      await addDoc(collection(db, 'visits'), {
        ...data,
        victimId: selectedVictimId,
        createdAt: serverTimestamp(),
      });
      setShowVisitModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'visits', setError);
    }
  };

  const handleDeleteVictim = async (id: string) => {
    try {
      // Also delete associated visits
      const victimVisitsQuery = query(collection(db, 'visits'), where('victimId', '==', id));
      const victimVisitsSnapshot = await getDocs(victimVisitsQuery);
      const deletePromises = victimVisitsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      await deleteDoc(doc(db, 'victims', id));
      setVictimToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'victims', setError);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = format(now, 'dd/MM/yyyy HH:mm');

    let periodLabel = '';
    if (reportType === 'monthly') {
      const monthName = format(new Date(reportYear, reportMonth), 'MMMM', { locale: ptBR });
      periodLabel = `${monthName} de ${reportYear}`;
    } else {
      periodLabel = `Ano de ${reportYear}`;
    }

    doc.setFontSize(18);
    doc.text('CENTRAL DE ACOMPANHAMENTO – Patrulha Maria da Penha', 14, 22);
    doc.setFontSize(12);
    doc.text('Querência/MT - Relatório de Acompanhamento', 14, 30);
    doc.text(`Período: ${periodLabel}`, 14, 38);
    doc.text(`Gerado em: ${dateStr}`, 14, 46);

    const stats = [
      ['Vítimas Ativas no Período', filteredVictimsForReport.filter(v => v.status === 'active').length],
      ['Vítimas Inativas no Período', filteredVictimsForReport.filter(v => v.status === 'inactive').length],
      ['Recusaram Acompanhamento no Período', filteredVictimsForReport.filter(v => v.status === 'refused').length],
      ['Total de Vítimas no Período', filteredVictimsForReport.length],
      ['Visitas Realizadas no Período', filteredVisitsForReport.length],
      ['Visitas a Agressores no Período', filteredVisitsForReport.filter(v => v.type === 'aggressor').length],
      ['Descumprimento de Medida no Período', filteredVisitsForReport.filter(v => v.situation === 'violation').length],
    ];

    autoTable(doc, {
      startY: 55,
      head: [['Indicador', 'Quantidade']],
      body: stats,
      theme: 'grid',
      headStyles: { fillColor: [155, 89, 182] }
    });

    doc.save(`relatorio-central-acompanhamento-${periodLabel.replace(/\s/g, '-')}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    let displayError = "Ocorreu um erro inesperado.";
    try {
      const parsed = JSON.parse(error || "{}");
      if (parsed.error) {
        displayError = `Erro no Firestore: ${parsed.error} (${parsed.operationType} em ${parsed.path})`;
      }
    } catch (e) {
      displayError = error || displayError;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-purple-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl border-2 border-purple-100 max-w-md w-full text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-purple-900 mb-4">Ops! Algo deu errado</h2>
          <p className="text-purple-700 mb-6">{displayError}</p>
          <Button onClick={() => window.location.reload()} className="w-full">
            Recarregar Página
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-purple-900 font-sans">
      {/* Header */}
      <header className="bg-purple-600 text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">CENTRAL DE ACOMPANHAMENTO</h1>
              <p className="text-xs text-purple-100">Patrulha Maria da Penha – Querência/MT</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-bold">Acesso Público</p>
              <p className="text-xs text-purple-200">Patrulha Maria da Penha</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Navigation Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button 
            onClick={() => { setEditingVictim(null); setNewVictimStatus('active'); setView('new'); }} 
            variant={view === 'new' ? 'primary' : 'outline'}
            className="flex-1 md:flex-none"
          >
            <Plus className="w-5 h-5" /> Novo Cadastro
          </Button>
          <Button 
            onClick={() => setView('dashboard')} 
            variant={view === 'dashboard' ? 'primary' : 'outline'}
            className="flex-1 md:flex-none"
          >
            <Search className="w-5 h-5" /> Busca Rápida
          </Button>
          <Button 
            onClick={() => setView('reports')} 
            variant={view === 'reports' ? 'primary' : 'outline'}
            className="flex-1 md:flex-none"
          >
            <BarChart3 className="w-5 h-5" /> Relatórios
          </Button>
        </div>

        {/* Views */}
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Search Bar */}
              <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-5 h-5" />
                <input 
                  type="text"
                  placeholder="Buscar por nome, código ou processo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-purple-50 border-2 border-purple-100 rounded-2xl focus:border-purple-400 focus:outline-none transition-all text-lg"
                />
              </div>

              {/* Tabs */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <button 
                  onClick={() => setActiveTab('active')}
                  className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${activeTab === 'active' ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                >
                  <Users className="w-6 h-6" />
                  <span className="font-bold text-sm md:text-base">📋 Vítimas Ativas</span>
                  <span className="text-xs opacity-80">{victims.filter(v => v.status === 'active').length} casos</span>
                </button>
                <button 
                  onClick={() => setActiveTab('inactive')}
                  className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${activeTab === 'inactive' ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                >
                  <UserMinus className="w-6 h-6" />
                  <span className="font-bold text-sm md:text-base">📂 Inativas</span>
                  <span className="text-xs opacity-80">{victims.filter(v => v.status === 'inactive').length} casos</span>
                </button>
                <button 
                  onClick={() => setActiveTab('refused')}
                  className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${activeTab === 'refused' ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                >
                  <UserX className="w-6 h-6" />
                  <span className="font-bold text-sm md:text-base">🚫 Recusaram</span>
                  <span className="text-xs opacity-80">{victims.filter(v => v.status === 'refused').length} casos</span>
                </button>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border-2 border-purple-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-purple-50 text-purple-900 uppercase text-xs font-bold">
                      <tr>
                        <th className="px-6 py-4">Código</th>
                        <th className="px-6 py-4">Processo</th>
                        <th className="px-6 py-4">Nome</th>
                        <th className="px-6 py-4">Telefone</th>
                        <th className="px-6 py-4">Visitas</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Anexo</th>
                        <th className="px-6 py-4">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50">
                      {filteredVictims.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-purple-400 italic">
                            Nenhuma vítima encontrada nesta categoria.
                          </td>
                        </tr>
                      ) : (
                        filteredVictims.map(victim => {
                          const vVisits = visits.filter(vis => vis.victimId === victim.id);
                          return (
                            <tr key={victim.id} className="hover:bg-purple-50/50 transition-colors group">
                              <td className="px-6 py-4 font-mono text-sm font-bold text-purple-600">
                                {victim.internalCode || '---'}
                              </td>
                              <td className="px-6 py-4 text-sm">{victim.processNumber}</td>
                              <td className="px-6 py-4 font-semibold">{victim.name}</td>
                              <td className="px-6 py-4 text-sm">{victim.phone}</td>
                              <td className="px-6 py-4">
                                <div className="flex gap-1">
                                  {vVisits.slice(0, 3).map((v, i) => {
                                    const [year, month, day] = v.date.split('-').map(Number);
                                    return (
                                      <span key={i} className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                        {`${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`}
                                      </span>
                                    );
                                  })}
                                  {vVisits.length > 3 && <span className="text-[10px] text-purple-400">+{vVisits.length - 3}</span>}
                                  {vVisits.length === 0 && <span className="text-xs text-purple-300">0</span>}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <select 
                                  value={victim.status}
                                  onChange={(e) => handleUpdateStatus(victim.id, e.target.value as VictimStatus)}
                                  className={`text-xs font-bold px-2 py-1 rounded-full border-none focus:ring-2 focus:ring-purple-400 ${
                                    victim.status === 'active' ? 'bg-green-100 text-green-700' :
                                    victim.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                                    'bg-red-100 text-red-700'
                                  }`}
                                >
                                  <option value="active">Ativo</option>
                                  <option value="inactive">Inativo</option>
                                  <option value="refused">Recusou</option>
                                </select>
                              </td>
                              <td className="px-6 py-4">
                                {victim.attachmentUrl ? (
                                  <a 
                                    href={victim.attachmentUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-800"
                                  >
                                    <FileText className="w-4 h-4" /> Ver Arquivo
                                  </a>
                                ) : (
                                  <span className="text-xs text-purple-300 italic">Sem anexo</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex gap-2">
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => { setSelectedVictimId(victim.id); setView('case'); }}
                                    className="p-2"
                                  >
                                    <ChevronRight className="w-5 h-5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => { 
                                      setEditingVictim(victim); 
                                      setNewVictimStatus(victim.status);
                                      setView('new'); 
                                    }}
                                    className="p-2"
                                  >
                                    <Edit className="w-5 h-5" />
                                  </Button>
                                  {isAdmin && (
                                    <Button 
                                      variant="ghost" 
                                      onClick={() => setVictimToDelete(victim.id)}
                                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Delete Confirmation Modal */}
              <AnimatePresence>
                {victimToDelete && isAdmin && (
                  <div className="fixed inset-0 bg-purple-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full border-t-8 border-red-500"
                    >
                      <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                      </div>
                      <h3 className="text-xl font-bold text-center text-purple-900 mb-2">Excluir Cadastro?</h3>
                      <p className="text-purple-600 text-center text-sm mb-8">
                        Esta ação é irreversível e excluirá todos os dados e histórico de visitas desta vítima.
                      </p>
                      <div className="flex gap-3">
                        <Button 
                          variant="danger" 
                          className="flex-1"
                          onClick={() => handleDeleteVictim(victimToDelete)}
                        >
                          Sim, Excluir
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setVictimToDelete(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {view === 'new' && (
            <motion.div 
              key="new"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white p-8 rounded-2xl border-2 border-purple-100 shadow-xl">
                <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => { setEditingVictim(null); setView('dashboard'); }} className="p-2 hover:bg-purple-50 rounded-full text-purple-600">
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <h2 className="text-2xl font-bold text-purple-900">
                    {editingVictim ? '✏️ Editar Cadastro' : '➕ Novo Cadastro'}
                  </h2>
                </div>

                <form className="space-y-6" onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const fileInput = e.currentTarget.querySelector('input[name="attachment"]') as HTMLInputElement;
                  const file = fileInput?.files?.[0];
                  
                  handleSaveVictim({
                    internalCode: formData.get('internalCode') as string,
                    processNumber: formData.get('processNumber') as string,
                    name: formData.get('name') as string,
                    phone: formData.get('phone') as string,
                    aggressorName: formData.get('aggressorName') as string,
                    protectiveMeasureDate: formData.get('protectiveMeasureDate') as string,
                    observations: formData.get('observations') as string,
                    status: newVictimStatus,
                  }, file);
                }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Código Interno" name="internalCode" placeholder="2026-01" defaultValue={editingVictim?.internalCode} />
                    <Input label="Nº Processo" name="processNumber" required placeholder="0001456-22.2026" defaultValue={editingVictim?.processNumber} />
                    <Input label="Nome da Vítima" name="name" required placeholder="Ana Souza" defaultValue={editingVictim?.name} />
                    <Input label="Telefone" name="phone" placeholder="(66) 99988-2222" defaultValue={editingVictim?.phone} />
                    <Input label="Nome do Agressor" name="aggressorName" placeholder="Carlos Silva" defaultValue={editingVictim?.aggressorName} />
                    <Input label="Data Medida Protetiva" name="protectiveMeasureDate" type="date" defaultValue={editingVictim?.protectiveMeasureDate} />
                    <Select 
                      label="Status Inicial" 
                      name="status" 
                      value={newVictimStatus}
                      onChange={(e) => setNewVictimStatus(e.target.value as VictimStatus)}
                      options={[
                        { value: 'active', label: 'Ativo' },
                        { value: 'inactive', label: 'Inativo' },
                        { value: 'refused', label: 'Recusou' }
                      ]} 
                    />
                  </div>

                  <div className="bg-purple-50 p-6 rounded-2xl border-2 border-purple-100 space-y-4">
                    <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Anexar Documento (Opcional)
                    </h3>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-purple-700">Foto, PDF ou Word</label>
                      <input 
                        type="file" 
                        name="attachment"
                        accept=".pdf,.doc,.docx,image/*"
                        className="text-sm text-purple-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
                      />
                      {editingVictim?.attachmentName && (
                        <p className="text-xs text-purple-500 mt-1">Arquivo atual: {editingVictim.attachmentName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-purple-900">Observações</label>
                    <textarea 
                      name="observations"
                      defaultValue={editingVictim?.observations}
                      className="px-3 py-2 border-2 border-purple-100 rounded-lg focus:border-purple-400 focus:outline-none transition-colors bg-white text-purple-900 min-h-[100px]"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button type="submit" className="flex-1 py-4" disabled={uploading}>
                      {uploading ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Salvando...
                        </span>
                      ) : (
                        <><Save className="w-5 h-5" /> Salvar Cadastro</>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setView('dashboard')} className="flex-1 py-4">
                      Cancelar
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {view === 'case' && selectedVictim && (
            <motion.div 
              key="case"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-2xl overflow-hidden">
                {/* Case Header */}
                <div className="bg-purple-600 p-8 text-white">
                  <div className="flex justify-between items-start mb-6">
                    <button onClick={() => setView('dashboard')} className="p-2 hover:bg-white/10 rounded-full">
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="text-right">
                      <p className="text-purple-200 text-sm font-mono uppercase tracking-widest">Código: {selectedVictim.internalCode || '---'}</p>
                      <p className="text-white font-bold">Processo: {selectedVictim.processNumber}</p>
                    </div>
                  </div>
                  <h2 className="text-4xl font-black mb-2">{selectedVictim.name}</h2>
                  <div className="flex flex-wrap gap-4 text-purple-100">
                    <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {selectedVictim.phone}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Medida: {selectedVictim.protectiveMeasureDate ? (
                      (() => {
                        const [y, m, d] = selectedVictim.protectiveMeasureDate.split('-').map(Number);
                        return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
                      })()
                    ) : '---'}</span>
                  </div>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Info Column */}
                  <div className="md:col-span-1 space-y-8">
                    <section>
                      <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <UserIcon className="w-4 h-4" /> Agressor
                      </h3>
                      <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                        <p className="font-bold text-red-900">{selectedVictim.aggressorName}</p>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Observações
                      </h3>
                      <p className="text-purple-700 text-sm leading-relaxed bg-purple-50 p-4 rounded-2xl italic">
                        "{selectedVictim.observations || 'Sem observações registradas.'}"
                      </p>
                    </section>

                    <section>
                      <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" /> Status Atual
                      </h3>
                      <div className={`p-4 rounded-2xl font-bold text-center uppercase tracking-widest border ${
                        selectedVictim.status === 'active' ? 'bg-green-50 text-green-700 border-green-100' :
                        selectedVictim.status === 'inactive' ? 'bg-gray-50 text-gray-700 border-gray-100' :
                        'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {selectedVictim.status}
                      </div>
                    </section>
                  </div>

                  {/* Visits Column */}
                  <div className="md:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">
                        <History className="w-6 h-6 text-purple-600" /> Histórico de Visitas
                      </h3>
                      <Button onClick={() => setShowVisitModal(true)} variant="secondary" className="text-sm">
                        <Plus className="w-4 h-4" /> Registrar Visita
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {victimVisits.length === 0 ? (
                        <div className="text-center py-12 bg-purple-50 rounded-3xl border-2 border-dashed border-purple-100">
                          <Calendar className="w-12 h-12 text-purple-200 mx-auto mb-2" />
                          <p className="text-purple-400">Nenhuma visita registrada ainda.</p>
                        </div>
                      ) : (
                        victimVisits.map(visit => (
                          <div key={visit.id} className="bg-white p-5 rounded-2xl border-2 border-purple-50 hover:border-purple-200 transition-all shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                                  {(() => {
                                    const [y, m, d] = visit.date.split('-').map(Number);
                                    return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
                                  })()}
                                </span>
                                <span className={`text-xs font-black uppercase tracking-widest ${visit.type === 'victim' ? 'text-purple-600' : 'text-red-600'}`}>
                                  {visit.type === 'victim' ? '👤 Vítima' : '⚠️ Agressor'}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-purple-500 bg-purple-50 px-2 py-0.5 rounded uppercase tracking-tighter">
                                {visit.situation === 'first_visit' ? '1ª Visita' :
                                 visit.situation === 'follow_up' ? 'Acompanhamento' :
                                 visit.situation === 'emergency' ? 'Urgência' :
                                 'Descumprimento'}
                              </span>
                            </div>
                            <p className="text-purple-800 text-sm">{visit.observation}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white p-8 rounded-3xl border-2 border-purple-100 shadow-xl">
                  <div className="flex justify-between items-center mb-10">
                    <h2 className="text-3xl font-black text-purple-900 flex items-center gap-3">
                      <BarChart3 className="w-8 h-8 text-purple-600" /> Relatório Geral
                    </h2>
                    <div className="flex gap-4 items-end">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-purple-400 uppercase">Tipo</label>
                        <select 
                          value={reportType} 
                          onChange={(e) => setReportType(e.target.value as 'monthly' | 'yearly')}
                          className="px-3 py-2 border-2 border-purple-100 rounded-lg focus:border-purple-400 focus:outline-none bg-white text-sm"
                        >
                          <option value="monthly">Mensal</option>
                          <option value="yearly">Anual</option>
                        </select>
                      </div>
                      
                      {reportType === 'monthly' && (
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-purple-400 uppercase">Mês</label>
                          <select 
                            value={reportMonth} 
                            onChange={(e) => setReportMonth(parseInt(e.target.value))}
                            className="px-3 py-2 border-2 border-purple-100 rounded-lg focus:border-purple-400 focus:outline-none bg-white text-sm"
                          >
                            {Array.from({ length: 12 }).map((_, i) => (
                              <option key={i} value={i}>{format(new Date(2024, i), 'MMMM', { locale: ptBR })}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-purple-400 uppercase">Ano</label>
                        <select 
                          value={reportYear} 
                          onChange={(e) => setReportYear(parseInt(e.target.value))}
                          className="px-3 py-2 border-2 border-purple-100 rounded-lg focus:border-purple-400 focus:outline-none bg-white text-sm"
                        >
                          {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <Button onClick={exportPDF}>
                        <Download className="w-5 h-5" /> Exportar PDF
                      </Button>
                    </div>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <div className="bg-purple-50 p-6 rounded-2xl border-2 border-purple-100 text-center">
                    <p className="text-purple-400 text-xs font-black uppercase tracking-widest mb-2">Vítimas Ativas</p>
                    <p className="text-5xl font-black text-purple-900">{filteredVictimsForReport.filter(v => v.status === 'active').length}</p>
                  </div>
                  <div className="bg-purple-50 p-6 rounded-2xl border-2 border-purple-100 text-center">
                    <p className="text-purple-400 text-xs font-black uppercase tracking-widest mb-2">Vítimas Inativas</p>
                    <p className="text-5xl font-black text-purple-900">{filteredVictimsForReport.filter(v => v.status === 'inactive').length}</p>
                  </div>
                  <div className="bg-purple-50 p-6 rounded-2xl border-2 border-purple-100 text-center">
                    <p className="text-purple-400 text-xs font-black uppercase tracking-widest mb-2">Recusaram</p>
                    <p className="text-5xl font-black text-purple-900">{filteredVictimsForReport.filter(v => v.status === 'refused').length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-purple-900 border-b-2 border-purple-100 pb-2">Estatísticas de Visitas</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-purple-600">Total de Visitas Realizadas</span>
                        <span className="font-bold text-xl">{filteredVisitsForReport.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-purple-600">Visitas a Agressores</span>
                        <span className="font-bold text-xl">{filteredVisitsForReport.filter(v => v.type === 'aggressor').length}</span>
                      </div>
                      <div className="flex justify-between items-center text-red-600">
                        <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Descumprimento de Medida</span>
                        <span className="font-bold text-xl">{filteredVisitsForReport.filter(v => v.situation === 'violation').length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-900 text-white p-8 rounded-3xl relative overflow-hidden">
                    <ShieldAlert className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
                    <h3 className="text-xl font-bold mb-4">Resumo do Período</h3>
                    <p className="text-purple-200 text-sm mb-6">Acompanhamento realizado pela Patrulha Maria da Penha em Querência/MT.</p>
                    <div className="text-4xl font-black">
                      {filteredVictimsForReport.length} <span className="text-lg font-normal text-purple-300">Casos no Período</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Visit Modal */}
      <AnimatePresence>
        {showVisitModal && (
          <div className="fixed inset-0 bg-purple-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-t-8 border-purple-600"
            >
              <h3 className="text-2xl font-bold text-purple-900 mb-6 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-purple-600" /> Nova Visita
              </h3>
              <form className="space-y-6" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleAddVisit({
                  date: formData.get('date') as string,
                  type: formData.get('type') as VisitType,
                  situation: formData.get('situation') as VisitSituation,
                  observation: formData.get('observation') as string,
                });
              }}>
                <Input label="Data da Visita" name="date" type="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')} />
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-purple-900">Tipo de Visita</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 p-3 border-2 border-purple-50 rounded-xl cursor-pointer hover:bg-purple-50 transition-colors has-[:checked]:bg-purple-100 has-[:checked]:border-purple-400">
                      <input type="radio" name="type" value="victim" defaultChecked className="hidden" />
                      <span className="text-sm font-bold">👤 Vítima</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 border-2 border-purple-50 rounded-xl cursor-pointer hover:bg-purple-50 transition-colors has-[:checked]:bg-red-100 has-[:checked]:border-red-400">
                      <input type="radio" name="type" value="aggressor" className="hidden" />
                      <span className="text-sm font-bold">⚠️ Agressor</span>
                    </label>
                  </div>
                </div>

                <Select 
                  label="Situação" 
                  name="situation" 
                  options={[
                    { value: 'first_visit', label: '1ª Visita' },
                    { value: 'follow_up', label: 'Acompanhamento' },
                    { value: 'emergency', label: 'Atendimento de Urgência' },
                    { value: 'violation', label: 'Descumprimento de Medida' }
                  ]} 
                />

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-purple-900">Observação</label>
                  <textarea 
                    name="observation"
                    className="px-3 py-2 border-2 border-purple-100 rounded-lg focus:border-purple-400 focus:outline-none transition-colors bg-white text-purple-900 min-h-[80px]"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="submit" className="flex-1 py-4">Salvar</Button>
                  <Button variant="outline" onClick={() => setShowVisitModal(false)} className="flex-1 py-4">Cancelar</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-20 py-10 border-t border-purple-100 text-center text-purple-300 text-sm">
        <p>© 2026 Rede Segura – Patrulha Maria da Penha – Querência/MT</p>
      </footer>
    </div>
  );
}

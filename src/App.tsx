import React, { useState, useEffect, useMemo } from 'react';
import { Victim, VictimStatus, Visit, VisitType, VisitSituation, User, UserType } from './types';
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
  ChevronRight,
  Calendar,
  Phone,
  User as UserIcon,
  ShieldAlert,
  AlertTriangle,
  Download,
  Trash2,
  LogOut,
  Lock,
  ShieldCheck,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import imageCompression from 'browser-image-compression';
import { 
  db, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  writeBatch,
  handleFirestoreError, 
  OperationType 
} from './firebase';

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

// --- Helper Functions ---
const formatDate = (date: string | Date | undefined | null, pattern: string = 'dd/MM/yyyy') => {
  if (!date) return '---';
  try {
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return format(new Date(date + 'T12:00:00'), pattern);
    }
    return format(new Date(date), pattern);
  } catch (e) {
    return '---';
  }
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const cleanData = (obj: any) => {
  const newObj = { ...obj };
  Object.keys(newObj).forEach(key => {
    if (newObj[key] === undefined) {
      delete newObj[key];
    }
  });
  return newObj;
};

const LoginScreen = ({ onLogin }: { onLogin: (type: UserType, name: string) => void }) => {
  const [mode, setMode] = useState<'initial' | 'login'>('initial');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'Porto' && password === '267130') {
      onLogin('admin', 'Porto');
    } else {
      setError('Usuário ou senha incorretos');
    }
  };

  if (mode === 'initial') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-200">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-purple-900 mb-2">Sistema Rede Segura</h1>
          <p className="text-purple-600 font-bold">Controle de Medidas Protetivas de Urgência - MPU</p>
          <p className="text-purple-400 text-sm mb-8 font-bold">Patrulha Maria da Penha - Querência/MT</p>
          
          <div className="space-y-4">
            <Button 
              onClick={() => setMode('login')} 
              className="w-full py-4 text-lg"
            >
              <Lock className="w-5 h-5" />
              Login Administrativo
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onLogin('visitor', 'Visitante')} 
              className="w-full py-4 text-lg"
            >
              <UserIcon className="w-5 h-5" />
              Entrar como Visitante
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full"
      >
        <button 
          onClick={() => setMode('initial')}
          className="text-purple-600 hover:text-purple-800 flex items-center gap-1 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        
        <h2 className="text-2xl font-black text-purple-900 mb-6">Acesso Restrito</h2>
        
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <Input 
            label="Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Digite seu usuário"
            required
          />
          <Input 
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite sua senha"
            required
          />
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
              {error}
            </div>
          )}
          
          <Button type="submit" className="w-full py-3 mt-4">
            <Key className="w-5 h-5" />
            Entrar
          </Button>
        </form>
      </motion.div>
    </div>
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
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('porto_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (type: UserType, name: string) => {
    const newUser = { name, type };
    setUser(newUser);
    localStorage.setItem('porto_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('porto_user');
    setView('dashboard');
  };

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState<'dashboard' | 'new' | 'case' | 'reports'>('dashboard');
  const [activeTab, setActiveTab] = useState<VictimStatus>('active');
  const [victims, setVictims] = useState<Victim[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVictimId, setSelectedVictimId] = useState<string | null>(null);
  const [editingVictim, setEditingVictim] = useState<Victim | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [newVictimStatus, setNewVictimStatus] = useState<VictimStatus>('active');
  const [victimToDelete, setVictimToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Report filters
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  // Initial load with onSnapshot for real-time updates
  useEffect(() => {
    setLoading(true);
    
    const unsubscribeVictims = onSnapshot(collection(db, 'victims'), (snapshot) => {
      const victimsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Victim));
      setVictims(victimsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'victims');
      showToast('Erro ao carregar vítimas. Verifique sua conexão.', 'error');
      setLoading(false);
    });

    const unsubscribeVisits = onSnapshot(collection(db, 'visits'), (snapshot) => {
      const visitsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Visit));
      setVisits(visitsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'visits');
      showToast('Erro ao carregar visitas.', 'error');
    });

    return () => {
      unsubscribeVictims();
      unsubscribeVisits();
    };
  }, []);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  // Derived Data
  const filteredVictims = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const filtered = victims.filter(v => {
      const matchesSearch = (v.name?.toLowerCase() || '').includes(term) || 
                           (v.internalCode?.toLowerCase() || '').includes(term) ||
                           (v.processNumber?.toLowerCase() || '').includes(term);
      
      // Se houver termo de busca, mostra resultados de todas as abas
      if (term !== '') return matchesSearch;
      
      // Caso contrário, filtra pela aba ativa
      return v.status === activeTab;
    });

    // Ordenação dinâmica para a aba "Vítimas Ativas"
    if (activeTab === 'active' && term === '') {
      return [...filtered].sort((a, b) => {
        const codeA = a.internalCode || '';
        const codeB = b.internalCode || '';
        
        // Registros sem código ficam por último
        if (!codeA && codeB) return 1;
        if (codeA && !codeB) return -1;
        if (!codeA && !codeB) return 0;
        
        // Ordenação numérica (ex: 2026-1 antes de 2026-10)
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    // Ordenação dinâmica para a aba "Recusaram"
    if (activeTab === 'refused' && term === '') {
      return [...filtered].sort((a, b) => {
        const dateA = a.refusalDate ? new Date(a.refusalDate + 'T12:00:00').getTime() : 0;
        const dateB = b.refusalDate ? new Date(b.refusalDate + 'T12:00:00').getTime() : 0;
        
        // Registros sem data ficam por último
        if (dateA === 0 && dateB !== 0) return 1;
        if (dateA !== 0 && dateB === 0) return -1;
        
        return dateB - dateA; // Decrescente
      });
    }

    return filtered;
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
      const d = new Date(v.date + 'T12:00:00');
      if (reportType === 'monthly') {
        return d.getMonth() === reportMonth && d.getFullYear() === reportYear;
      }
      return d.getFullYear() === reportYear;
    });
  }, [visits, reportType, reportMonth, reportYear]);

  const filteredVictimsForReport = useMemo(() => {
    return victims.filter(v => {
      if (!v.protectiveMeasureDate) return false;
      const d = new Date(v.protectiveMeasureDate + 'T12:00:00');
      if (reportType === 'monthly') {
        return d.getMonth() === reportMonth && d.getFullYear() === reportYear;
      }
      return d.getFullYear() === reportYear;
    });
  }, [victims, reportType, reportMonth, reportYear]);

  // Helper to calculate days since last visit
  const getDaysSinceLastVisit = (victim: Victim, allVisits: Visit[]) => {
    const victimVisits = allVisits.filter(v => v.victimId === victim.id);
    let lastDate: Date;
    
    if (victimVisits.length > 0) {
      const dates = victimVisits.map(v => new Date((v.date || '') + 'T12:00:00').getTime());
      lastDate = new Date(Math.max(...dates));
    } else if (victim.protectiveMeasureDate) {
      lastDate = new Date(victim.protectiveMeasureDate + 'T12:00:00');
    } else if (victim.createdAt) {
      lastDate = new Date(victim.createdAt);
    } else {
      return 0;
    }
    
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const diffTime = today.getTime() - lastDate.getTime();
    if (isNaN(diffTime)) return 0;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const delayedVictimsCount = useMemo(() => {
    return victims.filter(v => v.status === 'active' && getDaysSinceLastVisit(v, visits) > 10).length;
  }, [victims, visits]);

  // Actions
  const handleSaveVictim = async (data: Partial<Victim>, file?: File) => {
    if (user?.type !== 'admin') {
      showToast('Ação restrita para administradores.', 'error');
      return;
    }
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      let attachmentUrl = editingVictim?.attachmentUrl || '';
      let attachmentName = editingVictim?.attachmentName || '';

      if (file) {
        let fileToUpload = file;
        
        // If it's an image, try to compress it
        if (file.type.startsWith('image/')) {
          const options = {
            maxSizeMB: 0.7, // Target size under 700KB
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          };
          try {
            fileToUpload = await imageCompression(file, options);
          } catch (error) {
            console.error('Compression error:', error);
          }
        }

        // Final size check (Base64 adds ~33% overhead, Firestore limit is 1MB)
        // 700KB * 1.33 = 931KB, which fits in 1MB
        if (fileToUpload.size > 700 * 1024) {
          showToast('O arquivo é muito grande. O limite é de 700KB (incluindo PDFs e documentos).', 'error');
          setIsSaving(false);
          return;
        }

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(fileToUpload);
        attachmentUrl = await base64Promise;
        attachmentName = file.name;
      }

      const now = new Date().toISOString();
      
      const finalData = {
        ...data,
        internalCode: data.status === 'refused' ? '' : (data.internalCode || ''),
        refusalDate: data.status === 'refused' ? (data.refusalDate || now.split('T')[0]) : null,
      };

      if (editingVictim) {
        const victimRef = doc(db, 'victims', editingVictim.id);
        const updateData = cleanData({ 
          ...finalData, 
          attachmentUrl, 
          attachmentName,
          updatedAt: now 
        });
        await updateDoc(victimRef, updateData);
      } else {
        const id = generateId();
        const newVictim: Victim = {
          id,
          internalCode: finalData.internalCode,
          refusalDate: finalData.refusalDate,
          processNumber: data.processNumber || '',
          name: data.name || '',
          phone: data.phone || '',
          aggressorName: data.aggressorName || '',
          protectiveMeasureDate: data.protectiveMeasureDate || '',
          observations: data.observations || '',
          status: data.status || 'active',
          attachmentUrl,
          attachmentName,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(doc(db, 'victims', id), cleanData(newVictim));
      }

      setEditingVictim(null);
      setView('dashboard');
      showToast(editingVictim ? 'Cadastro atualizado com sucesso!' : 'Novo cadastro salvo com sucesso!');
    } catch (error) {
      showToast('Erro ao salvar cadastro. Verifique o tamanho do anexo.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'victims');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: VictimStatus) => {
    if (user?.type !== 'admin') {
      showToast('Ação restrita para administradores.', 'error');
      return;
    }
    try {
      const victim = victims.find(v => v.id === id);
      if (!victim) {
        showToast('Vítima não encontrada.', 'error');
        return;
      }
      
      if (status === 'active' && (!victim.internalCode)) {
        setEditingVictim(victim);
        setNewVictimStatus('active');
        setView('new');
        return;
      }
      
      const victimRef = doc(db, 'victims', id);
      const now = new Date().toISOString();
      const updateData = cleanData({ 
        status, 
        internalCode: status === 'refused' ? '' : (victim.internalCode || ''),
        refusalDate: status === 'refused' ? (victim.refusalDate || now.split('T')[0]) : null,
        updatedAt: now 
      });
      await updateDoc(victimRef, updateData);
      
      showToast('Status atualizado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `victims/${id}`);
      showToast('Erro ao atualizar status.', 'error');
    }
  };

  const handleAddVisit = async (data: Partial<Visit>) => {
    if (user?.type !== 'admin') {
      showToast('Ação restrita para administradores.', 'error');
      return;
    }
    try {
      const victimId = selectedVictimId || editingVictim?.id;
      if (!victimId) return;

      const now = new Date().toISOString();

      if (editingVisit) {
        const visitRef = doc(db, 'visits', editingVisit.id);
        const updateData = cleanData({ 
          ...data, 
          updatedAt: now 
        });
        await updateDoc(visitRef, updateData);
      } else {
        const id = generateId();
        const newVisit: Visit = {
          id,
          victimId,
          date: data.date || '',
          type: data.type || 'victim',
          situation: data.situation || 'follow_up',
          observation: data.observation || '',
          createdAt: now,
        };
        await setDoc(doc(db, 'visits', id), cleanData(newVisit));
      }

      setShowVisitModal(false);
      setEditingVisit(null);
      showToast(editingVisit ? 'Visita atualizada com sucesso!' : 'Nova visita salva com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'visits');
      showToast('Erro ao salvar visita.', 'error');
    }
  };

  const handleDeleteVisit = async (visitId: string) => {
    if (user?.type !== 'admin') {
      showToast('Ação restrita para administradores.', 'error');
      return;
    }
    try {
      if (!window.confirm("Tem certeza que deseja excluir esta visita?")) return;
      await deleteDoc(doc(db, 'visits', visitId));
      
      showToast('Visita excluída com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `visits/${visitId}`);
      showToast('Erro ao excluir visita.', 'error');
    }
  };

  const handleDeleteVictim = async (id: string) => {
    if (user?.type !== 'admin') {
      showToast('Ação restrita para administradores.', 'error');
      return;
    }
    try {
      if (window.confirm('Tem certeza que deseja excluir este registro?')) {
        const batch = writeBatch(db);
        
        // Delete the victim document
        batch.delete(doc(db, 'victims', id));
        
        // Delete associated visits
        const victimVisits = visits.filter(v => v.victimId === id);
        for (const visit of victimVisits) {
          batch.delete(doc(db, 'visits', visit.id));
        }
        
        await batch.commit();
        
        setVictimToDelete(null);
        if (selectedVictimId === id) setView('dashboard');
        showToast('Registro e visitas associadas excluídos com sucesso!');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `victims/${id}`);
      showToast('Erro ao excluir registro.', 'error');
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

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-purple-50 text-purple-900 font-sans selection:bg-purple-200">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header */}
      <header className="bg-white border-b border-purple-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-xl shadow-lg shadow-purple-200">
              <ShieldAlert className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-purple-900 uppercase">SISTEMA <span className="text-purple-500">REDE SEGURA</span></h1>
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-tighter">Patrulha Maria da Penha - Querência/MT - PMP</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pr-4 border-r border-purple-100">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-purple-900 uppercase">{user.name}</p>
                <p className={`text-[10px] font-bold uppercase ${user.type === 'admin' ? 'text-emerald-600' : 'text-emerald-500'}`}>
                  {user.type === 'admin' ? 'Modo Admin' : 'Modo Visitante'}
                </p>
              </div>
              <div className={`p-2 rounded-xl ${user.type === 'admin' ? 'bg-purple-100' : 'bg-amber-100'}`}>
                <UserIcon className={`w-5 h-5 ${user.type === 'admin' ? 'text-purple-600' : 'text-amber-600'}`} />
              </div>
            </div>
            
            <Button variant="ghost" onClick={handleLogout} className="text-red-500 hover:bg-red-50 p-2 h-auto">
              <LogOut className="w-5 h-5" />
              <span className="hidden md:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Navigation Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          {user.type === 'admin' && (
            <Button 
              onClick={() => { setEditingVictim(null); setNewVictimStatus('active'); setView('new'); }} 
              variant={view === 'new' ? 'primary' : 'outline'}
              className="flex-1 md:flex-none"
            >
              <Plus className="w-5 h-5" /> Novo Cadastro
            </Button>
          )}
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
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${searchTerm.trim() !== '' ? 'text-purple-600' : 'text-purple-400'}`} />
                <input 
                  type="text"
                  placeholder="Buscar por nome, código ou processo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 bg-purple-50 border-2 rounded-2xl focus:outline-none transition-all text-lg ${searchTerm.trim() !== '' ? 'border-purple-600 ring-4 ring-purple-100' : 'border-purple-100 focus:border-purple-400'}`}
                />
                {searchTerm.trim() !== '' && (
                  <div className="absolute -bottom-6 left-4 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-wider text-purple-600">
                      Mostrando resultados de todas as categorias
                    </p>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <button 
                  onClick={() => setActiveTab('active')}
                  className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all relative ${activeTab === 'active' ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                >
                  <Users className="w-6 h-6" />
                  <span className="font-bold text-sm md:text-base">📋 Vítimas Ativas</span>
                  <span className="text-xs opacity-80">{victims.filter(v => v.status === 'active').length} casos</span>
                  {delayedVictimsCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
                      {delayedVictimsCount} em atraso
                    </span>
                  )}
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
                        <th className="px-6 py-4">{activeTab === 'refused' ? 'Recusa' : 'Código'}</th>
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
                          const daysSinceLast = getDaysSinceLastVisit(victim, visits);
                          const isDelayed = victim.status === 'active' && daysSinceLast > 10;

                          return (
                            <tr key={victim.id} className={`hover:bg-purple-50/50 transition-colors group ${isDelayed ? 'bg-red-50' : ''}`}>
                              <td className="px-6 py-4 font-mono text-sm font-bold text-purple-600">
                                {activeTab === 'refused' ? formatDate(victim.refusalDate) : (victim.internalCode || '---')}
                              </td>
                              <td className="px-6 py-4 text-sm">{victim.processNumber}</td>
                              <td className="px-6 py-4 font-semibold flex items-center gap-2">
                                {victim.name}
                                {isDelayed && (
                                  <span title={`Atraso de ${daysSinceLast} dias`} className="text-red-500">
                                    <AlertTriangle className="w-4 h-4" />
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm">{victim.phone}</td>
                              <td className="px-6 py-4">
                                <div className="flex gap-1">
                                  {vVisits.slice(0, 3).map((v) => (
                                    <span key={v.id} className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                      {formatDate(v.date, 'dd/MM')}
                                    </span>
                                  ))}
                                  {vVisits.length > 3 && <span className="text-[10px] text-purple-400">+{vVisits.length - 3}</span>}
                                  {vVisits.length === 0 && <span className="text-xs text-purple-300">0</span>}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <select 
                                  value={victim.status}
                                  onChange={(e) => handleUpdateStatus(victim.id, e.target.value as VictimStatus)}
                                  disabled={user.type !== 'admin'}
                                  className={`text-xs font-bold px-2 py-1 rounded-full border-none focus:ring-2 focus:ring-purple-400 ${
                                    victim.status === 'active' ? 'bg-green-100 text-green-700' :
                                    victim.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                                    'bg-red-100 text-red-700'
                                  } ${user.type !== 'admin' ? 'cursor-not-allowed opacity-80' : ''}`}
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
                                    download={victim.attachmentName || 'arquivo'}
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-800"
                                  >
                                    <FileText className="w-4 h-4" /> Baixar Arquivo
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
                                  {user.type === 'admin' && (
                                    <>
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
                                      <Button 
                                        variant="ghost" 
                                        onClick={() => setVictimToDelete(victim.id)}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-5 h-5" />
                                      </Button>
                                    </>
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
                {victimToDelete && (
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
                    refusalDate: formData.get('refusalDate') as string,
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
                    {newVictimStatus !== 'refused' ? (
                      <Input 
                        label="Código Interno" 
                        name="internalCode" 
                        placeholder="2026-01" 
                        required={newVictimStatus === 'active'} 
                        defaultValue={editingVictim?.internalCode} 
                      />
                    ) : (
                      <Input 
                        label="Data de Recusa" 
                        name="refusalDate" 
                        type="date"
                        required
                        defaultValue={editingVictim?.refusalDate || new Date().toISOString().split('T')[0]} 
                      />
                    )}
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

                  <Button type="submit" className="w-full py-4 text-lg" disabled={isSaving}>
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <Save className="w-6 h-6" /> Salvar Cadastro
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>
          )}

          {view === 'case' && selectedVictim && (
            <motion.div 
              key="case"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4">
                <button onClick={() => setView('dashboard')} className="p-2 hover:bg-purple-50 rounded-full text-purple-600">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-purple-900">Detalhes do Caso</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Victim Info Card */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-2xl border-2 border-purple-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="bg-purple-100 p-3 rounded-full">
                        <UserIcon className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{selectedVictim.name}</h3>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          selectedVictim.status === 'active' ? 'bg-green-100 text-green-700' :
                          selectedVictim.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {selectedVictim.status === 'active' ? 'Ativo' : selectedVictim.status === 'inactive' ? 'Inativo' : 'Recusou'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 text-sm">
                      <div className="flex items-center gap-3 text-purple-600">
                        <FileText className="w-4 h-4" />
                        <span>Processo: <strong>{selectedVictim.processNumber}</strong></span>
                      </div>
                      <div className="flex items-center gap-3 text-purple-600">
                        <Phone className="w-4 h-4" />
                        <span>{selectedVictim.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 text-purple-600">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Agressor: <strong>{selectedVictim.aggressorName}</strong></span>
                      </div>
                      <div className="flex items-center gap-3 text-purple-600">
                        <Calendar className="w-4 h-4" />
                        <span>Medida desde: <strong>{formatDate(selectedVictim.protectiveMeasureDate)}</strong></span>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-purple-50">
                      <h4 className="text-xs font-bold text-purple-400 uppercase mb-2">Observações</h4>
                      <p className="text-sm text-purple-800 bg-purple-50 p-3 rounded-lg italic">
                        {selectedVictim.observations || 'Sem observações registradas.'}
                      </p>
                    </div>

                    {selectedVictim.attachmentUrl && (
                      <div className="mt-4">
                        <a 
                          href={selectedVictim.attachmentUrl} 
                          download={selectedVictim.attachmentName || 'arquivo'}
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3 bg-purple-50 text-purple-600 rounded-xl font-bold text-sm hover:bg-purple-100 transition-colors"
                        >
                          <FileText className="w-5 h-5" /> Baixar Documento Anexo
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Visits History */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-6 rounded-2xl border-2 border-purple-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <History className="w-6 h-6 text-purple-600" /> Histórico de Visitas
                      </h3>
                      {user.type === 'admin' && (
                        <Button onClick={() => { setEditingVisit(null); setShowVisitModal(true); }}>
                          <Plus className="w-5 h-5" /> Registrar Visita
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {victimVisits.length === 0 ? (
                        <div className="text-center py-12 bg-purple-50 rounded-2xl border-2 border-dashed border-purple-100">
                          <Calendar className="w-12 h-12 text-purple-200 mx-auto mb-4" />
                          <p className="text-purple-400 font-medium">Nenhuma visita registrada para este caso.</p>
                        </div>
                      ) : (
                        victimVisits
                          .sort((a, b) => new Date(b.date + 'T12:00:00').getTime() - new Date(a.date + 'T12:00:00').getTime())
                          .map(visit => (
                            <div key={visit.id} className="p-4 bg-purple-50 rounded-2xl border border-purple-100 relative group">
                              <div className="flex flex-wrap items-center gap-3 mb-2">
                                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                                  {formatDate(visit.date)}
                                </span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  visit.type === 'victim' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {visit.type === 'victim' ? 'Visita à Vítima' : 'Visita ao Agressor'}
                                </span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  visit.situation === 'violation' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {visit.situation === 'first_visit' ? 'Primeira Visita' :
                                   visit.situation === 'follow_up' ? 'Acompanhamento' :
                                   visit.situation === 'emergency' ? 'Emergência' : 'Descumprimento'}
                                </span>
                              </div>
                              <p className="text-purple-900 text-sm leading-relaxed">{visit.observation}</p>
                              
                              {user.type === 'admin' && (
                                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => { setEditingVisit(visit); setShowVisitModal(true); }}
                                    className="p-1.5 h-auto bg-white shadow-sm"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => handleDeleteVisit(visit.id)}
                                    className="p-1.5 h-auto bg-white shadow-sm text-red-400 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
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
              <div className="bg-white p-8 rounded-2xl border-2 border-purple-100 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setView('dashboard')} className="p-2 hover:bg-purple-50 rounded-full text-purple-600">
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-2xl font-bold text-purple-900">Relatórios e Estatísticas</h2>
                  </div>
                  <Button onClick={exportPDF} variant="primary">
                    <Download className="w-5 h-5" /> Exportar PDF
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                    <p className="text-xs font-bold text-purple-400 uppercase mb-1">Total de Vítimas</p>
                    <p className="text-3xl font-black text-purple-900">{victims.length}</p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                    <p className="text-xs font-bold text-green-400 uppercase mb-1">Casos Ativos</p>
                    <p className="text-3xl font-black text-green-700">{victims.filter(v => v.status === 'active').length}</p>
                  </div>
                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-400 uppercase mb-1">Total de Visitas</p>
                    <p className="text-3xl font-black text-blue-700">{visits.length}</p>
                  </div>
                </div>

                <div className="bg-purple-50 p-6 rounded-2xl border-2 border-purple-100 mb-8">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" /> Filtrar Período do Relatório
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    <Select 
                      label="Tipo" 
                      value={reportType} 
                      onChange={(e) => setReportType(e.target.value as 'monthly' | 'yearly')}
                      options={[
                        { value: 'monthly', label: 'Mensal' },
                        { value: 'yearly', label: 'Anual' }
                      ]}
                      className="flex-1 min-w-[150px]"
                    />
                    {reportType === 'monthly' && (
                      <Select 
                        label="Mês" 
                        value={reportMonth.toString()} 
                        onChange={(e) => setReportMonth(parseInt(e.target.value))}
                        options={[
                          { value: '0', label: 'Janeiro' },
                          { value: '1', label: 'Fevereiro' },
                          { value: '2', label: 'Março' },
                          { value: '3', label: 'Abril' },
                          { value: '4', label: 'Maio' },
                          { value: '5', label: 'Junho' },
                          { value: '6', label: 'Julho' },
                          { value: '7', label: 'Agosto' },
                          { value: '8', label: 'Setembro' },
                          { value: '9', label: 'Outubro' },
                          { value: '10', label: 'Novembro' },
                          { value: '11', label: 'Dezembro' }
                        ]}
                        className="flex-1 min-w-[150px]"
                      />
                    )}
                    <Select 
                      label="Ano" 
                      value={reportYear.toString()} 
                      onChange={(e) => setReportYear(parseInt(e.target.value))}
                      options={[
                        { value: '2024', label: '2024' },
                        { value: '2025', label: '2025' },
                        { value: '2026', label: '2026' }
                      ]}
                      className="flex-1 min-w-[150px]"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-purple-900">Resumo do Período</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between p-4 bg-white border border-purple-100 rounded-xl">
                      <span className="text-purple-600">Vítimas no Período</span>
                      <span className="font-bold">{filteredVictimsForReport.length}</span>
                    </div>
                    <div className="flex justify-between p-4 bg-white border border-purple-100 rounded-xl">
                      <span className="text-purple-600">Visitas no Período</span>
                      <span className="font-bold">{filteredVisitsForReport.length}</span>
                    </div>
                    <div className="flex justify-between p-4 bg-white border border-purple-100 rounded-xl">
                      <span className="text-purple-600">Visitas a Agressores</span>
                      <span className="font-bold">{filteredVisitsForReport.filter(v => v.type === 'aggressor').length}</span>
                    </div>
                    <div className="flex justify-between p-4 bg-white border border-purple-100 rounded-xl">
                      <span className="text-purple-600">Descumprimentos</span>
                      <span className="font-bold text-red-600">{filteredVisitsForReport.filter(v => v.situation === 'violation').length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visit Modal */}
        <AnimatePresence>
          {showVisitModal && (
            <div className="fixed inset-0 bg-purple-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white p-8 rounded-3xl shadow-2xl max-w-lg w-full"
              >
                <h3 className="text-2xl font-bold text-purple-900 mb-6">
                  {editingVisit ? '✏️ Editar Visita' : '📅 Registrar Visita'}
                </h3>
                <form className="space-y-4" onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleAddVisit({
                    date: formData.get('date') as string,
                    type: formData.get('type') as VisitType,
                    situation: formData.get('situation') as VisitSituation,
                    observation: formData.get('observation') as string,
                  });
                }}>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Data da Visita" name="date" type="date" required defaultValue={editingVisit?.date || format(new Date(), 'yyyy-MM-dd')} />
                    <Select 
                      label="Tipo de Visita" 
                      name="type" 
                      defaultValue={editingVisit?.type || 'victim'}
                      options={[
                        { value: 'victim', label: 'Vítima' },
                        { value: 'aggressor', label: 'Agressor' }
                      ]} 
                    />
                  </div>
                  <Select 
                    label="Situação" 
                    name="situation" 
                    defaultValue={editingVisit?.situation || 'follow_up'}
                    options={[
                      { value: 'first_visit', label: 'Primeira Visita' },
                      { value: 'follow_up', label: 'Acompanhamento' },
                      { value: 'emergency', label: 'Emergência' },
                      { value: 'violation', label: 'Descumprimento de Medida' }
                    ]} 
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-purple-900">Relatório da Visita</label>
                    <textarea 
                      name="observation"
                      required
                      defaultValue={editingVisit?.observation}
                      placeholder="Descreva como foi a visita..."
                      className="px-3 py-2 border-2 border-purple-100 rounded-lg focus:border-purple-400 focus:outline-none transition-colors bg-white text-purple-900 min-h-[120px]"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1">Salvar Visita</Button>
                    <Button variant="outline" onClick={() => { setShowVisitModal(false); setEditingVisit(null); }} className="flex-1">Cancelar</Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-12 py-8 bg-purple-50 border-t border-purple-100 text-center">
        <p className="text-sm text-purple-400 font-medium">
          © 2026 Central de Acompanhamento – Patrulha Maria da Penha - Querência/MT
        </p>
        <p className="text-[10px] text-purple-300 mt-1 uppercase tracking-widest">
          SISTEMA DE GESTÃO DE MEDIDAS PROTETIVAS DE URGÊNCIA - MPU
        </p>
      </footer>
    </div>
  );
}

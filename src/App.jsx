import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { 
  Activity, 
  User, 
  FileText, 
  LogOut, 
  Plus, 
  Search, 
  Download, 
  Trash2, 
  Archive, 
  ExternalLink,
  Save,
  Syringe,
  Microscope,
  Image as ImageIcon,
  Edit2,
  Unlock,
  FlaskConical,
  Scissors,
  Clock,
  Loader2,
  AlertTriangle,
  X
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBRLd0733PS3-K9XEeupa7hRGyxnDzbvlU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rounds-75bc9.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rounds-75bc9",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rounds-75bc9.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1004112669730",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1004112669730:web:2cab219b5be824aaedee7b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-98S23R4WVL"
};

// Inicialización segura
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'urorounds-prod'; 

// --- Constants & Helpers ---
const ADMIN_PASSWORD = "urotec123";

const CATEGORIES = [
  "Litiasis", 
  "Infecciones", 
  "Oncología", 
  "CPO (Crecimiento Prostático)", 
  "Trauma", 
  "Reconstructiva", 
  "Andrología",
  "Otro"
];

const NOTE_TYPES = [
  { id: 'evolution', label: 'Evolución', icon: FileText, color: 'text-slate-600' },
  { id: 'lab', label: 'Laboratorios', icon: Microscope, color: 'text-blue-600' },
  { id: 'culture', label: 'Cultivos', icon: FlaskConical, color: 'text-pink-600' },
  { id: 'antibiotic', label: 'Antibiótico', icon: Syringe, color: 'text-purple-600' },
  { id: 'procedure', label: 'Procedimiento', icon: Scissors, color: 'text-orange-600' },
  { id: 'image', label: 'Imagen/Link', icon: ImageIcon, color: 'text-green-600' },
];

const calculateAge = (dob) => {
  if (!dob) return '';
  const diff = Date.now() - new Date(dob).getTime();
  const ageDate = new Date(diff); 
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const calculateStayDays = (admitDate) => {
  if (!admitDate) return 0;
  const oneDay = 24 * 60 * 60 * 1000;
  const start = new Date(admitDate);
  const now = new Date();
  start.setHours(0,0,0,0);
  now.setHours(0,0,0,0);
  return Math.round(Math.abs((now - start) / oneDay));
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

const formatDateTime = (isoString) => {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'
  });
};

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled, type = "button", isLoading = false, ...props }) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-300",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 focus:ring-red-500",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
    outline: "bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || isLoading} className={`${base} ${variants[variant]} ${className}`} {...props}>
      {isLoading && <Loader2 className="animate-spin w-4 h-4" />}
      {children}
    </button>
  );
};

const Input = ({ label, readOnly, ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>}
    <input 
      className={`border rounded-md px-3 py-2 text-sm outline-none w-full transition-colors ${readOnly ? 'bg-slate-50 border-transparent text-slate-700 font-medium' : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
      readOnly={readOnly}
      {...props}
    />
  </div>
);

const Select = ({ label, options, readOnly, ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>}
    <select 
      className={`border rounded-md px-3 py-2 text-sm outline-none w-full ${readOnly ? 'bg-slate-50 border-transparent text-slate-700 pointer-events-none appearance-none font-medium' : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
      disabled={readOnly}
      {...props}
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

// --- Main Application ---

export default function UroRounds() {
  const [firebaseUser, setFirebaseUser] = useState(null); 
  const [appUser, setAppUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [patients, setPatients] = useState([]);
  const [view, setView] = useState('loading'); 
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI State
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [dischargeTarget, setDischargeTarget] = useState(null); 
  const [connectionError, setConnectionError] = useState(''); // New state for connection errors

  // Login States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Forms
  const initialPatientState = {
    name: '',
    bed: '',
    type: 'HO',
    fileNumber: '',
    dob: '',
    admissionDate: new Date().toISOString().split('T')[0],
    diagnosis: '',
    surgery: '',
    category: 'Litiasis',
    history: '',
    allergies: '',
    status: 'active',
    notes: [],
  };
  const [formData, setFormData] = useState(initialPatientState);
  const [newNote, setNewNote] = useState({ text: '', type: 'evolution', link: '', abxStart: '' });

  // --- Auth & Data Effects ---

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Auth init error", e);
        setConnectionError("Error de conexión con Firebase: " + e.message + ". Verifica que 'Anonymous Auth' esté habilitado en la consola de Firebase.");
        setAuthLoading(false);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUser(user);
        setConnectionError('');
      } else {
        setFirebaseUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (firebaseUser) {
       setAuthLoading(false);
       if (appUser) {
         setView('list');
       } else {
         setView('login');
       }
    }
  }, [firebaseUser, appUser]);

  useEffect(() => {
    if (!firebaseUser || !appUser || !db) return;

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'patients'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatients(data);
      
      if (selectedPatient) {
        const updated = data.find(p => p.id === selectedPatient.id);
        if (updated) {
           setSelectedPatient(updated);
           setFormData(prev => ({
             ...prev, 
             notes: updated.notes || [],
             status: updated.status,
             ...(!isEditingDetails ? {
               name: updated.name,
               bed: updated.bed,
               type: updated.type,
               fileNumber: updated.fileNumber,
               dob: updated.dob,
               admissionDate: updated.admissionDate,
               diagnosis: updated.diagnosis,
               surgery: updated.surgery,
               category: updated.category,
               history: updated.history,
               allergies: updated.allergies
             } : {})
           })); 
        } else if (isModalOpen && !dischargeTarget) { 
          setIsModalOpen(false);
          setSelectedPatient(null);
        }
      }
    }, (error) => console.error("Data fetch error:", error));

    return () => unsubscribe();
  }, [firebaseUser, appUser, selectedPatient?.id, isEditingDetails, dischargeTarget]);

  // --- Handlers ---

  const handleAppLogin = async (e) => {
    e.preventDefault();
    if (!firebaseUser) return setLoginError("Error de conexión. Recarga la página.");
    
    setLoginError('');
    setOperationLoading(true);

    try {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);

      if (isRegistering) {
        if (adminPass !== ADMIN_PASSWORD) {
          throw new Error('Contraseña maestra incorrecta');
        }
        if (!querySnapshot.empty) {
          throw new Error('El usuario ya existe');
        }
        await addDoc(usersRef, {
          username: username,
          password: password,
          createdAt: serverTimestamp()
        });
        setAppUser({ username });
      } else {
        if (querySnapshot.empty) {
          throw new Error('Usuario no encontrado');
        }
        const userDoc = querySnapshot.docs.find(doc => doc.data().password === password);
        if (!userDoc) {
          throw new Error('Contraseña incorrecta');
        }
        setAppUser({ username: userDoc.data().username });
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'permission-denied') {
        setLoginError('Error de permisos: Faltan reglas en Firestore. Revisa el README para configurarlas.');
      } else {
        setLoginError(err.message);
      }
    } finally {
      setOperationLoading(false);
    }
  };

  const handleLogout = () => {
    setAppUser(null);
    setView('login');
  };

  const openNewPatient = () => {
    setFormData(initialPatientState);
    setSelectedPatient(null);
    setIsEditingDetails(true);
    setIsModalOpen(true);
  };

  const openPatientDetail = (patient) => {
    setFormData(patient);
    setSelectedPatient(patient);
    setIsEditingDetails(false);
    setIsModalOpen(true);
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.bed) return alert('Nombre y Cama son obligatorios');
    setOperationLoading(true);
    
    try {
      const coll = collection(db, 'artifacts', appId, 'public', 'data', 'patients');
      
      if (selectedPatient) {
        await updateDoc(doc(coll, selectedPatient.id), {
          name: formData.name,
          bed: formData.bed,
          type: formData.type,
          fileNumber: formData.fileNumber,
          dob: formData.dob,
          admissionDate: formData.admissionDate,
          diagnosis: formData.diagnosis,
          surgery: formData.surgery,
          category: formData.category,
          history: formData.history,
          allergies: formData.allergies
        });
        setIsEditingDetails(false);
      } else {
        const docRef = await addDoc(coll, {
          ...formData,
          createdAt: serverTimestamp()
        });
        setSelectedPatient({ id: docRef.id, ...formData });
        setIsEditingDetails(false);
      }
    } catch (e) {
      console.error(e);
      if (e.code === 'permission-denied') {
        alert('Error de permisos: Configura las Reglas de Firestore en tu consola de Firebase.');
      } else {
        alert('Error al guardar: ' + e.message);
      }
    } finally {
      setOperationLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    if(e) e.preventDefault(); 
    
    if (!selectedPatient) return;
    if (!newNote.text) return alert("Por favor escribe el contenido de la nota.");

    const noteToAdd = {
      id: crypto.randomUUID(),
      text: newNote.text,
      type: newNote.type,
      link: newNote.link || null,
      abxStart: newNote.type === 'antibiotic' ? newNote.abxStart : null,
      timestamp: new Date().toISOString(),
      author: appUser?.username || 'Dr.'
    };

    const currentNotes = formData.notes || [];
    const updatedNotes = [noteToAdd, ...currentNotes];
    
    try {
      setOperationLoading(true);
      const patientRef = doc(db, 'artifacts', appId, 'public', 'data', 'patients', selectedPatient.id);
      await updateDoc(patientRef, { notes: updatedNotes });
      
      setNewNote({ text: '', type: 'evolution', link: '', abxStart: '' });
      setFormData(prev => ({ ...prev, notes: updatedNotes }));

    } catch (e) {
      console.error(e);
      alert("No se pudo agregar la nota. Intenta de nuevo.");
    } finally {
      setOperationLoading(false);
    }
  };

  const initiateDischarge = (e, patient) => {
    if(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setDischargeTarget(patient);
  };

  const confirmDischarge = async () => {
    if (!dischargeTarget) return;

    try {
      setOperationLoading(true);
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'patients', dischargeTarget.id);
      await updateDoc(ref, {
        status: 'discharged',
        dischargeDate: new Date().toISOString()
      });
      
      setDischargeTarget(null);
      if (selectedPatient?.id === dischargeTarget.id) {
         setIsModalOpen(false); 
         setSelectedPatient(null);
      }
    } catch (err) {
      console.error("Error discharging:", err);
      alert("Error al egresar: " + err.message);
    } finally {
      setOperationLoading(false);
    }
  };


  const handleDelete = async (id) => {
    if (!window.confirm('ATENCIÓN: ¿Eliminar registro permanentemente?\n\nEsta acción borrará todos los datos y notas. No se puede deshacer.')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'patients', id));
      if (selectedPatient?.id === id) setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Error al eliminar.");
    }
  };

  const downloadCSV = (dataToExport) => {
    const headers = [
      "Cama", "Tipo", "Nombre", "Expediente", "Ingreso", "Días Estancia", 
      "Edad", "Diagnóstico", "Categoría", "Cirugía", "Crónicos/Alergias", 
      "Últimos Labs", "Antibióticos Actuales"
    ];

    const escapeCsv = (txt) => `"${(txt || '').toString().replace(/"/g, '""')}"`;

    const rows = dataToExport.map(p => {
      const lastLab = p.notes?.find(n => n.type === 'lab')?.text || 'Sin registro';
      const activeAbx = p.notes
        ?.filter(n => n.type === 'antibiotic')
        .map(n => `${n.text} (Inicio: ${n.abxStart ? formatDate(n.abxStart) : '?'})`)
        .join('; ') || 'Ninguno';

      return [
        p.bed, p.type, p.name, p.fileNumber, formatDate(p.admissionDate),
        calculateStayDays(p.admissionDate), calculateAge(p.dob), p.diagnosis,
        p.category, p.surgery, `${p.history} / ${p.allergies}`, lastLab, activeAbx
      ].map(escapeCsv).join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Censo_UroRounds_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activePatients = useMemo(() => {
    return patients
      .filter(p => p.status !== 'discharged')
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.bed.includes(searchTerm))
      .sort((a,b) => a.bed.localeCompare(b.bed, undefined, { numeric: true }));
  }, [patients, searchTerm]);

  const dischargedPatients = useMemo(() => {
    return patients
      .filter(p => p.status === 'discharged')
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a,b) => new Date(b.dischargeDate) - new Date(a.dischargeDate));
  }, [patients, searchTerm]);

  // Si hay error de conexión (Auth fallida), mostrarlo en lugar del loader infinito
  if (connectionError) {
     return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-4 p-8 text-center">
            <AlertTriangle className="text-red-500 w-16 h-16" />
            <h1 className="text-2xl font-bold">Error de Conexión</h1>
            <p className="max-w-md">{connectionError}</p>
            <p className="text-xs text-slate-400 mt-4">Si eres el administrador, verifica la consola de Firebase.</p>
        </div>
     );
  }

  if (authLoading || view === 'loading') return <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-slate-400 font-medium flex-col gap-2"><Loader2 className="animate-spin text-blue-600" size={32} /><span>Conectando a UroRounds...</span></div>;

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border-t-4 border-blue-600">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Activity className="text-blue-600 w-10 h-10" />
            <h1 className="text-3xl font-bold text-slate-800">UroRounds</h1>
          </div>
          <h2 className="text-center text-gray-500 mb-6 font-medium">Acceso Médico</h2>
          
          <form onSubmit={handleAppLogin} className="space-y-4">
            <Input 
              type="text" 
              placeholder="Usuario (ej. r1urologia)" 
              value={username} 
              onChange={e => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())} 
              required 
            />
            <Input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
            
            {isRegistering && (
              <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-bold text-yellow-700">Contraseña Maestra (Admin)</label>
                <input type="password" className="w-full mt-1 border border-yellow-300 rounded px-2 py-1 text-sm" placeholder="Código de seguridad" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
              </div>
            )}
            {loginError && <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded">{loginError}</div>}
            <Button type="submit" className="w-full shadow-md" isLoading={operationLoading}>
              {isRegistering ? 'Crear Usuario' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button type="button" onClick={() => { setIsRegistering(!isRegistering); setLoginError(''); }} className="text-sm text-blue-600 hover:underline font-medium">
              {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿Nuevo usuario? Registrarse aquí'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="bg-blue-600 p-2 rounded-lg"><Activity className="text-white w-6 h-6" /></div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">UroRounds</h1>
              <p className="text-xs text-slate-500 hidden md:block">Sistema de Censo Hospitalario</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 hidden md:block font-medium bg-slate-100 px-3 py-1 rounded-full">
              Dr. {appUser?.username || 'Uro'}
            </span>
            <Button variant="ghost" onClick={handleLogout} className="text-red-500 hover:bg-red-50" title="Cerrar Sesión"><LogOut size={18} /></Button>
          </div>
        </div>
        
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setView('list')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Censo Actual ({activePatients.length})</button>
              <button onClick={() => setView('discharged')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'discharged' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Egresados ({dischargedPatients.length})</button>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
               <div className="relative flex-grow md:flex-grow-0">
                <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                <input type="text" placeholder="Buscar paciente..." className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              {view === 'list' && (
                <>
                  <Button variant="primary" onClick={openNewPatient} className="whitespace-nowrap shadow-sm"><Plus size={18} /> <span className="hidden md:inline">Ingresar</span></Button>
                  <Button variant="secondary" onClick={() => downloadCSV(activePatients)} className="text-slate-600"><Download size={18} /></Button>
                </>
              )}
              {view === 'discharged' && (
                 <Button variant="secondary" onClick={() => downloadCSV(dischargedPatients)} className="text-slate-600"><Download size={18} /> Histórico</Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-6 max-w-7xl mx-auto w-full">
        {view === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePatients.map(patient => (
              <div key={patient.id} onClick={() => openPatientDetail(patient)} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group overflow-hidden flex flex-col h-full">
                <div className={`h-1.5 w-full ${patient.type === 'IC' ? 'bg-orange-400' : 'bg-blue-500'}`} />
                <div className="p-4 flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{patient.bed}</span>
                      {patient.type === 'IC' && <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 px-2 py-1 rounded-full">IC</span>}
                    </div>
                    <span className="text-xs font-medium text-slate-400">Estancia: {calculateStayDays(patient.admissionDate)}d</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg leading-snug mb-1 group-hover:text-blue-600 truncate">{patient.name}</h3>
                  <div className="text-sm text-slate-600 mb-3 line-clamp-2 min-h-[2.5em]"><span className="font-semibold text-slate-400">Dx:</span> {patient.diagnosis}</div>
                  <div className="flex flex-wrap gap-1 text-xs">
                     <span className="bg-slate-50 border border-slate-100 px-2 py-1 rounded text-slate-500">{patient.category}</span>
                     <span className="bg-slate-50 border border-slate-100 px-2 py-1 rounded text-slate-500">{calculateAge(patient.dob)} años</span>
                  </div>
                </div>
                
                <div className="px-4 py-2 border-t border-slate-100 flex justify-end bg-slate-50/50">
                  <button 
                    onClick={(e) => initiateDischarge(e, patient)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded transition-all"
                  >
                    <Archive size={14} /> Egresar
                  </button>
                </div>
              </div>
            ))}
            {activePatients.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3"><User className="text-slate-300" /></div>
                <p>No hay pacientes activos. Agrega uno nuevo.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Egreso</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Diagnóstico</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dischargedPatients.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500">{formatDate(p.dischargeDate)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                      <td className="px-4 py-3 text-slate-600">{p.diagnosis}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {dischargedPatients.length === 0 && <tr><td colSpan="4" className="text-center py-8 text-slate-400">Sin egresos recientes</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 px-4 py-2 text-xs text-slate-400 text-center border-t border-slate-200">* Los registros se eliminan tras 30 días.</div>
          </div>
        )}
      </main>

      {dischargeTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Archive className="text-blue-600" size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">¿Confirmar Egreso?</h3>
            <p className="text-sm text-slate-600 mb-6">
              El paciente <strong>{dischargeTarget.name}</strong> se moverá a la lista de egresados y saldrá del censo activo.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => setDischargeTarget(null)}>Cancelar</Button>
              <Button variant="primary" onClick={confirmDischarge} isLoading={operationLoading}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
            
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-lg ${selectedPatient?.type === 'IC' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                   <User size={24} />
                 </div>
                 <div>
                    <h2 className="text-xl font-bold text-slate-800">
                      {selectedPatient ? selectedPatient.name : 'Nuevo Ingreso'}
                    </h2>
                    {selectedPatient && (
                      <p className="text-xs text-slate-500 font-mono">
                        Cama: {selectedPatient.bed} • Exp: {selectedPatient.fileNumber}
                      </p>
                    )}
                 </div>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full">✕</button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto bg-slate-50">
              <div className="max-w-4xl mx-auto p-6 space-y-6">

                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                       <Activity size={16} className="text-blue-500"/> Ficha de Identificación
                    </h3>
                    {selectedPatient && !isEditingDetails && (
                      <Button variant="ghost" onClick={() => setIsEditingDetails(true)} className="text-blue-600 text-xs h-8">
                        <Edit2 size={14} /> Corregir Datos
                      </Button>
                    )}
                     {selectedPatient && isEditingDetails && (
                       <span className="text-xs font-bold text-orange-600 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded">
                         <Unlock size={12}/> Modo Edición
                       </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                     <div className="md:col-span-2">
                      <Input label="Cama" readOnly={!isEditingDetails} value={formData.bed} onChange={e => setFormData({...formData, bed: e.target.value})} placeholder="314-A" />
                    </div>
                    <div className="md:col-span-2">
                      <Select label="Servicio" readOnly={!isEditingDetails} options={['HO', 'IC']} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} />
                    </div>
                    <div className="md:col-span-5">
                      <Input label="Nombre Completo" readOnly={!isEditingDetails} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="md:col-span-3">
                      <Input label="Expediente" readOnly={!isEditingDetails} value={formData.fileNumber} onChange={e => setFormData({...formData, fileNumber: e.target.value})} />
                    </div>

                    <div className="md:col-span-3">
                      <Input type="date" label="F. Nacimiento" readOnly={!isEditingDetails} value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                    </div>
                    <div className="md:col-span-1">
                       <Input label="Edad" readOnly={true} value={calculateAge(formData.dob)} />
                    </div>
                    <div className="md:col-span-3">
                      <Input type="date" label="F. Ingreso" readOnly={!isEditingDetails} value={formData.admissionDate} onChange={e => setFormData({...formData, admissionDate: e.target.value})} />
                    </div>
                     <div className="md:col-span-2">
                       <Input label="Estancia (Días)" readOnly={true} value={calculateStayDays(formData.admissionDate)} />
                    </div>
                     <div className="md:col-span-3">
                      <Select label="Categoría" readOnly={!isEditingDetails} options={CATEGORIES} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                    </div>

                    <div className="md:col-span-6">
                      <Input label="Diagnóstico de Ingreso" readOnly={!isEditingDetails} value={formData.diagnosis} onChange={e => setFormData({...formData, diagnosis: e.target.value})} />
                    </div>
                    <div className="md:col-span-6">
                      <Input label="Cirugía" readOnly={!isEditingDetails} value={formData.surgery} onChange={e => setFormData({...formData, surgery: e.target.value})} />
                    </div>
                    
                    <div className="md:col-span-6">
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Antecedentes</label>
                       <textarea className={`w-full border rounded-md px-3 py-2 text-sm mt-1 outline-none ${!isEditingDetails ? 'bg-slate-50 border-transparent text-slate-700' : 'bg-white border-gray-300'}`}
                         readOnly={!isEditingDetails} rows={2} value={formData.history} onChange={e => setFormData({...formData, history: e.target.value})} />
                    </div>
                    <div className="md:col-span-6">
                       <label className="text-xs font-bold text-red-500 uppercase tracking-wide">Alergias</label>
                       <textarea className={`w-full border rounded-md px-3 py-2 text-sm mt-1 outline-none text-red-700 ${!isEditingDetails ? 'bg-red-50 border-transparent' : 'bg-white border-red-200'}`}
                         readOnly={!isEditingDetails} rows={2} value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} />
                    </div>
                  </div>
                  
                  {isEditingDetails && (
                    <div className="mt-4 flex justify-end animate-in fade-in">
                      <Button onClick={handleSaveDetails} isLoading={operationLoading} variant="primary" className="bg-slate-800 text-white hover:bg-slate-900">
                        <Save size={16}/> Guardar Cambios Ficha
                      </Button>
                    </div>
                  )}
                </section>

                {selectedPatient && (
                  <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                     <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                       <FileText size={16} className="text-blue-500"/> Bitácora Clínica (Secuencial)
                     </h3>

                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 shadow-sm">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {NOTE_TYPES.map(type => (
                            <button
                              key={type.id}
                              onClick={() => setNewNote({...newNote, type: type.id})}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${newNote.type === type.id ? 'bg-white shadow-md border-blue-200 text-blue-700 ring-1 ring-blue-500' : 'bg-white text-slate-500 border-transparent hover:bg-slate-100 hover:border-slate-200'}`}
                            >
                              <type.icon size={14} className={type.color} /> {type.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-2 items-start">
                           <div className="flex-grow space-y-2">
                             <textarea 
                              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-inner"
                              placeholder={newNote.type === 'antibiotic' ? "Nombre del antibiótico, dosis y frecuencia..." : "Escriba la nota, reporte de laboratorio o procedimiento aquí..."}
                              rows={2}
                              value={newNote.text}
                              onChange={e => setNewNote({...newNote, text: e.target.value})}
                            />
                            {newNote.type === 'antibiotic' && (
                              <div className="flex items-center gap-2 animate-in fade-in bg-purple-50 p-2 rounded border border-purple-100">
                                <span className="text-xs font-bold text-purple-700">Fecha Inicio:</span>
                                <input type="date" className="border border-purple-200 rounded px-2 py-1 text-xs" value={newNote.abxStart} onChange={e => setNewNote({...newNote, abxStart: e.target.value})} />
                              </div>
                            )}
                            {newNote.type === 'image' && (
                               <div className="flex items-center gap-2 animate-in fade-in bg-green-50 p-2 rounded border border-green-100">
                                <span className="text-xs font-bold text-green-700">Link:</span>
                                <input type="text" className="border border-green-200 rounded px-2 py-1 text-xs flex-grow" placeholder="https://..." value={newNote.link} onChange={e => setNewNote({...newNote, link: e.target.value})} />
                              </div>
                            )}
                          </div>
                          <Button onClick={handleAddNote} isLoading={operationLoading} className="h-full py-4 bg-blue-600 hover:bg-blue-700 shadow-md">
                            <Plus size={20} />
                          </Button>
                        </div>
                     </div>

                     <div className="relative border-l-2 border-slate-100 ml-3 space-y-6 pb-4">
                        {formData.notes && formData.notes.length > 0 ? formData.notes.map((note, idx) => {
                          const typeInfo = NOTE_TYPES.find(t => t.id === note.type) || NOTE_TYPES[0];
                          const Icon = typeInfo.icon;
                          
                          return (
                            <div key={idx} className="relative pl-6">
                               <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${note.type === 'antibiotic' ? 'bg-purple-500' : 'bg-slate-300'}`}></div>
                               
                               <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                 <div className="flex justify-between items-start mb-2">
                                   <div className="flex items-center gap-2">
                                      <Icon size={16} className={typeInfo.color} />
                                      <span className={`text-xs font-bold uppercase ${typeInfo.color}`}>{typeInfo.label}</span>
                                   </div>
                                   <div className="text-right">
                                      <div className="text-xs font-bold text-slate-700">{formatDateTime(note.timestamp)}</div>
                                      <div className="text-[10px] text-slate-400 font-medium">Por: {note.author}</div>
                                   </div>
                                 </div>

                                 <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                                   {note.text}
                                 </div>

                                 {note.type === 'antibiotic' && (
                                   <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded border border-purple-100">
                                     <Clock size={12}/> Inicio: {note.abxStart ? formatDate(note.abxStart) : 'Indefinido'}
                                   </div>
                                 )}
                                 {note.link && (
                                   <a href={note.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded border border-blue-100 hover:underline">
                                     <ExternalLink size={12}/> Abrir Estudio
                                   </a>
                                 )}
                               </div>
                            </div>
                          );
                        }) : (
                          <div className="text-center text-slate-400 py-8 text-sm italic">
                            No hay notas en la bitácora aún.
                          </div>
                        )}
                     </div>
                  </section>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center z-20 sticky bottom-0">
              {selectedPatient ? (
                <div className="flex gap-2">
                  <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(selectedPatient.id)}>Eliminar</Button>
                </div>
              ) : (
                <div></div>
              )}
              
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cerrar</Button>
                {!selectedPatient && (
                   <Button variant="primary" onClick={handleSaveDetails} isLoading={operationLoading}>
                    <Save size={18} /> Crear Ingreso
                  </Button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

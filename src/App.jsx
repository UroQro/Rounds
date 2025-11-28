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
  X,
  Droplet,
  ChevronDown,
  ChevronUp
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
  "CPO", 
  "Trauma", 
  "Reconstructiva", 
  "Andrología",
  "Otro"
];

const NOTE_TYPES = [
  { id: 'evolution', label: 'Evol.', icon: FileText, color: 'text-slate-600' },
  { id: 'lab', label: 'Labs', icon: Microscope, color: 'text-blue-600' },
  { id: 'culture', label: 'Cultivo', icon: FlaskConical, color: 'text-pink-600' },
  { id: 'antibiotic', label: 'ABX', icon: Syringe, color: 'text-purple-600' },
  { id: 'procedure', label: 'Proc.', icon: Scissors, color: 'text-orange-600' },
  { id: 'image', label: 'Img', icon: ImageIcon, color: 'text-green-600' },
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

const calculateAntibioticDays = (startDate) => {
  if (!startDate) return 0;
  const parts = startDate.split('-');
  if(parts.length !== 3) return 0;
  const start = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const now = new Date();
  start.setHours(0,0,0,0);
  now.setHours(0,0,0,0);
  const diffTime = now - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  if (dateString.includes('-') && dateString.length === 10) {
      const [y, m, d] = dateString.split('-');
      return `${d}/${m}/${y}`;
  }
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short'
  });
};

const formatDateTime = (isoString) => {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleString('es-MX', {
    day: 'numeric', month: 'numeric', hour: '2-digit', minute:'2-digit'
  });
};

// --- FISHBONE COMPONENTS ---

const FishboneBMP = ({ data }) => {
  if (!data) return null;
  if (!data.na && !data.k && !data.cl && !data.bun && !data.cr && !data.glu) return null;

  return (
    <div className="flex items-center text-xs font-mono font-bold text-slate-800 select-none my-1 bg-white p-1 rounded border border-slate-100 w-fit">
        <div className="flex flex-col gap-0 items-end pr-1.5 border-r-2 border-slate-800 leading-none">
            <span>{data.na || '-'}</span>
            <span className="border-t border-slate-800 w-full text-right pt-0.5 mt-0.5">{data.k || '-'}</span>
        </div>
        <div className="flex flex-col gap-0 items-center px-1.5 border-r-2 border-slate-800 leading-none">
            <span>{data.cl || '-'}</span>
            <span className="border-t border-slate-800 w-full text-center pt-0.5 mt-0.5">{data.co2 || '-'}</span> 
        </div>
        <div className="flex flex-col gap-0 items-start pl-1.5 leading-none">
            <span>{data.bun || '-'}</span>
            <span className="border-t border-slate-800 w-full text-left pt-0.5 mt-0.5">{data.cr || '-'}</span>
        </div>
        <div className="ml-1 pl-2 border-l-2 border-slate-800 flex items-center h-full">
            <span className="text-sm font-black">{data.glu || '-'}</span>
        </div>
    </div>
  );
};

const FishboneCBC = ({ data }) => {
    if (!data) return null;
    if (!data.wbc && !data.hb && !data.plt && !data.hct) return null;
    
    return (
        <div className="flex items-center text-xs font-mono font-bold text-slate-800 bg-white p-1 rounded border border-slate-100 w-fit">
            <div className="pr-2 text-blue-700">{data.wbc || '-'}</div>
            <div className="px-2 border-l-2 border-r-2 border-slate-800 text-slate-900 flex flex-col items-center leading-none">
                <span>{data.hb || '-'}</span>
                <span className="border-t border-slate-800 w-full text-center pt-0.5 mt-0.5">{data.hct || '-'}</span>
            </div>
            <div className="pl-2 text-purple-700">{data.plt || '-'}</div>
        </div>
    );
};

const CoagBox = ({ data }) => {
    if (!data || (!data.tp && !data.inr)) return null;
    return (
        <div className="flex gap-2 text-[10px] uppercase font-bold text-slate-600 mt-1 bg-orange-50 px-2 py-0.5 rounded w-fit">
            {data.tp && <span>TP: {data.tp}</span>}
            {data.inr && <span>INR: {data.inr}</span>}
        </div>
    );
}


// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled, type = "button", isLoading = false, ...props }) => {
  const base = "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-300 shadow-sm",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 focus:ring-red-500",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    outline: "bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || isLoading} className={`${base} ${variants[variant]} ${className}`} {...props}>
      {isLoading && <Loader2 className="animate-spin w-4 h-4" />}
      {children}
    </button>
  );
};

const Input = ({ label, readOnly, className="", ...props }) => (
  <div className="flex flex-col gap-0.5 w-full">
    {label && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</label>}
    <input 
      className={`border rounded-md px-2 py-1.5 text-sm outline-none w-full transition-colors ${readOnly ? 'bg-slate-50 border-transparent text-slate-700 font-medium' : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'} ${className}`}
      readOnly={readOnly}
      {...props}
    />
  </div>
);

const Select = ({ label, options, readOnly, ...props }) => (
  <div className="flex flex-col gap-0.5 w-full">
    {label && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</label>}
    <select 
      className={`border rounded-md px-2 py-1.5 text-sm outline-none w-full ${readOnly ? 'bg-slate-50 border-transparent text-slate-700 pointer-events-none appearance-none font-medium' : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
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
  const [connectionError, setConnectionError] = useState('');

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
  
  // Note State
  const [newNote, setNewNote] = useState({ 
      text: '', 
      type: 'evolution', 
      link: '', 
      abxStart: '',
      labData: {
          na: '', k: '', cl: '', bun: '', cr: '', glu: '',
          wbc: '', hb: '', hct: '', plt: '',
          tp: '', ttp: '', inr: ''
      }
  });

  // --- Auth & Data Effects ---

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Auth init error", e);
        setConnectionError("Error de conexión. Verifica Internet o Firebase Auth.");
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
    if (!firebaseUser) return setLoginError("Sin conexión.");
    
    setLoginError('');
    setOperationLoading(true);

    try {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);

      if (isRegistering) {
        if (adminPass !== ADMIN_PASSWORD) {
          throw new Error('Clave maestra incorrecta');
        }
        if (!querySnapshot.empty) {
          throw new Error('Usuario ya existe');
        }
        await addDoc(usersRef, {
          username: username,
          password: password,
          createdAt: serverTimestamp()
        });
        setAppUser({ username });
      } else {
        if (querySnapshot.empty) throw new Error('Usuario no existe');
        const userDoc = querySnapshot.docs.find(doc => doc.data().password === password);
        if (!userDoc) throw new Error('Contraseña incorrecta');
        setAppUser({ username: userDoc.data().username });
      }
    } catch (err) {
      if (err.code === 'permission-denied') {
        setLoginError('Faltan permisos. Configura Reglas Firebase.');
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
    if (!formData.name || !formData.bed) return alert('Faltan datos');
    setOperationLoading(true);
    
    try {
      const coll = collection(db, 'artifacts', appId, 'public', 'data', 'patients');
      
      const payload = {
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
      };

      if (selectedPatient) {
        await updateDoc(doc(coll, selectedPatient.id), payload);
        setIsEditingDetails(false);
      } else {
        const docRef = await addDoc(coll, {
          ...payload,
          status: 'active',
          notes: [],
          createdAt: serverTimestamp()
        });
        setSelectedPatient({ id: docRef.id, ...formData });
        setIsEditingDetails(false);
      }
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setOperationLoading(false);
    }
  };

  const updateLabData = (field, value) => {
      setNewNote(prev => ({
          ...prev,
          labData: { ...prev.labData, [field]: value }
      }));
  };

  const handleAddNote = async (e) => {
    if(e) e.preventDefault(); 
    if (!selectedPatient) return;
    
    if (newNote.type !== 'lab' && newNote.type !== 'image' && !newNote.text) return alert("Escribe algo.");
    if (newNote.type === 'lab' && !Object.values(newNote.labData).some(x => x)) return alert("Pon algún valor de lab.");
    if (newNote.type === 'image' && !newNote.link) return alert("Ingresa el link.");

    const noteToAdd = {
      id: crypto.randomUUID(),
      text: newNote.text,
      type: newNote.type,
      link: newNote.link || null,
      abxStart: newNote.type === 'antibiotic' ? newNote.abxStart : null,
      labData: newNote.type === 'lab' ? newNote.labData : null,
      timestamp: new Date().toISOString(),
      author: appUser?.username || 'Dr.',
      deleted: false
    };

    const currentNotes = formData.notes || [];
    const updatedNotes = [noteToAdd, ...currentNotes];
    
    try {
      setOperationLoading(true);
      const patientRef = doc(db, 'artifacts', appId, 'public', 'data', 'patients', selectedPatient.id);
      await updateDoc(patientRef, { notes: updatedNotes });
      
      setNewNote({ 
          text: '', type: 'evolution', link: '', abxStart: '',
          labData: { na: '', k: '', cl: '', bun: '', cr: '', glu: '', wbc: '', hb: '', hct: '', plt: '', tp: '', ttp: '', inr: '' }
      });
      setFormData(prev => ({ ...prev, notes: updatedNotes }));

    } catch (e) {
      alert("Error al guardar nota.");
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('¿Eliminar esta nota? Quedará registro.')) return;
    
    try {
        setOperationLoading(true);
        const updatedNotes = formData.notes.map(n => {
            if (n.id === noteId) {
                return {
                    ...n,
                    deleted: true,
                    deletedBy: appUser?.username || 'Dr.',
                    deletedAt: new Date().toISOString()
                };
            }
            return n;
        });

        const patientRef = doc(db, 'artifacts', appId, 'public', 'data', 'patients', selectedPatient.id);
        await updateDoc(patientRef, { notes: updatedNotes });
        setFormData(prev => ({ ...prev, notes: updatedNotes }));
    } catch (e) {
        alert("Error al eliminar nota.");
    } finally {
        setOperationLoading(false);
    }
  };

  const initiateDischarge = (e, patient) => {
    if(e) { e.preventDefault(); e.stopPropagation(); }
    setDischargeTarget(patient);
  };

  const confirmDischarge = async () => {
    if (!dischargeTarget) return;
    try {
      setOperationLoading(true);
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'patients', dischargeTarget.id);
      await updateDoc(ref, { status: 'discharged', dischargeDate: new Date().toISOString() });
      
      setDischargeTarget(null);
      if (selectedPatient?.id === dischargeTarget.id) {
         setIsModalOpen(false); 
         setSelectedPatient(null);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar para siempre?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'patients', id));
      if (selectedPatient?.id === id) setIsModalOpen(false);
    } catch (e) { alert("Error al eliminar."); }
  };

  const downloadCSV = (dataToExport) => {
    const headers = [
      "Cama", "Tipo", "Nombre", "Expediente", "Ingreso", "Días", 
      "Edad", "Diagnóstico", "Categoría", "Cirugía", "Crónicos/Alergias", 
      "Labs Resumen", "Antibióticos"
    ];

    const escapeCsv = (txt) => `"${(txt || '').toString().replace(/"/g, '""')}"`;

    const rows = dataToExport.map(p => {
      const lastLabNote = p.notes?.find(n => n.type === 'lab' && !n.deleted);
      let lastLabText = '-';
      if (lastLabNote) {
          if (lastLabNote.labData) {
              const d = lastLabNote.labData;
              lastLabText = `Cr:${d.cr} BUN:${d.bun} WBC:${d.wbc} Hb:${d.hb} Hct:${d.hct} Plt:${d.plt}`;
          } else {
              lastLabText = lastLabNote.text;
          }
      }

      const activeAbx = p.notes
        ?.filter(n => n.type === 'antibiotic' && !n.deleted)
        .map(n => `${n.text} (${n.abxStart ? formatDate(n.abxStart) : '?'})`)
        .join('; ') || '-';

      return [
        p.bed, p.type, p.name, p.fileNumber, formatDate(p.admissionDate),
        calculateStayDays(p.admissionDate), calculateAge(p.dob), p.diagnosis,
        p.category, p.surgery, `${p.history} / ${p.allergies}`, lastLabText, activeAbx
      ].map(escapeCsv).join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Censo_${new Date().toISOString().split('T')[0]}.csv`);
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

  // --- Views ---

  if (connectionError) return <div className="h-screen w-full flex flex-col justify-center items-center p-6 text-center bg-slate-50"><AlertTriangle className="text-red-500 w-12 h-12 mb-2"/><h2 className="font-bold text-slate-700">Error Conexión</h2><p className="text-sm text-slate-500">{connectionError}</p></div>;
  if (authLoading || view === 'loading') return <div className="h-screen w-full flex justify-center items-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm border-t-4 border-blue-600">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Activity className="text-blue-600 w-8 h-8" />
            <h1 className="text-2xl font-bold text-slate-800">UroRounds</h1>
          </div>
          <form onSubmit={handleAppLogin} className="space-y-3">
            <Input placeholder="Usuario" value={username} onChange={e => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())} required />
            <Input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
            {isRegistering && <div className="bg-yellow-50 p-2 rounded border border-yellow-200"><label className="text-xs font-bold text-yellow-700 block mb-1">Clave Maestra</label><input type="password" className="w-full border-yellow-300 rounded px-2 py-1 text-sm border" value={adminPass} onChange={e => setAdminPass(e.target.value)} /></div>}
            {loginError && <div className="text-red-500 text-xs bg-red-50 p-2 rounded text-center">{loginError}</div>}
            <Button type="submit" className="w-full" isLoading={operationLoading}>{isRegistering ? 'Registrar' : 'Entrar'}</Button>
          </form>
          <div className="mt-4 text-center"><button type="button" onClick={() => { setIsRegistering(!isRegistering); setLoginError(''); }} className="text-xs text-blue-600 underline font-medium">{isRegistering ? 'Volver a Login' : 'Crear Usuario'}</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col h-[100dvh]">
      {/* NAVBAR COMPACTA */}
      <header className="bg-white shadow-sm border-b border-slate-200 z-10">
        <div className="max-w-7xl mx-auto px-3 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded"><Activity className="text-white w-5 h-5" /></div>
            <span className="text-lg font-bold text-slate-800 tracking-tight">UroRounds</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{appUser?.username}</span>
            <button onClick={handleLogout} className="text-red-400 hover:text-red-600"><LogOut size={18} /></button>
          </div>
        </div>
        
        {/* BARRA DE HERRAMIENTAS MÓVIL */}
        <div className="bg-white border-b border-slate-200 pb-2 px-3">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-2 justify-between items-center">
            <div className="flex bg-slate-100 p-0.5 rounded-lg w-full md:w-auto">
              <button onClick={() => setView('list')} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${view === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Activos ({activePatients.length})</button>
              <button onClick={() => setView('discharged')} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${view === 'discharged' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Altas</button>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
               <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2 text-gray-400 w-3.5 h-3.5" />
                <input type="text" placeholder="Buscar..." className="pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg w-full focus:ring-1 focus:ring-blue-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              {view === 'list' ? (
                <>
                  <Button variant="primary" onClick={openNewPatient} className="whitespace-nowrap"><Plus size={16} /><span className="hidden sm:inline">Nuevo</span></Button>
                  <Button variant="secondary" onClick={() => downloadCSV(activePatients)} className="px-2"><Download size={16} /></Button>
                </>
              ) : (
                 <Button variant="secondary" onClick={() => downloadCSV(dischargedPatients)} className="w-full md:w-auto"><Download size={16} /> CSV</Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow p-2 md:p-4 max-w-7xl mx-auto w-full overflow-y-auto">
        {view === 'list' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-20">
            {activePatients.map(patient => (
              <div key={patient.id} onClick={() => openPatientDetail(patient)} className="bg-white rounded-lg shadow-sm border border-slate-200 hover:border-blue-300 active:bg-blue-50 transition-all cursor-pointer flex flex-col relative overflow-hidden">
                <div className={`h-1 w-full ${patient.type === 'IC' ? 'bg-orange-400' : 'bg-blue-500'}`} />
                <div className="p-3 flex-grow">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-base font-bold text-slate-700 bg-slate-100 px-1.5 rounded">{patient.bed}</span>
                      {patient.type === 'IC' && <span className="text-[9px] font-bold uppercase bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">IC</span>}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{calculateStayDays(patient.admissionDate)}d</span>
                  </div>
                  
                  <h3 className="font-bold text-slate-800 text-base leading-tight mb-1 truncate">{patient.name}</h3>
                  <div className="text-xs text-slate-600 mb-2 line-clamp-1">{patient.diagnosis}</div>
                  
                  {/* PREVIEW LABS CONDENSADO */}
                  {(() => {
                      const lastLab = patient.notes?.find(n => n.type === 'lab' && n.labData && !n.deleted);
                      if (lastLab) {
                          const d = lastLab.labData;
                          return (d.wbc || d.cr) ? (
                              <div className="mb-2 flex flex-wrap gap-1">
                                  {d.wbc && <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1 rounded border border-blue-100">WBC:{d.wbc}</span>}
                                  {d.hb && <span className="text-[9px] font-mono bg-red-50 text-red-700 px-1 rounded border border-red-100">Hb:{d.hb}</span>}
                                  {d.hct && <span className="text-[9px] font-mono bg-red-50 text-red-700 px-1 rounded border border-red-100">Hct:{d.hct}</span>}
                                  {d.cr && <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1 rounded border border-slate-200">Cr:{d.cr}</span>}
                              </div>
                          ) : null;
                      }
                  })()}

                  <div className="flex flex-wrap gap-1">
                     <span className="text-[9px] border border-slate-100 px-1.5 py-0.5 rounded text-slate-500 bg-slate-50">{patient.category}</span>
                     <span className="text-[9px] border border-slate-100 px-1.5 py-0.5 rounded text-slate-500 bg-slate-50">{calculateAge(patient.dob)}a</span>
                  </div>
                </div>
                
                <div className="px-3 py-1.5 border-t border-slate-100 flex justify-end bg-slate-50/30">
                  <button 
                    onClick={(e) => initiateDischarge(e, patient)}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-blue-600 px-2 py-1 rounded"
                  >
                    <Archive size={12} /> Egresar
                  </button>
                </div>
              </div>
            ))}
            {activePatients.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                <p>Sin pacientes activos.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Egreso</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dischargedPatients.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-500">{formatDate(p.dischargeDate)}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{p.name}<div className="text-[10px] text-slate-400 font-normal">{p.diagnosis}</div></td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => handleDelete(p.id)} className="text-red-300 hover:text-red-500"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* --- CONFIRMATION MODAL --- */}
      {dischargeTarget && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-5 text-center animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Confirmar Egreso</h3>
            <p className="text-sm text-slate-600 mb-4">¿Egresar a <strong>{dischargeTarget.name}</strong>?</p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setDischargeTarget(null)} className="flex-1">Cancelar</Button>
              <Button variant="primary" onClick={confirmDischarge} isLoading={operationLoading} className="flex-1">Confirmar</Button>
            </div>
          </div>
        </div>
      )}

      {/* --- PATIENT MODAL (FULL SCREEN MOBILE) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-white sm:bg-slate-900/60 sm:backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white sm:rounded-2xl shadow-2xl w-full h-full sm:h-[90vh] max-w-5xl flex flex-col overflow-hidden">
            
            <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                 <button onClick={() => setIsModalOpen(false)} className="sm:hidden text-slate-500"><X size={24}/></button>
                 <div className="truncate">
                    <h2 className="text-lg font-bold text-slate-800 truncate leading-tight">
                      {selectedPatient ? selectedPatient.name : 'Nuevo Paciente'}
                    </h2>
                    {selectedPatient && (
                      <p className="text-[10px] text-slate-500 font-mono">
                        {selectedPatient.bed} • {selectedPatient.fileNumber}
                      </p>
                    )}
                 </div>
              </div>
              <div className="flex gap-2 shrink-0">
                 {!selectedPatient && <Button variant="primary" onClick={handleSaveDetails} isLoading={operationLoading} className="px-3 py-1 text-xs">Guardar</Button>}
                 <button onClick={() => setIsModalOpen(false)} className="hidden sm:block text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto bg-slate-50 pb-20 sm:pb-0">
              <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4">

                {/* ID SECTION - COLLAPSIBLE ON MOBILE OPTIONAL OR JUST DENSE */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-5">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                       <User size={14}/> Ficha Clínica
                    </h3>
                    {selectedPatient && (
                      <button onClick={() => setIsEditingDetails(!isEditingDetails)} className="text-blue-600 text-xs font-bold">
                        {isEditingDetails ? 'Cancelar' : 'Editar'}
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-12 gap-3">
                     <div className="col-span-1 md:col-span-2">
                      <Input label="Cama" readOnly={!isEditingDetails} value={formData.bed} onChange={e => setFormData({...formData, bed: e.target.value})} />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Select label="Servicio" readOnly={!isEditingDetails} options={['HO', 'IC']} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} />
                    </div>
                    <div className="col-span-2 md:col-span-5">
                      <Input label="Nombre" readOnly={!isEditingDetails} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <Input label="Expediente" readOnly={!isEditingDetails} value={formData.fileNumber} onChange={e => setFormData({...formData, fileNumber: e.target.value})} />
                    </div>

                    <div className="col-span-1 md:col-span-3">
                      <Input type="date" label="Nacimiento" readOnly={!isEditingDetails} value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                    </div>
                    <div className="col-span-1 md:col-span-1">
                       <Input label="Edad" readOnly={true} value={calculateAge(formData.dob)} />
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <Input type="date" label="Ingreso" readOnly={!isEditingDetails} value={formData.admissionDate} onChange={e => setFormData({...formData, admissionDate: e.target.value})} />
                    </div>
                     <div className="col-span-1 md:col-span-2">
                       <Input label="Estancia" readOnly={true} value={calculateStayDays(formData.admissionDate) + ' días'} />
                    </div>
                     <div className="col-span-2 md:col-span-3">
                      <Select label="Categoría" readOnly={!isEditingDetails} options={CATEGORIES} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                    </div>

                    <div className="col-span-2 md:col-span-6">
                      <Input label="Diagnóstico" readOnly={!isEditingDetails} value={formData.diagnosis} onChange={e => setFormData({...formData, diagnosis: e.target.value})} />
                    </div>
                    <div className="col-span-2 md:col-span-6">
                      <Input label="Cirugía" readOnly={!isEditingDetails} value={formData.surgery} onChange={e => setFormData({...formData, surgery: e.target.value})} />
                    </div>
                    
                    <div className="col-span-2 md:col-span-6">
                       <label className="text-[10px] font-bold text-slate-500 uppercase">Antecedentes</label>
                       <textarea className={`w-full border rounded-md px-2 py-1 text-xs mt-0.5 outline-none resize-none ${!isEditingDetails ? 'bg-slate-50 border-transparent text-slate-700' : 'bg-white border-slate-300'}`}
                         readOnly={!isEditingDetails} rows={2} value={formData.history} onChange={e => setFormData({...formData, history: e.target.value})} />
                    </div>
                    <div className="col-span-2 md:col-span-6">
                       <label className="text-[10px] font-bold text-red-400 uppercase">Alergias</label>
                       <textarea className={`w-full border rounded-md px-2 py-1 text-xs mt-0.5 outline-none resize-none text-red-600 font-medium ${!isEditingDetails ? 'bg-red-50 border-transparent' : 'bg-white border-red-100'}`}
                         readOnly={!isEditingDetails} rows={2} value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} />
                    </div>
                  </div>
                  
                  {isEditingDetails && (
                    <div className="mt-3 flex justify-end">
                      <Button onClick={handleSaveDetails} isLoading={operationLoading} variant="primary">Guardar Cambios</Button>
                    </div>
                  )}
                </section>

                {selectedPatient && (
                  <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-5">
                     <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                       <FileText size={14}/> Bitácora
                     </h3>

                     {/* NOTE INPUT */}
                     <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-6">
                        <div className="flex overflow-x-auto gap-2 mb-3 pb-1 no-scrollbar">
                          {NOTE_TYPES.map(type => (
                            <button
                              key={type.id}
                              onClick={() => setNewNote(prev => ({...prev, type: type.id}))}
                              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${newNote.type === type.id ? 'bg-white shadow-sm border-blue-300 text-blue-700' : 'bg-white text-slate-500 border-transparent hover:bg-slate-100'}`}
                            >
                              <type.icon size={12} className={type.color} /> {type.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex flex-col gap-3">
                             {/* LAB INPUT GRID - MOBILE OPTIMIZED */}
                             {newNote.type === 'lab' ? (
                                 <div className="bg-white border border-slate-200 rounded-lg p-2 animate-in fade-in">
                                     <h4 className="text-[10px] font-bold text-blue-600 uppercase mb-2">Ingresar Valores</h4>
                                     
                                     {/* BH - 4 COLS */}
                                     <div className="grid grid-cols-4 gap-2 mb-2 bg-slate-50 p-2 rounded">
                                         <Input label="WBC" placeholder="10.5" value={newNote.labData.wbc} onChange={e => updateLabData('wbc', e.target.value)} className="text-center"/>
                                         <Input label="Hb" placeholder="14" value={newNote.labData.hb} onChange={e => updateLabData('hb', e.target.value)} className="text-center"/>
                                         <Input label="Hct" placeholder="42" value={newNote.labData.hct} onChange={e => updateLabData('hct', e.target.value)} className="text-center"/>
                                         <Input label="Plt" placeholder="250" value={newNote.labData.plt} onChange={e => updateLabData('plt', e.target.value)} className="text-center"/>
                                     </div>

                                     {/* CHEM - 4 COLS Mobile */}
                                     <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-2 p-1">
                                         <Input label="Na" value={newNote.labData.na} onChange={e => updateLabData('na', e.target.value)} className="text-center"/>
                                         <Input label="K" value={newNote.labData.k} onChange={e => updateLabData('k', e.target.value)} className="text-center"/>
                                         <Input label="Cl" value={newNote.labData.cl} onChange={e => updateLabData('cl', e.target.value)} className="text-center"/>
                                         <Input label="Glu" value={newNote.labData.glu} onChange={e => updateLabData('glu', e.target.value)} className="text-center font-bold"/>
                                         <Input label="BUN" value={newNote.labData.bun} onChange={e => updateLabData('bun', e.target.value)} className="text-center col-span-2 sm:col-span-1"/>
                                         <Input label="Cr" value={newNote.labData.cr} onChange={e => updateLabData('cr', e.target.value)} className="text-center col-span-2 sm:col-span-1 font-bold"/>
                                     </div>

                                     {/* COAGS */}
                                     <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-2">
                                         <Input label="TP" value={newNote.labData.tp} onChange={e => updateLabData('tp', e.target.value)} className="text-center"/>
                                         <Input label="TTP" value={newNote.labData.ttp} onChange={e => updateLabData('ttp', e.target.value)} className="text-center"/>
                                         <Input label="INR" value={newNote.labData.inr} onChange={e => updateLabData('inr', e.target.value)} className="text-center"/>
                                     </div>
                                     
                                     <input type="text" className="w-full mt-2 border-b border-slate-200 text-xs py-1 outline-none" placeholder="Nota adicional (opcional)..." value={newNote.text} onChange={e => setNewNote({...newNote, text: e.target.value})} />
                                 </div>
                             ) : (
                                 <textarea 
                                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-blue-500 outline-none bg-white min-h-[80px]"
                                  placeholder={newNote.type === 'antibiotic' ? "Medicamento, dosis, intervalo..." : "Escribe aquí..."}
                                  value={newNote.text}
                                  onChange={e => setNewNote({...newNote, text: e.target.value})}
                                />
                             )}

                            {newNote.type === 'antibiotic' && (
                              <div className="bg-purple-50 p-2 rounded border border-purple-100">
                                <span className="text-[10px] font-bold text-purple-700 block mb-1">Fecha Inicio</span>
                                <input type="date" className="w-full border border-purple-200 rounded px-2 py-1.5 text-xs bg-white" value={newNote.abxStart} onChange={e => setNewNote({...newNote, abxStart: e.target.value})} />
                              </div>
                            )}

                            {newNote.type === 'image' && (
                               <div className="bg-green-50 p-2 rounded border border-green-100 animate-in fade-in">
                                <span className="text-[10px] font-bold text-green-700 block mb-1">Link de Imagen / Estudio</span>
                                <input type="text" className="w-full border border-green-200 rounded px-2 py-1.5 text-xs bg-white" placeholder="Pegar URL aquí (https://...)" value={newNote.link} onChange={e => setNewNote({...newNote, link: e.target.value})} />
                              </div>
                            )}
                            
                            <Button onClick={handleAddNote} isLoading={operationLoading} className="w-full py-3 bg-slate-800 hover:bg-slate-900">
                              <Plus size={16} /> Agregar Nota
                            </Button>
                        </div>
                     </div>

                     {/* TIMELINE */}
                     <div className="space-y-4 pl-2">
                        {formData.notes && formData.notes.length > 0 ? formData.notes.map((note, idx) => {
                          if (note.deleted) {
                              return (
                                <div key={idx} className="pl-4 border-l-2 border-red-100 opacity-60">
                                    <div className="bg-slate-50 p-2 rounded text-[10px] text-red-400 italic">
                                        Nota eliminada por Dr. {note.deletedBy} el {formatDateTime(note.deletedAt)}
                                    </div>
                                </div>
                              );
                          }

                          const typeInfo = NOTE_TYPES.find(t => t.id === note.type) || NOTE_TYPES[0];
                          const Icon = typeInfo.icon;
                          
                          return (
                            <div key={idx} className="relative pl-4 border-l-2 border-slate-100 group">
                               <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${note.type === 'antibiotic' ? 'bg-purple-500' : 'bg-slate-300'}`}></div>
                               
                               <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm relative">
                                 <div className="flex justify-between items-start mb-2">
                                   <div className="flex items-center gap-1.5">
                                      <Icon size={14} className={typeInfo.color} />
                                      <span className={`text-[10px] font-bold uppercase ${typeInfo.color}`}>{typeInfo.label}</span>
                                   </div>
                                   <div className="flex items-center gap-2">
                                        <div className="text-right leading-none">
                                            <div className="text-[10px] font-bold text-slate-700">{formatDateTime(note.timestamp)}</div>
                                            <div className="text-[9px] text-slate-400">Dr. {note.author}</div>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteNote(note.id)}
                                            className="text-slate-300 hover:text-red-400 transition-colors p-1"
                                            title="Eliminar nota"
                                        >
                                            <X size={14} /> 
                                        </button>
                                   </div>
                                 </div>

                                 {/* FISHBONE RENDER */}
                                 {note.type === 'lab' && note.labData ? (
                                     <div className="overflow-x-auto">
                                         <div className="flex flex-wrap gap-4 items-start">
                                            <FishboneCBC data={note.labData} />
                                            <FishboneBMP data={note.labData} />
                                         </div>
                                         <CoagBox data={note.labData} />
                                         {note.text && <p className="text-xs text-slate-500 mt-2 pt-1 border-t border-slate-50 italic">{note.text}</p>}
                                     </div>
                                 ) : (
                                     <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                                       {note.text}
                                     </div>
                                 )}

                                 {note.type === 'antibiotic' && (
                                   <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded border border-purple-100">
                                     <Clock size={10}/> Día {calculateAntibioticDays(note.abxStart)} ({formatDate(note.abxStart)})
                                   </div>
                                 )}
                                 {note.link && (
                                   <a href={note.link} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded border border-blue-200 hover:bg-blue-100 transition-all">
                                     <ExternalLink size={14}/> TAC
                                   </a>
                                 )}
                               </div>
                            </div>
                          );
                        }) : (
                          <div className="text-center text-slate-300 py-8 text-xs italic">Sin notas registradas</div>
                        )}
                     </div>
                  </section>
                )}
              </div>
            </div>

            {/* MOBILE FOOTER ACTIONS */}
            <div className="p-3 border-t border-slate-200 bg-white flex justify-between items-center z-20 shrink-0 safe-area-pb">
              {selectedPatient ? (
                <button onClick={() => handleDelete(selectedPatient.id)} className="text-red-400 p-2"><Trash2 size={20}/></button>
              ) : <div></div>}
              
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cerrar</Button>
                {!selectedPatient && (
                   <Button variant="primary" onClick={handleSaveDetails} isLoading={operationLoading}>Crear Ingreso</Button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Building, User, MapPin, X, ArrowRight, BookOpen, ChevronRight, Tag, Loader2, Database, ExternalLink, Video } from 'lucide-react';

// Ícone de Cadeado Nativo (À prova de falhas de versão)
const LockIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

// ============================================================================
// CONFIGURAÇÃO TÉCNICA
// ============================================================================
// ID do Google Sheets
const SHEET_ID = '1vX2_MEnWVtTJQXzLYjWhTKnSBMuLjAuX69GDPGhtiwA'; 

// Links de partilha dos seus 3 Google Forms
const FORM_FIGURAS = 'https://docs.google.com/forms/d/e/1FAIpQLSdtWmSw4mD9elpPmY1Owv0jryhlgGZmtueT4_3iSyQ6Ywb8UA/viewform?usp=publish-editor';
const FORM_PALACETES = 'https://docs.google.com/forms/d/e/1FAIpQLSfhhBzf1xGezrrPKaet0kd8pwnG371yVlxSwCsMu76_Q9E2aQ/viewform?usp=publish-editor';
const FORM_ARTIGOS = 'https://docs.google.com/forms/d/e/1FAIpQLSfY9tWHignjRqzL30Yig7Zv0snjMYkCX2wU94HGpN2OkJoh6g/viewform?usp=publish-editor';

// Password de Acesso à Gestão (Mude para a que preferir)
const GESTAO_PASSWORD = 'cucp2026';

// Link do Logótipo
const LOGO_URL = 'https://drive.google.com/file/d/1T7rAFvvK9tYSrUUHDUUK0jQaC96VkHtA/view?usp=sharing';

// ============================================================================
// MOTOR DE COMUNICAÇÃO COM GOOGLE SHEETS E MULTIMÉDIA
// ============================================================================
const EXPECTED_KEYS = ['id', 'name', 'title', 'category', 'origin', 'fortuneLocation', 'description', 'images', 'relatedPalacetes', 'relatedArticles', 'bibliografia', 'ownerIds', 'year', 'distrito', 'concelho', 'location', 'artistic', 'excerpt', 'content', 'relatedFigures', 'videoUrl'];

// Helper para converter links do Google Drive em links diretos de imagem
const getDirectImageUrl = (url) => {
  if (!url) return url;
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch && openMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${openMatch[1]}`;
  }
  return url;
};

// Extrator de IDs de Vídeo para Embed Automático (À prova de Mobile e Safari)
const getEmbedVideoUrl = (url) => {
  if (!url) return null;
  const cleanUrl = String(url).trim();

  // Tratamento específico para YouTube (Usa youtube-nocookie para evitar bloqueios do iPhone/Safari)
  if (cleanUrl.toLowerCase().includes('youtube.com') || cleanUrl.toLowerCase().includes('youtu.be')) {
    let videoId = '';
    if (cleanUrl.includes('youtu.be/')) {
      videoId = cleanUrl.split('youtu.be/')[1]?.split(/[?#]/)[0];
    } else if (cleanUrl.includes('v=')) {
      videoId = cleanUrl.split('v=')[1]?.split('&')[0];
    } else if (cleanUrl.includes('embed/')) {
      videoId = cleanUrl.split('embed/')[1]?.split(/[?#]/)[0];
    }
    if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
  }

  // Tratamento específico para Vimeo
  if (cleanUrl.toLowerCase().includes('vimeo.com/')) {
    const videoId = cleanUrl.split('vimeo.com/')[1]?.split(/[?#]/)[0];
    if (videoId) return `https://player.vimeo.com/video/${videoId}`;
  }

  return cleanUrl; 
};

// Tradutor Inteligente
const normalizeKey = (rawKey) => {
  if (!rawKey) return null;
  const lower = rawKey.toString().trim().toLowerCase();
  
  if (lower.includes('id semântico') || lower === 'id') return 'id';
  if (lower.includes('nome') && !lower.includes('cognome')) return 'name';
  if (lower.includes('título')) return 'title';
  if (lower.includes('categoria') || lower.includes('área temática')) return 'category';
  if (lower.includes('origem')) return 'origin';
  if (lower.includes('fortuna')) return 'fortuneLocation';
  if (lower.includes('biográfica') || lower.includes('historial') || lower === 'description') return 'description';
  if (lower.includes('imagem') || lower.includes('imagens') || lower === 'images') return 'images';
  if (lower.includes('vídeo') || lower.includes('video') || lower.includes('youtube')) return 'videoUrl';
  if (lower.includes('palacetes relacionados') || lower.includes('palacetes mencionados') || lower === 'relatedpalacetes') return 'relatedPalacetes';
  if (lower.includes('artigos') || lower.includes('temas') || lower === 'relatedarticles') return 'relatedArticles';
  if (lower.includes('bibliografia')) return 'bibliografia';
  if (lower.includes('proprietários') || lower === 'ownerids') return 'ownerIds';
  if (lower.includes('ano') || lower === 'year') return 'year';
  if (lower.includes('distrito')) return 'distrito';
  if (lower.includes('concelho')) return 'concelho';
  if (lower.includes('localização') || lower.includes('morada') || lower === 'location') return 'location';
  if (lower.includes('artístico') || lower === 'artistic') return 'artistic';
  if (lower.includes('resumo') || lower === 'excerpt') return 'excerpt';
  if (lower.includes('conteúdo') || lower === 'content') return 'content';
  if (lower.includes('figuras mencionadas') || lower === 'relatedfigures') return 'relatedFigures';
  
  return EXPECTED_KEYS.find(k => k.toLowerCase() === lower) || rawKey;
};

const fetchSheetData = async (sheetName) => {
  if (!SHEET_ID || SHEET_ID.includes('COLOQUE_AQUI')) return [];
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}&headers=1&t=${new Date().getTime()}`;
    const res = await fetch(url);
    const text = await res.text();
    const jsonString = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\)/)[1];
    const data = JSON.parse(jsonString);
    
    let headers = data.table.cols.map(c => c.label ? c.label.toString().trim() : '');
    let rows = data.table.rows;

    if (!headers[0] && rows.length > 0) {
       headers = rows[0].c.map(cell => cell && cell.v ? cell.v.toString().trim() : '');
       rows = rows.slice(1);
    }
    
    return rows.map(row => {
      const obj = {};
      row.c.forEach((cell, i) => {
        const rawKey = headers[i];
        if (!rawKey) return; 
        if (rawKey.toLowerCase().includes('carimbo')) return;

        const key = normalizeKey(rawKey);
        let value = (cell && cell.v !== null) ? cell.v : '';
        if (typeof value === 'string') value = value.trim();
        
        if (key === 'images') {
           obj[key] = value ? value.toString().split(',').map(s => getDirectImageUrl(s.trim())) : [];
        } else if (['ownerIds', 'relatedPalacetes', 'relatedFigures', 'relatedArticles'].includes(key)) {
           obj[key] = value ? value.toString().split(',').map(s => s.trim()) : [];
        } else {
           obj[key] = value;
        }
      });
      return obj;
    });
  } catch (e) {
    console.error(`Erro na folha ${sheetName}:`, e);
    return [];
  }
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home'); 
  
  const [figures, setFigures] = useState([]);
  const [palacetes, setPalacetes] = useState([]);
  const [artigos, setArtigos] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [modalType, setModalType] = useState(null);
  
  // Estado da galeria e do Filtro do Diretório
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [filterLocation, setFilterLocation] = useState({ distrito: 'Todos', concelho: 'Todos' });

  // Estados de Segurança (Acesso à Gestão)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Controlo de erro de Imagem do Logótipo e Conversão
  const resolvedLogoUrl = getDirectImageUrl(LOGO_URL) || LOGO_URL;
  const [logoHeaderError, setLogoHeaderError] = useState(false);
  const [logoFooterError, setLogoFooterError] = useState(false);

  // Rotação Automática de Imagens
  useEffect(() => {
    let intervalId;
    if (selectedItem && selectedItem.images && selectedItem.images.length > 1) {
      intervalId = setInterval(() => {
        setActiveImageIndex((prevIndex) => 
          (prevIndex + 1) % selectedItem.images.length
        );
      }, 4000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedItem, activeImageIndex]);

  // Injetor de CSS
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [f, p, a] = await Promise.all([
      fetchSheetData('Figuras'),
      fetchSheetData('Palacetes'),
      fetchSheetData('Artigos')
    ]);
    setFigures(f);
    setPalacetes(p);
    setArtigos(a);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Navegação Centralizada
  const handleNav = (newView) => {
    setView(newView);
    if (newView === 'patrimonio') {
      setFilterLocation({ distrito: 'Todos', concelho: 'Todos' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Função para lidar com o clique no botão Gestão
  const handleGestaoClick = () => {
    if (isAuthenticated) {
      handleNav('gestao');
    } else {
      setShowAuthModal(true);
    }
  };

  // Função para validar a password
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (passcode === GESTAO_PASSWORD) {
      setIsAuthenticated(true);
      setShowAuthModal(false);
      setPasscode('');
      setAuthError('');
      handleNav('gestao');
    } else {
      setAuthError('Código de acesso incorreto.');
      setPasscode('');
    }
  };

  const openModal = (item, type) => {
    setSelectedItem(item);
    setModalType(type);
    setActiveImageIndex(0); 
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setSelectedItem(null);
    setModalType(null);
    document.body.style.overflow = 'auto';
  };

  const getOwnerForPalacete = (ownerId) => figures.find(f => f.id === ownerId);
  const getPalacetesForFigure = (houseIds) => palacetes.filter(p => houseIds?.includes(p.id));
  const getArtigosRelacionados = (id, type) => artigos.filter(art => 
    (type === 'figura' && art.relatedFigures?.includes(id)) ||
    (type === 'palacete' && art.relatedPalacetes?.includes(id)) ||
    (type === 'artigo' && (art.relatedFigures?.includes(id) || art.relatedPalacetes?.includes(id)))
  );

  // === LÓGICA DO DIRETÓRIO GEOGRÁFICO ===
  const distritosList = [...new Set(palacetes.map(p => p.distrito ? String(p.distrito).trim() : 'Não Definido'))]
    .filter(Boolean).sort();
  
  const getConcelhosPorDistrito = (distrito) => {
    return [...new Set(palacetes
      .filter(p => (p.distrito ? String(p.distrito).trim() : 'Não Definido') === distrito)
      .map(p => p.concelho ? String(p.concelho).trim() : 'Não Definido'))
    ].filter(Boolean).sort();
  };

  const palacetesFiltrados = palacetes.filter(p => {
    const d = p.distrito ? String(p.distrito).trim() : 'Não Definido';
    const c = p.concelho ? String(p.concelho).trim() : 'Não Definido';
    
    if (filterLocation.distrito !== 'Todos' && d !== filterLocation.distrito) return false;
    if (filterLocation.concelho !== 'Todos' && c !== filterLocation.concelho) return false;
    return true;
  });

  if (loading) return (
    <div className="min-h-screen bg-[#11121a] flex flex-col items-center justify-center text-amber-500 font-serif">
      <Loader2 className="w-12 h-12 animate-spin mb-4" />
      <p className="tracking-widest uppercase text-xs">A carregar o Observatório...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#faf9f6] text-gray-800 font-sans flex flex-col">
      
      {/* HEADER ADAPTÁVEL */}
      <header className="bg-[#11121a] text-white sticky top-0 z-50 shadow-xl border-b border-amber-900/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNav('home')}>
             
             {/* Lógica do Logótipo no Header com Fallback */}
             {!logoHeaderError && resolvedLogoUrl && resolvedLogoUrl !== '' && !resolvedLogoUrl.includes('COLOQUE_AQUI') ? (
                <img src={resolvedLogoUrl} alt="Logo" className="w-10 h-10 object-contain" onError={() => setLogoHeaderError(true)} />
             ) : (
                <div className="w-10 h-10 bg-amber-600 rounded-sm flex items-center justify-center font-serif text-xl font-bold">T</div>
             )}

             <div className="flex flex-col">
                <span className="font-serif font-bold text-lg uppercase leading-tight tracking-tight">Torna-Viagem</span>
                <span className="text-[9px] tracking-widest uppercase opacity-60">Observatório do Património</span>
             </div>
          </div>
          
          <nav className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 text-[10px] font-bold uppercase tracking-widest">
            <button onClick={() => handleNav('patrimonio')} className={view === 'patrimonio' ? 'text-amber-500' : 'text-gray-400 hover:text-white transition-colors'}>Património</button>
            <button onClick={() => handleNav('figuras')} className={view === 'figuras' ? 'text-amber-500' : 'text-gray-400 hover:text-white transition-colors'}>Protagonistas</button>
            <button onClick={() => handleNav('artigos')} className={view === 'artigos' ? 'text-amber-500' : 'text-gray-400 hover:text-white transition-colors'}>Artigos</button>
            <button onClick={handleGestaoClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border transition-colors ${view === 'gestao' ? 'bg-amber-600 border-amber-600 text-white' : 'border-gray-700 text-gray-400 hover:text-white'}`}>
              {isAuthenticated ? <Database className="w-3 h-3" /> : <LockIcon className="w-3 h-3" />} Gestão
            </button>
          </nav>
        </div>
      </header>

      {/* MODAL DE AUTENTICAÇÃO (CADEADO) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1a1c29]/95 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-sm shadow-2xl w-full max-w-sm p-8 relative animate-in zoom-in-95 duration-300">
             <button 
               onClick={() => {setShowAuthModal(false); setAuthError(''); setPasscode('');}} 
               className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors"
             >
               <X className="w-5 h-5" />
             </button>
             
             <div className="text-center mb-6">
               <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
                 <LockIcon className="w-6 h-6" />
               </div>
               <h3 className="text-2xl font-serif text-[#1a1c29]">Acesso Reservado</h3>
               <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                 Esta área é exclusiva à equipa do CUCP.<br/>Introduza o código de acesso para gerir os dados.
               </p>
             </div>

             <form onSubmit={handleAuthSubmit}>
               <input 
                 type="password" 
                 value={passcode}
                 onChange={(e) => setPasscode(e.target.value)}
                 className={`w-full text-center border-2 p-3 rounded-sm mb-2 focus:outline-none tracking-[0.5em] text-lg transition-colors ${authError ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-amber-500'}`}
                 placeholder="••••••••"
                 autoFocus
               />
               {authError ? (
                 <p className="text-red-500 text-xs text-center mb-4 font-bold animate-in slide-in-bottom-1">{authError}</p>
               ) : (
                 <div className="h-4 mb-4"></div>
               )}
               <button type="submit" className="w-full bg-[#11121a] text-white py-3 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-amber-600 transition-colors">
                 Desbloquear Plataforma
               </button>
             </form>
          </div>
        </div>
      )}

      {/* VIEW: GESTÃO */}
      {view === 'gestao' && isAuthenticated && (
        <main className="flex-1 max-w-4xl mx-auto w-full p-8 animate-in fade-in slide-in-bottom-4 duration-500">
          <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden text-center p-6 md:p-12 relative">
            
            <button 
              onClick={() => {setIsAuthenticated(false); handleNav('home');}} 
              className="absolute top-4 right-4 md:top-6 md:right-6 text-[9px] uppercase tracking-widest text-gray-400 hover:text-red-600 flex items-center gap-1 transition-colors"
            >
              <LockIcon className="w-3 h-3" /> Bloquear Sessão
            </button>

            <Database className="w-16 h-16 text-gray-300 mx-auto mb-6" />
            <h2 className="text-3xl font-serif text-[#1a1c29] mb-4">Curadoria de Dados</h2>
            <p className="text-gray-600 max-w-xl mx-auto mb-10 leading-relaxed text-sm">
              A introdução de novos registos é feita através dos formulários oficiais do Google. Ao submeter um formulário, a plataforma será atualizada automaticamente.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-3xl mx-auto">
              <a href={FORM_FIGURAS} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center gap-3 p-6 bg-[#faf9f6] border border-gray-200 rounded-sm hover:border-amber-500 hover:shadow-md transition-all group">
                <User className="w-8 h-8 text-amber-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-800">Nova Figura</span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">Abrir Formulário <ExternalLink className="w-3 h-3"/></span>
              </a>

              <a href={FORM_PALACETES} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center gap-3 p-6 bg-[#faf9f6] border border-gray-200 rounded-sm hover:border-amber-500 hover:shadow-md transition-all group">
                <Building className="w-8 h-8 text-amber-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-800">Novo Palacete</span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">Abrir Formulário <ExternalLink className="w-3 h-3"/></span>
              </a>

              <a href={FORM_ARTIGOS} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center gap-3 p-6 bg-[#faf9f6] border border-gray-200 rounded-sm hover:border-amber-500 hover:shadow-md transition-all group">
                <BookOpen className="w-8 h-8 text-amber-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-800">Novo Artigo</span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">Abrir Formulário <ExternalLink className="w-3 h-3"/></span>
              </a>
            </div>
            
            <button onClick={loadData} className="mt-12 px-4 py-2 border border-gray-200 rounded-sm text-[10px] uppercase tracking-widest text-gray-500 hover:text-amber-600 hover:border-amber-600 flex items-center justify-center gap-2 mx-auto transition-colors">
               <Loader2 className="w-4 h-4" /> Recarregar Dados da Base
            </button>
          </div>
        </main>
      )}

      {/* VIEW: HOME */}
      {view === 'home' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 text-center">
          <span className="text-amber-600 font-bold tracking-[0.3em] uppercase text-[10px] mb-4">Homenagem aos Torna-Viagem</span>
          <h1 className="text-5xl md:text-8xl font-serif text-[#11121a] mb-6 leading-none italic">O Legado <span className="not-italic font-bold">Material</span></h1>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed font-light mb-12">Exploração prosopográfica e arquitetónica do impacto do capital de retorno oitocentista na paisagem portuguesa.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => handleNav('patrimonio')} className="bg-[#11121a] text-white px-6 md:px-8 py-3 md:py-4 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-amber-800 transition-colors">Explorar Património</button>
            <button onClick={() => handleNav('figuras')} className="border border-gray-300 text-gray-700 px-6 md:px-8 py-3 md:py-4 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:border-amber-600 transition-colors">Protagonistas</button>
            <button onClick={() => handleNav('artigos')} className="border border-gray-300 text-gray-700 px-6 md:px-8 py-3 md:py-4 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:border-amber-600 transition-colors">Artigos</button>
            
            <button onClick={handleGestaoClick} className="border border-amber-600 text-amber-700 px-6 md:px-8 py-3 md:py-4 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-colors flex items-center gap-2">
              {isAuthenticated ? <Database className="w-3 h-3" /> : <LockIcon className="w-3 h-3" />} Acesso à Gestão
            </button>
          </div>
        </main>
      )}

      {/* VIEW: PATRIMONIO COM DIRETÓRIO GEOGRÁFICO */}
      {view === 'patrimonio' && (
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 flex flex-col lg:flex-row gap-10">
           
           {/* BARRA LATERAL (DIRETÓRIO / FILTRO) */}
           <aside className="w-full lg:w-1/4 lg:flex-shrink-0">
             <div className="bg-white border border-gray-200 rounded-sm p-6 sticky top-28 shadow-sm">
                <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                  <MapPin className="w-5 h-5 text-amber-600" />
                  <h3 className="font-serif text-[#1a1c29] text-xl">Diretório Geográfico</h3>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                  {/* Botão de Reset */}
                  <button 
                    onClick={() => setFilterLocation({ distrito: 'Todos', concelho: 'Todos' })}
                    className={`w-full text-left text-sm font-bold uppercase tracking-widest py-2 px-3 rounded-sm transition-colors ${filterLocation.distrito === 'Todos' ? 'bg-amber-50 text-amber-700' : 'text-gray-500 hover:bg-gray-50 hover:text-amber-600'}`}
                  >
                    Todo o País
                  </button>

                  {/* Acordeão de Distritos */}
                  {distritosList.map(distrito => {
                    const isExpanded = filterLocation.distrito === distrito;
                    return (
                      <div key={distrito} className="space-y-1">
                        <button
                          onClick={() => setFilterLocation(isExpanded ? { distrito: 'Todos', concelho: 'Todos' } : { distrito, concelho: 'Todos' })}
                          className={`w-full flex items-center justify-between text-sm py-2 px-3 rounded-sm transition-colors ${isExpanded ? 'bg-slate-50 font-bold text-slate-800' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                          {distrito}
                          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'text-amber-600 rotate-90' : 'text-gray-400'}`} />
                        </button>
                        
                        {/* Lista de Concelhos */}
                        {isExpanded && (
                          <div className="pl-3 py-1 space-y-1 border-l-2 border-amber-100 ml-4">
                            <button
                              onClick={() => setFilterLocation({ distrito, concelho: 'Todos' })}
                              className={`block w-full text-left text-xs py-1.5 px-2 rounded-sm transition-colors ${filterLocation.concelho === 'Todos' ? 'font-bold text-amber-600' : 'text-gray-500 hover:text-amber-600'}`}
                            >
                              Todos os Concelhos
                            </button>
                            {getConcelhosPorDistrito(distrito).map(concelho => (
                              <button
                                key={concelho}
                                onClick={() => setFilterLocation({ distrito, concelho })}
                                className={`block w-full text-left text-xs py-1.5 px-2 rounded-sm transition-colors ${filterLocation.concelho === concelho ? 'font-bold text-amber-600 bg-amber-50/50' : 'text-gray-500 hover:text-amber-600'}`}
                              >
                                {concelho}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
             </div>
           </aside>

           {/* GRELHA PRINCIPAL DE PALACETES */}
           <div className="w-full lg:w-3/4">
             <div className="flex justify-between items-end mb-8 border-b border-gray-200 pb-4">
                <h2 className="text-3xl font-serif text-[#1a1c29]">
                  {filterLocation.concelho !== 'Todos' 
                    ? `Palacetes em ${filterLocation.concelho}`
                    : filterLocation.distrito !== 'Todos'
                    ? `Palacetes em ${filterLocation.distrito}`
                    : 'Inventário Arquitetónico Completo'}
                </h2>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{palacetesFiltrados.length} Registos</span>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {palacetesFiltrados.length === 0 ? (
                   <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-sm">
                     <p className="text-gray-400 italic">Nenhum palacete registado nesta localização.</p>
                     <button onClick={() => setFilterLocation({ distrito: 'Todos', concelho: 'Todos' })} className="mt-4 text-xs font-bold text-amber-600 uppercase tracking-widest hover:underline">Ver todos os registos</button>
                   </div>
                ) : (
                   palacetesFiltrados.map(palacete => (
                     <div key={palacete.id} onClick={() => openModal(palacete, 'palacete')} className="bg-white border border-gray-100 rounded-sm shadow-sm hover:shadow-md cursor-pointer group flex flex-col h-full overflow-hidden">
                        <div className="h-56 bg-gray-200 overflow-hidden relative flex items-center justify-center">
                           {palacete.images && palacete.images[0] ? (
                             <img src={palacete.images[0]} alt={palacete.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                           ) : (
                             <Building className="w-12 h-12 text-gray-300" />
                           )}
                           
                           {/* Ícone de Vídeo se existir */}
                           {palacete.videoUrl && (
                             <div className="absolute top-3 right-3 bg-amber-600/90 text-white p-1.5 rounded-full shadow-sm">
                               <Video className="w-4 h-4" />
                             </div>
                           )}

                           {/* Contador de fotos */}
                           {palacete.images && palacete.images.length > 1 && (
                             <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-sm tracking-widest flex items-center gap-1">
                               +{palacete.images.length - 1} FOTOS
                             </div>
                           )}
                        </div>
                        <div className="p-6 flex flex-col flex-1">
                           <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                             <MapPin className="w-3 h-3" />
                             {palacete.concelho ? `${palacete.concelho}${palacete.distrito ? `, ${palacete.distrito}` : ''}` : 'Localização não especificada'}
                           </span>
                           <h3 className="text-xl font-serif text-[#1a1c29] mb-2">{palacete.name || 'Sem Título'}</h3>
                           <p className="text-sm text-gray-600 line-clamp-2 mb-4">{palacete.description || 'Sem descrição inserida.'}</p>
                           <div className="mt-auto pt-4 border-t border-gray-50 flex items-center text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-amber-600 transition-colors">
                              Ver Detalhes <ArrowRight className="w-4 h-4 ml-1" />
                           </div>
                        </div>
                     </div>
                   ))
                )}
             </div>
           </div>
        </main>
      )}

      {/* VIEW: FIGURAS */}
      {view === 'figuras' && (
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
           <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-amber-600 font-bold tracking-widest uppercase text-[10px] mb-3 block">Diretório Biográfico</span>
              <h2 className="text-4xl font-serif text-[#1a1c29] mb-4">Os Protagonistas</h2>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {figures.length === 0 ? (
                 <p className="text-gray-400 italic col-span-full text-center">Nenhuma figura registada na base de dados.</p>
              ) : (
                 figures.map(fig => (
                   <div key={fig.id} onClick={() => openModal(fig, 'figura')} className="bg-white border border-gray-100 p-6 text-center group cursor-pointer hover:shadow-lg transition-shadow rounded-sm flex flex-col h-full relative">
                      {fig.videoUrl && (
                        <div className="absolute top-4 right-4 text-amber-500">
                          <Video className="w-4 h-4" />
                        </div>
                      )}
                      <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-6 bg-gray-200 border-4 border-[#faf9f6] flex items-center justify-center relative mt-4">
                         {fig.images && fig.images[0] ? (
                           <img src={fig.images[0]} alt={fig.name} className="w-full h-full object-cover filter sepia-[.3] group-hover:sepia-0 transition-all duration-500" />
                         ) : (
                           <User className="w-12 h-12 text-gray-400" />
                         )}
                      </div>
                      <h3 className="text-lg font-serif text-[#1a1c29] mb-1 group-hover:text-amber-700 transition-colors leading-tight">{fig.name || 'Desconhecido'}</h3>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">{fig.title || fig.category || 'Sem categoria'}</p>
                   </div>
                 ))
              )}
           </div>
        </main>
      )}

      {/* VIEW: ARTIGOS */}
      {view === 'artigos' && (
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
           <div className="border-b border-gray-200 pb-8 mb-12">
              <span className="text-amber-600 font-bold tracking-widest uppercase text-[10px] mb-3 block">Estudos e Ensaios</span>
              <h2 className="text-4xl font-serif text-[#1a1c29]">Compreender o Fenómeno</h2>
           </div>
           <div className="space-y-8">
              {artigos.length === 0 ? (
                 <p className="text-gray-400 italic">Nenhum artigo registado na base de dados.</p>
              ) : (
                 artigos.map(artigo => (
                   <article key={artigo.id} onClick={() => openModal(artigo, 'artigo')} className="group cursor-pointer bg-white p-6 md:p-8 rounded-sm shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col md:flex-row gap-6">
                      <div className="md:w-1/3 h-48 bg-gray-200 overflow-hidden rounded-sm flex items-center justify-center relative">
                         {artigo.images && artigo.images[0] ? (
                           <img src={artigo.images[0]} alt={artigo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                         ) : (
                           <BookOpen className="w-12 h-12 text-gray-400" />
                         )}
                         {artigo.videoUrl && (
                           <div className="absolute top-3 left-3 bg-amber-600/90 text-white px-2 py-1 rounded-sm text-[9px] font-bold tracking-widest flex items-center gap-1">
                             <Video className="w-3 h-3" /> VÍDEO
                           </div>
                         )}
                      </div>
                      <div className="md:w-2/3 flex flex-col justify-center">
                         <span className="text-[9px] uppercase tracking-widest text-amber-600 font-bold mb-2 block">{artigo.category || 'Ensaio'}</span>
                         <h3 className="text-2xl font-serif text-[#1a1c29] group-hover:text-amber-700 transition-colors mb-4">{artigo.title || 'Sem título'}</h3>
                         <p className="text-gray-600 leading-relaxed text-sm border-l-2 border-gray-200 pl-4 italic line-clamp-3">{artigo.excerpt || 'Leia o artigo completo clicando aqui...'}</p>
                      </div>
                   </article>
                 ))
              )}
           </div>
        </main>
      )}

      <footer className="bg-[#11121a] text-gray-500 py-12 px-6 border-t border-amber-900/10 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 opacity-40 grayscale">
             
             {/* Lógica do Logótipo no Footer com Fallback */}
             {!logoFooterError && resolvedLogoUrl && resolvedLogoUrl !== '' && !resolvedLogoUrl.includes('COLOQUE_AQUI') ? (
                <img src={resolvedLogoUrl} alt="Logo CUCP" className="w-10 h-10 object-contain" onError={() => setLogoFooterError(true)} />
             ) : (
                <div className="w-8 h-8 bg-gray-500 rounded-sm flex items-center justify-center text-white font-serif font-bold text-lg">T</div>
             )}

             <div className="flex flex-col text-white">
               <span className="font-serif text-sm font-bold uppercase">Torna-Viagem</span>
                <span className="text-[8px] uppercase tracking-widest">Observatório</span>
             </div>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-center md:text-left">© 2026 Observatório do Património Digital — CUCP</p>
        </div>
      </footer>

      {/* MODAL COM GALERIA DE IMAGENS, VÍDEO E CONTEÚDO CRUZADO */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-[#1a1c29]/95 backdrop-blur-sm transition-opacity" onClick={closeModal}></div>
          
          <div className="relative bg-[#faf9f6] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl flex flex-col md:flex-row">
            <button onClick={closeModal} className="absolute top-4 right-4 bg-white/80 hover:bg-white text-gray-900 rounded-full p-2 z-10 transition-colors shadow-sm">
              <X className="w-5 h-5" />
            </button>

            {/* SEÇÃO DA IMAGEM E GALERIA */}
            <div className="md:w-2/5 h-64 md:h-auto relative bg-gray-200 flex flex-col">
              {selectedItem.images && selectedItem.images.length > 0 ? (
                 <>
                   {/* Imagem Principal */}
                   <div className="flex-1 w-full relative min-h-[250px]">
                     <img 
                       src={selectedItem.images[activeImageIndex]} 
                       alt={selectedItem.title || selectedItem.name} 
                       className="w-full h-full object-cover absolute inset-0 transition-opacity duration-500 ease-in-out" 
                     />
                   </div>
                   
                   {/* Miniaturas (Thumbnails) */}
                   {selectedItem.images.length > 1 && (
                     <div className="flex gap-2 p-3 bg-gray-900 overflow-x-auto">
                       {selectedItem.images.map((img, idx) => (
                         <button
                           key={idx}
                           onClick={() => setActiveImageIndex(idx)}
                           className={`w-14 h-14 flex-shrink-0 border-2 rounded-sm overflow-hidden transition-all ${activeImageIndex === idx ? 'border-amber-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`}
                         >
                           <img src={img} className="w-full h-full object-cover" alt={`Miniatura ${idx + 1}`} />
                         </button>
                       ))}
                     </div>
                   )}
                 </>
              ) : (
                 <div className="w-full h-full flex items-center justify-center bg-gray-100 flex-1">
                   {modalType === 'palacete' && <Building className="w-16 h-16 text-gray-300" />}
                   {modalType === 'figura' && <User className="w-16 h-16 text-gray-300" />}
                   {modalType === 'artigo' && <BookOpen className="w-16 h-16 text-gray-300" />}
                 </div>
              )}
            </div>

            <div className="md:w-3/5 p-8 md:p-10 flex flex-col">
              <span className="text-amber-700 font-bold tracking-widest uppercase text-[9px] mb-2 block">
                {modalType === 'palacete' ? 'Ficha de Património' : modalType === 'figura' ? 'Nota Biográfica' : 'Ensaio Histórico'}
              </span>
              <h3 className="text-3xl font-serif text-[#1a1c29] mb-6 leading-tight">{selectedItem.name || selectedItem.title}</h3>
              
              {/* VÍDEO EMBEBIDO (Se Existir) - VERSÃO À PROVA DE MOBILE/SAFARI */}
              {selectedItem.videoUrl && (() => {
                 const videoUrlStr = String(selectedItem.videoUrl).toLowerCase();
                 const isEmbeddable = videoUrlStr.includes('youtube') || videoUrlStr.includes('youtu.be') || videoUrlStr.includes('vimeo');
                 
                 return (
                   <div className="mb-6 w-full relative rounded-sm overflow-hidden bg-[#11121a] shadow-sm border border-gray-200" style={{ paddingBottom: '56.25%', height: 0 }}>
                     {isEmbeddable ? (
                       <iframe 
                         src={getEmbedVideoUrl(selectedItem.videoUrl)}
                         style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                         allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                         allowFullScreen
                         title="Vídeo do Artigo"
                       ></iframe>
                     ) : (
                       <a href={selectedItem.videoUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center text-amber-500 hover:text-white transition-colors" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                         <Video className="w-8 h-8 mb-2" />
                         <span className="text-xs font-bold uppercase tracking-widest text-center px-4">O formato não pôde ser embebido.<br/>Clique para abrir externamente.</span>
                       </a>
                     )}
                   </div>
                 );
              })()}

              <div className="space-y-4 text-gray-600 font-light leading-relaxed text-sm border-b border-gray-200 pb-6 mb-6">
                <p className="whitespace-pre-wrap">{selectedItem.description || selectedItem.content}</p>
                {selectedItem.artistic && <p className="whitespace-pre-wrap">{selectedItem.artistic}</p>}
                
                {selectedItem.bibliografia && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <BookOpen className="w-3 h-3"/> Bibliografia
                    </p>
                    <p className="text-xs text-gray-500 italic">{selectedItem.bibliografia}</p>
                  </div>
                )}
              </div>

              <div className="mt-auto">
                <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1">
                  <Tag className="w-3 h-3"/> Registos Relacionados
                </h4>
                
                <div className="space-y-3">
                  {modalType === 'palacete' && (
                    <>
                      {selectedItem.ownerIds?.map(ownerId => {
                        const owner = getOwnerForPalacete(ownerId);
                        if (!owner) return null;
                        return (
                          <button key={ownerId} onClick={() => openModal(owner, 'figura')} className="flex items-center gap-3 p-3 bg-white border border-gray-200 hover:border-amber-400 rounded-sm w-full text-left transition-colors group">
                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                              {owner.images && owner.images[0] ? <img src={owner.images[0]} alt="" className="w-full h-full object-cover"/> : <User className="w-5 h-5 m-auto text-gray-400 mt-2"/>}
                            </div>
                            <div>
                              <p className="text-[9px] uppercase tracking-widest text-amber-600 font-bold mb-0.5">Proprietário</p>
                              <p className="text-sm font-serif text-[#1a1c29] group-hover:text-amber-700">{owner.name}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 ml-auto text-gray-400 group-hover:text-amber-500" />
                          </button>
                        )
                      })}
                    </>
                  )}

                  {modalType === 'figura' && (
                    <>
                      {getPalacetesForFigure(selectedItem.relatedPalacetes).map(house => (
                        <button key={house.id} onClick={() => openModal(house, 'palacete')} className="flex items-center gap-3 p-3 bg-white border border-gray-200 hover:border-amber-400 rounded-sm w-full text-left transition-colors group">
                          <div className="w-10 h-10 rounded-sm overflow-hidden flex-shrink-0 bg-gray-200">
                            {house.images && house.images[0] ? <img src={house.images[0]} alt="" className="w-full h-full object-cover"/> : <Building className="w-5 h-5 m-auto text-gray-400 mt-2"/>}
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-amber-600 font-bold mb-0.5">Edificação</p>
                            <p className="text-sm font-serif text-[#1a1c29] group-hover:text-amber-700">{house.name}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 ml-auto text-gray-400 group-hover:text-amber-500" />
                        </button>
                      ))}
                    </>
                  )}

                  {getArtigosRelacionados(selectedItem.id, modalType).map(art => (
                    <button key={art.id} onClick={() => openModal(art, 'artigo')} className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-3 rounded-sm text-xs text-slate-700 hover:bg-slate-100 transition-colors w-full text-left group">
                      <BookOpen className="w-4 h-4 text-amber-600 flex-shrink-0"/> 
                      <span className="font-bold">Tema / Ensaio:</span> {art.title}
                      <ChevronRight className="w-4 h-4 ml-auto text-gray-400 group-hover:text-amber-500" />
                    </button>
                  ))}

                  {modalType === 'artigo' && (
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.relatedFigures?.map(id => {
                        const fig = figures.find(f => f.id === id);
                        if (!fig) return null;
                        return (
                          <button key={id} onClick={() => openModal(fig, 'figura')} className="bg-amber-50 text-amber-900 border border-amber-200 px-3 py-2 rounded-sm text-xs hover:bg-amber-100 transition-colors flex items-center gap-2">
                            <User className="w-3 h-3 text-amber-600"/> <span className="font-bold">{fig.name}</span>
                          </button>
                        );
                      })}
                      {selectedItem.relatedPalacetes?.map(id => {
                        const pal = palacetes.find(p => p.id === id);
                        if (!pal) return null;
                        return (
                          <button key={id} onClick={() => openModal(pal, 'palacete')} className="bg-slate-100 text-slate-800 border border-slate-200 px-3 py-2 rounded-sm text-xs hover:bg-slate-200 transition-colors flex items-center gap-2">
                            <Building className="w-3 h-3 text-slate-500"/> <span className="font-bold">{pal.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

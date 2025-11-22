import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import WordCloud3D from './components/WordCloud3D';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "ALL"];

// Colors now handled in CSS mostly, but kept for 3D elements if needed
const LEVEL_COLORS = {
  "A1": "#61dafb",
  "A2": "#4CAF50",
  "B1": "#FFC107",
  "B2": "#FF5722",
  "C1": "#E91E63",
  "C2": "#9C27B0",
  "ALL": "#ffffff"
};

// --- TRANSLATIONS DICTIONARY ---
const TRANSLATIONS = {
  es: {
    title: "Neural Vocabulary",
    loading: "Cargando...",
    words: "palabras",
    connectPlaceholder: "Conectar frase...",
    connectBtn: "Conectar",
    searchPlaceholder: "🔍 Buscar...",
    resetBtn: "☠️ RESET",
    clearBtn: "🗑️ VACIAR",
    resetConfirm: "⚠️ ¿RESTAURAR DE FÁBRICA?\nEsto borrará tus cambios y cargará la IA original.",
    resetSuccess: "¡Universo restaurado!",
    clearConfirm: "🗑️ ¿VACIAR TODO?\nSe borrarán todas las palabras.",
    clearSuccess: "Universo vacío.",
    adminActivated: "🛠️ MODO ADMIN ACTIVADO",
    processed: "Frase procesada"
  },
  en: {
    title: "Neural Vocabulary",
    loading: "Loading...",
    words: "words",
    connectPlaceholder: "Connect phrase...",
    connectBtn: "Connect",
    searchPlaceholder: "🔍 Search...",
    resetBtn: "☠️ RESET",
    clearBtn: "🗑️ CLEAR",
    resetConfirm: "⚠️ FACTORY RESET?\nThis will delete your changes and load the original AI.",
    resetSuccess: "Universe restored!",
    clearConfirm: "🗑️ CLEAR ALL?\nAll words will be deleted.",
    clearSuccess: "Universe cleared.",
    adminActivated: "🛠️ ADMIN MODE ACTIVATED",
    processed: "Phrase processed"
  }
};

function App() {
  // --- LANGUAGE STATE (Auto-detect) ---
  const [lang, setLang] = useState(() => {
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.startsWith('es') ? 'es' : 'en';
  });

  const t = TRANSLATIONS[lang]; // Helper for current language

  const [phrase, setPhrase] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [clusterData, setClusterData] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // ESTADO PARA CONTROLAR LOS BOTONES ADMIN
  const [showAdminTools, setShowAdminTools] = useState(false);
  // ESTADO PARA CONTAR LOS CLICS SECRETOS
  const [secretClicks, setSecretClicks] = useState(0);

  useEffect(() => {
    fetchClusters('ALL');
  }, []);

  const toggleLang = () => {
    setLang(prev => prev === 'es' ? 'en' : 'es');
  };

  // --- FUNCIÓN DE ACTIVACIÓN SECRETA ---
  const handleSecretClick = () => {
    const newCount = secretClicks + 1;
    setSecretClicks(newCount);

    // Si llevamos 3 clics o más, activamos el modo admin
    if (newCount >= 3) {
      setShowAdminTools(true);
      // Opcional: un pequeño aviso visual
      if (newCount === 3) alert(t.adminActivated);
    }
  };

  const fetchClusters = async (level) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/get_semantic_map?level=${level}`);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      const data = await response.json();
      setClusterData(Array.isArray(data.clusterMap) ? data.clusterMap : []);
    } catch (error) {
      console.error('❌ Error API:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelChange = (lvl) => {
    setSelectedLevel(lvl);
    fetchClusters(lvl);
  };

  const totalVisibleWords = useMemo(() => {
    if (!clusterData || !Array.isArray(clusterData)) return 0;
    return clusterData.reduce((acc, cluster) => acc + (cluster.words ? cluster.words.length : 0), 0);
  }, [clusterData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phrase.trim()) return;
    try {
      await fetch(`${API_BASE_URL}/api/add_phrase_links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: phrase.trim() }),
      });
      setPhrase('');
      console.log(t.processed);
      await fetchClusters(selectedLevel);
    } catch (error) { console.error(error); }
  };

  const handleReset = async () => {
    const confirm = window.confirm(t.resetConfirm);
    if (!confirm) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reset_db`, { method: 'POST' });
      if (response.ok) {
        alert(t.resetSuccess);
        window.location.reload();
      }
    } catch (error) { console.error(error); }
    finally { setIsLoading(false); }
  };

  const handleClear = async () => {
    const confirm = window.confirm(t.clearConfirm);
    if (!confirm) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/clear_db`, { method: 'POST' });
      if (response.ok) {
        setClusterData([]);
        alert(t.clearSuccess);
      }
    } catch (error) { console.error(error); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="App">
      {/* --- LANGUAGE TOGGLE (Minimalist Corner) --- */}
      <div className="lang-toggle" onClick={toggleLang} title="Switch Language">
        <span className={`lang-option ${lang === 'es' ? 'active' : ''}`}>ES</span>
        <span className="lang-separator">/</span>
        <span className={`lang-option ${lang === 'en' ? 'active' : ''}`}>EN</span>
      </div>

      {/* --- ZEN HEADER (Top Left) --- */}
      <div className="zen-header">
        <div
          onClick={handleSecretClick}
          className="app-title"
          title="Haz clic 3 veces para opciones de admin"
        >
          {t.title} {secretClicks > 0 && secretClicks < 3 ? `(${secretClicks})` : ""}
        </div>

        <div className="stat-badge">
          {isLoading ? t.loading : `${totalVisibleWords} ${t.words} (${selectedLevel})`}
        </div>
      </div>

      {/* --- ZEN CONTROLS (Bottom Floating Pill) --- */}
      <div className="zen-controls">
        <div className="level-filters">
          {LEVELS.map(lvl => (
            <button
              key={lvl}
              onClick={() => handleLevelChange(lvl)}
              disabled={isLoading}
              className={`level-btn ${selectedLevel === lvl ? 'active' : ''}`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="controls-row">
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={t.connectPlaceholder}
              className="glass-input"
            />
            <button type="submit" className="action-btn">{t.connectBtn}</button>
          </form>

          {showAdminTools && (
            <div className="admin-tools">
              <button
                onClick={handleReset}
                disabled={isLoading}
                className="action-btn btn-reset"
              >
                {t.resetBtn}
              </button>

              <button
                onClick={handleClear}
                disabled={isLoading}
                className="action-btn btn-clear"
              >
                {t.clearBtn}
              </button>
            </div>
          )}

          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="glass-input"
          />
        </div>
      </div>

      <div className="canvas-container">
        <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 800], fov: 60, far: 10000 }}>
          <color attach="background" args={['#121212']} /> {/* Zen Background */}
          <fog attach="fog" args={['#121212', 500, 2000]} />
          <ambientLight intensity={0.8} />
          <pointLight position={[100, 100, 100]} intensity={1} />
          <Stars radius={300} depth={100} count={4000} factor={4} saturation={0} fade speed={0.5} />
          <OrbitControls enableDamping dampingFactor={0.05} minDistance={10} maxDistance={5000} />
          <WordCloud3D searchTerm={searchTerm} clusterMap={clusterData} />
        </Canvas>
      </div>
    </div>
  );
}

export default App;
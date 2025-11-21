import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei'; 
import WordCloud3D from './components/WordCloud3D';
import './App.css'; 

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "ALL"];

const LEVEL_COLORS = {
  "A1": "#61dafb", 
  "A2": "#4CAF50", 
  "B1": "#FFC107", 
  "B2": "#FF5722", 
  "C1": "#E91E63", 
  "C2": "#9C27B0", 
  "ALL": "#ffffff" 
};

function App() {
  const [phrase, setPhrase] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); 
  const [clusterData, setClusterData] = useState([]); 
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  
  // ESTADO PARA CONTROLAR LA VISIBILIDAD DE LOS BOTONES ADMIN
  const [showAdminTools, setShowAdminTools] = useState(false);

  useEffect(() => {
    // 1. Cargar Clusters
    fetchClusters('ALL');

    // 2. Verificar si estamos en la ruta secreta "/test"
    // Esto revisa si la URL actual es http://localhost:3000/test
    if (window.location.pathname === '/test') {
      setShowAdminTools(true);
    }
  }, []);

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
      console.log("Frase procesada");
      await fetchClusters(selectedLevel); 
    } catch (error) { console.error(error); }
  };

  const handleReset = async () => {
    const confirm = window.confirm("⚠️ ¿RESTAURAR DE FÁBRICA?\nEsto borrará tus cambios y cargará la IA original.");
    if (!confirm) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reset_db`, { method: 'POST' });
      if (response.ok) {
        alert("¡Universo restaurado!");
        window.location.reload(); 
      }
    } catch (error) { console.error(error); } 
    finally { setIsLoading(false); }
  };

  const handleClear = async () => {
    const confirm = window.confirm("🗑️ ¿VACIAR TODO?\nSe borrarán todas las palabras.");
    if (!confirm) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/clear_db`, { method: 'POST' });
      if (response.ok) {
        setClusterData([]); 
        alert("Universo vacío.");
      }
    } catch (error) { console.error(error); } 
    finally { setIsLoading(false); }
  };

  return (
    <div className="App">
      <header className="App-header" style={{ 
        padding: '15px', background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(10px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', 
        zIndex: 10, position: 'relative', borderBottom: '1px solid #333' 
      }}>
        
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <div style={{color: 'white', fontWeight: 'bold', fontSize: '1.2rem'}}>
            Neural Vocabulary
          </div>
          <div style={{
            background: LEVEL_COLORS[selectedLevel], 
            color: '#000', padding: '2px 10px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.9rem'
          }}>
            {isLoading ? "Cargando..." : `${totalVisibleWords} palabras (${selectedLevel})`}
          </div>
        </div>

        <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center'}}>
          {LEVELS.map(lvl => (
            <button
              key={lvl}
              onClick={() => handleLevelChange(lvl)}
              disabled={isLoading}
              style={{
                background: selectedLevel === lvl ? LEVEL_COLORS[lvl] : 'transparent',
                color: selectedLevel === lvl ? '#000' : LEVEL_COLORS[lvl],
                border: `1px solid ${LEVEL_COLORS[lvl]}`,
                padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold',
                opacity: isLoading ? 0.5 : 1,
                transition: 'all 0.2s',
                fontSize: '0.85rem'
              }}
            >
              {lvl}
            </button>
          ))}
        </div>
        
        <div style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center'}}>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '5px' }}>
            <input type="text" value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="Conectar frase..." style={{ padding: '8px', borderRadius: '4px', border: 'none' }} />
            <button type="submit" style={{cursor: 'pointer', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px'}}>Conectar</button>
          </form>
          
          {/* --- SOLO SE MUESTRAN SI LA URL ES /test --- */}
          {showAdminTools && (
            <div style={{display: 'flex', gap: '5px'}}>
              <button 
                onClick={handleReset} 
                disabled={isLoading}
                style={{
                  background: '#E91E63', color: 'white', border: 'none', borderRadius: '4px', 
                  cursor: 'pointer', fontWeight: 'bold', padding: '0 10px', height: '33px'
                }}
                title="Restaurar IA original"
              >
                ☠️ RESET
              </button>

              <button 
                onClick={handleClear} 
                disabled={isLoading}
                style={{
                  background: '#000', color: '#ff4d4d', border: '1px solid #ff4d4d', borderRadius: '4px', 
                  cursor: 'pointer', fontWeight: 'bold', padding: '0 10px', height: '33px'
                }}
                title="Vaciar DB"
              >
                🗑️ VACIAR
              </button>
            </div>
          )}

          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="🔍 Buscar..." style={{ padding: '8px', borderRadius: '4px', border: 'none' }} />
        </div>
      </header>

      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100vh', background: '#000' }}>
        <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 800], fov: 60, far: 10000 }}>
          <color attach="background" args={['#000000']} />
          <fog attach="fog" args={['#000000', 500, 2000]} />
          <ambientLight intensity={0.8} />
          <pointLight position={[100, 100, 100]} intensity={1} />
          <Stars radius={300} depth={100} count={6000} factor={4} saturation={0} fade speed={1} />
          <OrbitControls enableDamping dampingFactor={0.05} minDistance={10} maxDistance={5000} /> 
          <WordCloud3D searchTerm={searchTerm} clusterMap={clusterData} />
        </Canvas>
      </div>
    </div>
  );
}

export default App;
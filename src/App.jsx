import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei'; // <-- IMPORTANTE: Incluimos OrbitControls
import WordCloud3D from './components/WordCloud3D';
import './App.css'; 

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
// --- AÑADIMOS C1 y C2 ---
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "ALL"];

const LEVEL_COLORS = {
  "A1": "#61dafb", // Azul Claro
  "A2": "#4CAF50", // Verde
  "B1": "#FFC107", // Amarillo
  "B2": "#FF5722", // Naranja
  "C1": "#E91E63", // Rosa Fuerte
  "C2": "#9C27B0", // Violeta
  "ALL": "#ffffff" // Blanco
};

function App() {
  const [phrase, setPhrase] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); 
  const [clusterData, setClusterData] = useState([]); 
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch al Backend con el nivel seleccionado
  const fetchClusters = async (level) => {
    setIsLoading(true);
    try {
      console.log("Conectando a:", API_BASE_URL); // Para debug
      const response = await fetch(`${API_BASE_URL}/api/get_semantic_map?level=${level}`);
      
      if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}: El backend falló al devolver datos.`);
      }

      const data = await response.json();
      
      // Ajuste de formato: aseguramos que siempre sea un array
      setClusterData(Array.isArray(data.clusterMap) ? data.clusterMap : []); 
    } catch (error) {
      console.error('❌ Error API:', error);
      // Podemos poner un estado de error visible aquí si quieres
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters('ALL');
  }, []);

  const handleLevelChange = (lvl) => {
    setSelectedLevel(lvl);
    fetchClusters(lvl);
  };

  // REVISIÓN CLAVE: Lógica robusta de conteo
  const totalVisibleWords = useMemo(() => {
    if (!clusterData || !Array.isArray(clusterData)) return 0;
    // Verifica que cluster.words exista antes de leer .length
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
    } catch (error) { console.error(error); }
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
            IA Semantic Universe
          </div>
          <div style={{
            background: LEVEL_COLORS[selectedLevel], 
            color: '#000', padding: '2px 10px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.9rem'
          }}>
            {isLoading ? "Cargando..." : `${totalVisibleWords} palabras (${selectedLevel})`}
          </div>
        </div>

        {/* BOTONES DE FILTRO */}
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
        
        <div style={{display: 'flex', gap: '10px'}}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '5px' }}>
            <input type="text" value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="Conectar frase..." style={{ padding: '8px', borderRadius: '4px', border: 'none' }} />
            <button type="submit" style={{cursor: 'pointer', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px'}}>Conectar</button>
          </form>
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="🔍 Buscar..." style={{ padding: '8px', borderRadius: '4px', border: 'none' }} />
        </div>
      </header>

      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100vh', background: '#000' }}>
        {/* CÁMARA AJUSTADA Y CONTROL DEL RATÓN EN EL CANVAS */}
        <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 800], fov: 60, far: 10000 }}>
          <color attach="background" args={['#000000']} />
          <fog attach="fog" args={['#000000', 500, 2000]} />
          <ambientLight intensity={0.8} />
          <pointLight position={[100, 100, 100]} intensity={1} />
          <Stars radius={300} depth={100} count={6000} factor={4} saturation={0} fade speed={1} />
          
          {/* CONTROL DEL RATÓN (OrbitControls) */}
          <OrbitControls enableDamping dampingFactor={0.05} minDistance={10} maxDistance={5000} /> 
          
          <WordCloud3D searchTerm={searchTerm} clusterMap={clusterData} />
        </Canvas>
      </div>
    </div>
  );
}

export default App;
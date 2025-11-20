import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

const SUB_WORD_COLOR_PALETTE = [
  "#FF5733", "#33FF57", "#3357FF", "#FF33F7", "#33FFF9", 
  "#F7FF33", "#FF8333", "#8D33FF", "#33FF83", "#FF3333",
];

// --- COMPONENTE WORD (Con efecto Billboard) ---
function Word({ text, size, position, wordColor, isFound }) { 
  const meshRef = useRef();
  const { camera } = useThree(); 

  useFrame((state, delta) => {
    if (meshRef.current) {
      // 1. BILLBOARD: Que el texto mire siempre a la cámara
      meshRef.current.quaternion.copy(camera.quaternion);

      // 2. Animación de latido si se encuentra
      const targetScale = isFound ? 1.5 : 1;
      meshRef.current.scale.setScalar(
        THREE.MathUtils.damp(meshRef.current.scale.x, targetScale, 4, delta)
      );
    }
  });

  return (
    <Text
      ref={meshRef}
      position={position}
      fontSize={size} 
      color={wordColor}
      anchorX="center" 
      anchorY="middle"
      renderOrder={isFound ? 100 : 1} 
      material-depthTest={false}      
      material-toneMapped={false}
      outlineWidth={0.05}             
      outlineColor="#000000"
    >
      {text}
    </Text>
  );
}

function CameraManager({ targetPosition, controlsRef }) {
  const { camera } = useThree();
  const isAnimating = useRef(false);

  useEffect(() => {
    if (targetPosition) isAnimating.current = true;
    else isAnimating.current = false;
  }, [targetPosition]);

  useFrame((state, delta) => {
    if (isAnimating.current && targetPosition && controlsRef.current) {
      const dest = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z + 15);
      controlsRef.current.target.lerp(targetPosition, 5 * delta);
      camera.position.lerp(dest, 3 * delta);
      controlsRef.current.update();
      if (camera.position.distanceTo(dest) < 0.5) isAnimating.current = false;
    }
  });
  return null;
}

function getSphericalPosition(index, totalItems, radiusMultiplier, variance) {
  const phi = Math.acos(-1 + (2 * index) / totalItems);
  const theta = Math.sqrt(totalItems * Math.PI) * phi;
  
  // Añadimos varianza aleatoria para que no sea una esfera perfecta aburrida
  const x = radiusMultiplier * Math.cos(theta) * Math.sin(phi) + (Math.random()-0.5)*variance;
  const y = radiusMultiplier * Math.sin(theta) * Math.sin(phi) + (Math.random()-0.5)*variance;
  const z = radiusMultiplier * Math.cos(phi) + (Math.random()-0.5)*variance; 
  
  return [x, y, z];
}

export default function WordCloud3D({ searchTerm, clusterMap }) { 
  const controls = useRef(); 
  const [targetFocus, setTargetFocus] = useState(null); 
  const [foundWordId, setFoundWordId] = useState(null);

  // --- AJUSTES DE DENSIDAD VISUAL (APLICADOS) ---
  const CLUSTER_VARIANCE = 20;      
  const INNER_CLUSTER_RADIUS = 15;   // <--- CAMBIO: Más compacto (era 22)
  const INNER_CLUSTER_VARIANCE = 4;  // <--- CAMBIO: Menos dispersión (era 8)

  const wordsWithPosition = useMemo(() => {
    if (!clusterMap || clusterMap.length === 0) return [];
    const arrangedWords = [];
    
    clusterMap.forEach((clusterData, clusterIndex) => {
      const [BASE_X, BASE_Y, BASE_Z] = clusterData.center || [0, 0, 0]; 
      const CENTER_X = BASE_X + (Math.random() - 0.5) * CLUSTER_VARIANCE;
      const CENTER_Y = BASE_Y + (Math.random() - 0.5) * CLUSTER_VARIANCE;
      const CENTER_Z = BASE_Z + (Math.random() - 0.5) * CLUSTER_VARIANCE;
      
      // Título Cluster
      arrangedWords.push({
        id: `cluster-${clusterIndex}`, 
        text: clusterData.name,
        size: 3.5, 
        position: [CENTER_X, CENTER_Y, CENTER_Z],
        wordColor: clusterData.color, 
      });
      
      // Palabras
      clusterData.words.forEach((subTopic, subIndex) => {
        const paletteIndex = subIndex % SUB_WORD_COLOR_PALETTE.length;
        const [offsetX, offsetY, offsetZ] = getSphericalPosition(
          subIndex, clusterData.words.length, INNER_CLUSTER_RADIUS, INNER_CLUSTER_VARIANCE
        );
        
        arrangedWords.push({
          id: `word-${clusterIndex}-${subIndex}`,
          text: subTopic,
          size: 1.5, // <--- CAMBIO: Texto más grande (era 1.0)
          position: [CENTER_X + offsetX, CENTER_Y + offsetY, CENTER_Z + offsetZ],
          wordColor: SUB_WORD_COLOR_PALETTE[paletteIndex],
        });
      });
    });
    return arrangedWords;
  }, [clusterMap]); 

  useEffect(() => {
    const term = searchTerm ? searchTerm.toUpperCase() : "";
    if (!term || term.length < 2) {
        setFoundWordId(null); setTargetFocus(null); return;
    }
    const foundWord = wordsWithPosition.find(w => w.text.toUpperCase() === term || w.text.toUpperCase().includes(term));
    if (foundWord) {
      setFoundWordId(foundWord.id);
      setTargetFocus(new THREE.Vector3(...foundWord.position));
    } else {
      setFoundWordId(null); setTargetFocus(null);
    }
  }, [searchTerm, wordsWithPosition]);

  return (
    <>
      <OrbitControls ref={controls} enableDamping dampingFactor={0.05} minDistance={2} maxDistance={500} />
      <CameraManager targetPosition={targetFocus} controlsRef={controls} />
      {wordsWithPosition.map((word) => (
        <Word 
          key={word.id} 
          text={word.text} 
          size={word.size} 
          position={word.position} 
          wordColor={word.wordColor} 
          isFound={word.id === foundWordId} 
        />
      ))}
    </>
  );
}